# Serviço — Marcar origem "Cobrança" no Ganho + KPI

**Data:** 21/09/2026
**Objetivo:** Sinalizar, no board de Serviço, que um negócio ganho veio de uma Cobrança, e medir a receita dessas conclusões numa KPI própria.

## Contexto / problema
O time de Cobrança dá ganho no board **Serviço Cobrança** (board 2) e formaliza a proposta.
O aparelho é enviado, chega na empresa e entra no board **Serviço** (board 1), onde o time de
Serviço dá ganho. Hoje nada no CRM sinaliza que aquele ganho do Serviço originou-se de uma
Cobrança. Falta rastreabilidade e uma métrica dessa receita.

## Decisões (validadas com o usuário)
- **Onde grava:** campo `from_collection` ("sim" | "nao") em `ServiceCard.business_info` (JSON já existente). **Sem migration.**
- **Escopo:** só board de **Serviço (board 1)**. Cobrança (board 2) não recebe o campo/modal.
- **Texto:** modal "Este negócio foi originado de uma Cobrança?"; rótulo no Resumo "Origem: Cobrança?".
- **Modal:** ao dar Ganho no board 1, **só abre se `from_collection` estiver em branco**. Se já
  respondido (no Resumo), segue direto. Ao responder no modal, grava no Resumo e conclui o Ganho.
  Fechar o modal sem responder cancela o Ganho (a resposta é obrigatória para ganhos novos).
- **KPI:** "Receita de Cobrança (concluída)", logo após "Receita Cobrança (Phoebus)", **só na dash de Serviço**.
  Soma o **valor total do negócio** (`value_by_card`) dos cards ganhos no período com `from_collection == "sim"`.
  É uma fatia da "Receita ganha" (respeita filtros de período/usuário da dashboard).

## Mudanças

### Backend
- `schemas/service_dashboard.py`: novo campo `from_collection_won_value: float = 0`.
- `services/service_dashboard_service.py`: calcular
  `from_collection_won_value = sum(value_by_card.get(c.id, 0.0) for c in won_cards if (c.business_info or {}).get("from_collection") == "sim")`
  e retornar no `ServiceDashboardResponse`.

### Frontend
- `services/serviceBoardService.ts`: adicionar `from_collection?: "sim" | "nao" | ""` em `ServiceBusinessInfo`.
- `pages/ServiceCardDetails.tsx`:
  - `ServiceSummarySection`: novo select "Origem: Cobrança?" (só `!isCobranca`), no modo edição e na lista de resumo.
  - Componente pai: estado do modal + `handleWin` (board 1) abre o modal quando `from_collection` vazio;
    ao responder, `updateCard({ business_info: { ...from_collection } })` e conclui o Ganho.
- `components/dashboard/ServiceDashboard.tsx`: nova `KpiCard` "Receita de Cobrança (concluída)" após a Phoebus,
  com tooltip; grade da 1ª linha vira `lg:grid-cols-7` quando `board !== 2`.

### Changelog (3 lugares) — v1.10.1
CHANGELOG.md, ChangelogModal.tsx, rodapé MainLayout.tsx.

## Fora de escopo
- Backfill de cards ganhos antes da mudança (ficam "não respondido" até edição manual do Resumo).
