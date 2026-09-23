"""
A página de Reuniões — lista e indicadores numa resposta só.

Lista **todas** as reuniões, não só as avaliadas: o que interessa ao gestor é
justamente o que ninguém gravou nem avaliou. Reunião cancelada fica de fora,
porque reunião que não aconteceu não entra na conta de avaliação.

Quem responde pela reunião é o responsável pela tarefa; só quando ela não tem
responsável vale o vendedor do negócio. É a mesma regra que decide quem pode
gravar, e a mesma que o Dashboard usa para contar reuniões realizadas — sem
isso, uma reunião conduzida por um vendedor no negócio de outro apareceria no
nome da pessoa errada.

Visibilidade (RN-037): admin e gerente veem tudo; os demais veem os negócios
em que são vendedor ou SDR — por id, não por nome. A página de Ligações compara
nomes em texto, o que erra com homônimo e nome composto.
"""
import math
from datetime import date, datetime, time
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, or_
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_current_active_user, get_db
from app.models.card import Card
from app.models.card_task import CardTask
from app.models.meeting_evaluation import MeetingEvaluation
from app.models.user import User
from app.services.reunioes.tipos import TIPOS, tipo_por_id

router = APIRouter()

# Critério "próximo passo com compromisso" — o ponto mais fraco do time hoje
CRITERIO_PROXIMO_PASSO = "F6"

TAMANHO_PADRAO = 20

SEM_VINCULO = "sem"

BLOCOS = ("Abertura", "Diagnóstico", "Demonstração", "Fechamento")


def _quando(task: CardTask):
    """A data em que a reunião aconteceu, ou a que estava marcada."""
    return task.meeting_ended_at or task.due_date


def _responsavel(task: CardTask) -> Optional[User]:
    """Quem conduziu a reunião: o responsável pela tarefa, ou o vendedor do negócio."""
    if task.assigned_to:
        return task.assigned_to
    return task.card.assigned_to if task.card else None


def _tipo(task: CardTask) -> str:
    """Onde a reunião aconteceu, como aparece na lista."""
    if task.meeting_provider == "daily":
        return "CRM"
    if task.teams_meeting_id or task.teams_join_url:
        return "Teams"
    return "—"


def _selo(task: CardTask, avaliacao: Optional[MeetingEvaluation]) -> str:
    if task.is_noshow:
        return "no-show"
    if avaliacao:
        return "avaliada"
    if task.recording_status == "ready" or task.transcript_raw:
        return "gravada"
    return "sem gravação"


def _agrupar(reunioes: list, pessoa_da_reuniao, rotulo: str) -> list:
    """
    Quantidade, score médio e média por bloco de cada pessoa.

    `pessoa_da_reuniao` devolve o User daquela reunião (o responsável, ou o
    SDR do negócio) — assim o mesmo cálculo serve para os dois quadros.
    """
    agrupado = {}
    for t in reunioes:
        pessoa = pessoa_da_reuniao(t)
        nome = pessoa.name if pessoa else f"(sem {rotulo})"
        linha = agrupado.setdefault(
            nome, {rotulo: nome, "reunioes": 0, "scores": [], "blocos": {}}
        )
        linha["reunioes"] += 1
        if t.evaluation and t.evaluation.score is not None:
            linha["scores"].append(t.evaluation.score)
            for bloco, media in (t.evaluation.medias_por_bloco or {}).items():
                linha["blocos"].setdefault(bloco, []).append(media)

    linhas = [
        {
            rotulo: linha[rotulo],
            "reunioes": linha["reunioes"],
            "score_medio": (
                round(sum(linha["scores"]) / len(linha["scores"]), 1)
                if linha["scores"]
                else None
            ),
            "media_por_bloco": {
                bloco: round(sum(v) / len(v), 1) for bloco, v in linha["blocos"].items()
            },
        }
        for linha in agrupado.values()
    ]
    linhas.sort(key=lambda linha: linha["reunioes"], reverse=True)
    return linhas


@router.get(
    "",
    summary="Reuniões e indicadores",
    description="""
    Lista as reuniões do período com os indicadores do topo da página.

    Os indicadores valem para o período inteiro, não só para a página atual.
    """,
)
def listar_reunioes(
    page: int = 1,
    page_size: int = TAMANHO_PADRAO,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    vendedor: Optional[str] = Query(
        None, description="Id do responsável, ou 'sem' para reuniões sem responsável"
    ),
    sdr: Optional[str] = Query(
        None, description="Id do SDR do negócio, ou 'sem' para negócios sem SDR"
    ),
    veredito: Optional[str] = None,
    tipo_reuniao: Optional[str] = Query(
        None, description="Id do tipo da reunião, ou 'sem' para reuniões sem tipo"
    ),
    canal: Optional[str] = Query(
        None, description="Canal de aquisição do negócio, ou 'sem' para os sem canal"
    ),
    estado: Optional[str] = Query(
        None, pattern="^(todas|sem_gravacao|avaliadas|nao_avaliadas)$"
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    role = current_user.role.name if current_user.role else ""
    e_gestor = role in ("admin", "manager")

    # A data que vale é a que a lista mostra: a reunião aconteceu, ou a que
    # estava marcada. Filtrar só por `due_date` escondia reunião realizada cujo
    # agendamento ficou com data de outro dia.
    data_da_reuniao = func.coalesce(CardTask.meeting_ended_at, CardTask.due_date)

    consulta = (
        db.query(CardTask)
        .join(Card, Card.id == CardTask.card_id)
        .outerjoin(MeetingEvaluation, MeetingEvaluation.card_task_id == CardTask.id)
        .options(
            joinedload(CardTask.assigned_to),
            joinedload(CardTask.card).joinedload(Card.assigned_to),
            joinedload(CardTask.card).joinedload(Card.sdr),
            joinedload(CardTask.evaluation).joinedload(MeetingEvaluation.itens),
        )
        .filter(CardTask.task_type == "meeting")
        .filter(CardTask.is_cancelled.is_(False))
    )

    if not e_gestor:
        consulta = consulta.filter(
            or_(
                Card.assigned_to_id == current_user.id,
                Card.sdr_id == current_user.id,
                CardTask.assigned_to_id == current_user.id,
            )
        )

    if date_from:
        consulta = consulta.filter(data_da_reuniao >= datetime.combine(date_from, time.min))
    if date_to:
        consulta = consulta.filter(data_da_reuniao <= datetime.combine(date_to, time.max))

    # Quem tem reunião no período — levantado ANTES dos filtros de pessoa,
    # senão escolher alguém apagaria os outros do seletor e o gestor ficaria
    # preso naquele nome.
    vendedores = []
    sdrs = []
    canais = []
    do_periodo = consulta.all() if e_gestor else []
    if e_gestor:
        vistos_vendedor = {}
        vistos_sdr = {}
        vistos_canal = set()
        for t in do_periodo:
            responsavel = _responsavel(t)
            if responsavel:
                vistos_vendedor[responsavel.id] = responsavel.name
            if t.card and t.card.sdr:
                vistos_sdr[t.card.sdr.id] = t.card.sdr.name
            if t.card and (t.card.acquisition_channel or "").strip():
                vistos_canal.add(t.card.acquisition_channel.strip())
        canais = sorted(vistos_canal)
        vendedores = [
            {"id": i, "nome": nome}
            for i, nome in sorted(vistos_vendedor.items(), key=lambda x: x[1])
        ]
        sdrs = [
            {"id": i, "nome": nome}
            for i, nome in sorted(vistos_sdr.items(), key=lambda x: x[1])
        ]

    if e_gestor and vendedor:
        if vendedor == SEM_VINCULO:
            consulta = consulta.filter(
                CardTask.assigned_to_id.is_(None), Card.assigned_to_id.is_(None)
            )
        elif vendedor.isdigit():
            alvo = int(vendedor)
            # Responsável pela tarefa; sem responsável, o vendedor do negócio
            consulta = consulta.filter(
                or_(
                    CardTask.assigned_to_id == alvo,
                    (CardTask.assigned_to_id.is_(None)) & (Card.assigned_to_id == alvo),
                )
            )

    # O SDR agenda a reunião e acompanha; filtrar por ele mostra o que a
    # pré-venda colocou de pé, que é uma leitura diferente da do vendedor.
    if e_gestor and sdr:
        if sdr == SEM_VINCULO:
            consulta = consulta.filter(Card.sdr_id.is_(None))
        elif sdr.isdigit():
            consulta = consulta.filter(Card.sdr_id == int(sdr))

    if veredito:
        consulta = consulta.filter(MeetingEvaluation.veredito == veredito)

    if tipo_reuniao == SEM_VINCULO:
        consulta = consulta.filter(CardTask.meeting_kind.is_(None))
    elif tipo_reuniao:
        consulta = consulta.filter(CardTask.meeting_kind == tipo_reuniao)

    # De onde veio o negócio. É a leitura que liga a reunião ao marketing:
    # quais canais trazem conversa que anda.
    if canal == SEM_VINCULO:
        consulta = consulta.filter(
            or_(Card.acquisition_channel.is_(None), Card.acquisition_channel == "")
        )
    elif canal:
        consulta = consulta.filter(Card.acquisition_channel == canal)

    if estado == "avaliadas":
        consulta = consulta.filter(MeetingEvaluation.id.isnot(None))
    elif estado == "nao_avaliadas":
        consulta = consulta.filter(MeetingEvaluation.id.is_(None))
    elif estado == "sem_gravacao":
        consulta = consulta.filter(CardTask.transcript_raw.is_(None))

    todas = consulta.all()
    total = len(todas)

    avaliadas = [t for t in todas if t.evaluation]
    comparaveis = [t for t in avaliadas if t.evaluation.score is not None]

    score_medio = (
        round(sum(t.evaluation.score for t in comparaveis) / len(comparaveis), 1)
        if comparaveis
        else None
    )

    por_veredito = {}
    for t in avaliadas:
        chave = t.evaluation.veredito or "sem veredito"
        por_veredito[chave] = por_veredito.get(chave, 0) + 1

    somas_por_bloco = {}
    for t in avaliadas:
        for bloco, media in (t.evaluation.medias_por_bloco or {}).items():
            somas_por_bloco.setdefault(bloco, []).append(media)
    media_por_bloco = {
        bloco: round(sum(v) / len(v), 1) for bloco, v in somas_por_bloco.items() if v
    }

    com_proximo_passo = sum(
        1
        for t in avaliadas
        if any(
            i.criterio_id == CRITERIO_PROXIMO_PASSO and (i.nota or 0) >= 1
            for i in t.evaluation.itens
        )
    )

    por_vendedor = _agrupar(todas, _responsavel, "vendedor") if e_gestor else []
    por_sdr = (
        _agrupar(todas, lambda t: t.card.sdr if t.card else None, "sdr") if e_gestor else []
    )

    ordenadas = sorted(todas, key=lambda t: _quando(t) or datetime.min, reverse=True)
    pagina = ordenadas[(page - 1) * page_size : page * page_size]

    items = []
    for t in pagina:
        responsavel = _responsavel(t)
        items.append({
            "task_id": t.id,
            "card_id": t.card_id,
            "titulo": t.title,
            "cliente": t.card.title if t.card else None,
            "vendedor": responsavel.name if responsavel else None,
            "sdr": t.card.sdr.name if t.card and t.card.sdr else None,
            "tipo": _tipo(t),
            "canal": (t.card.acquisition_channel or None) if t.card else None,
            "tipo_reuniao": t.meeting_kind,
            "tipo_reuniao_rotulo": (
                tipo_por_id(t.meeting_kind).rotulo if tipo_por_id(t.meeting_kind) else None
            ),
            "quando": _quando(t),
            "duracao_minutos": (
                int((t.meeting_ended_at - t.meeting_started_at).total_seconds() / 60)
                if t.meeting_started_at and t.meeting_ended_at
                else None
            ),
            "avaliada": t.evaluation is not None,
            "selo": _selo(t, t.evaluation),
            "score": t.evaluation.score if t.evaluation else None,
            "veredito": t.evaluation.veredito if t.evaluation else None,
        })

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": max(1, math.ceil(total / page_size)),
        "score_medio": score_medio,
        "por_veredito": por_veredito,
        "media_por_bloco": media_por_bloco,
        "percentual_avaliadas": round(len(avaliadas) / total * 100, 1) if total else 0.0,
        "percentual_proximo_passo": (
            round(com_proximo_passo / len(avaliadas) * 100, 1) if avaliadas else 0.0
        ),
        "por_vendedor": por_vendedor,
        "por_sdr": por_sdr,
        "vendedores": vendedores,
        "sdrs": sdrs,
        "tipos_de_reuniao": [{"id": tipo.id, "rotulo": tipo.rotulo} for tipo in TIPOS],
        "canais": canais,
    }
