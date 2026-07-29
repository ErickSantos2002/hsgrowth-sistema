"""A task Celery que avisa o Ganho ao GestorHS."""
from app.workers.tasks import notificar_ganho_gestorhs


def test_chama_o_cliente_com_os_argumentos(monkeypatch):
    capturado = {}
    monkeypatch.setattr(
        "app.integrations.gestorhs_client.mover_caixa_ganho",
        lambda caixa_id, numero_proposta, observacao: capturado.update(
            caixa_id=caixa_id, numero_proposta=numero_proposta, observacao=observacao
        ),
    )
    # .run() executa o corpo da task de forma síncrona (sem broker).
    notificar_ganho_gestorhs.run("42", 123, "Ganho - card #7")
    assert capturado == {"caixa_id": "42", "numero_proposta": 123, "observacao": "Ganho - card #7"}
