"""Consulta de CNPJ com reservas: BrasilAPI → OpenCNPJ → ReceitaWS (sem internet)."""
import pytest

from app.services.cnpj_lookup_service import (
    CnpjNaoEncontrado,
    ConsultaIndisponivel,
    FonteIndisponivel,
    consultar_cnpj,
    normalizar_opencnpj,
    normalizar_receitaws,
)

CNPJ = "08857492000148"


def _fonte(resultado, chamadas, nome):
    """Fonte falsa: dict (achou), None (não existe) ou Exception (indisponível)."""
    async def buscar(client, cnpj):
        chamadas.append(nome)
        if isinstance(resultado, Exception):
            raise resultado
        return resultado
    return (nome, buscar)


async def test_usa_a_primeira_que_responde_e_nao_chama_as_demais():
    chamadas = []
    r = await consultar_cnpj(CNPJ, [
        _fonte({"razao_social": "A"}, chamadas, "BrasilAPI"),
        _fonte({"razao_social": "B"}, chamadas, "OpenCNPJ"),
    ])
    assert r["razao_social"] == "A" and r["fonte"] == "BrasilAPI"
    assert chamadas == ["BrasilAPI"]


async def test_brasilapi_fora_do_ar_cai_na_opencnpj():
    chamadas = []
    r = await consultar_cnpj(CNPJ, [
        _fonte(FonteIndisponivel("504"), chamadas, "BrasilAPI"),
        _fonte({"razao_social": "B"}, chamadas, "OpenCNPJ"),
        _fonte({"razao_social": "C"}, chamadas, "ReceitaWS"),
    ])
    assert r["fonte"] == "OpenCNPJ"
    assert chamadas == ["BrasilAPI", "OpenCNPJ"]


async def test_duas_fora_do_ar_cai_na_receitaws():
    r = await consultar_cnpj(CNPJ, [
        _fonte(FonteIndisponivel("504"), [], "BrasilAPI"),
        _fonte(FonteIndisponivel("500"), [], "OpenCNPJ"),
        _fonte({"razao_social": "C"}, [], "ReceitaWS"),
    ])
    assert r["fonte"] == "ReceitaWS"


async def test_nao_encontrado_numa_fonte_tenta_a_proxima():
    r = await consultar_cnpj(CNPJ, [
        _fonte(None, [], "BrasilAPI"),
        _fonte({"razao_social": "B"}, [], "OpenCNPJ"),
    ])
    assert r["fonte"] == "OpenCNPJ"


async def test_ninguem_acha_e_alguma_respondeu_vira_nao_encontrado():
    with pytest.raises(CnpjNaoEncontrado):
        await consultar_cnpj(CNPJ, [
            _fonte(FonteIndisponivel("504"), [], "BrasilAPI"),
            _fonte(None, [], "OpenCNPJ"),
            _fonte(FonteIndisponivel("429"), [], "ReceitaWS"),
        ])


async def test_todas_fora_do_ar_vira_indisponivel():
    with pytest.raises(ConsultaIndisponivel):
        await consultar_cnpj(CNPJ, [
            _fonte(FonteIndisponivel("504"), [], "BrasilAPI"),
            _fonte(FonteIndisponivel("500"), [], "OpenCNPJ"),
            _fonte(FonteIndisponivel("429"), [], "ReceitaWS"),
        ])


def test_normaliza_opencnpj_para_o_formato_da_brasilapi():
    # Amostra real (resumida) de api.opencnpj.org
    d = normalizar_opencnpj({
        "cnpj": "08857492000148", "razao_social": "HEALTH & SAFETY LTDA", "nome_fantasia": "HEALTHTECH",
        "cnae_principal": "4669999", "tipo_logradouro": "RUA", "logradouro": "VIS DO LIVRAMENTO",
        "numero": "54", "complemento": "      APTO 000G SALA G", "bairro": "DERBY", "cep": "52010065",
        "municipio": "RECIFE", "uf": "PE", "email": "NP@HEALTHSAFETY.COM.BR",
        "telefones": [{"ddd": "11", "numero": "40071507", "is_fax": False}],
    })
    assert d["razao_social"] == "HEALTH & SAFETY LTDA"
    assert d["ddd_telefone_1"] == "1140071507"
    assert d["cnae_fiscal"] == "4669999"
    assert d["logradouro"] == "RUA VIS DO LIVRAMENTO"
    assert d["complemento"] == "APTO 000G SALA G"
    assert d["email"] == "np@healthsafety.com.br"
    assert d["municipio"] == "RECIFE" and d["uf"] == "PE"


def test_normaliza_receitaws_para_o_formato_da_brasilapi():
    # Amostra real (resumida) de receitaws.com.br
    d = normalizar_receitaws({
        "cnpj": "08.857.492/0001-48", "nome": "HEALTH & SAFETY LTDA", "fantasia": "HEALTHTECH",
        "atividade_principal": [{"code": "46.69-9-99", "text": "Comércio atacadista..."}],
        "logradouro": "RUA VIS DO LIVRAMENTO", "numero": "54", "complemento": "APTO 000G SALA G",
        "bairro": "DERBY", "cep": "52.010-065", "municipio": "RECIFE", "uf": "PE",
        "email": "np@healthsafety.com.br", "telefone": "(11) 4007-1507 / (81) 3333-4444",
    })
    assert d["nome_fantasia"] == "HEALTHTECH"
    assert d["cnae_fiscal"] == "4669999"
    assert d["ddd_telefone_1"] == "1140071507"   # só o primeiro telefone
    assert d["cep"] == "52010065"
