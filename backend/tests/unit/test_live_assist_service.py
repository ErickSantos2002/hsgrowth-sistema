"""
Serviço da ajuda ao vivo: formato da conversa, contexto do CRM e normalização
da resposta da IA.

A IA é sempre simulada — nenhum teste gasta chamada real.
"""
import pytest
from sqlalchemy.orm import Session

from app.models.card_task import CardTask
from app.services.live_assist_service import (
    LIMITE_CONVERSA,
    MARCADORES_VALIDOS,
    formatar_conversa,
    montar_contexto_crm,
    normalizar_resposta,
)


class TestFormatoDaConversa:

    def test_marca_quem_e_time_e_quem_e_cliente(self):
        """A IA precisa saber quem falou o quê para reconhecer uma objeção."""
        falas = [
            {"papel": "time", "nome": "Miguel", "texto": "Bom dia"},
            {"papel": "cliente", "nome": "Carlos", "texto": "Bom dia, tudo bem?"},
        ]

        assert formatar_conversa(falas) == (
            "[TIME] Miguel: Bom dia\n[CLIENTE] Carlos: Bom dia, tudo bem?"
        )

    def test_ignora_fala_vazia(self):
        falas = [
            {"papel": "time", "nome": "Miguel", "texto": "   "},
            {"papel": "cliente", "nome": "Carlos", "texto": "Oi"},
        ]

        assert formatar_conversa(falas) == "[CLIENTE] Carlos: Oi"

    def test_conversa_longa_mantem_o_final(self):
        """O clique acontece por causa do que acabou de ser dito."""
        falas = [{"papel": "time", "nome": "M", "texto": "x" * 1000} for _ in range(200)]
        falas.append({"papel": "cliente", "nome": "C", "texto": "o contrato vence em outubro"})

        texto = formatar_conversa(falas)

        assert len(texto) <= LIMITE_CONVERSA
        assert "o contrato vence em outubro" in texto


class TestNormalizacao:

    def test_preenche_campos_ausentes(self):
        """A IA às vezes omite campos; a sala não pode quebrar no meio da reunião."""
        r = normalizar_resposta({"leitura": "Objeção de prazo", "fala": "Entendo."})

        assert r["pergunta"] == ""
        assert r["alertas"] == []
        assert r["fato_crm"] is None
        assert r["marcadores"] == []

    def test_corta_listas_nos_limites(self):
        r = normalizar_resposta({
            "leitura": "x",
            "fala": "y",
            "alertas": ["a", "b", "c", "d"],
            "marcadores": ["objecao_preco", "interesse_alto", "sinal_compra", "risco_perda"],
        })

        assert len(r["alertas"]) == 2
        assert len(r["marcadores"]) == 3

    def test_descarta_marcador_inventado(self):
        """Vocabulário fechado: é o que permite contar ocorrências depois."""
        r = normalizar_resposta({
            "leitura": "x",
            "fala": "y",
            "marcadores": ["objecao_preco", "cliente_simpatico"],
        })

        assert r["marcadores"] == ["objecao_preco"]
        assert all(m in MARCADORES_VALIDOS for m in r["marcadores"])

    def test_alerta_em_branco_nao_entra(self):
        r = normalizar_resposta({"leitura": "x", "fala": "y", "alertas": ["", "  ", "real"]})

        assert r["alertas"] == ["real"]


class TestContextoDoCRM:

    def _reuniao(self, db, test_card, **extras) -> CardTask:
        task = CardTask(
            card_id=test_card.id,
            title="Apresentação de proposta",
            task_type="meeting",
            meeting_provider="daily",
            **extras,
        )
        db.add(task)
        db.commit()
        db.refresh(task)
        return task

    def test_inclui_a_pauta_da_reuniao(self, db: Session, test_card):
        task = self._reuniao(db, test_card, description="Confirmar prazo e quem decide")

        assert "Confirmar prazo e quem decide" in montar_contexto_crm(db, task)

    def test_inclui_valor_e_produtos_do_negocio(self, db: Session, test_card):
        from app.models.card_product import CardProduct
        from app.models.product import Product

        produto = Product(name="Bafômetro automatizado", unit_price=12000, is_active=True)
        db.add(produto)
        db.commit()
        db.add(CardProduct(
            card_id=test_card.id, product_id=produto.id,
            quantity=2, unit_price=12000, discount=0,
        ))
        test_card.value = 24000
        db.commit()

        contexto = montar_contexto_crm(db, self._reuniao(db, test_card))

        assert "Bafômetro automatizado" in contexto
        assert "24000" in contexto.replace(".00", "")

    def test_nao_inclui_o_catalogo(self, db: Session, test_card):
        """Decisão do cliente: a IA só cita valores que já estão no negócio."""
        from app.models.product import Product

        db.add(Product(name="Produto fora do negocio", unit_price=999, is_active=True))
        db.commit()

        assert "Produto fora do negocio" not in montar_contexto_crm(
            db, self._reuniao(db, test_card)
        )

    def test_inclui_reunioes_anteriores(self, db: Session, test_card):
        """O histórico é o que separa uma sugestão específica de um conselho genérico."""
        import json

        anterior = CardTask(
            card_id=test_card.id,
            title="Primeira conversa",
            task_type="meeting",
            meeting_provider="daily",
            transcript_analysis=json.dumps({
                "resumo": "Cliente usa bafômetro manual hoje",
                "proximos_passos": ["Enviar proposta"],
            }, ensure_ascii=False),
        )
        db.add(anterior)
        db.commit()

        contexto = montar_contexto_crm(db, self._reuniao(db, test_card))

        assert "bafômetro manual" in contexto
        assert "Enviar proposta" in contexto

    def test_analise_ilegivel_nao_quebra(self, db: Session, test_card):
        """Análise antiga em formato estranho não pode derrubar a ajuda ao vivo."""
        anterior = CardTask(
            card_id=test_card.id, title="Conversa antiga", task_type="meeting",
            meeting_provider="daily", transcript_analysis="isto não é json",
        )
        db.add(anterior)
        db.commit()

        montar_contexto_crm(db, self._reuniao(db, test_card))  # não levanta


class TestRespostaEmFormatoInesperado:
    """
    O modelo nem sempre devolve string onde pedimos string.

    Na homologação de 17/09 o primeiro pedido funcionou e os seguintes
    devolveram 502 ('list' object has no attribute 'strip') — no meio da
    reunião, que é o pior momento possível.
    """

    def test_campo_que_veio_como_lista_vira_texto(self):
        dados = normalizar_resposta({
            "leitura": ["O cliente hesitou", "e mudou de assunto"],
            "fala": "Faz sentido?",
            "pergunta": ["Quem mais decide?", "Qual o prazo?"],
        })

        assert dados["leitura"] == "O cliente hesitou e mudou de assunto"
        assert dados["pergunta"] == "Quem mais decide? Qual o prazo?"

    def test_alerta_solto_vale_como_lista(self):
        dados = normalizar_resposta({"alertas": "Não ficou claro quem decide"})

        assert dados["alertas"] == ["Não ficou claro quem decide"]

    def test_marcador_solto_vale_como_lista(self):
        dados = normalizar_resposta({"marcadores": "objecao_prazo"})

        assert dados["marcadores"] == ["objecao_prazo"]

    def test_marcador_inventado_continua_fora(self):
        dados = normalizar_resposta({"marcadores": ["objecao_prazo", "inventado"]})

        assert dados["marcadores"] == ["objecao_prazo"]

    def test_fato_crm_em_lista_vira_texto(self):
        dados = normalizar_resposta({"fato_crm": ["Proposta enviada em 10/09"]})

        assert dados["fato_crm"] == "Proposta enviada em 10/09"

    def test_resposta_vazia_nao_quebra(self):
        dados = normalizar_resposta({})

        assert dados["leitura"] == ""
        assert dados["alertas"] == []
        assert dados["fato_crm"] is None
