import { Wrench, Sparkles, Zap, X } from "lucide-react";

/**
 * Tipos de entrada do changelog
 * - feature: nova funcionalidade
 * - fix: correção de bug
 * - improvement: melhoria em algo existente
 */
type EntryType = "feature" | "fix" | "improvement";

interface ChangelogEntry {
  type: EntryType;
  text: string;
}

interface ChangelogVersion {
  version: string;
  date: string;
  entries: ChangelogEntry[];
}

/**
 * Histórico de versões em linguagem acessível para todos os usuários.
 * Novas versões devem ser adicionadas no início da lista.
 */
const CHANGELOG: ChangelogVersion[] = [
  {
    version: "1.3.18",
    date: "11/03/2026",
    entries: [
      {
        type: "fix",
        text: "O botão 'Ligar' rápido (no canto da barra de abas do card) agora abre uma tela de seleção quando a pessoa tem mais de um número cadastrado — igual ao botão de ligar dentro das atividades. Se tiver apenas um número, continua ligando diretamente.",
      },
    ],
  },
  {
    version: "1.3.17",
    date: "10/03/2026",
    entries: [
      {
        type: "feature",
        text: "Novo botão 'Ligar' na barra de abas do card (ao lado de Atividade, Anotações, Calendário e Arquivos). Com um clique, o sistema cria a atividade de ligação automaticamente e já inicia a chamada — sem precisar preencher formulário. Se já houver uma atividade de ligação em aberto, o botão fica bloqueado e indica que você deve ir até ela para ligar.",
      },
      {
        type: "improvement",
        text: "Ao criar um novo card, agora é obrigatório informar o Tipo de Negócio, o Canal de Aquisição, vincular uma empresa e um contato. O card já nasce com tudo preenchido — sem precisar voltar depois para completar.",
      },
      {
        type: "improvement",
        text: "É possível buscar empresas e contatos existentes diretamente na modal de criação de card, ou cadastrar novos na hora sem perder o que já preencheu.",
      },
    ],
  },
  {
    version: "1.3.16",
    date: "09/03/2026",
    entries: [
      {
        type: "fix",
        text: "Corrigido problema onde o Webhook de automação não disparava quando o card era movido automaticamente por outra automação — apenas disparava em movimentos manuais. Agora o encadeamento de automações funciona corretamente.",
      },
    ],
  },
  {
    version: "1.3.15",
    date: "09/03/2026",
    entries: [
      {
        type: "feature",
        text: "Nova ação no editor de automações: Enviar Webhook. Configure uma URL e o sistema enviará os dados completos do card automaticamente quando a automação disparar. Suporta assinatura de segurança (HMAC) para o receptor validar a autenticidade.",
      },
    ],
  },
  {
    version: "1.3.14",
    date: "09/03/2026",
    entries: [
      {
        type: "feature",
        text: "Quatro novos campos adicionados no Resumo do card: Origem (editável), UTM Campaign, UTM Source e UTM Term. Os três campos UTM são preenchidos automaticamente via integração com sistemas externos.",
      },
    ],
  },
  {
    version: "1.3.13",
    date: "09/03/2026",
    entries: [
      {
        type: "feature",
        text: "Ao clicar em Ligar em uma atividade, se a pessoa tiver mais de um número cadastrado (Principal, WhatsApp ou Comercial), um menu aparece para você escolher qual número quer usar antes de iniciar a chamada.",
      },
    ],
  },
  {
    version: "1.3.12",
    date: "09/03/2026",
    entries: [
      {
        type: "fix",
        text: "Ao editar um cliente, limpar campos opcionais como Nome Fantasia, Email ou Telefone agora salva corretamente — antes, o valor antigo ficava mantido mesmo após apagar.",
      },
    ],
  },
  {
    version: "1.3.11",
    date: "05/03/2026",
    entries: [
      {
        type: "feature",
        text: "Administradores e gerentes agora podem ver quais usuários estão online em tempo real, na página de Configurações.",
      },
      {
        type: "feature",
        text: "Cada usuário agora tem configurações individuais de notificação.",
      },
      {
        type: "improvement",
        text: "Ao sair do sistema, o login é invalidado imediatamente — aumentando a segurança da conta.",
      },
      {
        type: "fix",
        text: "Atualização do sistema de autenticação para maior estabilidade e compatibilidade.",
      },
    ],
  },
  {
    version: "1.3.10",
    date: "04/03/2026",
    entries: [
      {
        type: "improvement",
        text: "Campos do card agora salvam automaticamente enquanto você digita — não é mais necessário clicar em salvar.",
      },
      {
        type: "fix",
        text: "Corrigidas permissões de edição em cards para garantir que apenas os responsáveis possam alterar.",
      },
    ],
  },
  {
    version: "1.3.9",
    date: "03/03/2026",
    entries: [
      {
        type: "feature",
        text: "Novo perfil de acesso: Visualizador. Usuários com esse perfil podem navegar pelo sistema sem poder criar, editar ou excluir nada.",
      },
    ],
  },
  {
    version: "1.3.8",
    date: "02/03/2026",
    entries: [
      {
        type: "improvement",
        text: "Nos relatórios, agora é possível clicar nos gráficos para ver os detalhes dos dados daquele ponto.",
      },
    ],
  },
  {
    version: "1.3.7",
    date: "28/02/2026",
    entries: [
      {
        type: "feature",
        text: "Gerentes e administradores agora podem ver o histórico de pontos de todos os usuários em uma única tela.",
      },
      {
        type: "improvement",
        text: "Histórico de pontos agora mostra a coluna 'Usuário' quando visualizado pela equipe.",
      },
    ],
  },
  {
    version: "1.3.6",
    date: "27/02/2026",
    entries: [
      {
        type: "feature",
        text: "Cada vendedor agora pode consultar seu próprio histórico de pontos de gamificação.",
      },
    ],
  },
  {
    version: "1.3.5",
    date: "25/02/2026",
    entries: [
      {
        type: "improvement",
        text: "Mensagens de erro agora aparecem de forma consistente em todo o sistema.",
      },
      {
        type: "improvement",
        text: "Novas ações disponíveis nas automações: atualizar campo de cliente e atribuir rodízio de SDR.",
      },
    ],
  },
  {
    version: "1.3.4",
    date: "24/02/2026",
    entries: [
      {
        type: "feature",
        text: "Calendário global: visualize todas as atividades do sistema em formato de calendário, com filtros por tipo e responsável.",
      },
    ],
  },
];

// Configuração visual por tipo de entrada
const ENTRY_CONFIG: Record<EntryType, { label: string; icon: React.ElementType; color: string }> = {
  feature: {
    label: "Novidade",
    icon: Sparkles,
    color: "text-blue-500 bg-blue-500/10 border-blue-500/20",
  },
  fix: {
    label: "Corrigido",
    icon: Wrench,
    color: "text-orange-500 bg-orange-500/10 border-orange-500/20",
  },
  improvement: {
    label: "Melhoria",
    icon: Zap,
    color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
  },
};

interface ChangelogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Modal de changelog acessível, com linguagem simples para todos os usuários.
 * Exibido ao clicar na versão do sistema na sidebar.
 */
const ChangelogModal: React.FC<ChangelogModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-200 px-6 py-5 dark:border-slate-700">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              O que há de novo?
            </h2>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
              Atualizações recentes do HSGrowth CRM
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-gray-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Lista de versões */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="space-y-8">
            {CHANGELOG.map((versionItem, versionIndex) => (
              <div key={versionItem.version}>
                {/* Cabeçalho da versão */}
                <div className="mb-3 flex items-center gap-3">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${
                      versionIndex === 0
                        ? "bg-emerald-500 text-white"
                        : "bg-gray-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                    }`}
                  >
                    v{versionItem.version}
                  </span>
                  <span className="text-xs text-slate-400 dark:text-slate-500">
                    {versionItem.date}
                  </span>
                  {versionIndex === 0 && (
                    <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                      Versão atual
                    </span>
                  )}
                </div>

                {/* Entradas da versão */}
                <div className="space-y-2">
                  {versionItem.entries.map((entry, entryIndex) => {
                    const config = ENTRY_CONFIG[entry.type];
                    const Icon = config.icon;

                    return (
                      <div
                        key={entryIndex}
                        className="flex items-start gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3 dark:border-slate-800 dark:bg-slate-800/50"
                      >
                        {/* Badge de tipo */}
                        <span
                          className={`mt-0.5 flex flex-shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${config.color}`}
                        >
                          <Icon size={10} />
                          {config.label}
                        </span>
                        <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                          {entry.text}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Rodapé */}
        <div className="flex-shrink-0 border-t border-gray-200 px-6 py-4 dark:border-slate-700">
          <p className="text-center text-xs text-slate-400 dark:text-slate-500">
            HSGrowth CRM &mdash; desenvolvido internamente pela equipe
          </p>
        </div>
      </div>
    </div>
  );
};

export default ChangelogModal;
