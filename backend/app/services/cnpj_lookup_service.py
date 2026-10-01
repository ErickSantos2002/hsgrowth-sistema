"""
Consulta de CNPJ com fontes reserva: BrasilAPI → OpenCNPJ → ReceitaWS.

A BrasilAPI é a fonte principal (gratuita, sem limite fixo publicado). Quando ela cai
— aconteceu em out/2026, respondendo 500/504 após ~10 s — tentamos a OpenCNPJ (também
sem limite fixo publicado) e, por último, a ReceitaWS (grátis: 3 consultas/minuto para
o servidor inteiro, e só CNPJs que já estão no cache dela).

As respostas das reservas são convertidas para o formato da BrasilAPI, que é o que a
tela de cliente consome (razao_social, nome_fantasia, email, ddd_telefone_1,
cnae_fiscal, logradouro, numero, complemento, bairro, cep, municipio, uf). O campo
`fonte` diz de onde vieram os dados.
"""
import re
from typing import Awaitable, Callable, List, Optional, Tuple

import httpx


class FonteIndisponivel(Exception):
    """A fonte não respondeu, deu erro ou limitou a consulta — tentar a próxima."""


def _digits(s) -> str:
    return re.sub(r"\D", "", str(s or ""))


def _txt(s) -> str:
    return " ".join(str(s or "").split())  # tira espaços sobrando (OpenCNPJ traz "   APTO")


# ─── Fontes ──────────────────────────────────────────────────────────────────────
# Cada uma devolve o dict no formato BrasilAPI, None se o CNPJ não existe nela,
# ou levanta FonteIndisponivel.

async def _brasilapi(client: httpx.AsyncClient, cnpj: str) -> Optional[dict]:
    try:
        r = await client.get(f"https://brasilapi.com.br/api/cnpj/v1/{cnpj}", timeout=6.0)
    except httpx.HTTPError as e:
        raise FonteIndisponivel(f"BrasilAPI: {e.__class__.__name__}") from e
    if r.status_code == 404:
        return None
    if r.status_code != 200:
        raise FonteIndisponivel(f"BrasilAPI: HTTP {r.status_code}")
    return r.json()


async def _opencnpj(client: httpx.AsyncClient, cnpj: str) -> Optional[dict]:
    try:
        r = await client.get(f"https://api.opencnpj.org/{cnpj}", timeout=6.0)
    except httpx.HTTPError as e:
        raise FonteIndisponivel(f"OpenCNPJ: {e.__class__.__name__}") from e
    if r.status_code == 404:
        return None
    if r.status_code != 200:
        raise FonteIndisponivel(f"OpenCNPJ: HTTP {r.status_code}")
    return normalizar_opencnpj(r.json())


async def _receitaws(client: httpx.AsyncClient, cnpj: str) -> Optional[dict]:
    try:
        r = await client.get(f"https://receitaws.com.br/v1/cnpj/{cnpj}", timeout=8.0)
    except httpx.HTTPError as e:
        raise FonteIndisponivel(f"ReceitaWS: {e.__class__.__name__}") from e
    if r.status_code == 429:
        raise FonteIndisponivel("ReceitaWS: limite de 3 consultas/minuto")
    if r.status_code != 200:
        raise FonteIndisponivel(f"ReceitaWS: HTTP {r.status_code}")
    data = r.json()
    if str(data.get("status", "")).upper() == "ERROR":
        # "CNPJ inválido" / "não está no cache" → para nós, não encontrado nesta fonte
        return None
    return normalizar_receitaws(data)


def normalizar_opencnpj(o: dict) -> dict:
    tel = (o.get("telefones") or [{}])[0] or {}
    logradouro = " ".join(p for p in (_txt(o.get("tipo_logradouro")), _txt(o.get("logradouro"))) if p)
    return {
        "cnpj": _digits(o.get("cnpj")),
        "razao_social": _txt(o.get("razao_social")),
        "nome_fantasia": _txt(o.get("nome_fantasia")),
        "email": _txt(o.get("email")).lower() or None,
        "ddd_telefone_1": _digits(f"{tel.get('ddd') or ''}{tel.get('numero') or ''}"),
        "cnae_fiscal": _digits(o.get("cnae_principal")) or None,
        "logradouro": logradouro,
        "numero": _txt(o.get("numero")),
        "complemento": _txt(o.get("complemento")),
        "bairro": _txt(o.get("bairro")),
        "cep": _digits(o.get("cep")),
        "municipio": _txt(o.get("municipio")),
        "uf": _txt(o.get("uf")),
        "descricao_situacao_cadastral": _txt(o.get("situacao_cadastral")),
    }


def normalizar_receitaws(r: dict) -> dict:
    principal = (r.get("atividade_principal") or [{}])[0] or {}
    # telefone vem como "(11) 4007-1507" ou vários separados por "/"
    primeiro_tel = str(r.get("telefone") or "").split("/")[0]
    return {
        "cnpj": _digits(r.get("cnpj")),
        "razao_social": _txt(r.get("nome")),
        "nome_fantasia": _txt(r.get("fantasia")),
        "email": _txt(r.get("email")).lower() or None,
        "ddd_telefone_1": _digits(primeiro_tel),
        "cnae_fiscal": _digits(principal.get("code")) or None,
        "logradouro": _txt(r.get("logradouro")),
        "numero": _txt(r.get("numero")),
        "complemento": _txt(r.get("complemento")),
        "bairro": _txt(r.get("bairro")),
        "cep": _digits(r.get("cep")),
        "municipio": _txt(r.get("municipio")),
        "uf": _txt(r.get("uf")),
        "descricao_situacao_cadastral": _txt(r.get("situacao")),
    }


Fonte = Tuple[str, Callable[[httpx.AsyncClient, str], Awaitable[Optional[dict]]]]

# Ordem de tentativa (decidida com o usuário em 01/10/2026).
FONTES: List[Fonte] = [
    ("BrasilAPI", _brasilapi),
    ("OpenCNPJ", _opencnpj),
    ("ReceitaWS", _receitaws),
]


class CnpjNaoEncontrado(Exception):
    pass


class ConsultaIndisponivel(Exception):
    pass


async def consultar_cnpj(cnpj: str, fontes: Optional[List[Fonte]] = None) -> dict:
    """Consulta o CNPJ na primeira fonte que responder.

    - Achou: devolve o dict (formato BrasilAPI) + `fonte`.
    - Alguma fonte respondeu "não existe" e nenhuma achou: CnpjNaoEncontrado.
    - Todas indisponíveis: ConsultaIndisponivel.
    """
    fontes = fontes if fontes is not None else FONTES
    alguma_respondeu = False
    falhas: List[str] = []
    async with httpx.AsyncClient() as client:
        for nome, buscar in fontes:
            try:
                dados = await buscar(client, cnpj)
            except FonteIndisponivel as e:
                falhas.append(str(e))
                continue
            alguma_respondeu = True
            if dados:
                return {**dados, "fonte": nome}
    if alguma_respondeu:
        raise CnpjNaoEncontrado()
    raise ConsultaIndisponivel("; ".join(falhas))
