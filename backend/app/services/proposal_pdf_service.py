"""
Serviço de geração de PDF para Propostas Comerciais.
Usa WeasyPrint (HTML → PDF) com template inline.
"""
import re
from decimal import Decimal
from typing import Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session, joinedload

from app.models.proposal import Proposal


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


def _sanitize_html(html: Optional[str]) -> str:
    """
    Remove blocos <script> e <style> do HTML do Quill (defense-in-depth
    para o sink de PDF — Quill já sanitiza na entrada).
    """
    if not html:
        return ""
    html = re.sub(r"<script[\s\S]*?</script>", "", html, flags=re.IGNORECASE | re.DOTALL)
    html = re.sub(r"<style[\s\S]*?</style>", "", html, flags=re.IGNORECASE | re.DOTALL)
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
    font-size: 11px;
    color: #1a1a1a;
    margin: 0;
    padding: 0;
    line-height: 1.5;
}

/* Cabeçalho */
.header {
    display: table;
    width: 100%;
    margin-bottom: 16px;
    border-bottom: 2px solid #1a1a1a;
    padding-bottom: 10px;
}

.header-logo-area {
    display: table-cell;
    width: 40%;
    vertical-align: top;
    /* Logo pode ser adicionada aqui futuramente (ex: <img src="...logo.png">) */
    color: #666;
    font-size: 10px;
    font-style: italic;
}

.header-company {
    display: table-cell;
    width: 60%;
    text-align: right;
    vertical-align: top;
}

.header-company .company-name {
    font-size: 12px;
    font-weight: bold;
    margin-bottom: 2px;
}

.header-company .company-line {
    font-size: 10px;
    color: #444;
    line-height: 1.4;
}

/* Título */
.titulo {
    text-align: center;
    font-size: 15px;
    font-weight: bold;
    margin: 12px 0 16px 0;
    letter-spacing: 0.5px;
}

/* Seção genérica */
.secao {
    margin-bottom: 12px;
}

.secao-titulo {
    font-size: 11px;
    font-weight: bold;
    border-bottom: 1px solid #555;
    padding-bottom: 2px;
    margin-bottom: 6px;
    text-transform: uppercase;
    letter-spacing: 0.3px;
}

/* Caixa com borda */
.box {
    border: 1px solid #aaa;
    padding: 7px 10px;
    border-radius: 2px;
    margin-bottom: 6px;
    font-size: 10.5px;
    line-height: 1.6;
}

/* Linha para/aos-cuidados */
.para-linha {
    font-size: 11px;
    margin-bottom: 4px;
}

/* Tabela de itens */
table.itens {
    width: 100%;
    border-collapse: collapse;
    margin-top: 4px;
    font-size: 10.5px;
}

table.itens th {
    background: #f0f0f0;
    border: 1px solid #bbb;
    padding: 5px 7px;
    text-align: left;
    font-weight: bold;
}

table.itens td {
    border: 1px solid #bbb;
    padding: 4px 7px;
    vertical-align: top;
}

table.itens tr:nth-child(even) td {
    background: #fafafa;
}

table.itens td.right,
table.itens th.right {
    text-align: right;
}

.itens-rodape {
    margin-top: 5px;
    font-size: 10.5px;
    color: #333;
}

/* Totais */
.totais-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 11px;
}

.totais-table td {
    padding: 3px 6px;
}

.totais-table td.label {
    text-align: right;
    color: #555;
    width: 70%;
}

.totais-table td.valor {
    text-align: right;
    font-weight: bold;
    width: 30%;
}

.totais-table tr.total-final td {
    font-size: 12px;
    font-weight: bold;
    border-top: 2px solid #333;
    padding-top: 5px;
    color: #000;
}

/* Outros itens (HTML do Quill) */
.outros-itens-conteudo {
    font-size: 10.5px;
    line-height: 1.6;
}

.outros-itens-conteudo p { margin: 0 0 4px 0; }
.outros-itens-conteudo ul, .outros-itens-conteudo ol {
    margin: 0 0 4px 1em;
    padding: 0;
}

/* Assinatura */
.assinatura {
    margin-top: 20px;
    font-size: 11px;
    line-height: 1.8;
}
"""


def _build_html(proposal: Proposal) -> str:
    client = proposal.client
    person = proposal.person
    items = proposal.items or []

    # --- Dados do cliente ---
    client_display = "—"
    client_document = ""
    client_address = ""
    client_city_state = ""
    client_phone = ""
    client_email = ""

    if client:
        client_display = _esc(client.company_name or client.name or "—")
        client_document = _esc(client.document or "")
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

    # --- Dados da pessoa ---
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
    fone_email_line = " &nbsp;|&nbsp; ".join(fone_email_parts) if fone_email_parts else ""

    # --- Itens ---
    total_itens = Decimal("0")
    rows_html = ""
    for i, item in enumerate(items, 1):
        qty = float(item.quantity or 0)
        unit_price = float(item.unit_price or 0)
        total_item = float(item.total or 0)
        total_itens += Decimal(str(total_item))

        rows_html += f"""
        <tr>
          <td>{i}</td>
          <td>{_esc(item.description)}</td>
          <td>{_esc(item.sku or "")}</td>
          <td class="right">{qty:g}</td>
          <td>{_esc(item.unit or "")}</td>
          <td class="right">{_fmt_currency(unit_price)}</td>
          <td class="right">{_fmt_currency(total_item)}</td>
        </tr>"""

    n_itens = len(items)

    # --- Financeiro ---
    discount = Decimal(str(proposal.discount or 0))
    shipping = Decimal(str(proposal.shipping or 0))
    total_proposta = total_itens + shipping - discount

    # --- Outros itens (HTML sanitizado) ---
    outros_itens_html = _sanitize_html(proposal.other_items or "")

    # --- Número da proposta ---
    number_str = str(proposal.number) if proposal.number else "—"

    # --- Endereço de entrega (diferente) ---
    delivery_block = ""
    if proposal.different_delivery_address and proposal.delivery_address:
        da = proposal.delivery_address
        def da_get(key):
            return _esc(str(da.get(key, "") or ""))

        delivery_block = f"""
        <div class="secao">
          <div class="secao-titulo">Endereço de Entrega</div>
          <div class="box">
            <strong>Destinatário:</strong> {da_get('recipient')}<br>
            {da_get('street')}{', ' + da_get('number') if da.get('number') else ''}{', ' + da_get('complement') if da.get('complement') else ''}<br>
            <strong>Bairro:</strong> {da_get('district')}<br>
            {da_get('city')}{('/' + da_get('state')) if da.get('state') else ''}{(' — CEP ' + da_get('cep')) if da.get('cep') else ''}<br>
            {'<strong>CPF/CNPJ:</strong> ' + da_get('document') + '<br>' if da.get('document') else ''}
            {'<strong>Fone:</strong> ' + da_get('phone') + '<br>' if da.get('phone') else ''}
            {'<strong>Insc. estadual:</strong> ' + da_get('state_registration') + '<br>' if da.get('state_registration') else ''}
          </div>
        </div>"""

    # --- Condições comerciais ---
    condicoes_parts = []
    if proposal.payment_terms:
        condicoes_parts.append(f"<strong>Pagamento:</strong> {_esc(proposal.payment_terms)}")
    if proposal.validity_days:
        condicoes_parts.append(f"<strong>Validade:</strong> {proposal.validity_days} dias")
    if proposal.delivery_date:
        condicoes_parts.append(f"<strong>Data prevista de entrega:</strong> {_fmt_date(proposal.delivery_date)}")
    if proposal.delivery_desc:
        condicoes_parts.append(f"<strong>Prazo:</strong> {_esc(proposal.delivery_desc)}")
    if proposal.shipping_method:
        condicoes_parts.append(f"<strong>Forma de envio:</strong> {_esc(proposal.shipping_method)}")
    if proposal.freight_type:
        condicoes_parts.append(f"<strong>Frete:</strong> {_esc(proposal.freight_type)}")
    if proposal.carrier_name:
        condicoes_parts.append(f"<strong>Transportador:</strong> {_esc(proposal.carrier_name)}")
    condicoes_html = "<br>".join(condicoes_parts) if condicoes_parts else ""

    # --- Data da proposta ---
    data_proposta = _fmt_date(proposal.date)

    # --- Seller ---
    seller = _esc(proposal.seller_name or "")

    # --- Assinatura ---
    signature_html = ""
    if proposal.signature:
        sig = _esc(proposal.signature).replace("\n", "<br>")
        signature_html = f"""
        <div class="secao assinatura">
          <div class="secao-titulo">Assinatura</div>
          <div>{sig}</div>
        </div>"""

    # -----------------------------------------------------------------------
    # Monta o HTML completo
    # -----------------------------------------------------------------------
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
    <!-- Logo pode ser adicionada aqui futuramente, ex:
         <img src="data:image/png;base64,..." alt="Logo" style="max-height:60px"> -->
  </div>
  <div class="header-company">
    <div class="company-name">HEALTH &amp; SAFETY DISTRIBUICAO IMPORTACAO E EXPORTACAO DE INST</div>
    <div class="company-line">08.857.492/0001-48</div>
    <div class="company-line">www.healthsafety.com.br</div>
    <div class="company-line">(81) 3052-3350</div>
    <div class="company-line">R VISCONDESSA DO LIVRAMENTO, 54, SALA G — DERBY, Recife - PE — 52.010-065</div>
  </div>
</div>

<!-- ══ Título ══ -->
<div class="titulo">Proposta Comercial N&ordm; {_esc(number_str)}</div>

<!-- ══ Para / Aos cuidados de ══ -->
<div class="secao">
  <p class="para-linha">
    <strong>Para:</strong> {client_display}
    &nbsp;&nbsp;&middot;&nbsp;&nbsp;
    <strong>Aos cuidados de:</strong> {_esc(aos_cuidados)}
    {'&nbsp;&nbsp;&middot;&nbsp;&nbsp;<strong>Data:</strong> ' + data_proposta if data_proposta != '—' else ''}
    {'&nbsp;&nbsp;&middot;&nbsp;&nbsp;<strong>Vendedor:</strong> ' + seller if seller else ''}
  </p>
</div>

<!-- ══ Endereço do cliente ══ -->
<div class="secao">
  <div class="secao-titulo">Dados do Cliente</div>
  <div class="box">
    {'<strong>CNPJ/CPF:</strong> ' + client_document + '<br>' if client_document else ''}
    {client_address + '<br>' if client_address else ''}
    {client_city_state + '<br>' if client_city_state else ''}
    {fone_email_line if fone_email_line else ''}
    {'<br>' if not any([client_document, client_address, client_city_state, fone_email_line]) else ''}
    {'—' if not any([client_document, client_address, client_city_state, fone_email_line]) else ''}
  </div>
</div>

{'<!-- ══ Introdução ══ --><div class="secao"><div class="secao-titulo">Introdução</div><div class="box">' + _esc(proposal.intro) + '</div></div>' if proposal.intro else ''}

<!-- ══ Itens ══ -->
<div class="secao">
  <div class="secao-titulo">Itens de Produto ou Serviço</div>
  <table class="itens">
    <thead>
      <tr>
        <th style="width:28px">N&ordm;</th>
        <th>Item</th>
        <th style="width:90px">SKU</th>
        <th class="right" style="width:50px">Qtd</th>
        <th style="width:40px">Un</th>
        <th class="right" style="width:85px">Preço un</th>
        <th class="right" style="width:85px">Total</th>
      </tr>
    </thead>
    <tbody>
      {rows_html if rows_html else '<tr><td colspan="7" style="text-align:center;color:#888">Nenhum item</td></tr>'}
    </tbody>
  </table>
  <div class="itens-rodape">
    Número de itens: <strong>{n_itens}</strong>
    &nbsp;&nbsp;|&nbsp;&nbsp;
    Total dos itens: <strong>{_fmt_currency(total_itens)}</strong>
  </div>
</div>

{'<!-- ══ Outros itens ══ --><div class="secao"><div class="secao-titulo">Outros Itens ou Serviços</div><div class="box"><div class="outros-itens-conteudo">' + outros_itens_html + '</div></div></div>' if outros_itens_html.strip() else ''}

<!-- ══ Totais ══ -->
<div class="secao">
  <div class="secao-titulo">Resumo Financeiro</div>
  <table class="totais-table">
    <tr>
      <td class="label">Total dos itens:</td>
      <td class="valor">{_fmt_currency(total_itens)}</td>
    </tr>
    <tr>
      <td class="label">Desconto:</td>
      <td class="valor">({_fmt_currency(discount)})</td>
    </tr>
    <tr>
      <td class="label">Frete:</td>
      <td class="valor">{_fmt_currency(shipping)}</td>
    </tr>
    <tr class="total-final">
      <td class="label">Total da proposta:</td>
      <td class="valor">{_fmt_currency(total_proposta)}</td>
    </tr>
  </table>
</div>

{delivery_block}

{'<!-- ══ Condições comerciais ══ --><div class="secao"><div class="secao-titulo">Condições Comerciais</div><div class="box">' + condicoes_html + '</div></div>' if condicoes_html else ''}

{'<!-- ══ Observações ══ --><div class="secao"><div class="secao-titulo">Observações</div><div class="box">' + _esc(proposal.notes).replace(chr(10), '<br>') + '</div></div>' if proposal.notes else ''}

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

    import weasyprint  # import tardio — só carrega quando necessário
    pdf_bytes = weasyprint.HTML(string=html).write_pdf()
    return pdf_bytes
