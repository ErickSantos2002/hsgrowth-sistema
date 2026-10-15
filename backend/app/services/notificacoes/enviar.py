"""
O único caminho para criar notificação.

Até 14/10/2026 cada serviço gravava direto no banco, e cada um esquecia uma
regra diferente: o "Card atribuído" avisava a pessoa da própria ação, e
nenhum consultava as preferências. Aqui as regras moram num lugar só.
"""
from typing import Optional

from sqlalchemy.orm import Session

from app.models.notification import Notification
from app.models.user import User
from app.models.user_notification_setting import UserNotificationSetting
from app.services.notificacoes.tipos import tipo_por_id


def notificar(
    db: Session,
    destinatario_id: Optional[int],
    tipo: str,
    titulo: str,
    mensagem: str,
    link: Optional[str] = None,
    metadata: Optional[dict] = None,
    autor_id: Optional[int] = None,
    referencia: Optional[str] = None,
) -> Optional[Notification]:
    """
    Cria o aviso se as regras deixarem, nesta ordem:

    1. quem fez a ação é o próprio destinatário → não avisa;
    2. destinatário inativo ou excluído → não avisa;
    3. tipo obrigatório → avisa;
    4. preferência do tipo desligada → não avisa;
    5. já existe aviso desse tipo com a mesma `referencia` → não avisa.

    Nunca levanta por falha de banco: quem chama está no meio de uma ação que
    já deu certo (criar card, salvar tarefa) e não pode perdê-la por causa do
    aviso. Tipo fora do catálogo levanta — é erro de programação.

    Returns:
        A notificação criada, ou None quando não avisou.
    """
    info = tipo_por_id(tipo)
    if info is None:
        raise ValueError(f"Tipo de aviso fora do catálogo: {tipo}")

    if not destinatario_id:
        return None
    if autor_id is not None and autor_id == destinatario_id:
        return None

    try:
        destinatario = db.query(User).filter(User.id == destinatario_id).first()
        if not destinatario or not destinatario.is_active or destinatario.is_deleted:
            return None

        if not info.obrigatorio and info.coluna:
            preferencia = (
                db.query(UserNotificationSetting)
                .filter(UserNotificationSetting.user_id == destinatario_id)
                .first()
            )
            if preferencia is not None and not getattr(preferencia, info.coluna):
                return None

        if referencia and (
            db.query(Notification.id)
            .filter(
                Notification.user_id == destinatario_id,
                Notification.notification_type == tipo,
                Notification.referencia == referencia,
            )
            .first()
        ):
            return None

        dados = dict(metadata or {})
        if link:
            dados["url"] = link

        aviso = Notification(
            user_id=destinatario_id,
            notification_type=tipo,
            title=titulo[:255],
            message=mensagem,
            icon=info.icone,
            color=info.cor,
            notification_metadata=dados,
            referencia=referencia,
        )
        db.add(aviso)
        db.commit()
        db.refresh(aviso)
        return aviso
    except Exception as e:
        db.rollback()
        print(f"[NOTIFICACAO] Falha ao avisar usuário {destinatario_id} ({tipo}): {e}")
        return None
