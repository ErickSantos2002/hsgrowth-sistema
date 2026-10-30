"""CNPJ guardado só com dígitos e conferido pelos dígitos verificadores."""
import re

_PESOS_1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
_PESOS_2 = [6] + _PESOS_1


def so_digitos(valor) -> str:
    return re.sub(r"\D", "", valor or "")


def _digito(base: str, pesos) -> str:
    resto = sum(int(n) * p for n, p in zip(base, pesos)) % 11
    return "0" if resto < 2 else str(11 - resto)


def cnpj_valido(valor) -> bool:
    d = so_digitos(valor)
    if len(d) != 14 or d == d[0] * 14:
        return False
    return d[12] == _digito(d[:12], _PESOS_1) and d[13] == _digito(d[:13], _PESOS_2)
