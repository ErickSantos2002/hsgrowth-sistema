"""
Backfill de anotações (CardNote) para os cards de Cross-sell do Phoebus.

A observação "Cliente da base, candidato a Phoebus. Comprou R$..." veio no
Obs_Gerais_Card da planilha e foi para card.description — que o detalhe do card
(CardDetails.tsx) NÃO exibe. Este script copia essa observação para a aba
"Anotações" (tabela card_notes), que é visível.

- Fonte da observação: coluna Obs_Gerais_Card da Fase6-Import-Phoebus-Base-2026-09-24.xlsx,
  casada por CNPJ com o cliente de cada card.
- Alvo: os 148 cards Base / Cross Sell (ids 11455-11603).
- Autor da anotação: usuário 'integracao' (id=7) — nota gerada por integração.
- Idempotente: não recria se já existe uma anotação com o mesmo conteúdo no card.

Rode de dentro de backend/:  python scripts/imports/add_notes_phoebus.py
"""

import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

import openpyxl
from app.db.session import SessionLocal
from app.models.card import Card
from app.models.client import Client
from app.models.card_note import CardNote
from import_from_planilha import clean_cnpj, clean_str

PLANILHA   = os.path.join(os.path.dirname(__file__), "Fase6-Import-Phoebus-Base-2026-09-24.xlsx")
AUTHOR_ID  = 7            # usuário 'integracao'
ID_MIN, ID_MAX = 11455, 11603
COL_CNPJ, COL_OBS = 1, 40


def main():
    # 1) mapa CNPJ(14) -> Obs_Gerais_Card
    wb = openpyxl.load_workbook(PLANILHA, data_only=True)
    ws = wb["Importação_CRM"]
    obs_by_cnpj = {}
    for r in range(5, ws.max_row + 1):
        cnpj = clean_cnpj(ws.cell(r, COL_CNPJ).value)
        obs = clean_str(ws.cell(r, COL_OBS).value)
        if cnpj and obs:
            obs_by_cnpj[cnpj] = obs
    print(f"Observações lidas da planilha: {len(obs_by_cnpj)}")

    db = SessionLocal()
    cards = (
        db.query(Card)
        .filter(
            Card.acquisition_channel == "Base",
            Card.deal_type == "Cross Sell",
            Card.id >= ID_MIN,
            Card.id <= ID_MAX,
        )
        .all()
    )
    print(f"Cards Cross-sell alvo: {len(cards)}")

    criadas = puladas = sem_obs = 0
    for c in cards:
        cl = db.query(Client).filter(Client.id == c.client_id).first()
        cnpj = clean_cnpj(cl.document) if cl and cl.document else None
        obs = obs_by_cnpj.get(cnpj)
        if not obs:
            sem_obs += 1
            print(f"  AVISO: card {c.id} sem obs correspondente (cnpj {cnpj})")
            continue
        ja = (
            db.query(CardNote)
            .filter(CardNote.card_id == c.id, CardNote.content == obs)
            .first()
        )
        if ja:
            puladas += 1
            continue
        db.add(CardNote(card_id=c.id, user_id=AUTHOR_ID, content=obs, note_type="geral"))
        criadas += 1

    db.commit()
    db.close()
    print("=" * 50)
    print(f"Anotações criadas : {criadas}")
    print(f"Puladas (já tinha): {puladas}")
    print(f"Sem obs           : {sem_obs}")
    print("=" * 50)


if __name__ == "__main__":
    main()
