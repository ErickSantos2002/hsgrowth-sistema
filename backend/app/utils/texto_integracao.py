"""
Texto que chega pela integração (formulário do site via RD Station/n8n).

A mensagem do formulário vem em HTML, com `<br />` seguido de um `\\n` escrito
por extenso — na tela aparecia o "\\n" no meio do texto. E como o formulário é
público, qualquer pessoa pode mandar HTML: o CRM grava só texto.
"""
import html
import re
from typing import Optional

_SCRIPT_STYLE = re.compile(r"<(script|style)\b[^>]*>.*?</\1\s*>", re.I | re.S)
_BR = re.compile(r"<br\s*/?>[ \t]*(?:\\r)?(?:\\n)?", re.I)
_FIM_DE_BLOCO = re.compile(r"</(p|div|li|tr|h[1-6])\s*>", re.I)
_LINK = re.compile(r"<a\b[^>]*?\bhref\s*=\s*[\"']?([^\"'\s>]+)[\"']?[^>]*>(.*?)</a\s*>", re.I | re.S)
# Tag de verdade: "<" seguido de letra (ou "/", "!"). "valor < 100" não é tag.
_TAG = re.compile(r"</?[a-zA-Z!][^<>]*>")
_BARRA_N = re.compile(r"(?:\\r)?\\n")
# Sinais de que o texto veio em HTML: tag, entidade (&amp;) ou "\n" por extenso
_PARECE_HTML = re.compile(r"</?[a-zA-Z!][^<>]*>|&(?:[a-zA-Z]+|#\d+);|\\n")


def _link_como_texto(m: re.Match) -> str:
    endereco, texto = m.group(1), _TAG.sub("", m.group(2)).strip()
    if not texto or texto == endereco:
        return endereco
    return f"{texto} ({endereco})"


def limpar_texto_da_integracao(texto: Optional[str]) -> Optional[str]:
    """HTML do formulário → texto: quebras de verdade, sem tags, link como "texto (endereço)".
    Texto que não veio em HTML (ex.: transcrição de ligação) volta exatamente igual."""
    if not texto or not _PARECE_HTML.search(texto):
        return texto

    t = _SCRIPT_STYLE.sub("", texto)
    t = _BR.sub("\n", t)
    t = _FIM_DE_BLOCO.sub("\n", t)
    t = _LINK.sub(_link_como_texto, t)
    t = _TAG.sub("", t)
    t = _BARRA_N.sub("\n", t)
    t = html.unescape(t).replace("\xa0", " ")

    # Espaços no fim das linhas e no máximo uma linha em branco seguida
    t = "\n".join(linha.rstrip() for linha in t.split("\n"))
    t = re.sub(r"\n{3,}", "\n\n", t)
    return t.strip()
