"""
FormulaEvaluator — Avaliador seguro de fórmulas DAX-like.

Permite ao usuário criar métricas derivadas combinando campos existentes
com expressões aritméticas simples. Exemplos:
  - [won_count] / [count] * 100  → Taxa de Conversão (%)
  - [value] / [won_count]        → Ticket Médio

Segurança: usa ast.parse() + NodeVisitor com whitelist explícita.
Nunca usa eval() puro — apenas avaliação de nós AST autorizados.
"""
import ast
import re
from typing import Optional


# Padrão que identifica referências a campos: [field_key]
_FIELD_REF_PATTERN = re.compile(r'\[([a-zA-Z_][a-zA-Z0-9_]*)\]')

# Prefixo/sufixo usado para transformar [field_key] em identificador Python válido
_FIELD_PREFIX = '__field_'
_FIELD_SUFFIX = '__'

# Nós AST permitidos (operadores aritméticos + números + nomes de variáveis)
_ALLOWED_NODE_TYPES = (
    ast.Module,
    ast.Expr,
    ast.Expression,
    ast.BinOp,
    ast.UnaryOp,
    ast.Constant,
    ast.Name,
    ast.Load,
    # Operadores binários aritméticos
    ast.Add,
    ast.Sub,
    ast.Mult,
    ast.Div,
    ast.FloorDiv,
    ast.Mod,
    ast.Pow,
    # Operadores unários
    ast.UAdd,
    ast.USub,
)


class _SafeVisitor(ast.NodeVisitor):
    """
    Visitor que percorre a AST e acumula erros para nós não permitidos.
    Garante que apenas expressões aritméticas simples passem pela validação.
    """

    def __init__(self):
        self.errors: list[str] = []

    def generic_visit(self, node: ast.AST) -> None:
        if not isinstance(node, _ALLOWED_NODE_TYPES):
            self.errors.append(
                f"Operação não permitida: {type(node).__name__}. "
                "Apenas operações aritméticas (+, -, *, /) são aceitas."
            )
        # Continua visitando os filhos mesmo após erro, para reportar todos de uma vez
        super().generic_visit(node)


class _SafeEvalVisitor(ast.NodeVisitor):
    """
    Visitor que avalia a AST com um dicionário de valores para os campos.
    Retorna o resultado via self.result após visit().
    """

    def __init__(self, values: dict[str, float]):
        self.values = values
        self.result: Optional[float] = None
        self._stack: list[float] = []

    def _eval(self, node: ast.AST) -> float:
        """Avalia recursivamente um nó da AST e retorna o valor float."""
        if isinstance(node, ast.Constant):
            return float(node.value)

        if isinstance(node, ast.Name):
            return self.values.get(node.id, 0.0)

        if isinstance(node, ast.UnaryOp):
            operand = self._eval(node.operand)
            if isinstance(node.op, ast.USub):
                return -operand
            if isinstance(node.op, ast.UAdd):
                return operand
            raise ValueError(f"Operador unário não suportado: {type(node.op).__name__}")

        if isinstance(node, ast.BinOp):
            left = self._eval(node.left)
            right = self._eval(node.right)

            if isinstance(node.op, ast.Add):
                return left + right
            if isinstance(node.op, ast.Sub):
                return left - right
            if isinstance(node.op, ast.Mult):
                return left * right
            if isinstance(node.op, ast.Div):
                # Divisão por zero retorna None — o caller decide como tratar
                if right == 0:
                    raise ZeroDivisionError("Divisão por zero na fórmula")
                return left / right
            if isinstance(node.op, ast.FloorDiv):
                if right == 0:
                    raise ZeroDivisionError("Divisão por zero na fórmula")
                return float(left // right)
            if isinstance(node.op, ast.Mod):
                if right == 0:
                    raise ZeroDivisionError("Divisão por zero na fórmula")
                return float(left % right)
            if isinstance(node.op, ast.Pow):
                return float(left ** right)

            raise ValueError(f"Operador binário não suportado: {type(node.op).__name__}")

        raise ValueError(f"Nó AST não suportado: {type(node).__name__}")


class FormulaEvaluator:
    """
    Avaliador seguro de fórmulas DAX-like.

    Uso típico:
        evaluator = FormulaEvaluator()
        errors = evaluator.validate("[won_count] / [count] * 100")
        if not errors:
            result = evaluator.evaluate(
                "[won_count] / [count] * 100",
                {"__field_won_count__": 10.0, "__field_count__": 50.0}
            )
    """

    def preprocess(self, formula: str) -> str:
        """
        Converte referências [field_key] para identificadores Python válidos.
        Ex: "[won_count] / [count]" → "__field_won_count__ / __field_count__"
        """
        return _FIELD_REF_PATTERN.sub(
            lambda m: f"{_FIELD_PREFIX}{m.group(1)}{_FIELD_SUFFIX}",
            formula,
        )

    def validate(self, formula: str) -> list[str]:
        """
        Valida a fórmula usando parse AST + whitelist de nós permitidos.
        Retorna lista de erros (vazia se a fórmula for válida).
        """
        if not formula or not formula.strip():
            return ["A fórmula não pode estar vazia."]

        # Verifica caracteres completamente proibidos antes do parse
        # (evita mensagens de erro confusas do parser Python)
        allowed_chars = re.compile(r'^[\w\s\[\]\+\-\*\/\(\)\.\,]+$')
        if not allowed_chars.match(formula):
            return ["A fórmula contém caracteres inválidos. Use apenas letras, números, [campo], e operadores + - * /."]

        preprocessed = self.preprocess(formula)

        try:
            tree = ast.parse(preprocessed, mode='eval')
        except SyntaxError as exc:
            return [f"Erro de sintaxe na fórmula: {exc.msg}"]

        visitor = _SafeVisitor()
        visitor.visit(tree)

        return visitor.errors

    def extract_dependencies(self, formula: str) -> set[str]:
        """
        Extrai os field_key referenciados na fórmula.
        Ex: "[won_count] / [count] * 100" → {"won_count", "count"}
        """
        return set(_FIELD_REF_PATTERN.findall(formula))

    def evaluate(
        self,
        formula: str,
        values: dict[str, float],
    ) -> Optional[float]:
        """
        Avalia a fórmula com o dicionário de valores fornecido.
        As chaves do dict devem estar no formato preprocessado: __field_key__.

        Retorna None em caso de divisão por zero ou erro de avaliação.
        """
        preprocessed = self.preprocess(formula)

        try:
            tree = ast.parse(preprocessed, mode='eval')
            eval_visitor = _SafeEvalVisitor(values)
            result = eval_visitor._eval(tree.body)
            return float(result)
        except ZeroDivisionError:
            return None
        except Exception:
            return None

    def build_value_context(
        self,
        field_values: dict[str, float],
    ) -> dict[str, float]:
        """
        Constrói o dicionário de contexto para evaluate() a partir de
        um dict simples {field_key: value}, adicionando o prefixo/sufixo.

        Ex: {"won_count": 10.0} → {"__field_won_count__": 10.0}
        """
        return {
            f"{_FIELD_PREFIX}{key}{_FIELD_SUFFIX}": value
            for key, value in field_values.items()
        }
