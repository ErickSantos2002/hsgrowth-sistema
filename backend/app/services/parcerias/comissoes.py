"""
Comissões de Parcerias: lançamentos gerados quando a H&S confirma o ganho e
cancelados quando o ganho é desfeito antes do pagamento.

Regras (spec 2026-11-11, §4.1-4.2 e §8):
- Só venda gera comissão (`locacao` não; `modality` nula conta como venda).
- Base = produtos − desconto geral, sem o frete, nunca negativa.
- Y% venda própria para quem vendeu (empresa ou hunter), sem prazo.
- X% indicação + bônus fixo da primeira venda para o indicador da hora da
  confirmação (não excluído e não bloqueado). O X% vale até `âncora + meses`
  (meses de calendário), contando da primeira venda confirmada de quem vendeu.
- Um lançamento ativo (pendente/paga) por (oportunidade, tipo), seja qual for o
  beneficiário — o índice único parcial garante isso também numa corrida. O
  cancelado só é reaproveitado quando o beneficiário é o mesmo.
- A âncora (primeira venda) só é gravada com o programa de indicação ativo
  (X% ou bônus > 0): vendas de antes disso não queimam o bônus nem o prazo.
"""
from datetime import date, datetime, time, timedelta, timezone
from decimal import ROUND_HALF_UP, Decimal
from typing import List, Optional, Tuple
from zoneinfo import ZoneInfo

from dateutil.relativedelta import relativedelta
from fastapi import HTTPException, status
from sqlalchemy import func, or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.partner import Partner
from app.models.partner_commission import PartnerCalibration, PartnerCommission, PartnerCommissionConfig
from app.models.partner_opportunity import PartnerOpportunity
from app.models.user import User
from app.services.parcerias import acesso, respostas

CENTAVO = Decimal("0.01")
ZERO = Decimal("0.00")
ATIVOS = ("pendente", "paga")
FUSO = ZoneInfo("America/Sao_Paulo")
MESES_PADRAO = 24


def _dinheiro(valor) -> Decimal:
    return Decimal(str(valor or 0)).quantize(CENTAVO, rounding=ROUND_HALF_UP)


def base_sem_frete(db: Session, op: PartnerOpportunity) -> Decimal:
    """Produtos − desconto geral, sem o frete, nunca negativa."""
    total = respostas.totais_de_produtos(db, [op.id]).get(op.id, ZERO)
    return max(ZERO, respostas.produtos_menos_desconto(total, op))


def _padrao() -> PartnerCommissionConfig:
    """Configuração enquanto a H&S não salvou nenhuma: tudo zero, prazo de 24 meses (não gravada)."""
    return PartnerCommissionConfig(own_sale_pct=0, indication_pct=0, first_sale_bonus=0,
                                   indication_months=MESES_PADRAO, calibration_pct=0)


def _config(db: Session) -> PartnerCommissionConfig:
    """A linha única; sem ela, o padrão (tudo zero: nada é gerado e a âncora não é gravada)."""
    return db.query(PartnerCommissionConfig).first() or _padrao()


def _programa_ativo(cfg: PartnerCommissionConfig) -> bool:
    """O programa de indicação só começa a contar depois que a H&S preenche X% ou o bônus."""
    return Decimal(str(cfg.indication_pct or 0)) > 0 or Decimal(str(cfg.first_sale_bonus or 0)) > 0


def _pode_receber(ind: Optional[Partner], vendedor: Partner) -> bool:
    return ind is not None and ind.id != vendedor.id and not ind.is_deleted and ind.stage != "bloqueado"


def _indicador(db: Session, vendedor: Partner) -> Optional[Partner]:
    """Quem indicou o vendedor agora — se ainda existe e não está bloqueado."""
    # Pela coluna, não pela relationship: a troca de indicador vale na hora.
    if vendedor.indicated_by_partner_id is None:
        return None
    ind = db.get(Partner, vendedor.indicated_by_partner_id)
    return ind if _pode_receber(ind, vendedor) else None


def _consulta_do_vendedor(db: Session, partner_id: int):
    return db.query(Partner).filter(Partner.id == partner_id).populate_existing().with_for_update()


def _travar_vendedor(db: Session, partner_id: Optional[int]) -> Optional[Partner]:
    """
    Relê e trava a linha de quem vendeu: duas primeiras vendas confirmadas ao mesmo
    tempo não ganham as duas o bônus — a segunda espera e já vê a âncora gravada.
    """
    if partner_id is None:
        return None
    db.flush()  # o populate_existing não pode apagar alteração ainda não gravada
    return _consulta_do_vendedor(db, partner_id).first()


def _ja_lancado(db: Session, op_id: int, kind: str) -> bool:
    """Já há lançamento ativo deste tipo na oportunidade (de qualquer beneficiário)?"""
    return db.query(PartnerCommission.id).filter(
        PartnerCommission.opportunity_id == op_id,
        PartnerCommission.kind == kind,
        PartnerCommission.status.in_(ATIVOS),
    ).first() is not None


def _lancar(db: Session, op: PartnerOpportunity, kind: str, beneficiario_id: int, base: Decimal,
            agora: datetime, rate=None, fixed_value=None) -> Optional[PartnerCommission]:
    if rate is not None:
        rate = Decimal(str(rate))
        valor = (base * rate / 100).quantize(CENTAVO, rounding=ROUND_HALF_UP)
    else:
        fixed_value = _dinheiro(fixed_value)
        valor = fixed_value
    if valor <= 0 or _ja_lancado(db, op.id, kind):
        return None

    cancelado = db.query(PartnerCommission).filter(
        PartnerCommission.opportunity_id == op.id,
        PartnerCommission.kind == kind,
        PartnerCommission.beneficiary_partner_id == beneficiario_id,
        PartnerCommission.status == "cancelada",
    ).order_by(PartnerCommission.id).first()
    try:
        # Savepoint: se outra transação gerou antes (índice único), só este lançamento volta.
        with db.begin_nested():
            c = cancelado or PartnerCommission(
                opportunity_id=op.id, kind=kind, beneficiary_partner_id=beneficiario_id, created_at=agora,
            )
            c.source_partner_id = op.partner_id
            c.base_value, c.rate, c.fixed_value, c.amount = base, rate, fixed_value, valor
            c.status = "pendente"
            c.cancelled_at = c.cancel_reason = None
            db.add(c)
            db.flush()
    except IntegrityError:
        return None  # já gerado por outra confirmação
    return c


def gerar(db: Session, op: PartnerOpportunity, agora: datetime) -> List[PartnerCommission]:
    """Lançamentos da confirmação do ganho. Não faz commit (vai na transação da confirmação)."""
    if op.modality == "locacao":
        return []
    vendedor = _travar_vendedor(db, op.partner_id)
    cfg = _config(db)
    base = base_sem_frete(db, op)
    gerados = [_lancar(db, op, "venda_propria", vendedor.id, base, agora, rate=cfg.own_sale_pct)]
    if not _programa_ativo(cfg):
        # Sem X% nem bônus, nada de indicação e a âncora não é gravada.
        db.flush()
        return [c for c in gerados if c is not None]

    # A âncora é a primeira venda confirmada de quem vendeu, com ou sem indicador.
    primeira = vendedor.first_sale_at is None or vendedor.first_sale_opportunity_id == op.id
    if vendedor.first_sale_at is None:
        vendedor.first_sale_at = agora
        vendedor.first_sale_opportunity_id = op.id

    indicador = _indicador(db, vendedor)
    if indicador is not None:
        if primeira:
            gerados.append(_lancar(db, op, "bonus_primeira_venda", indicador.id, base, agora,
                                   fixed_value=cfg.first_sale_bonus))
        prazo = vendedor.first_sale_at + relativedelta(months=int(cfg.indication_months or MESES_PADRAO))
        if agora <= prazo:
            gerados.append(_lancar(db, op, "indicacao", indicador.id, base, agora, rate=cfg.indication_pct))
    db.flush()
    return [c for c in gerados if c is not None]


def _reancorar(db: Session, vendedor: Partner, desfeita: PartnerOpportunity, agora: datetime) -> None:
    """
    A primeira venda foi desfeita sem nada pago: a próxima venda confirmada vira a
    âncora e recebe o bônus — para o indicador do X% já lançado nela ou, sem X%, o
    indicador atual de quem vendeu; bloqueado ou excluído não recebe. Só conta venda
    com algum lançamento (as confirmadas antes da 1.11.19 não são âncora). Sem outra
    venda assim, a âncora fica vazia e a próxima confirmação vira a primeira.
    """
    cfg = _config(db)
    tem_lancamento = db.query(PartnerCommission.id).filter(
        PartnerCommission.opportunity_id == PartnerOpportunity.id,
    ).exists()
    outra = None
    if _programa_ativo(cfg):
        outra = db.query(PartnerOpportunity).filter(
            PartnerOpportunity.partner_id == vendedor.id,
            PartnerOpportunity.id != desfeita.id,
            PartnerOpportunity.won_confirmed_at.isnot(None),
            or_(PartnerOpportunity.modality.is_(None), PartnerOpportunity.modality != "locacao"),
            PartnerOpportunity.is_deleted.is_(False),
            tem_lancamento,
        ).order_by(PartnerOpportunity.won_confirmed_at, PartnerOpportunity.id).first()
    if outra is None:
        vendedor.first_sale_at = vendedor.first_sale_opportunity_id = None
        return
    vendedor.first_sale_at = outra.won_confirmed_at
    vendedor.first_sale_opportunity_id = outra.id
    indicacao = db.query(PartnerCommission).filter(
        PartnerCommission.opportunity_id == outra.id,
        PartnerCommission.kind == "indicacao",
        PartnerCommission.status.in_(ATIVOS),
    ).first()
    if indicacao is not None:
        beneficiario = db.get(Partner, indicacao.beneficiary_partner_id)
        if not _pode_receber(beneficiario, vendedor):
            return
        base = _dinheiro(indicacao.base_value)
    else:
        beneficiario = _indicador(db, vendedor)
        if beneficiario is None:
            return
        base = base_sem_frete(db, outra)
    _lancar(db, outra, "bonus_primeira_venda", beneficiario.id, base, agora, fixed_value=cfg.first_sale_bonus)


def cancelar_da_oportunidade(db: Session, op: PartnerOpportunity, motivo: str) -> None:
    """
    Ganho negado ou desfeito: cancela os pendentes da oportunidade, calibração
    inclusive (o pago fica), e refaz a âncora se cabe.
    """
    agora = datetime.utcnow()
    vendedor = _travar_vendedor(db, op.partner_id)
    pendentes = db.query(PartnerCommission).filter(
        PartnerCommission.opportunity_id == op.id,
        PartnerCommission.status == "pendente",
    ).with_for_update().all()
    for c in pendentes:
        c.status = "cancelada"
        c.cancelled_at = agora
        c.cancel_reason = (motivo or "")[:255] or None
    db.flush()

    if vendedor is not None and vendedor.first_sale_opportunity_id == op.id:
        algo_pago = db.query(PartnerCommission.id).filter(
            PartnerCommission.opportunity_id == op.id,
            PartnerCommission.status == "paga",
        ).first()
        if algo_pago is None:
            _reancorar(db, vendedor, op, agora)
    db.flush()


# ─── Consulta, pagamento e calibração ────────────────────────────────────────

MSG_SO_FINANCEIRO = "Só o Financeiro, admin ou gerente marcam pagamento."
MSG_LIMITE_CALIBRACAO = "Este aparelho já tem 2 calibrações com comissão."
MSG_CALIBRACAO_SEM_GANHO = "Só oportunidade com ganho confirmado recebe calibração."
MSG_CALIBRACAO_BLOQUEADO = "Parceiro bloqueado: desbloqueie antes de lançar calibração."
LIMITE_CALIBRACOES = 2
VEEM_TUDO = ("admin", "manager", "finance")
FINANCEIRO = ("admin", "manager", "finance")


def exigir_ver_tudo(user: User) -> None:
    if acesso.perfil(user) not in VEEM_TUDO:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Só admin, gerente ou Financeiro.")


def exigir_pagador(user: User) -> None:
    if acesso.perfil(user) not in FINANCEIRO:
        raise HTTPException(status.HTTP_403_FORBIDDEN, MSG_SO_FINANCEIRO)


def ler_config(db: Session) -> PartnerCommissionConfig:
    """Sem linha gravada, devolve o padrão sem gravar (a linha nasce no primeiro PUT)."""
    return _config(db)


def salvar_config(db: Session, user: User, dados) -> PartnerCommissionConfig:
    acesso.exigir_gestao(user)
    cfg = db.query(PartnerCommissionConfig).with_for_update().first()
    if cfg is None:
        cfg = PartnerCommissionConfig()
        db.add(cfg)
    cfg.own_sale_pct = dados.own_sale_pct
    cfg.indication_pct = dados.indication_pct
    cfg.first_sale_bonus = dados.first_sale_bonus
    cfg.indication_months = dados.indication_months
    cfg.calibration_pct = dados.calibration_pct
    cfg.updated_by_id = user.id
    cfg.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(cfg)
    return cfg


def _meia_noite_utc(d: date) -> datetime:
    """Meia-noite do dia `d` em São Paulo, em UTC sem fuso (como o banco grava)."""
    return datetime.combine(d, time.min, tzinfo=FUSO).astimezone(timezone.utc).replace(tzinfo=None)


def _limites_utc(de: Optional[date], ate: Optional[date]) -> Tuple[Optional[datetime], Optional[datetime]]:
    """Dias de calendário de São Paulo, inclusivos: [00:00 de `de`, 00:00 do dia seguinte a `ate`)."""
    return (_meia_noite_utc(de) if de is not None else None,
            _meia_noite_utc(ate + timedelta(days=1)) if ate is not None else None)


def _filtrar(q, de: Optional[date], ate: Optional[date]):
    inicio, fim = _limites_utc(de, ate)
    if inicio is not None:
        q = q.filter(PartnerCommission.created_at >= inicio)
    if fim is not None:
        q = q.filter(PartnerCommission.created_at < fim)
    return q


def _escopo(db: Session, user: User, beneficiario: Optional[int]):
    """Consulta de lançamentos já restrita ao que o login pode ver."""
    perfil = acesso.perfil(user)
    q = db.query(PartnerCommission)
    if perfil in VEEM_TUDO:
        if beneficiario is not None:
            q = q.filter(PartnerCommission.beneficiary_partner_id == beneficiario)
    elif perfil in (acesso.PARCEIRO_DONO, acesso.HUNTER):
        # Ignora o parâmetro: só os próprios lançamentos.
        q = q.filter(PartnerCommission.beneficiary_partner_id == acesso.parceiro_do_login(user))
    else:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Você não tem acesso às comissões.")
    return q


def _como_resposta(db: Session, lancs: List[PartnerCommission]) -> list:
    ids = {x for c in lancs for x in (c.beneficiary_partner_id, c.source_partner_id)}
    nomes = dict(db.query(Partner.id, Partner.name).filter(Partner.id.in_(ids)).all()) if ids else {}
    ops = {c.opportunity_id for c in lancs}
    titulos = dict(db.query(PartnerOpportunity.id, PartnerOpportunity.title)
                   .filter(PartnerOpportunity.id.in_(ops)).all()) if ops else {}
    return [{
        "id": c.id, "beneficiary_partner_id": c.beneficiary_partner_id,
        "beneficiary_name": nomes.get(c.beneficiary_partner_id),
        "source_partner_id": c.source_partner_id, "source_name": nomes.get(c.source_partner_id),
        "opportunity_id": c.opportunity_id, "opportunity_title": titulos.get(c.opportunity_id),
        "calibration_id": c.calibration_id, "kind": c.kind, "base_value": c.base_value,
        "rate": c.rate, "fixed_value": c.fixed_value, "amount": c.amount, "status": c.status,
        "created_at": c.created_at, "paid_at": c.paid_at, "cancelled_at": c.cancelled_at,
        "cancel_reason": c.cancel_reason,
    } for c in lancs]


def listar(db: Session, user: User, status_: Optional[str], beneficiario: Optional[int],
           de: Optional[date], ate: Optional[date]) -> list:
    q = _filtrar(_escopo(db, user, beneficiario), de, ate)
    if status_:
        q = q.filter(PartnerCommission.status == status_)
    return _como_resposta(db, q.order_by(PartnerCommission.created_at.desc(), PartnerCommission.id.desc()).all())


def resumo(db: Session, user: User, status_: Optional[str] = None, beneficiario: Optional[int] = None,
           de: Optional[date] = None, ate: Optional[date] = None) -> dict:
    q = _filtrar(_escopo(db, user, beneficiario), de, ate)
    somas = {s: ZERO for s in ("pendente", "paga", "cancelada")}
    for st, total in q.with_entities(PartnerCommission.status, func.sum(PartnerCommission.amount)) \
            .group_by(PartnerCommission.status).all():
        somas[st] = _dinheiro(total)
    return {"pendente": somas["pendente"], "pago": somas["paga"], "cancelado": somas["cancelada"]}


def a_pagar(db: Session, user: User, de: Optional[date], ate: Optional[date]) -> list:
    exigir_ver_tudo(user)
    lancs = _filtrar(db.query(PartnerCommission).filter(PartnerCommission.status == "pendente"), de, ate) \
        .order_by(PartnerCommission.created_at, PartnerCommission.id).all()
    grupos = {}
    for item in _como_resposta(db, lancs):
        grupos.setdefault(item["beneficiary_partner_id"], []).append(item)
    parceiros = {p.id: p for p in db.query(Partner).filter(Partner.id.in_(list(grupos))).all()} if grupos else {}
    saida = []
    for pid, itens in grupos.items():
        p = parceiros.get(pid)
        eh_hunter = p is not None and p.kind == "hunter"
        saida.append({
            "beneficiary_partner_id": pid,
            "nome": p.name if p else str(pid),
            "kind": "hunter" if eh_hunter else "empresa",
            "documento": ((p.cpf or p.cnpj) if eh_hunter else p.cnpj) if p else None,
            "pix_key": p.pix_key if p else None,
            "total": sum((i["amount"] for i in itens), ZERO),
            "quantidade": len(itens),
            "lancamentos": itens,
        })
    saida.sort(key=lambda g: (-g["total"], g["nome"]))
    return saida


def _virgula(valor: Decimal) -> str:
    return f"{Decimal(valor):.2f}".replace(".", ",")


def _celula(texto) -> str:
    """Neutraliza fórmula (=, +, -, @) e o separador no CSV aberto em planilha."""
    # CNPJ/CPF vão como estão: abra no Excel importando como texto para manter zeros à esquerda.
    t = "" if texto is None else str(texto).replace("\r", " ").replace("\n", " ")
    telefone = t[:1] == "+" and t[1:].isdigit()  # chave PIX de telefone não é fórmula
    if t[:1] in ("=", "+", "-", "@", "\t") and not telefone:
        t = "'" + t
    if ";" in t or '"' in t:
        t = '"' + t.replace('"', '""') + '"'
    return t


def a_pagar_csv(db: Session, user: User, de: Optional[date], ate: Optional[date]) -> str:
    linhas = ["Beneficiário;Tipo;Documento;Chave PIX;Quantidade;Total"]
    for g in a_pagar(db, user, de, ate):
        linhas.append(";".join([
            _celula(g["nome"]), _celula(g["kind"]), _celula(g["documento"]), _celula(g["pix_key"]),
            str(g["quantidade"]), _virgula(g["total"]),
        ]))
    return "﻿" + "\r\n".join(linhas) + "\r\n"


def pagar(db: Session, user: User, dados) -> dict:
    exigir_pagador(user)
    q = db.query(PartnerCommission).filter(PartnerCommission.status == "pendente")
    if dados.ids is not None:
        pedidos = set(dados.ids)
        q = q.filter(PartnerCommission.id.in_(pedidos))
    else:
        pedidos = None
        q = _filtrar(q.filter(PartnerCommission.beneficiary_partner_id == dados.beneficiary_partner_id),
                     dados.de, dados.ate)
    pendentes = q.with_for_update().all()
    agora = datetime.utcnow()
    for c in pendentes:
        c.status, c.paid_at, c.paid_by_id = "paga", agora, user.id
    db.commit()
    return {
        "quantidade": len(pendentes),
        "total": sum((c.amount for c in pendentes), ZERO),
        "ignorados": (len(pedidos) - len(pendentes)) if pedidos is not None else 0,
    }


def _op_para_calibracao(db: Session, user: User, opportunity_id: int, escrever: bool) -> PartnerOpportunity:
    perfil = acesso.perfil(user)
    if escrever:
        if perfil not in FINANCEIRO:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Só o Financeiro, admin ou gerente lançam calibração.")
    elif perfil == acesso.PARCEIRO_VENDEDOR or perfil not in VEEM_TUDO + (acesso.PARCEIRO_DONO, acesso.HUNTER):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Você não tem acesso às calibrações.")
    op = acesso.buscar_oportunidade(db, user, opportunity_id)
    if not escrever:
        acesso.exigir_oportunidade_propria(user, op)
    return op


def listar_calibracoes(db: Session, user: User, opportunity_id: int) -> list:
    op = _op_para_calibracao(db, user, opportunity_id, escrever=False)
    cals = db.query(PartnerCalibration).filter(PartnerCalibration.opportunity_id == op.id) \
        .order_by(PartnerCalibration.id).all()
    valores = dict(db.query(PartnerCommission.calibration_id, PartnerCommission.amount).filter(
        PartnerCommission.opportunity_id == op.id, PartnerCommission.kind == "calibracao",
        PartnerCommission.status != "cancelada").all())
    return [{"id": c.id, "opportunity_id": c.opportunity_id, "serial_number": c.serial_number,
             "calibration_date": c.calibration_date, "value": c.value, "created_at": c.created_at,
             "commission_amount": valores.get(c.id)} for c in cals]


def lancar_calibracao(db: Session, user: User, opportunity_id: int, dados) -> dict:
    op = _op_para_calibracao(db, user, opportunity_id, escrever=True)
    # Trava a oportunidade: duas calibrações simultâneas do mesmo aparelho não passam do limite.
    op = db.query(PartnerOpportunity).filter(PartnerOpportunity.id == op.id) \
        .populate_existing().with_for_update().one()
    if op.won_confirmed_at is None:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, MSG_CALIBRACAO_SEM_GANHO)
    if op.partner is None or op.partner.is_deleted or op.partner.stage == "bloqueado":
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, MSG_CALIBRACAO_BLOQUEADO)
    # Só conta a calibração que gerou comissão: a mensagem do limite fala disso.
    existentes = db.query(func.count(PartnerCalibration.id)).join(
        PartnerCommission, PartnerCommission.calibration_id == PartnerCalibration.id,
    ).filter(
        PartnerCalibration.opportunity_id == op.id,
        PartnerCalibration.serial_number == dados.serial_number,
        PartnerCommission.kind == "calibracao",
        PartnerCommission.status.in_(ATIVOS),
    ).scalar() or 0
    if existentes >= LIMITE_CALIBRACOES:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, MSG_LIMITE_CALIBRACAO)

    agora = datetime.utcnow()
    if dados.calibration_date > agora.date():
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Data da calibração no futuro.")
    cal = PartnerCalibration(opportunity_id=op.id, serial_number=dados.serial_number,
                             calibration_date=dados.calibration_date, value=_dinheiro(dados.value),
                             created_by_id=user.id, created_at=agora)
    db.add(cal)
    db.flush()

    comissao = None
    # Só empresa vendendo (não hunter) e só venda (locação não gera) recebem Z%.
    if op.partner is not None and op.partner.kind == "empresa" and op.modality != "locacao":
        taxa = Decimal(str(_config(db).calibration_pct or 0))
        valor = (cal.value * taxa / 100).quantize(CENTAVO, rounding=ROUND_HALF_UP)
        if valor > 0:
            comissao = PartnerCommission(
                opportunity_id=op.id, calibration_id=cal.id, kind="calibracao",
                beneficiary_partner_id=op.partner_id, source_partner_id=op.partner_id,
                base_value=cal.value, rate=taxa, amount=valor, status="pendente", created_at=agora,
            )
            db.add(comissao)
    db.commit()
    db.refresh(cal)
    return {"id": cal.id, "opportunity_id": cal.opportunity_id, "serial_number": cal.serial_number,
            "calibration_date": cal.calibration_date, "value": cal.value, "created_at": cal.created_at,
            "commission_amount": comissao.amount if comissao else None}
