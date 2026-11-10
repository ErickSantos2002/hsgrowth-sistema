"""
Ponto único de envio de e-mail do CRM (convite, redefinir senha).

Quem chama não sabe qual provedor está ligado: troque em settings.EMAIL_PROVIDER.
Nunca levanta exceção: devolve False se não enviou (a tela oferece "Copiar link").
"""
import logging
from typing import Callable, Dict, Optional

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

Provedor = Callable[[str, str, str, Optional[str]], None]


def _smtp(para: str, assunto: str, html: str, texto: Optional[str]) -> None:
    from app.services.email_service import EmailService
    if not EmailService()._send_email(para, assunto, html, texto):
        raise RuntimeError("SMTP não enviou (veja o log do EmailService)")


def _resend(para: str, assunto: str, html: str, texto: Optional[str]) -> None:
    if not settings.RESEND_API_KEY:
        raise RuntimeError("RESEND_API_KEY não configurada")
    corpo = {"from": settings.EMAIL_FROM, "to": [para], "subject": assunto, "html": html}
    if texto:
        corpo["text"] = texto
    resp = httpx.post(
        "https://api.resend.com/emails",
        headers={"Authorization": f"Bearer {settings.RESEND_API_KEY}"},
        json=corpo,
        timeout=10,
    )
    if resp.status_code >= 400:
        raise RuntimeError(f"Resend recusou o envio ({resp.status_code}): {resp.text}")


_PROVEDORES: Dict[str, Provedor] = {
    "smtp": _smtp,
    "resend": _resend,
}


def enviar_email(para: str, assunto: str, html: str, texto: Optional[str] = None) -> bool:
    provedor = _PROVEDORES.get((settings.EMAIL_PROVIDER or "").strip().lower())
    if provedor is None:
        logger.warning(f"[E-MAIL NÃO ENVIADO] sem provedor configurado. Para: {para} | {assunto}")
        return False
    try:
        provedor(para, assunto, html, texto)
        return True
    except Exception:
        logger.exception(f"Falha ao enviar e-mail para {para} ({assunto})")
        return False
