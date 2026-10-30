"""
Atividades e histórico dos dois boards de Parcerias, no padrão dos cards de Serviço:
atividade (Foco), anotação, arquivo e alteração (evento do sistema).

Mexer numa atividade de oportunidade atualiza last_activity_at
(a Consulta de CNPJ usa para saber se a negociação está viva).
"""
import uuid
from datetime import datetime
from pathlib import Path
from typing import List, Optional, Tuple

from fastapi import HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.models.partner_activity import PartnerActivity
from app.models.partner_opportunity import PartnerOpportunity
from app.models.user import User
from app.schemas.parcerias import AtividadeCreate, AtividadeUpdate
from app.services.parcerias import acesso

UPLOAD_DIR = Path("/app/uploads")
TAMANHO_MAXIMO = 10 * 1024 * 1024  # 10MB, como nos cards de Serviço


def registrar_evento(db: Session, user: Optional[User], descricao: str,
                     partner_id: Optional[int] = None, opportunity_id: Optional[int] = None,
                     tipo: str = "change") -> None:
    """Linha de "alteração" gravada pelo sistema. Quem chama faz o commit."""
    db.add(PartnerActivity(
        partner_id=partner_id,
        opportunity_id=opportunity_id,
        user_id=user.id if user else None,
        category="alteracao",
        activity_type=tipo,
        description=descricao,
    ))


def tocar(oportunidade: Optional[PartnerOpportunity]) -> None:
    if oportunidade:
        oportunidade.last_activity_at = datetime.utcnow()


def listar(db: Session, partner_id: Optional[int] = None,
           opportunity_id: Optional[int] = None) -> List[PartnerActivity]:
    q = db.query(PartnerActivity)
    if opportunity_id is not None:
        q = q.filter(PartnerActivity.opportunity_id == opportunity_id)
    else:
        q = q.filter(PartnerActivity.partner_id == partner_id)
    return q.order_by(PartnerActivity.created_at.desc(), PartnerActivity.id.desc()).all()


def criar(db: Session, user: User, dados: AtividadeCreate, partner_id: Optional[int] = None,
          oportunidade: Optional[PartnerOpportunity] = None) -> PartnerActivity:
    acesso.exigir_escrita(user)
    titulo = (dados.title or "").strip() or None
    texto = (dados.description or "").strip() or None
    if dados.category == "atividade" and not titulo:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Informe o título da atividade.")
    if dados.category == "anotacao" and not texto:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Escreva a anotação.")
    atividade = PartnerActivity(
        partner_id=partner_id,
        opportunity_id=oportunidade.id if oportunidade else None,
        user_id=user.id,
        category=dados.category,
        activity_type=dados.activity_type or ("note" if dados.category == "anotacao" else "task"),
        title=titulo,
        description=texto,
        priority=dados.priority,
        due_date=dados.due_date,
        activity_metadata=dados.activity_metadata,
    )
    db.add(atividade)
    tocar(oportunidade)
    db.commit()
    db.refresh(atividade)
    return atividade


def _buscar_visivel(db: Session, user: User, atividade_id: int) -> Tuple[PartnerActivity, Optional[PartnerOpportunity]]:
    """Atividade de um card que o usuário enxerga; senão, 404 (não revela a de outro parceiro)."""
    atividade = db.query(PartnerActivity).filter(PartnerActivity.id == atividade_id).first()
    if not atividade:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Atividade não encontrada.")
    if atividade.opportunity_id:
        return atividade, acesso.buscar_oportunidade(db, user, atividade.opportunity_id)
    acesso.buscar_parceiro(db, user, atividade.partner_id)
    return atividade, None


def _editavel(db: Session, user: User, atividade_id: int) -> Tuple[PartnerActivity, Optional[PartnerOpportunity]]:
    acesso.exigir_escrita(user)
    atividade, oportunidade = _buscar_visivel(db, user, atividade_id)
    if atividade.category == "alteracao":
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Alteração do histórico não se edita nem se exclui.")
    return atividade, oportunidade


def atualizar(db: Session, user: User, atividade_id: int, dados: AtividadeUpdate) -> PartnerActivity:
    atividade, oportunidade = _editavel(db, user, atividade_id)
    mudancas = dados.model_dump(exclude_unset=True)
    meta_nova = mudancas.pop("activity_metadata", None)
    if atividade.category == "atividade":
        if "title" in mudancas and not (mudancas["title"] or "").strip():
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Informe o título da atividade.")
        meta = dict(atividade.activity_metadata or {})
        meta.update(meta_nova or {})
        # As edições aparecem no histórico da atividade, como em Serviço.
        meta["edits"] = [*meta.get("edits", []), datetime.utcnow().isoformat()]
        atividade.activity_metadata = meta
    elif meta_nova is not None:
        atividade.activity_metadata = meta_nova
    if atividade.category == "anotacao" and "description" in mudancas and not (mudancas["description"] or "").strip():
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "A anotação não pode ficar vazia.")
    for campo, valor in mudancas.items():
        setattr(atividade, campo, valor)
    tocar(oportunidade)
    db.commit()
    db.refresh(atividade)
    return atividade


def concluir(db: Session, user: User, atividade_id: int, concluida: bool,
             valida: Optional[bool] = None) -> PartnerActivity:
    atividade, oportunidade = _editavel(db, user, atividade_id)
    if atividade.category != "atividade":
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Só atividade se conclui.")
    atividade.is_completed = concluida
    atividade.completed_at = datetime.utcnow() if concluida else None
    if valida is not None:
        atividade.activity_metadata = {**(atividade.activity_metadata or {}), "is_valid": valida}
    tocar(oportunidade)
    db.commit()
    db.refresh(atividade)
    return atividade


def excluir(db: Session, user: User, atividade_id: int) -> None:
    atividade, _ = _editavel(db, user, atividade_id)
    if atividade.user_id != user.id and not acesso.eh_gestao(user):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Só quem criou, admin ou gerente excluem.")
    if atividade.category == "arquivo" and atividade.file_path:
        try:
            (UPLOAD_DIR / atividade.file_path).unlink(missing_ok=True)
        except OSError:  # pragma: no cover
            pass
    db.delete(atividade)
    db.commit()


async def anexar(db: Session, user: User, arquivo: UploadFile, partner_id: Optional[int] = None,
                 oportunidade: Optional[PartnerOpportunity] = None) -> PartnerActivity:
    acesso.exigir_escrita(user)
    conteudo = await arquivo.read()
    if len(conteudo) > TAMANHO_MAXIMO:
        raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, "Arquivo muito grande. Máximo: 10MB")
    original = (arquivo.filename or "arquivo")[:500]
    pasta = f"parcerias/oportunidade_{oportunidade.id}" if oportunidade else f"parcerias/parceiro_{partner_id}"
    relativo = f"{pasta}/{uuid.uuid4().hex}{Path(original).suffix}"
    destino = UPLOAD_DIR / relativo
    destino.parent.mkdir(parents=True, exist_ok=True)
    destino.write_bytes(conteudo)
    atividade = PartnerActivity(
        partner_id=partner_id,
        opportunity_id=oportunidade.id if oportunidade else None,
        user_id=user.id,
        category="arquivo",
        activity_type="file_attached",
        title=original,
        file_name=original,
        file_path=relativo,
        file_size=len(conteudo),
        mime_type=arquivo.content_type,
    )
    db.add(atividade)
    tocar(oportunidade)
    db.commit()
    db.refresh(atividade)
    return atividade


def arquivo_para_baixar(db: Session, user: User, atividade_id: int) -> Tuple[Path, str, str]:
    atividade, _ = _buscar_visivel(db, user, atividade_id)
    caminho = UPLOAD_DIR / (atividade.file_path or "")
    if atividade.category != "arquivo" or not atividade.file_path or not caminho.exists():
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Arquivo não encontrado.")
    return caminho, atividade.file_name or "arquivo", atividade.mime_type or "application/octet-stream"
