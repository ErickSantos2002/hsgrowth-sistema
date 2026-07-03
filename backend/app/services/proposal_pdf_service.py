"""
Serviço de geração de PDF para Propostas Comerciais.
Usa WeasyPrint (HTML → PDF) com template inline.
"""
import re
from decimal import Decimal
from pathlib import Path
from typing import Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session, joinedload

from app.models.proposal import Proposal

# Mesmo UPLOAD_DIR usado por service_board_service.upload_file
UPLOAD_DIR = Path("/app/uploads")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _fmt_currency(value) -> str:
    """Formata um valor numérico como R$ 1.234,56 (pt-BR)."""
    if value is None:
        return "R$ 0,00"
    try:
        v = float(value)
    except (TypeError, ValueError):
        return "R$ 0,00"
    # Formata com separadores pt-BR
    formatted = f"{v:,.2f}"          # e.g. "1,234.56"
    # Troca separadores: vírgula→placeholder, ponto→vírgula, placeholder→ponto
    formatted = formatted.replace(",", "X").replace(".", ",").replace("X", ".")
    return f"R$ {formatted}"


def _fmt_date(d) -> str:
    """Formata um objeto date como dd/mm/aaaa."""
    if d is None:
        return "—"
    try:
        return d.strftime("%d/%m/%Y")
    except Exception:
        return str(d)


def _esc(text: Optional[str]) -> str:
    """Escapa texto simples para uso seguro em HTML."""
    if not text:
        return ""
    return (
        str(text)
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def _fmt_document(doc: Optional[str]) -> str:
    """Formata CPF (11 díg.) ou CNPJ (14 díg.); mantém original se não bater."""
    if not doc:
        return ""
    digits = re.sub(r"\D", "", str(doc))
    if len(digits) == 14:
        return f"{digits[:2]}.{digits[2:5]}.{digits[5:8]}/{digits[8:12]}-{digits[12:]}"
    if len(digits) == 11:
        return f"{digits[:3]}.{digits[3:6]}.{digits[6:9]}-{digits[9:]}"
    return _esc(doc)


def _sanitize_html(html: Optional[str]) -> str:
    """
    Sanitização defensiva do HTML do Quill antes de renderizar no PDF (WeasyPrint).
    Remove scripts/estilos, elementos que carregam recursos externos
    (img/iframe/object/embed/link/source/base) e handlers de evento on*=.
    Junto com o url_fetcher seguro no render, fecha SSRF / leitura de arquivo
    local via recursos referenciados. (Quill já sanitiza na entrada; isto é
    defense-in-depth no sink.)
    """
    if not html:
        return ""
    # Blocos com conteúdo
    for tag in ("script", "style", "iframe", "object"):
        html = re.sub(rf"<{tag}[\s\S]*?</{tag}>", "", html, flags=re.IGNORECASE)
    # Elementos "void" que carregam/apontam recursos externos
    html = re.sub(r"<(?:img|link|embed|source|base)\b[^>]*>", "", html, flags=re.IGNORECASE)
    # Handlers de evento inline (onerror, onload, ...)
    html = re.sub(r"""\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)""", "", html, flags=re.IGNORECASE)
    return html


# ---------------------------------------------------------------------------
# HTML template
# ---------------------------------------------------------------------------

_CSS = """
@page {
    size: A4;
    margin: 1.5cm;
}

* {
    box-sizing: border-box;
}

body {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 10.5px;
    color: #222;
    margin: 0;
    padding: 0;
    line-height: 1.5;
}

/* ── Cabeçalho ── */
.header {
    display: table;
    width: 100%;
    padding-bottom: 8px;
    border-bottom: 1px solid #333;
    margin-bottom: 12px;
}

.header-logo-area {
    display: table-cell;
    width: 38%;
    vertical-align: top;
}

.header-company {
    display: table-cell;
    width: 62%;
    text-align: right;
    vertical-align: top;
}

.header-company .company-name {
    font-size: 10.5px;
    font-weight: bold;
    margin-bottom: 2px;
}

.header-company .company-line {
    font-size: 9.5px;
    color: #333;
    line-height: 1.45;
}

/* ── Título ── */
.titulo {
    text-align: center;
    font-size: 16px;
    font-weight: bold;
    margin: 10px 0 14px 0;
}

/* ── Linha Para / Aos cuidados de ── */
.para-linha {
    font-size: 10.5px;
    margin: 0 0 10px 0;
}

/* ── Seção genérica ── */
.secao {
    margin-bottom: 10px;
}

.secao-titulo {
    font-size: 12px;
    font-weight: bold;
    border-bottom: 1px solid #333;
    padding-bottom: 3px;
    margin-top: 14px;
    margin-bottom: 4px;
    /* sentence case — sem text-transform */
}

/* ── Caixa com borda ── */
.box {
    border: 1px solid #999;
    padding: 8px 10px;
    margin-top: 4px;
    font-size: 10px;
    line-height: 1.6;
}

/* ── Endereço em 2 colunas (Cliente | Entrega) ── */
.endereco-2col {
    display: table;
    width: 100%;
    margin-top: 4px;
}
.endereco-col {
    display: table-cell;
    width: 50%;
    vertical-align: top;
}
.endereco-col:first-child { padding-right: 6px; }
.endereco-col:last-child { padding-left: 6px; }
.endereco-col .secao-titulo { margin-top: 0; }

/* ── Tabela de itens ── */
table.itens {
    width: 100%;
    border-collapse: collapse;
    margin-top: 4px;
    font-size: 10px;
}

table.itens th {
    background: #f2f2f2;
    border: 1px solid #ccc;
    padding: 5px 7px;
    text-align: left;
    font-weight: bold;
}

table.itens td {
    border: 1px solid #ccc;
    padding: 5px 7px;
    vertical-align: top;
}

table.itens td.right,
table.itens th.right {
    text-align: right;
}

.itens-rodape {
    border: 1px solid #ccc;
    border-top: none;
    padding: 6px 8px;
    font-size: 10px;
    color: #333;
    text-align: right;
}

/* ── Tabela de 2 colunas (Condições gerais) ── */
table.cond2 {
    width: 100%;
    border-collapse: collapse;
    margin-top: 4px;
    font-size: 10px;
}
table.cond2 td {
    border: 1px solid #ccc;
    padding: 5px 8px;
    vertical-align: top;
}
table.cond2 td:first-child {
    background: #f7f7f7;
    width: 42%;
}

/* ── Tabela de totais (fechamento) ── */
table.totais {
    width: 100%;
    border-collapse: collapse;
    margin-top: 4px;
    font-size: 10px;
}

table.totais th {
    background: #f2f2f2;
    border: 1px solid #ccc;
    padding: 5px 7px;
    text-align: left;
    font-weight: bold;
}

table.totais td {
    border: 1px solid #ccc;
    padding: 5px 7px;
    vertical-align: top;
}

table.totais td.right,
table.totais th.right {
    text-align: right;
}

/* ── Outros itens (HTML do Quill) ── */
.outros-itens-conteudo {
    font-size: 10px;
    line-height: 1.6;
}

.outros-itens-conteudo p { margin: 0 0 4px 0; }
.outros-itens-conteudo ul, .outros-itens-conteudo ol {
    margin: 0 0 4px 1em;
    padding: 0;
}

/* ── Assinatura ── */
.assinatura {
    margin-top: 18px;
    font-size: 10.5px;
    line-height: 1.8;
}
"""


def _build_html(proposal: Proposal) -> str:
    client = proposal.client
    person = proposal.person
    items = proposal.items or []

    # ── Dados do cliente ──
    client_display = "—"
    client_document = ""
    client_address = ""
    client_city_state = ""
    client_phone = ""
    client_email = ""

    if client:
        client_display = _esc(client.company_name or client.name or "—")
        client_document = _fmt_document(client.document)
        client_address = _esc(client.address or "")
        city = client.city or ""
        state = client.state or ""
        if city and state:
            client_city_state = _esc(f"{city} - {state}")
        elif city:
            client_city_state = _esc(city)
        elif state:
            client_city_state = _esc(state)
        client_email = _esc(client.email or "")
        client_phone = _esc(client.phone or "")

    # ── Dados da pessoa ──
    person_name = ""
    person_email = ""
    person_phone = ""

    if person:
        person_name = _esc(person.name or "")
        # Preferência de email: email_commercial → email
        person_email = _esc(
            person.email_commercial or person.email or ""
        )
        # Preferência de telefone: phone_commercial → phone_whatsapp → phone
        person_phone = _esc(
            person.phone_commercial or person.phone_whatsapp or person.phone or ""
        )

    # Linha "Aos cuidados de" — email da pessoa, fallback nome
    aos_cuidados = person_email or person_name or "—"

    # Linha fone/email do box de endereço: combina cliente + pessoa
    fone_email_parts = []
    combined_phone = person_phone or client_phone
    combined_email = person_email or client_email
    if combined_phone:
        fone_email_parts.append(f"Fone: {combined_phone}")
    if combined_email:
        fone_email_parts.append(f"E-mail: {combined_email}")
    fone_email_line = " &nbsp;&middot;&nbsp; ".join(fone_email_parts) if fone_email_parts else ""

    # ── Itens ──
    total_itens = Decimal("0")
    soma_qtds = Decimal("0")
    rows_html = ""
    for i, item in enumerate(items, 1):
        qty = Decimal(str(item.quantity or 0))
        unit_price = float(item.unit_price or 0)
        total_item = float(item.total or 0)
        total_itens += Decimal(str(total_item))
        soma_qtds += qty

        # Formata quantidade: 4 decimais, separadores pt-BR
        qty_str = f"{float(qty):,.4f}".replace(",", "X").replace(".", ",").replace("X", ".")

        rows_html += f"""
        <tr>
          <td>{i}</td>
          <td>{_esc(item.description)}</td>
          <td>{_esc(item.sku or "")}</td>
          <td class="right">{qty_str}</td>
          <td>{_esc(item.unit or "")}</td>
          <td class="right">{_fmt_currency(unit_price)}</td>
          <td class="right">{_fmt_currency(total_item)}</td>
        </tr>"""

    n_itens = len(items)
    soma_qtds_str = f"{float(soma_qtds):,.4f}".replace(",", "X").replace(".", ",").replace("X", ".")

    # ── Financeiro ──
    discount = Decimal(str(proposal.discount or 0))
    shipping = Decimal(str(proposal.shipping or 0))
    total_proposta = total_itens + shipping - discount

    # ── Outros itens (HTML sanitizado) ──
    outros_itens_html = _sanitize_html(proposal.other_items or "")

    # ── Número da proposta ──
    number_str = str(proposal.number) if proposal.number else "—"

    # ── Data da proposta ──
    data_proposta = _fmt_date(proposal.date)

    # ── Endereço de entrega (diferente) — linhas p/ o bloco de 2 colunas ──
    delivery_lines = ""
    if proposal.different_delivery_address and proposal.delivery_address:
        da = proposal.delivery_address

        def da_get(key):
            return _esc(str(da.get(key, "") or ""))

        street_line = da_get('street')
        if da.get('number'):
            street_line += f", {da_get('number')}"
        if da.get('complement'):
            street_line += f" {da_get('complement')}"

        city_state_cep = da_get('city')
        if da.get('state'):
            city_state_cep += f"/{da_get('state')}"
        if da.get('cep'):
            city_state_cep += f" — CEP: {da_get('cep')}"

        if da_get('recipient'):
            delivery_lines += f"{da_get('recipient')}<br>"
        if street_line:
            delivery_lines += f"{street_line}<br>"
        if da_get('district'):
            delivery_lines += f"Bairro: {da_get('district')}<br>"
        if city_state_cep:
            delivery_lines += f"{city_state_cep}<br>"
        if da.get('state_registration'):
            delivery_lines += f"Insc. estadual: {da_get('state_registration')}<br>"
        if da.get('document'):
            delivery_lines += f"CPF/CNPJ: {da_get('document')}<br>"
        if da.get('phone'):
            delivery_lines += f"Fone: {da_get('phone')}<br>"

    # ── Condições gerais (linhas da tabela label | valor) ──
    def _cg_row(label, value):
        return f"<tr><td><strong>{label}</strong></td><td>{value}</td></tr>" if value else ""
    cond_gerais_rows = (
        _cg_row("Forma de envio", _esc(proposal.shipping_method or ""))
        + _cg_row("Forma de frete", _esc(proposal.freight_type or ""))
        + _cg_row("Validade da proposta", f"{proposal.validity_days} dias" if proposal.validity_days else "")
        + _cg_row("Data prevista de entrega", _fmt_date(proposal.delivery_date) if proposal.delivery_date else "")
        + _cg_row("Prazo de entrega", _esc(proposal.delivery_desc or ""))
    )

    # ── Assinatura ──
    signature_html = ""
    if proposal.signature:
        sig = _esc(proposal.signature).replace("\n", "<br>")
        signature_html = f"""
<div class="assinatura">{sig}</div>"""

    # ── Box do endereço do cliente ──
    addr_lines = ""
    if client_document:
        addr_lines += f"{client_document}<br>"
    if client_address:
        addr_lines += f"{client_address}<br>"
    if client_city_state:
        addr_lines += f"{client_city_state}<br>"
    if fone_email_line:
        addr_lines += fone_email_line
    if not addr_lines:
        addr_lines = "—"

    # ── Bloco de endereço: 2 colunas (Cliente | Entrega) quando há entrega diferente ──
    if proposal.different_delivery_address and delivery_lines:
        endereco_block = f"""
<div class="endereco-2col">
  <div class="endereco-col">
    <div class="secao-titulo">Endereço do Cliente</div>
    <div class="box">{addr_lines}</div>
  </div>
  <div class="endereco-col">
    <div class="secao-titulo">Endereço de Entrega</div>
    <div class="box">{delivery_lines}</div>
  </div>
</div>"""
    else:
        endereco_block = f"""
<div class="secao">
  <div class="secao-titulo">Endereço do Cliente</div>
  <div class="box">{addr_lines}</div>
</div>"""

    # ── Introdução ──
    intro_block = ""
    if proposal.intro:
        intro_block = f"""
<div class="secao">
  <div class="secao-titulo">Introdução</div>
  <p>{_esc(proposal.intro)}</p>
</div>"""

    # ── Outros itens ──
    outros_block = ""
    if outros_itens_html.strip():
        outros_block = f"""
<div class="secao">
  <div class="secao-titulo">Outros itens ou serviços</div>
  <div class="box"><div class="outros-itens-conteudo">{outros_itens_html}</div></div>
</div>"""

    # ── Condições comerciais block (Dias | Valor | Obs) ──
    cond_comerciais_block = ""
    if proposal.payment_terms:
        cond_comerciais_block = f"""
<div class="secao">
  <div class="secao-titulo">Condições comerciais</div>
  <table class="totais">
    <thead><tr><th style="width:100px">Dias</th><th class="right" style="width:130px">Valor</th><th>Obs.</th></tr></thead>
    <tbody><tr><td>{_esc(proposal.payment_terms)}</td><td class="right">{_fmt_currency(total_proposta)}</td><td></td></tr></tbody>
  </table>
</div>"""

    # ── Condições gerais block (tabela label | valor) ──
    cond_gerais_block = ""
    if cond_gerais_rows:
        cond_gerais_block = f"""
<div class="secao">
  <div class="secao-titulo">Condições gerais</div>
  <table class="cond2"><tbody>{cond_gerais_rows}</tbody></table>
</div>"""

    # ── Observações ──
    obs_block = ""
    if proposal.notes:
        obs_block = f"""
<div class="secao">
  <div class="secao-titulo">Observações</div>
  <div class="box">{_esc(proposal.notes).replace(chr(10), '<br>')}</div>
</div>"""

    # ── Tabela de totais (fechamento) ──
    totais_block = f"""
<div class="secao">
  <div class="secao-titulo">Totais</div>
  <table class="totais">
    <thead>
      <tr>
        <th>Data</th>
        <th class="right">Total dos itens</th>
        <th class="right">Desconto</th>
        <th class="right">Frete</th>
        <th class="right">Total da proposta</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>{data_proposta}</td>
        <td class="right">{_fmt_currency(total_itens)}</td>
        <td class="right">{_fmt_currency(discount)}</td>
        <td class="right">{_fmt_currency(shipping)}</td>
        <td class="right"><strong>{_fmt_currency(total_proposta)}</strong></td>
      </tr>
    </tbody>
  </table>
  <!-- (mantém Desconto como coluna extra; modelo externo embute desconto no preço) -->
</div>"""

    # ── Monta o HTML completo ──
    html = f"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Proposta Nº {number_str}</title>
  <style>{_CSS}</style>
</head>
<body>

<!-- ══ Cabeçalho ══ -->
<div class="header">
  <div class="header-logo-area">
    <!-- logo H&S (a adicionar) -->
  </div>
  <div class="header-company">
    <div class="company-name">HEALTH &amp; SAFETY DISTRIBUICAO IMPORTACAO E EXPORTACAO DE INST</div>
    <div class="company-line">08.857.492/0001-48</div>
    <div class="company-line">www.healthsafety.com.br</div>
    <div class="company-line">(81) 3052-3350</div>
    <div class="company-line">R VISCONDESSA DO LIVRAMENTO, 54, SALA G &mdash; DERBY, Recife - PE &mdash; 52.010-065</div>
  </div>
</div>

<!-- ══ Título ══ -->
<div class="titulo">Proposta Comercial N&ordm; {_esc(number_str)}</div>

<!-- ══ Para / Aos cuidados de ══ -->
<p class="para-linha">
  <strong>Para:</strong> {client_display}
  &nbsp;&nbsp;&middot;&nbsp;&nbsp;
  <strong>Aos cuidados de:</strong> {_esc(aos_cuidados)}
</p>

<!-- ══ Endereço do cliente (+ entrega, se diferente) ══ -->
{endereco_block}

{intro_block}

<!-- ══ Itens ══ -->
<div class="secao">
  <div class="secao-titulo">Itens de produto ou serviço</div>
  <table class="itens">
    <thead>
      <tr>
        <th style="width:26px">N&ordm;</th>
        <th>Item</th>
        <th style="width:88px">SKU / NCM</th>
        <th class="right" style="width:52px">Qtd</th>
        <th style="width:38px">Un</th>
        <th class="right" style="width:82px">Preço un</th>
        <th class="right" style="width:82px">Total</th>
      </tr>
    </thead>
    <tbody>
      {rows_html if rows_html else '<tr><td colspan="7" style="text-align:center;color:#888">Nenhum item</td></tr>'}
    </tbody>
  </table>
  <div class="itens-rodape">
    Número de itens: {n_itens}
    &nbsp;&nbsp;&middot;&nbsp;&nbsp;
    Soma das quantidades: {soma_qtds_str}
    &nbsp;&nbsp;&middot;&nbsp;&nbsp;
    Total dos itens: <strong>{_fmt_currency(total_itens)}</strong>
  </div>
</div>

{outros_block}

{totais_block}

{cond_comerciais_block}

{cond_gerais_block}

{obs_block}

{signature_html}

</body>
</html>"""

    return html


# ---------------------------------------------------------------------------
# Função principal
# ---------------------------------------------------------------------------

def generate_proposal_pdf(db: Session, proposal_id: int) -> bytes:
    """
    Busca a proposta pelo ID, gera o HTML e converte para PDF via WeasyPrint.
    Levanta HTTPException 404 se não encontrada.
    """
    proposal = (
        db.query(Proposal)
        .options(
            joinedload(Proposal.client),
            joinedload(Proposal.person),
            joinedload(Proposal.items),
        )
        .filter(Proposal.id == proposal_id, Proposal.deleted_at.is_(None))
        .first()
    )

    if not proposal:
        raise HTTPException(status_code=404, detail=f"Proposta {proposal_id} não encontrada.")

    html = _build_html(proposal)

    from weasyprint import HTML, default_url_fetcher  # import tardio

    # Segurança: bloqueia QUALQUER recurso externo (file://, http(s)://, etc.).
    # O template não usa recursos remotos, então só `data:` é permitido.
    # Isso neutraliza SSRF / leitura de arquivo local via recursos do HTML.
    def _safe_fetcher(url: str):
        if url.startswith("data:"):
            return default_url_fetcher(url)
        raise ValueError(f"Recurso externo bloqueado na geração do PDF: {url}")

    pdf_bytes = HTML(string=html, base_url=None, url_fetcher=_safe_fetcher).write_pdf()
    return pdf_bytes


def attach_proposal_pdf_to_card(db: Session, proposal: Proposal) -> None:
    """
    Gera o PDF da proposta e o anexa como arquivo ao card de serviço vinculado.

    - Se a proposta não tiver service_card_id, não faz nada.
    - Substitui qualquer PDF auto-anexado anterior para a mesma proposta
      (identificado via activity_metadata.proposal_pdf_id).
    - Erros de geração de PDF NÃO são propagados (apenas logados).
    - O arquivo criado aparece na aba "Arquivos" do card e pode ser deletado
      normalmente, exatamente como qualquer outro arquivo enviado via upload_file.
    """
    if not proposal.service_card_id:
        return

    from app.models.service_card_activity import ServiceCardActivity

    card_id = proposal.service_card_id
    number = proposal.number or proposal.id

    # Gera o PDF
    pdf = generate_proposal_pdf(db, proposal.id)

    # Garante que o diretório existe (igual a upload_file)
    card_dir = UPLOAD_DIR / "service_cards" / str(card_id)
    card_dir.mkdir(parents=True, exist_ok=True)

    # Nome de arquivo estável (substituível) para esta proposta
    filename = f"proposta-{number}.pdf"
    file_path_relative = f"service_cards/{card_id}/{filename}"

    # Remove registro e arquivo anteriores do PDF automático desta proposta
    try:
        old_activities = (
            db.query(ServiceCardActivity)
            .filter(
                ServiceCardActivity.service_card_id == card_id,
                ServiceCardActivity.category == "arquivo",
            )
            .all()
        )
        for act in old_activities:
            meta = act.activity_metadata or {}
            if meta.get("proposal_pdf_id") == proposal.id:
                # Remove o arquivo físico (best-effort)
                try:
                    fp = UPLOAD_DIR / act.file_path
                    if fp.exists():
                        fp.unlink()
                except Exception as e:
                    print(f"[PROPOSAL-PDF] erro ao remover arquivo antigo: {e}")
                db.delete(act)
        db.commit()
    except Exception as e:
        print(f"[PROPOSAL-PDF] erro ao limpar PDF anterior da proposta {proposal.id}: {e}")
        db.rollback()

    # Grava o PDF no disco
    with open(card_dir / filename, "wb") as f:
        f.write(pdf)

    # Cria a atividade de arquivo — campos idênticos ao upload_file
    activity = ServiceCardActivity(
        service_card_id=card_id,
        user_id=None,                                   # sistema (automático)
        category="arquivo",
        activity_type="file_attached",
        title=f"Proposta {number}.pdf",
        file_name=f"Proposta {number}.pdf",
        file_path=file_path_relative,
        file_size=len(pdf),
        mime_type="application/pdf",
        description=f"Proposta #{number} (PDF) — anexada automaticamente",
        activity_metadata={"proposal_pdf_id": proposal.id, "doc_slot": None},
    )
    db.add(activity)
    db.commit()
