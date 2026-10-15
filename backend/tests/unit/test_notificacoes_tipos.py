"""O catálogo é a fonte única: notificar() e a tela de Configurações leem dele."""
from app.models.user_notification_setting import UserNotificationSetting
from app.services.notificacoes.tipos import TIPOS, tipo_por_id


def test_ids_unicos():
    ids = [t.id for t in TIPOS]
    assert len(ids) == len(set(ids))


def test_obrigatorios_visiveis_sao_lead_e_card_atribuido():
    """Decisão de 14/10: os dois que deixam o cliente esperando se ignorados."""
    assert {t.id for t in TIPOS if t.obrigatorio and t.visivel} == {"lead_site", "card_atribuido"}


def test_obrigatorio_nao_tem_coluna_de_preferencia():
    assert all(t.coluna is None for t in TIPOS if t.obrigatorio)


def test_toda_coluna_existe_no_modelo():
    for t in TIPOS:
        if t.coluna:
            assert hasattr(UserNotificationSetting, t.coluna), t.id


def test_tipo_desconhecido():
    assert tipo_por_id("card_overdue") is None
    assert tipo_por_id("lead_site").rotulo == "Novo lead do site"
