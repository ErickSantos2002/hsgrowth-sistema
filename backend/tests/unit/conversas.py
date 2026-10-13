"""
Transcrições de reunião para os testes.

Desde 13/10 a régua só avalia o que foi conversa: 500 palavras e duas pessoas
falando (`app/services/avaliacao_reuniao/conversa.py`). Um "Bom dia" solto
não passa mais — os testes que esperam avaliação precisam de uma reunião.
"""


def _vtt_daily(falas: list[tuple[str, str]]) -> str:
    """Monta um VTT no formato do Daily: identificador, horário, voz."""
    blocos = ["WEBVTT", ""]
    for i, (falante, texto) in enumerate(falas):
        segundos = i * 5
        inicio = f"00:{segundos // 60:02d}:{segundos % 60:02d}.000"
        fim = f"00:{(segundos + 4) // 60:02d}:{(segundos + 4) % 60:02d}.000"
        blocos += [f"transcript:{i}", f"{inicio} --> {fim}", f"<v>{falante}:</v>{texto}", ""]
    return "\n".join(blocos)


_VENDEDOR = (
    "Hoje vocês controlam a calibração dos equipamentos em planilha e quem "
    "avisa o vencimento é a própria equipe de manutenção"
)
_CLIENTE = (
    "Isso mesmo, e no mês passado perdemos um prazo de auditoria porque o "
    "certificado venceu sem ninguém perceber a tempo"
)

# Uma apresentação curta mas de verdade: vendedor e cliente, ~700 palavras.
APRESENTACAO = _vtt_daily(
    [("Miguel Luiz", _VENDEDOR) if i % 2 == 0 else ("Jaques Ribeiro", _CLIENTE) for i in range(36)]
)

# Muita fala, uma voz só: o vendedor esperando o cliente que não entrou.
MONOLOGO = _vtt_daily([("Miguel Luiz", _VENDEDOR) for _ in range(36)])

# Duas pessoas, mas pouco: "está me ouvindo?", "estou", e caiu.
CONVERSA_CURTA = _vtt_daily(
    [("Miguel Luiz", "Olá, está conseguindo me ouvir?"), ("Jaques Ribeiro", "Estou sim")]
)
