"""
Se a transcrição tem conversa suficiente para ser avaliada pela régua.

A régua mede como o vendedor conduziu uma apresentação ao cliente. Avaliar
o que não foi apresentação não diz nada sobre isso, e a nota entra nos
indicadores: em 08/10 uma reunião com transcrição vazia recebeu nota 0 e
puxou a média do time para baixo.

O corte saiu das reuniões do CRM entre 30/09 e 09/10. A menor apresentação
de verdade teve 1.155 palavras, e as de 30 a 40 minutos passaram de 5 mil,
sempre com duas ou três pessoas falando. As que não eram tiveram no máximo
282 palavras e uma pessoa só: o vendedor arrumando a câmera, comentando o
frio, esperando o cliente que não entrou.
"""
import re
from typing import Optional

from app.services.transcript_analysis_service import vtt_em_turnos

# Cerca de quatro minutos de conversa: abaixo disso não houve apresentação.
PALAVRAS_MINIMAS = 500

# O vendedor e o cliente. Uma voz só é monólogo — o cliente não entrou ou
# não foi ouvido, e a régua pede o que o cliente disse.
FALANTES_MINIMOS = 2


def motivo_para_nao_avaliar(transcricao: Optional[str]) -> Optional[str]:
    """
    Diz por que a transcrição não serve para a régua.

    Returns:
        None quando dá para avaliar; senão uma frase para mostrar a quem
        pediu a avaliação.
    """
    turnos = vtt_em_turnos(transcricao or "")
    palavras = sum(len(re.findall(r"\w+", " ".join(falas))) for _, falas in turnos)

    if palavras < PALAVRAS_MINIMAS:
        return (
            f"A transcrição tem {palavras} palavra{'' if palavras == 1 else 's'} — "
            f"pouco para ter sido uma "
            f"apresentação (o mínimo é {PALAVRAS_MINIMAS})."
        )

    # Sem nome de quem falou não dá para contar vozes — acontece no Teams,
    # quando o locatário não libera a identificação. Aí vale só o tamanho.
    falantes = {falante for falante, _ in turnos if falante}
    if falantes and len(falantes) < FALANTES_MINIMOS:
        return (
            "Só uma pessoa aparece falando na transcrição — o cliente não "
            "entrou ou não foi ouvido."
        )

    return None
