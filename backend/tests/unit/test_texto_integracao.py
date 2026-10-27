"""
Anotação que chega pela integração (formulário do site via RD Station/n8n).

A mensagem vem em HTML, com `<br />` seguido de um `\\n` escrito por extenso.
O CRM grava texto limpo: quebra de linha de verdade, sem tags, link como texto.
"""
from fastapi.testclient import TestClient

from app.utils.texto_integracao import limpar_texto_da_integracao
from tests.unit.apoio_notificacoes import cabecalho, usuario


def test_br_com_barra_n_literal_vira_quebra_de_linha():
    bruto = "Prezados (as)<br />\\n<br />\\nSolicito informações e orçamento."
    assert limpar_texto_da_integracao(bruto) == "Prezados (as)\n\nSolicito informações e orçamento."


def test_variacoes_de_br_e_barra_n_sozinho():
    assert limpar_texto_da_integracao("a<br>b<BR/>c<br />d") == "a\nb\nc\nd"
    assert limpar_texto_da_integracao("linha 1\\nlinha 2\\r\\nlinha 3") == "linha 1\nlinha 2\nlinha 3"


def test_link_vira_texto_com_endereco():
    bruto = 'Veja <a href=https://exemplo.com>nosso site</a> e <a href="https://x.com/a">https://x.com/a</a>.'
    assert limpar_texto_da_integracao(bruto) == "Veja nosso site (https://exemplo.com) e https://x.com/a."


def test_outras_tags_somem_e_codigo_nao_passa():
    bruto = '<p>Olá <strong>time</strong></p><img src=x onerror=alert(1)><script>alert(2)</script>fim'
    limpo = limpar_texto_da_integracao(bruto)
    assert "<" not in limpo and "onerror" not in limpo and "alert(2)" not in limpo
    assert limpo == "Olá time\nfim"


def test_entidades_e_espacos():
    assert limpar_texto_da_integracao("A &amp; B&nbsp;Ltda  \n\n\n\nfim  ") == "A & B Ltda\n\nfim"


def test_texto_normal_nao_muda():
    texto = "📌 Lead RD Station - Origem: Google - Mensagem: Quero um orçamento"
    assert limpar_texto_da_integracao(texto) == texto


def test_texto_sem_html_fica_exatamente_igual():
    """Transcrição de ligação e texto comum: nem espaço nem linha em branco mudam."""
    transcricao = "VENDEDOR: Alô, bom dia.  \n\n\n\nCLIENTE: Bom dia. "
    assert limpar_texto_da_integracao(transcricao) == transcricao


def test_sinal_de_menor_no_texto_nao_e_tag():
    texto = "Orçamento <br />\\npara valor < 100 e prazo > 5 dias"
    assert limpar_texto_da_integracao(texto) == "Orçamento\npara valor < 100 e prazo > 5 dias"


def test_vazio():
    assert limpar_texto_da_integracao("") == ""
    assert limpar_texto_da_integracao(None) is None


# ─── Na criação da anotação ──────────────────────────────────────────────────

def test_anotacao_da_integracao_chega_limpa(client: TestClient, db, test_card):
    integracao = usuario(db, "integracao", "admin", is_integracao=True)
    r = client.post(
        "/api/v1/card-notes",
        json={"card_id": test_card.id, "content": "Oi<br />\\nTudo bem?"},
        headers=cabecalho(integracao),
    )
    assert r.status_code in (200, 201), r.text
    assert r.json()["content"] == "Oi\nTudo bem?", r.text


def test_anotacao_de_usuario_nao_e_mexida(client: TestClient, db, test_card, manager_headers):
    r = client.post(
        "/api/v1/card-notes",
        json={"card_id": test_card.id, "content": "Oi<br />\\nTudo bem?"},
        headers=manager_headers,
    )
    assert r.status_code in (200, 201), r.text
    assert r.json()["content"] == "Oi<br />\\nTudo bem?", r.text
