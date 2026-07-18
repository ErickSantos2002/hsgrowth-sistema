"""Validação do contrato de entrada da integração."""
import pytest
from pydantic import ValidationError

from app.schemas.integration import IntegrationServiceCardCreate


def payload_valido(**overrides):
    base = {
        "source": "gestorhs.os",
        "external_id": "1234",
        "board_id": 1,
        "title": "OS #1234 · Transportadora X",
        "client": {"external_id": "789", "name": "Transportadora X LTDA"},
    }
    base.update(overrides)
    return base


def test_payload_minimo_e_valido():
    data = IntegrationServiceCardCreate(**payload_valido())
    assert data.source == "gestorhs.os"
    assert data.client.name == "Transportadora X LTDA"
    assert data.contact is None
    assert data.devices is None


def test_source_desconhecido_e_rejeitado():
    with pytest.raises(ValidationError):
        IntegrationServiceCardCreate(**payload_valido(source="outro.sistema"))


@pytest.mark.parametrize(
    "source", ["gestorhs.os", "gestorhs.calibracao", "gestorhs.atrasados"]
)
def test_os_tres_sources_conhecidos_sao_aceitos(source):
    """Os três gatilhos do GestorHS. Um valor fora desta lista tem que dar 422."""
    assert IntegrationServiceCardCreate(**payload_valido(source=source)).source == source


def test_carga_de_atrasados_agrupa_varios_aparelhos_do_mesmo_cliente():
    """gestorhs.atrasados manda 1 card por cliente, com todos os vencidos em devices[]."""
    data = IntegrationServiceCardCreate(**payload_valido(
        source="gestorhs.atrasados",
        external_id="512:2026-07-18",
        devices=[
            {"serial_number": "AB123", "next_recalibration_date": "2026-01-10"},
            {"serial_number": "CD456", "next_recalibration_date": "2026-03-22"},
        ],
    ))
    assert data.source == "gestorhs.atrasados"
    assert len(data.devices) == 2


def test_external_id_vazio_e_rejeitado():
    with pytest.raises(ValidationError):
        IntegrationServiceCardCreate(**payload_valido(external_id=""))


def test_cliente_e_obrigatorio():
    p = payload_valido()
    del p["client"]
    with pytest.raises(ValidationError):
        IntegrationServiceCardCreate(**p)


def test_aparelhos_sao_aceitos():
    data = IntegrationServiceCardCreate(**payload_valido(devices=[
        {"serial_number": "AB123", "model": "Alcotest 6820",
         "alcohol_module": "Sim", "next_recalibration_date": "2026-08-10"},
    ]))
    assert data.devices[0].serial_number == "AB123"
