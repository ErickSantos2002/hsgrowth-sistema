/**
 * Opções de campos do blueprint da consultora
 * Centraliza todas as opções de dropdowns para fácil manutenção
 */

// ==================== PERSON ====================

export const PERSON_AREAS = [
  "CEO",
  "Coordenador(a)",
  "CSM",
  "Diretor(a)/C-Level",
  "Estagiário",
  "Gerente",
  "Inside Sales",
  "Marketing",
  "Onboarding",
  "Outro",
  "Outsourcing",
  "Product Owner",
  "SDR",
  "Sem Informação",
  "Suporte",
  "Tech Lead",
  "Vendedor(a)",
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
  "Laticínios",
  "Produção/Distribuição de Proteína Animal",
  "Varejo (e-commerce, lojas físicas)",
  "Atacado/Distribuição (FMCG, logística)",
  "Tecnologia/Software/SaaS",
  "Serviços Profissionais (consultorias, agências)",
  "Educação e Treinamento",
  "Saúde (hospitais, clínicas, farmacêuticas)",
  "Construção Civil e Infraestrutura",
  "Transportes e Logística",
  "Agronegócio e Cooperativas",
  "Energia e Utilities",
  "Financeiro (bancos, seguros, fintechs)",
  "Entretenimento e Mídia",
  "Terceiro Setor / ONGs",
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
    "Inbound - Levantada de mão (site / WhatsApp / formulário)",
  ],
  "Outbound": [
    "Outbound - Lista fria",
    "Outbound - LinkedIn",
    "Outbound - Cold email",
    "Outbound - Cold call",
  ],
  "Indicação": [
    "Indicação - Cliente",
    "Indicação - Parceiro",
    "Indicação - Network pessoal",
  ],
  "Parcerias": [
    "Parcerias - Co-marketing",
    "Parcerias - Integração tecnológica",
    "Parcerias - Revenda",
  ],
  "Eventos": [
    "Eventos - Feira",
    "Eventos - Webinar",
    "Eventos - Workshop",
    "Eventos - Meetup",
  ],
  "Base": [
    "Base - Reativação",
    "Base - Cross-sell",
    "Base - Up-sell",
  ],
};

export const LOSS_REASONS_PROSPECTION = [
  "Lead fora do ICP",
  "Sem contato / dados inválidos",
  "Falta de interesse",
  "Timing ruim",
  "Sem verba",
  "Decisor não identificado",
  "Não avançou / Ghosting",
  "Outros",
];

export const LOSS_REASONS_ACQUISITION = [
  "Preço / orçamento",
  "Sem budget aprovado",
  "Optou por concorrente",
  "Não tem fit com a solução",
  "Processo de vendas longo demais",
  "Decisor mudou",
  "Não avançou / Ghosting",
  "Questões contratuais",
  "Timing ruim",
  "Outros",
];

export const LOSS_REASONS_EXPANSION = [
  "Cliente insatisfeito",
  "Resultado não atingido",
  "Mudança de fornecedor",
  "Budget cortado",
  "Reestruturação interna",
  "Não renovou contrato",
  "Downgrade",
  "Outros",
];

// Mapeamento de board_id para motivos de perda
// Nota: Ajustar IDs conforme banco de dados real
export const LOSS_REASONS_BY_BOARD_NAME: Record<string, string[]> = {
  "Prospecção": LOSS_REASONS_PROSPECTION,
  "Aquisição": LOSS_REASONS_ACQUISITION,
  "Expansão": LOSS_REASONS_EXPANSION,
};

export const BOOLEAN_OPTIONS = [
  { value: "true", label: "Sim" },
  { value: "false", label: "Não" },
];
