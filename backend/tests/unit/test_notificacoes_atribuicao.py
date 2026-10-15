"""
Lead do site sai como aviso próprio, uma vez só.

Os leads do site entram pelo usuário "integracao" e vão justamente para quem
não lia o sino (14/10: Gislayne, Adriana e Eduardo com 0% de leitura). Com o
mesmo título genérico de "Card atribuído", sumiam no meio do resto.
"""
from app.models.card import Card
from app.services.notificacoes.atribuicao import avisar_atribuicao, e_lead_do_site
from tests.unit.apoio_notificacoes import avisos, usuario


def _card(db, lista, criador=None, **kw):
    c = Card(title="Lead RD Station - Marcelo", list_id=lista.id, position=0,
             created_by_id=criador.id if criador else None, **kw)
    db.add(c)
    db.commit()
    db.refresh(c)
    return c


def test_card_da_integracao_e_lead(db, test_lists):
    integ = usuario(db, "integracao", "manager", is_integracao=True)
    assert e_lead_do_site(db, _card(db, test_lists[0], integ)) is True


def test_card_de_pessoa_nao_e_lead(db, test_lists, test_salesperson_user):
    assert e_lead_do_site(db, _card(db, test_lists[0], test_salesperson_user)) is False


def test_card_antigo_sem_criador_nao_e_lead(db, test_lists):
    assert e_lead_do_site(db, _card(db, test_lists[0])) is False


def test_vendedor_do_lead_recebe_lead_site(db, test_lists, test_salesperson_user):
    integ = usuario(db, "integracao", "manager", is_integracao=True)
    card = _card(db, test_lists[0], integ, origin="Contato pelo Site")

    avisar_atribuicao(db, card, test_salesperson_user.id, "vendedor", autor_id=None)

    [aviso] = avisos(db, test_salesperson_user.id)
    assert aviso.notification_type == "lead_site"
    assert aviso.title == "Novo lead do site: Lead RD Station - Marcelo"
    assert "Contato pelo Site" in aviso.message


def test_lead_nao_repete(db, test_lists, test_salesperson_user):
    """Criação e distribuição podem avisar o mesmo vendedor; o lead sai uma vez."""
    integ = usuario(db, "integracao", "manager", is_integracao=True)
    card = _card(db, test_lists[0], integ)

    avisar_atribuicao(db, card, test_salesperson_user.id, "vendedor", autor_id=integ.id)
    avisar_atribuicao(db, card, test_salesperson_user.id, "vendedor", autor_id=None)

    assert len(avisos(db, test_salesperson_user.id)) == 1


def test_card_de_pessoa_sai_como_card_atribuido(db, test_lists, test_salesperson_user, test_manager_user):
    card = _card(db, test_lists[0], test_manager_user)

    avisar_atribuicao(db, card, test_salesperson_user.id, "vendedor", autor_id=test_manager_user.id)

    [aviso] = avisos(db, test_salesperson_user.id)
    assert aviso.notification_type == "card_atribuido"


def test_sdr_recebe_card_atribuido_com_o_papel(db, test_lists, test_sdr_user, test_manager_user):
    card = _card(db, test_lists[0], test_manager_user)

    avisar_atribuicao(db, card, test_sdr_user.id, "sdr", autor_id=test_manager_user.id)

    [aviso] = avisos(db, test_sdr_user.id)
    assert aviso.notification_type == "card_atribuido"
    assert aviso.message.endswith("como SDR")


def test_quem_se_atribui_nao_e_avisado(db, test_lists, test_salesperson_user):
    card = _card(db, test_lists[0], test_salesperson_user)

    avisar_atribuicao(db, card, test_salesperson_user.id, "vendedor", autor_id=test_salesperson_user.id)

    assert avisos(db, test_salesperson_user.id) == []
