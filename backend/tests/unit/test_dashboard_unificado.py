"""Cards fechados como 'Unificado em outro card' não contam como perda na dashboard."""
from datetime import datetime, timedelta

from app.models.client import Client
from app.models.service_board import ServiceBoard
from app.models.service_card import ServiceCard
from app.models.service_card_activity import ServiceCardActivity
from app.models.service_card_product import ServiceCardProduct
from app.models.service_list import ServiceList
from app.models.service_product import ServiceProduct
from app.schemas.service_board import PullDevicesRequest, PullDevicesItem
from app.services.service_board_service import ServiceBoardService
from app.services.service_dashboard_service import ServiceDashboardService


def test_unificado_fora_das_metricas_de_perda(db):
    b = ServiceBoard(name="Cobrança"); db.add(b); db.commit()
    aberta = ServiceList(board_id=b.id, name="Entrada", position=0)
    perdido = ServiceList(board_id=b.id, name="Negócio Perdido", position=1, is_lost_stage=True)
    cli = Client(name="Terraço"); mod = ServiceProduct(name="IBlow 10")
    db.add_all([aberta, perdido, cli, mod]); db.commit()
    origem = ServiceCard(list_id=aberta.id, client_id=cli.id, title="Origem")
    destino = ServiceCard(list_id=aberta.id, client_id=cli.id, title="Destino")
    real = ServiceCard(list_id=perdido.id, client_id=cli.id, title="Perda real")
    db.add_all([origem, destino, real]); db.commit()
    db.add(ServiceCardProduct(service_card_id=origem.id, product_id=mod.id, quantity=1,
                              unit_price=0, discount=0, aparelhos=[{"serial_number": "S1"}]))
    db.add(ServiceCardActivity(service_card_id=real.id, category="anotacao", activity_type="note",
                               description="Motivo da perda: Sem budget aprovado"))
    db.commit()

    ServiceBoardService(db).pull_devices(
        b.id, destino.id,
        PullDevicesRequest(from_card_id=origem.id, items=[PullDevicesItem(product_id=mod.id, all=True)]),
        None)

    agora = datetime.utcnow()
    r = ServiceDashboardService(db).get_dashboard(agora - timedelta(days=1), agora + timedelta(days=1), boards={b.id})
    assert r.lost_count == 1                                    # só a perda real
    assert all(x.name != "Unificado em outro card" for x in r.loss_reasons)
