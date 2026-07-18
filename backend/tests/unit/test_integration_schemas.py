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
