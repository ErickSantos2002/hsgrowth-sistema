"""
Serviço de importação em lote de cards via planilha Excel.
Suporta criação de Clientes, Pessoas e Cards vinculados em uma única operação.
"""
import io
from datetime import datetime
from unicodedata import normalize as unicode_normalize

import openpyxl
from openpyxl.styles import PatternFill, Font, Alignment, Border, Side
from sqlalchemy.orm import Session

from app.models.card import Card
from app.models.client import Client
from app.models.person import Person
from app.models.user import User
from app.models.card_list_history import CardListHistory
from app.schemas.card import CardImportRowResult, CardImportResponse

TARGET_LIST_ID = 22
TARGET_BOARD_ID = 6

TEMPLATE_COLUMNS = [
    # (header, example, is_required)
    ("Título do Card", "Proposta Empresa XYZ", True),
    ("Descrição", "Interesse no produto A - cliente indicado por João", False),
    ("Valor (R$)", "15000.00", False),
    ("Data de Vencimento", "2026-06-30", False),
    ("Vendedor (nome exato)", "João Silva", False),
    ("SDR (nome exato)", "Maria Santos", False),
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
VALID_UF = set(STATE_TO_UF.values())


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
    if upper in VALID_UF:
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


def _get_or_create_client(db: Session, row: dict, current_user_id: int) -> int | None:
    company_name = _clean(row.get("Nome da Empresa"))
    if not company_name:
        return None

    cnpj_digits = _clean_cnpj(row.get("CNPJ/CPF"))

    if cnpj_digits:
        existing = db.query(Client).filter(Client.is_deleted == False).all()
        for c in existing:
            if c.document:
                doc_digits = "".join(ch for ch in c.document if ch.isdigit()).zfill(14)
                if doc_digits == cnpj_digits:
                    return c.id

    # Busca por nome exato se sem CNPJ
    if not cnpj_digits:
        existing_by_name = (
            db.query(Client)
            .filter(Client.name.ilike(company_name), Client.is_deleted == False)
            .first()
        )
        if existing_by_name:
            return existing_by_name.id

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

    # Busca por email comercial
    if email:
        existing = db.query(Person).filter(Person.email_commercial == email).first()
        if existing:
            return existing.id

    # Busca por nome + organização
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


def process_import(db: Session, file_bytes: bytes, current_user_id: int) -> CardImportResponse:
    """
    Processa o arquivo xlsx recebido e cria cards linha a linha.
    Retorna um resumo com o resultado de cada linha.
    """
    wb = openpyxl.load_workbook(io.BytesIO(file_bytes), data_only=True)
    ws = wb.active

    # Lê cabeçalhos da primeira linha
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
        # Ignora linhas completamente vazias
        row_values = [ws.cell(row=row_num, column=c).value for c in range(1, ws.max_column + 1)]
        if all(v is None or str(v).strip() == "" for v in row_values):
            continue

        row_data = {col_name: get_cell(row_num, col_name) for col_name in headers}
        title = _clean(row_data.get("Título do Card"))

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

            client_id = _get_or_create_client(db, row_data, current_user_id)
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


def generate_template() -> bytes:
    """Gera o arquivo xlsx de modelo para importação em lote."""
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Importação"

    header_fill = PatternFill(start_color="1E3A5F", end_color="1E3A5F", fill_type="solid")
    header_font = Font(color="FFFFFF", bold=True, size=11)
    header_align = Alignment(horizontal="center", vertical="center", wrap_text=True)

    required_fill = PatternFill(start_color="2D5A27", end_color="2D5A27", fill_type="solid")
    example_fill = PatternFill(start_color="F0F4F8", end_color="F0F4F8", fill_type="solid")
    example_font = Font(color="6B7280", italic=True, size=10)

    thin_border = Border(
        left=Side(style="thin", color="CBD5E0"),
        right=Side(style="thin", color="CBD5E0"),
        bottom=Side(style="thin", color="CBD5E0"),
    )

    col_widths = [
        28, 35, 14, 18, 22, 22, 18, 20, 30, 16,
        32, 20, 20, 25, 18, 12, 25, 22, 16,
        28, 22, 28, 20, 22, 30,
    ]

    # Linha 1: cabeçalhos
    for col_idx, (header, _, is_required) in enumerate(TEMPLATE_COLUMNS, 1):
        cell = ws.cell(row=1, column=col_idx, value=header + (" *" if is_required else ""))
        cell.fill = required_fill if is_required else header_fill
        cell.font = header_font
        cell.alignment = header_align
        cell.border = thin_border

    # Linha 2: valores de exemplo
    for col_idx, (_, example, _) in enumerate(TEMPLATE_COLUMNS, 1):
        cell = ws.cell(row=2, column=col_idx, value=example)
        cell.fill = example_fill
        cell.font = example_font
        cell.alignment = Alignment(vertical="center")
        cell.border = thin_border

    # Altura das linhas e largura das colunas
    ws.row_dimensions[1].height = 40
    ws.row_dimensions[2].height = 20

    for col_idx, width in enumerate(col_widths, 1):
        ws.column_dimensions[ws.cell(row=1, column=col_idx).column_letter].width = width

    # Congela a primeira linha
    ws.freeze_panes = "A3"

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return buf.read()
