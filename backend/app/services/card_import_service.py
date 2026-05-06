"""
Serviço de importação em lote de cards via planilha Excel.
Suporta criação de Clientes, Pessoas e Cards vinculados em uma única operação.
"""
import io
from datetime import datetime
from unicodedata import normalize as unicode_normalize

import openpyxl
from openpyxl.styles import PatternFill, Font, Alignment, Border, Side
from openpyxl.worksheet.datavalidation import DataValidation
from sqlalchemy.orm import Session

from app.models.card import Card
from app.models.client import Client
from app.models.person import Person
from app.models.user import User
from app.models.card_list_history import CardListHistory
from app.schemas.card import CardImportRowResult, CardImportResponse

TARGET_LIST_ID = 22
TARGET_BOARD_ID = 6

# Ordem e definição das colunas do template
# (header, exemplo_valor, is_required)
TEMPLATE_COLUMNS = [
    ("Título do Card", "Proposta Empresa XYZ", True),
    ("Descrição", "Interesse no produto A - cliente indicado por João", False),
    ("Tipo de Negócio", "Nova Venda", False),
    ("Canal de Aquisição", "Indicacao", False),
    ("Detalhe do Canal", "Indicação do cliente XYZ", False),
    ("Origem", "Inbound", False),
    # Empresa
    ("Nome da Empresa", "Empresa XYZ LTDA", False),
    ("CNPJ/CPF", "12.345.678/0001-90", False),
    ("Setor / Segmento", "Tecnologia", False),
    ("Website", "www.empresa.com.br", False),
    ("Cidade", "São Paulo", False),
    ("Estado (UF)", "SP", False),
    ("Nº de Funcionários", "Ate 50 colaboradores", False),
    ("Receita Anual", "Ate R$ 10 milhoes", False),
    ("CNAE", "6201-5/01", False),
    # Contato
    ("Nome do Contato", "Carlos Oliveira", False),
    ("Cargo", "Diretor Comercial", False),
    ("E-mail Comercial", "carlos@empresa.com.br", False),
    ("WhatsApp", "(11) 99999-9999", False),
    ("Telefone Comercial", "(11) 3333-4444", False),
    ("LinkedIn", "linkedin.com/in/carlos", False),
    # Responsáveis — colocados no final para serem pré-preenchidos via API
    ("Vendedor (nome exato)", "", False),
    ("SDR (nome exato)", "", False),
]

VALID_CHANNELS = {
    "inbound": "Inbound",
    "outbound": "Outbound",
    "indicacao": "Indicacao",
    "indicação": "Indicacao",
    "parcerias": "Parcerias",
    "eventos": "Eventos",
    "base": "Base",
}

VALID_DEAL_TYPES = {
    "nova venda": "Nova Venda",
    "cross sell": "Cross Sell",
    "up sell": "Up Sell",
}

VALID_EMPLOYEE_COUNTS = [
    "Ate 50 colaboradores",
    "51-100 colaboradores",
    "101-300 colaboradores",
    "301-600 colaboradores",
    "601-1.000 colaboradores",
    "Acima de 1.000 colaboradores",
]

VALID_ANNUAL_REVENUES = [
    "Ate R$ 10 milhoes",
    "R$ 10-30 milhoes",
    "R$ 30-100 milhoes",
    "R$ 100-300 milhoes",
    "R$ 300 milhoes - R$ 1 bilhao",
    "Acima de R$ 1 bilhao",
]

STATE_TO_UF = {
    "acre": "AC", "alagoas": "AL", "amapa": "AP", "amazonas": "AM",
    "bahia": "BA", "ceara": "CE", "distrito federal": "DF",
    "espirito santo": "ES", "goias": "GO", "maranhao": "MA",
    "mato grosso do sul": "MS", "mato grosso": "MT", "minas gerais": "MG",
    "para": "PA", "paraiba": "PB", "parana": "PR", "pernambuco": "PE",
    "piaui": "PI", "rio de janeiro": "RJ", "rio grande do norte": "RN",
    "rio grande do sul": "RS", "rondonia": "RO", "roraima": "RR",
    "santa catarina": "SC", "sao paulo": "SP", "sergipe": "SE",
    "tocantins": "TO",
}
VALID_UF = sorted(STATE_TO_UF.values())


# ─── Helpers ────────────────────────────────────────────────────────────────

def _strip_accents(text: str) -> str:
    return unicode_normalize("NFKD", text).encode("ascii", "ignore").decode("ascii")


def _clean(val) -> str | None:
    if val is None:
        return None
    s = str(val).strip()
    return s if s else None


def _normalize_uf(val) -> str | None:
    s = _clean(val)
    if not s:
        return None
    upper = s.upper().strip()
    if upper in set(VALID_UF):
        return upper
    return STATE_TO_UF.get(_strip_accents(s.lower()).strip())


def _normalize_channel(val) -> str | None:
    s = _clean(val)
    if not s:
        return None
    return VALID_CHANNELS.get(_strip_accents(s.lower()).strip())


def _normalize_deal_type(val) -> str | None:
    s = _clean(val)
    if not s:
        return None
    return VALID_DEAL_TYPES.get(_strip_accents(s.lower()).strip())


def _parse_date(val) -> datetime | None:
    if val is None:
        return None
    if isinstance(val, datetime):
        return val
    s = str(val).strip()
    for fmt in ("%d/%m/%Y", "%Y-%m-%d", "%d-%m-%Y"):
        try:
            return datetime.strptime(s, fmt)
        except ValueError:
            continue
    return None


def _clean_cnpj(val) -> str | None:
    if val is None:
        return None
    digits = "".join(c for c in str(val).strip() if c.isdigit())
    if not digits:
        return None
    return digits.zfill(14)


def _find_user(db: Session, name: str) -> int | None:
    if not name:
        return None
    name_norm = _strip_accents(name.lower())
    users = db.query(User).filter(User.is_active == True).all()
    for user in users:
        if not user.name:
            continue
        user_norm = _strip_accents(user.name.lower())
        significant = [w for w in user_norm.split() if len(w) > 3]
        if not significant:
            continue
        if all(w in name_norm for w in significant):
            return user.id
    return None


def _get_or_create_client(db: Session, row: dict) -> int | None:
    company_name = _clean(row.get("Nome da Empresa"))
    if not company_name:
        return None

    cnpj_digits = _clean_cnpj(row.get("CNPJ/CPF"))

    if cnpj_digits:
        for c in db.query(Client).filter(Client.is_deleted == False).all():
            if c.document:
                doc_digits = "".join(ch for ch in c.document if ch.isdigit()).zfill(14)
                if doc_digits == cnpj_digits:
                    return c.id

    if not cnpj_digits:
        existing = (
            db.query(Client)
            .filter(Client.name.ilike(company_name), Client.is_deleted == False)
            .first()
        )
        if existing:
            return existing.id

    new_client = Client(
        name=company_name,
        company_name=company_name,
        document=cnpj_digits,
        website=_clean(row.get("Website")),
        state=_normalize_uf(row.get("Estado (UF)")),
        city=_clean(row.get("Cidade")),
        cnae=_clean(row.get("CNAE")),
        sector=_clean(row.get("Setor / Segmento")),
        source="importacao",
        is_active=True,
        relationship_type="Lead",
        commercial_activity="Ativo",
    )
    db.add(new_client)
    db.flush()
    return new_client.id


def _get_or_create_person(db: Session, row: dict, client_id: int | None) -> int | None:
    name = _clean(row.get("Nome do Contato"))
    if not name:
        return None

    email = _clean(row.get("E-mail Comercial"))

    if email:
        existing = db.query(Person).filter(Person.email_commercial == email).first()
        if existing:
            return existing.id

    if client_id:
        existing = (
            db.query(Person)
            .filter(Person.name == name, Person.organization_id == client_id)
            .first()
        )
        if existing:
            return existing.id

    parts = name.strip().split()
    first_name = parts[0] if parts else name
    last_name = " ".join(parts[1:]) if len(parts) > 1 else ""

    new_person = Person(
        name=name,
        first_name=first_name,
        last_name=last_name,
        position=_clean(row.get("Cargo")),
        phone_whatsapp=_clean(row.get("WhatsApp")),
        phone_commercial=_clean(row.get("Telefone Comercial")),
        email_commercial=email,
        linkedin=_clean(row.get("LinkedIn")),
        organization_id=client_id,
        is_active=True,
    )
    db.add(new_person)
    db.flush()
    return new_person.id


def _create_card(
    db: Session,
    row: dict,
    client_id: int | None,
    person_id: int | None,
    sdr_id: int | None,
    vendor_id: int | None,
    position: int,
) -> int:
    title = _clean(row.get("Título do Card"))
    if not title:
        raise ValueError("Título do Card é obrigatório")

    # Mantém compatibilidade com templates antigos que possam ter esses campos
    value = 0.0
    valor_raw = row.get("Valor (R$)")
    if valor_raw is not None:
        try:
            value = float(str(valor_raw).replace(",", ".").strip())
        except (ValueError, TypeError):
            value = 0.0

    due_date = _parse_date(row.get("Data de Vencimento"))

    new_card = Card(
        title=title,
        description=_clean(row.get("Descrição")),
        list_id=TARGET_LIST_ID,
        client_id=client_id,
        person_id=person_id,
        sdr_id=sdr_id,
        assigned_to_id=vendor_id,
        value=value,
        due_date=due_date,
        is_won=0,
        acquisition_channel=_normalize_channel(row.get("Canal de Aquisição")),
        acquisition_channel_detail=_clean(row.get("Detalhe do Canal")),
        deal_type=_normalize_deal_type(row.get("Tipo de Negócio")) or "Nova Venda",
        origin=_clean(row.get("Origem")) or "Importação via planilha",
        position=position,
        prospection_entry_date=datetime.now(),
    )
    db.add(new_card)
    db.flush()

    history = CardListHistory(
        card_id=new_card.id,
        list_id=TARGET_LIST_ID,
        board_id=TARGET_BOARD_ID,
        entered_at=datetime.now(),
    )
    db.add(history)

    return new_card.id


# ─── Importação ─────────────────────────────────────────────────────────────

EXEMPLO_PREFIX = "[EXEMPLO]"


def process_import(db: Session, file_bytes: bytes, current_user_id: int) -> CardImportResponse:
    wb = openpyxl.load_workbook(io.BytesIO(file_bytes), data_only=True)
    ws = wb.active

    # Cabeçalhos na linha 1
    headers = []
    for col in range(1, ws.max_column + 1):
        val = ws.cell(row=1, column=col).value
        headers.append(str(val).strip() if val else f"__COL_{col}")

    col_index = {h: i + 1 for i, h in enumerate(headers)}

    def get_cell(row_num: int, col_name: str):
        idx = col_index.get(col_name)
        if idx is None:
            return None
        return ws.cell(row=row_num, column=idx).value

    results: list[CardImportRowResult] = []
    created = 0
    errors = 0

    next_position = (
        db.query(Card)
        .filter(Card.list_id == TARGET_LIST_ID, Card.is_deleted == False)
        .count()
    )

    for row_num in range(2, ws.max_row + 1):
        row_values = [ws.cell(row=row_num, column=c).value for c in range(1, ws.max_column + 1)]
        if all(v is None or str(v).strip() == "" for v in row_values):
            continue

        row_data = {col_name: get_cell(row_num, col_name) for col_name in headers}
        title = _clean(row_data.get("Título do Card"))

        # Ignora linha de exemplo independente de onde estiver
        if title and title.startswith(EXEMPLO_PREFIX):
            continue

        if not title:
            results.append(CardImportRowResult(
                row=row_num,
                status="error",
                card_id=None,
                title=None,
                message="Título do Card é obrigatório",
            ))
            errors += 1
            continue

        try:
            sdr_name = _clean(row_data.get("SDR (nome exato)"))
            sdr_id = _find_user(db, sdr_name) if sdr_name else None

            vendor_name = _clean(row_data.get("Vendedor (nome exato)"))
            vendor_id = _find_user(db, vendor_name) if vendor_name else None

            client_id = _get_or_create_client(db, row_data)
            person_id = _get_or_create_person(db, row_data, client_id)
            card_id = _create_card(db, row_data, client_id, person_id, sdr_id, vendor_id, next_position)

            db.commit()
            next_position += 1
            created += 1

            results.append(CardImportRowResult(
                row=row_num,
                status="success",
                card_id=card_id,
                title=title,
                message="Card criado com sucesso",
            ))

        except Exception as e:
            db.rollback()
            errors += 1
            results.append(CardImportRowResult(
                row=row_num,
                status="error",
                card_id=None,
                title=title,
                message=str(e),
            ))

    return CardImportResponse(
        total=len(results),
        created=created,
        errors=errors,
        results=results,
    )


# ─── Geração do template ─────────────────────────────────────────────────────

def generate_template(user_name: str = "", user_role: str = "") -> bytes:
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Importação"

    # ── Estilos ──────────────────────────────────────────────────────────────
    header_fill = PatternFill(start_color="1E3A5F", end_color="1E3A5F", fill_type="solid")
    required_fill = PatternFill(start_color="1A5C32", end_color="1A5C32", fill_type="solid")
    header_font = Font(color="FFFFFF", bold=True, size=11)
    header_align = Alignment(horizontal="center", vertical="center", wrap_text=True)

    example_fill = PatternFill(start_color="FFF3CD", end_color="FFF3CD", fill_type="solid")
    example_font = Font(color="856404", italic=True, size=10)
    example_title_font = Font(color="856404", italic=True, bold=True, size=10)

    thin_border = Border(
        left=Side(style="thin", color="CBD5E0"),
        right=Side(style="thin", color="CBD5E0"),
        bottom=Side(style="thin", color="CBD5E0"),
    )

    # ── Pré-preenchimento de SDR/Vendedor baseado no usuário logado ──────────
    # "sdr" → preenche coluna SDR; demais → preenche coluna Vendedor
    pre_sdr = user_name if user_role == "sdr" else ""
    pre_vendor = user_name if user_role != "sdr" and user_name else ""

    # Monta os valores de exemplo com os campos de responsável já preenchidos
    example_values = {}
    for header, example, _ in TEMPLATE_COLUMNS:
        if header == "SDR (nome exato)":
            example_values[header] = pre_sdr or "Maria Santos"
        elif header == "Vendedor (nome exato)":
            example_values[header] = pre_vendor or "João Silva"
        else:
            example_values[header] = example

    # Prefixo [EXEMPLO] no título para que o backend ignore esta linha
    example_values["Título do Card"] = f"{EXEMPLO_PREFIX} Proposta Empresa XYZ"

    # ── Linha 1: cabeçalhos ──────────────────────────────────────────────────
    for col_idx, (header, _, is_required) in enumerate(TEMPLATE_COLUMNS, 1):
        label = header + (" *" if is_required else "")
        cell = ws.cell(row=1, column=col_idx, value=label)
        cell.fill = required_fill if is_required else header_fill
        cell.font = header_font
        cell.alignment = header_align
        cell.border = thin_border

    # ── Linha 2: exemplo (amarelo) ───────────────────────────────────────────
    for col_idx, (header, _, _) in enumerate(TEMPLATE_COLUMNS, 1):
        val = example_values[header]
        cell = ws.cell(row=2, column=col_idx, value=val)
        cell.fill = example_fill
        cell.font = example_title_font if col_idx == 1 else example_font
        cell.alignment = Alignment(vertical="center")
        cell.border = thin_border

    # ── Coluna A1 — instrução de início ─────────────────────────────────────
    # Adiciona comentário explicativo à célula A1
    try:
        from openpyxl.comments import Comment
        comment = Comment(
            "Preencha a partir da LINHA 3.\nA linha amarela (linha 2) é apenas um exemplo — pode apagar ou deixar como está.",
            "HSGrowth",
        )
        comment.width = 260
        comment.height = 60
        ws["A1"].comment = comment
    except Exception:
        pass  # Comentários são opcional

    # ── Larguras das colunas ─────────────────────────────────────────────────
    col_widths = [
        30, 38,          # Título, Descrição
        20, 22, 32, 16,  # Tipo, Canal, Detalhe, Origem
        32, 20, 20, 25, 16, 10, 28, 28, 14,  # Empresa (9 cols)
        28, 22, 28, 20, 22, 30,              # Contato (6 cols)
        24, 24,          # Vendedor, SDR
    ]
    for col_idx, width in enumerate(col_widths[:len(TEMPLATE_COLUMNS)], 1):
        ws.column_dimensions[ws.cell(row=1, column=col_idx).column_letter].width = width

    ws.row_dimensions[1].height = 40
    ws.row_dimensions[2].height = 20
    ws.freeze_panes = "A3"  # Congela cabeçalho — usuário começa na linha 3

    # ── Listas para dropdowns (aba oculta) ───────────────────────────────────
    lists_ws = wb.create_sheet("Listas")
    lists_ws.sheet_state = "hidden"

    canais = ["Inbound", "Outbound", "Indicacao", "Parcerias", "Eventos", "Base"]
    tipos = ["Nova Venda", "Cross Sell", "Up Sell"]
    ufs = VALID_UF  # já está sorted

    for i, v in enumerate(canais, 1):
        lists_ws.cell(row=i, column=1, value=v)
    for i, v in enumerate(tipos, 1):
        lists_ws.cell(row=i, column=2, value=v)
    for i, v in enumerate(ufs, 1):
        lists_ws.cell(row=i, column=3, value=v)
    for i, v in enumerate(VALID_EMPLOYEE_COUNTS, 1):
        lists_ws.cell(row=i, column=4, value=v)
    for i, v in enumerate(VALID_ANNUAL_REVENUES, 1):
        lists_ws.cell(row=i, column=5, value=v)

    # Índices das colunas com validação (1-based)
    col_map = {h: i for i, (h, _, _) in enumerate(TEMPLATE_COLUMNS, 1)}

    def col_letter(col_name: str) -> str:
        idx = col_map.get(col_name)
        if not idx:
            return "Z"
        return ws.cell(row=1, column=idx).column_letter

    def add_dv(formula: str, col_name: str):
        dv = DataValidation(
            type="list",
            formula1=formula,
            allow_blank=True,
            showErrorMessage=True,
            error="Use um dos valores da lista suspensa.",
            errorTitle="Valor inválido",
        )
        ws.add_data_validation(dv)
        letter = col_letter(col_name)
        dv.add(f"{letter}3:{letter}10000")

    add_dv("Listas!$A$1:$A$6", "Canal de Aquisição")
    add_dv("Listas!$B$1:$B$3", "Tipo de Negócio")
    add_dv(f"Listas!$C$1:$C${len(ufs)}", "Estado (UF)")
    add_dv(f"Listas!$D$1:$D${len(VALID_EMPLOYEE_COUNTS)}", "Nº de Funcionários")
    add_dv(f"Listas!$E$1:$E${len(VALID_ANNUAL_REVENUES)}", "Receita Anual")

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return buf.read()
