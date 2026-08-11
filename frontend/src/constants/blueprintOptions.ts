/**
 * Opções de campos do blueprint da consultora
 * Centraliza todas as opções de dropdowns para fácil manutenção
 */

// ==================== PERSON ====================

export const PERSON_AREAS = [
  "Operações",
  "Segurança do Trabalho / HSE / SST",
  "Manutenção",
  "Recursos Humanos (RH)",
  "Financeiro",
  "Compras / Suprimentos",
  "Diretoria / Sócios",
  "Tecnologia da Informação (TI)",
];

// ==================== CLIENT ====================

export const RELATIONSHIP_TYPES = [
  "Cliente",
  "Fornecedor",
  "Lead",
  "Parceiro",
  "Prospect",
  "Revendedor",
];

export const COMMERCIAL_ACTIVITIES = [
  "Ativo",
  "Dormente",
  "Inativo",
];

export const SECTORS = [
  "Indústria (manufatura em geral)",
  "Indústrias de Transformação",
  "Alimentos e Bebidas",
  "Frigoríficos",
  "Agroindústria / Agronegócio",
  "Processadoras de Grãos",
  "Usinas de Açúcar / Etanol",
  "Componentes Automotivos",
  "Logística e Transporte",
  "Construção Civil",
  "Mineração",
  "Óleo e Gás / Energia",
  "Química / Petroquímica",
  "Papel e Celulose",
  "Metalurgia / Siderurgia",
  "Portos e Terminais",
  "Saneamento / Utilidades Públicas",
  "Serviços Industriais / Facilities",
  "Cooperativas / Associações Produtivas",
  "Outros",
];

export const EMPLOYEE_COUNTS = [
  "Até 50 colaboradores",
  "51-100 colaboradores",
  "101-300 colaboradores",
  "301-600 colaboradores",
  "601-1.000 colaboradores",
  "Acima de 1.000 colaboradores",
];

export const ANNUAL_REVENUES = [
  "Até R$ 10 milhões",
  "R$ 10-30 milhões",
  "R$ 30-100 milhões",
  "R$ 100-300 milhões",
  "R$ 300 milhões - R$ 1 bilhão",
  "Acima de R$ 1 bilhão",
];

// ==================== CARD ====================

export const DEAL_TYPES = [
  "Nova Venda",
  "Cross Sell",
  "Up Sell",
];

export const ACQUISITION_CHANNELS = [
  "Inbound",
  "Outbound",
  "Indicação",
  "Parcerias",
  "Eventos",
  "Base",
];

export const ACQUISITION_CHANNEL_DETAILS: Record<string, string[]> = {
  "Inbound": [
    "Inbound - Conteúdo",
    "Inbound - Tráfego pago",
    "Inbound - SEO",
    "Inbound - Email marketing",
    "Inbound - Levantada de mão",
  ],
  "Outbound": [
    "Outbound - Lista fria",
    "Outbound - LinkedIn",
    "Outbound - Cold email",
    "Outbound - Cold call",
  ],
  "Indicação": [
    "Indicação - Cliente",
    "Indicação - Ex-cliente",
    "Indicação - Networking pessoal",
  ],
  "Parcerias": [
    "Parcerias - Consultorias",
    "Parcerias - Integradores",
    "Parcerias - Representantes",
    "Parcerias - Outras empresas",
  ],
  "Eventos": [
    "Eventos - Feira",
    "Eventos - Workshop próprio",
    "Eventos - Palestra",
    "Eventos - Meetup",
  ],
  "Base": [
    "Base - Resgate",
    "Base - Levantada de mão",
    "Base - e-mail marketing",
    "Base - Disparo whats",
  ],
};

export const LOSS_REASONS_PROSPECTION = [
  "Lead fora do ICP",
  "Sem contato / dados inválidos",
  "Lead inválido / duplicado / teste",
  "Sem interesse ou sem timing",
  "Não chegamos no responsável pelo tema",
  "Revenda",
  "Já cliente / em atendimento interno",
  "Cenário externo",
  "Produto não atende",
  "Demanda Calibração",
  "Demanda Suporte",
  "Não deu retorno",
  "Terceirizam o serviço",
];

export const LOSS_REASONS_ACQUISITION = [
  "Preço / orçamento",
  "Sem budget aprovado",
  "Prioridade mudou",
  "Solução não percebida como crítica",
  "Produto não atende / restrição técnica",
  "Proposta fora de timing",
  "Aprovação interna travada",
  "Perda para concorrência",
  "Demanda Calibração",
  "Demanda Suporte",
  "Não deu retorno",
  "Terceirizam o serviço",
];

export const LOSS_REASONS_EXPANSION = [
  "Preço / orçamento",
  "Sem budget aprovado",
  "Prioridade mudou",
  "Solução não percebida como crítica",
  "Produto não atende / restrição técnica",
  "Proposta fora de timing",
  "Aprovação interna travada",
  "Perda para concorrência",
  "Não deu retorno",
  "Terceirizam o serviço",
];

// Mapeamento de board_id para motivos de perda
// Nota: Ajustar IDs conforme banco de dados real
export const LOSS_REASONS_BY_BOARD_NAME: Record<string, string[]> = {
  "Prospecção": LOSS_REASONS_PROSPECTION,
  "Aquisição": LOSS_REASONS_ACQUISITION,
  "Expansão": LOSS_REASONS_EXPANSION,
};

// Mapeamento por board_id
export const LOSS_REASONS_BY_BOARD_ID: Record<number, string[]> = {
  6: LOSS_REASONS_PROSPECTION, // Prospecção
  7: LOSS_REASONS_ACQUISITION, // Aquisição
  8: LOSS_REASONS_EXPANSION,   // Expansão (Pós Venda)
};

// Motivos de perda do módulo de SERVIÇO (boards de Serviço e de Cobrança).
// Usados no modal de perda (ServiceCardDetails) e no filtro do kanban (ServiceKanban).
export const SERVICE_LOSS_REASONS = [
  "Não chegamos no responsável pelo tema",
  "Proposta fora do orçamento",
  "Manutenção não aprovada",
  "Sem budget aprovado",
  "Solução não percebida como crítica",
  "Aprovação interna travada",
  "Perda para concorrência",
  "Lead não deu mais retorno",
  "Data de Recalibração Errada",
  "Cliente Inadimplente",
  "Cliente em standby",
];

// Motivo exclusivo do Admin — descarte de cards criados errados (sem apagar).
export const SERVICE_ADMIN_LOSS_REASON = "Descarte administrativo — erro de cadastro";

export const BOOLEAN_OPTIONS = [
  { value: "true", label: "Sim" },
  { value: "false", label: "Não" },
];
