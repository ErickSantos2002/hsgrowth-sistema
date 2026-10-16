"""
Ler a gravação do Daily em blocos, retomando de onde parou se a conexão cair.

Em 15/10/2026 a gravação de 951 MB de uma Apresentação Phoebus (tarefa 41638)
se perdeu aos 723 MB: o Daily fechou a conexão e o sistema desistiu. Agora a
leitura reabre a conexão a partir do byte em que parou — com um link novo,
porque o do Daily expira em minutos — e quem consome os blocos (o envio ao
bucket) nem percebe a queda. Nada vai para o disco: os blocos passam pela
memória, como antes.
"""
import httpx
import pytest

from app.services.download_retomavel import ErroDeDownload, blocos_com_retomada

CONTEUDO = bytes(range(256)) * 40  # 10.240 bytes, com conteúdo que denuncia ordem errada


class _Resposta:
    """Simula httpx.stream(): devolve o pedaço pedido e pode cair no meio."""

    def __init__(self, inicio=0, cai_depois_de=None, status=None, ignora_range=False):
        self._inicio = 0 if ignora_range else inicio
        self._cai = cai_depois_de
        parcial = self._inicio > 0
        self.status_code = status or (206 if parcial else 200)
        restante = len(CONTEUDO) - self._inicio
        self.headers = {"content-length": str(restante)}
        if parcial:
            self.headers["content-range"] = f"bytes {self._inicio}-{len(CONTEUDO) - 1}/{len(CONTEUDO)}"

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False

    def iter_bytes(self, chunk_size=None):
        enviados = 0
        for i in range(self._inicio, len(CONTEUDO), 1000):
            if self._cai is not None and enviados >= self._cai:
                raise httpx.RemoteProtocolError("peer closed connection without sending complete message body")
            pedaco = CONTEUDO[i:i + 1000]
            enviados += len(pedaco)
            yield pedaco


class _Daily:
    """Registra cada pedido: link usado e Range pedido."""

    def __init__(self, roteiro):
        self.roteiro = list(roteiro)
        self.pedidos = []
        self.links = 0

    def obter_link(self):
        self.links += 1
        return f"https://daily/link-{self.links}"

    def abrir(self, metodo, url, headers=None, **kw):
        inicio = 0
        intervalo = (headers or {}).get("Range")
        if intervalo:
            inicio = int(intervalo.split("=")[1].rstrip("-"))
        self.pedidos.append((url, intervalo))
        return self.roteiro.pop(0)(inicio)


def _ler(daily, tentativas=4, esperar=None):
    return b"".join(blocos_com_retomada(daily.obter_link, tentativas=tentativas,
                                        abrir=daily.abrir, esperar=esperar or (lambda s: None)))


def test_le_inteiro_de_primeira():
    daily = _Daily([lambda inicio: _Resposta(inicio)])

    assert _ler(daily) == CONTEUDO
    assert daily.pedidos == [("https://daily/link-1", None)]


def test_conexao_cai_e_continua_de_onde_parou():
    daily = _Daily([
        lambda inicio: _Resposta(inicio, cai_depois_de=7000),
        lambda inicio: _Resposta(inicio),
    ])

    assert _ler(daily) == CONTEUDO
    # o segundo pedido usa link novo e pede só o que faltava
    assert daily.pedidos[1] == ("https://daily/link-2", "bytes=7000-")


def test_cai_varias_vezes_e_completa():
    daily = _Daily([
        lambda inicio: _Resposta(inicio, cai_depois_de=3000),
        lambda inicio: _Resposta(inicio, cai_depois_de=3000),
        lambda inicio: _Resposta(inicio),
    ])

    assert _ler(daily) == CONTEUDO
    assert [r for _, r in daily.pedidos] == [None, "bytes=3000-", "bytes=6000-"]


def test_servidor_que_ignora_o_range_nao_duplica_o_comeco():
    """Sem 206 o servidor manda o arquivo todo: o que já foi entregue é pulado."""
    daily = _Daily([
        lambda inicio: _Resposta(inicio, cai_depois_de=5000),
        lambda inicio: _Resposta(inicio, ignora_range=True),
    ])

    assert _ler(daily) == CONTEUDO


def test_link_recusado_pede_outro():
    """O link do Daily expira em minutos: 403 numa nova tentativa pede link novo."""
    daily = _Daily([
        lambda inicio: _Resposta(inicio, status=403),
        lambda inicio: _Resposta(inicio),
    ])

    assert _ler(daily) == CONTEUDO
    assert daily.links == 2


def test_desiste_depois_das_tentativas():
    daily = _Daily([lambda inicio: _Resposta(inicio, cai_depois_de=1000)] * 3)

    with pytest.raises(ErroDeDownload) as erro:
        _ler(daily, tentativas=3)

    assert "3 tentativas" in str(erro.value)
    assert "peer closed" in str(erro.value)


def test_espera_mais_a_cada_tentativa():
    esperas = []
    daily = _Daily([
        lambda inicio: _Resposta(inicio, cai_depois_de=1000),
        lambda inicio: _Resposta(inicio, cai_depois_de=1000),
        lambda inicio: _Resposta(inicio),
    ])

    _ler(daily, esperar=esperas.append)

    assert len(esperas) == 2
    assert esperas[0] < esperas[1]


def test_entrega_em_blocos_sem_juntar_tudo():
    """É um gerador: o arquivo passa pela memória aos pedaços, como antes."""
    daily = _Daily([lambda inicio: _Resposta(inicio)])

    blocos = list(blocos_com_retomada(daily.obter_link, abrir=daily.abrir, esperar=lambda s: None))

    assert len(blocos) > 1
    assert max(len(b) for b in blocos) < len(CONTEUDO)
