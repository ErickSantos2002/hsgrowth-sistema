"""
Os tipos de aviso do CRM.

Fonte única: `notificar()` decide por aqui e a tela de Configurações é montada
daqui. Até 14/10/2026 a tela oferecia avisos que nunca existiram (e-mail,
badge, transferência) e salvava num console.log.

- `obrigatorio`: não dá para desligar e não tem coluna de preferência.
- `coluna`: a preferência em `user_notification_settings`. Sem coluna e sem
  ser obrigatório, quem chama decide os destinatários (card novo de Serviço
  vai para quem acompanha o board).
- `visivel`: aparece em Configurações.
"""
from dataclasses import dataclass
from typing import Optional


@dataclass(frozen=True)
class TipoDeAviso:
    id: str
    rotulo: str
    descricao: str
    icone: str
    cor: str
    obrigatorio: bool = False
    coluna: Optional[str] = None
    visivel: bool = True


TIPOS = (
    TipoDeAviso("lead_site", "Novo lead do site",
                "Quando um lead chega pelo site e é distribuído para você",
                "target", "success", obrigatorio=True),
    TipoDeAviso("card_atribuido", "Card atribuído a mim",
                "Quando outra pessoa, ou a distribuição automática, coloca você no card",
                "user-check", "info", obrigatorio=True),
    TipoDeAviso("tarefa_para_mim", "Tarefa criada para mim",
                "Quando outra pessoa cria ou passa uma tarefa para você",
                "check-square", "info", coluna="task_assigned"),
    TipoDeAviso("produto_no_card", "Produto no meu card",
                "Quando outra pessoa adiciona ou remove produto de um card seu",
                "package", "info", coluna="card_product_changed"),
    TipoDeAviso("reuniao_pronta", "Gravação e análise da reunião",
                "Quando a gravação ou a análise de uma reunião sua fica pronta",
                "video", "info", coluna="reuniao_pronta"),
    TipoDeAviso("resumo_manha", "Resumo da manhã",
                "Às 8h, de segunda a sexta: o que você tem para hoje e o que está atrasado",
                "sun", "info", coluna="resumo_manha"),
    TipoDeAviso("reuniao_15min", "Reunião em 15 minutos",
                "Aviso 15 minutos antes de cada reunião sua",
                "alarm-clock", "warning", coluna="reuniao_15min"),
    TipoDeAviso("card_novo_servico", "Card novo no board",
                "Quando chega card novo nos boards de Serviço que você acompanha",
                "inbox", "info"),
    TipoDeAviso("reuniao_falha", "Falha na gravação da reunião",
                "Quando a gravação de uma reunião não pôde ser processada",
                "alert-triangle", "danger", obrigatorio=True, visivel=False),
    TipoDeAviso("automacao", "Aviso de automação",
                "Enviado por uma automação configurada no board",
                "zap", "info", obrigatorio=True, visivel=False),
)

_POR_ID = {t.id: t for t in TIPOS}


def tipo_por_id(tipo_id: Optional[str]) -> Optional[TipoDeAviso]:
    return _POR_ID.get(tipo_id)
