"""
Ler um arquivo grande em blocos, retomando de onde parou se a conexão cair.

Feito para as gravações do Daily. Em 15/10/2026 uma gravação de 951 MB se
perdeu aos 723 MB: o Daily fechou a conexão no meio e o sistema desistiu na
primeira queda. Agora a leitura reabre a conexão pedindo só o que faltava
(`Range`), e quem consome os blocos — o envio ao bucket — segue como se nada
tivesse acontecido.

Nada vai para o disco: os blocos passam pela memória e seguem adiante, como
antes. O link de download do Daily expira em minutos, então cada tentativa
pede um novo.
"""
import time
from typing import Callable, Iterator, Optional

import httpx

TENTATIVAS = 4
PAUSA_BASE_SEGUNDOS = 5
TIMEOUT = httpx.Timeout(120.0, connect=30.0)  # entre blocos, não para o arquivo todo
BLOCO = 1024 * 1024


class ErroDeDownload(Exception):
    pass


def _tamanho_total(resposta, ja_entregues: int) -> Optional[int]:
    """Do Content-Range (206) ou do Content-Length (200)."""
    intervalo = resposta.headers.get("content-range", "")
    if "/" in intervalo:
        total = intervalo.rsplit("/", 1)[1]
        return int(total) if total.isdigit() else None
    comprimento = resposta.headers.get("content-length")
    if comprimento and comprimento.isdigit():
        return int(comprimento) + (ja_entregues if resposta.status_code == 206 else 0)
    return None


def blocos_com_retomada(
    obter_link: Callable[[], str],
    tentativas: int = TENTATIVAS,
    abrir=None,
    esperar: Optional[Callable[[float], None]] = None,
) -> Iterator[bytes]:
    """
    Entrega o arquivo em blocos. Se a conexão cair ou o servidor recusar,
    espera um pouco, pede um link novo e continua do byte onde parou.

    Args:
        obter_link: devolve um link de download válido (chamado a cada tentativa).
        abrir: o `httpx.stream` (trocável nos testes).
        esperar: pausa entre tentativas (trocável nos testes).

    Raises:
        ErroDeDownload: quando nenhuma das tentativas completou o arquivo.
    """
    abrir = abrir or httpx.stream
    esperar = esperar or time.sleep
    entregues = 0
    total: Optional[int] = None
    ultimo_erro = "sem resposta"

    for tentativa in range(1, tentativas + 1):
        if tentativa > 1:
            esperar(PAUSA_BASE_SEGUNDOS * (tentativa - 1))
        try:
            url = obter_link()
            cabecalhos = {"Range": f"bytes={entregues}-"} if entregues else {}
            with abrir("GET", url, headers=cabecalhos, timeout=TIMEOUT,
                       follow_redirects=True) as resposta:
                if resposta.status_code >= 400:
                    ultimo_erro = f"Daily devolveu {resposta.status_code}"
                    print(f"[DOWNLOAD] Tentativa {tentativa}/{tentativas}: {ultimo_erro}")
                    continue

                # O servidor ignorou o Range e mandou desde o começo: o que já
                # foi entregue é pulado, senão o início sairia duplicado.
                pular = entregues if (entregues and resposta.status_code != 206) else 0
                total = _tamanho_total(resposta, 0 if pular else entregues) or total

                for bloco in resposta.iter_bytes(BLOCO):
                    if pular:
                        if len(bloco) <= pular:
                            pular -= len(bloco)
                            continue
                        bloco, pular = bloco[pular:], 0
                    entregues += len(bloco)
                    yield bloco

            if total is None or entregues >= total:
                return
            ultimo_erro = f"conexão encerrada com {entregues} de {total} bytes"
        except (httpx.HTTPError, OSError) as e:
            ultimo_erro = str(e)
        print(f"[DOWNLOAD] Tentativa {tentativa}/{tentativas} parou em {entregues} bytes: {ultimo_erro}")

    raise ErroDeDownload(f"Download incompleto após {tentativas} tentativas ({entregues} bytes): {ultimo_erro}")
