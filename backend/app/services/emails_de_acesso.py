"""Textos dos e-mails de acesso: Convite e Redefinir senha (HTML simples e texto puro)."""
from datetime import datetime
from html import escape
from typing import Tuple


def _moldura(titulo: str, corpo: str) -> str:
    return f"""<!doctype html><html><body style="font-family:Arial,sans-serif;background:#f4f6f8;padding:24px">
<div style="max-width:560px;margin:auto;background:#fff;border-radius:8px;padding:28px">
<h2 style="color:#0f172a;margin-top:0">{escape(titulo)}</h2>{corpo}
<p style="color:#94a3b8;font-size:12px;margin-top:32px">Health &amp; Safety · HSGrowth CRM</p>
</div></body></html>"""


def _botao(link: str, texto: str) -> str:
    return (f'<p style="margin:28px 0"><a href="{escape(link)}" style="background:#059669;color:#fff;'
            f'padding:12px 22px;border-radius:6px;text-decoration:none">{escape(texto)}</a></p>'
            f'<p style="color:#64748b;font-size:13px">Se o botão não abrir, copie este endereço no navegador:<br>'
            f'{escape(link)}</p>')


def convite(nome: str, quem_convidou: str, link: str, expira_em: datetime) -> Tuple[str, str, str]:
    """(assunto, html, texto)"""
    validade = expira_em.strftime("%d/%m/%Y")
    assunto = "Seu acesso ao HSGrowth CRM"
    html = _moldura("Você foi convidado para o HSGrowth CRM", (
        f"<p>Olá, {escape(nome)}.</p>"
        f"<p>{escape(quem_convidou)} criou o seu acesso ao CRM da Health &amp; Safety. "
        f"Clique no botão para criar a sua senha.</p>"
        + _botao(link, "Criar minha senha")
        + f"<p>O link vale até {validade} e só pode ser usado uma vez.</p>"
          "<p>Se você não esperava este e-mail, pode ignorar.</p>"))
    texto = (f"Olá, {nome}.\n{quem_convidou} criou o seu acesso ao HSGrowth CRM.\n"
             f"Crie a sua senha em: {link}\nO link vale até {validade} e só pode ser usado uma vez.")
    return assunto, html, texto


def redefinir(nome: str, link: str) -> Tuple[str, str, str]:
    assunto = "Redefinir sua senha do HSGrowth CRM"
    html = _moldura("Redefinir senha", (
        f"<p>Olá, {escape(nome)}.</p><p>Recebemos um pedido para redefinir a sua senha.</p>"
        + _botao(link, "Criar nova senha")
        + "<p>O link vale por 1 hora. Se não foi você, ignore este e-mail: a senha atual continua valendo.</p>"))
    texto = f"Olá, {nome}.\nPara criar uma nova senha, acesse: {link}\nO link vale por 1 hora."
    return assunto, html, texto
