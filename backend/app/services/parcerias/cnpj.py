"""
CNPJ guardado sem máscara e conferido pelos dígitos verificadores.

Desde jul/2026 a Receita emite CNPJ com letras nas 12 primeiras posições
(os 2 verificadores seguem números). Cada caractere vale o código ASCII
menos 48 (números ficam iguais, "A" vale 17), e a conta é a mesma.
"""
import re

_PESOS_1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
_PESOS_2 = [6] + _PESOS_1


def so_digitos(valor) -> str:
    return re.sub(r"\D", "", valor or "")


def normalizar_cnpj(valor) -> str:
    """Tira a máscara e põe as letras em maiúsculas."""
    return re.sub(r"[^0-9A-Z]", "", (valor or "").upper())


def _digito(base: str, pesos) -> str:
    resto = sum((ord(c) - 48) * p for c, p in zip(base, pesos)) % 11
    return "0" if resto < 2 else str(11 - resto)


def cnpj_valido(valor) -> bool:
    d = normalizar_cnpj(valor)
    if not re.fullmatch(r"[0-9A-Z]{12}\d{2}", d) or d == d[0] * 14:
        return False
    return d[12] == _digito(d[:12], _PESOS_1) and d[13] == _digito(d[:13], _PESOS_2)
