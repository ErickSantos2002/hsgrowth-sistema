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
    version: "1.8.3",
    date: "23/07/2026",
    entries: [
      {
        type: "feature",
        text: "Proposta — modelo de texto em 'Outros itens': novo seletor para escolher o modelo do texto padrão entre 'Demais aparelhos' (padrão) e 'Aparelho Phoebus', cada um com seu conteúdo próprio (títulos, valores e códigos).",
      },
      {
        type: "feature",
        text: "Proposta — Aparelho Phoebus automático: ao criar a proposta por um card que tem um aparelho Phoebus, o modelo de texto já abre como 'Aparelho Phoebus', com o Serial do Aparelho (nº de série) e o Número do Módulo (campo 'Módulo de álcool' do aparelho) já preenchidos a partir do card.",
      },
      {
        type: "improvement",
        text: "Proposta — itens buscam Serviços: na tabela 'Itens de produto ou serviço', ao digitar na descrição o sistema passa a sugerir os Serviços do catálogo (antes sugeria produtos). Ao escolher, preenche descrição, código e preço do serviço.",
      },
      {
        type: "fix",
        text: "Proposta — PDF em produção: concluída a correção que impedia a geração/visualização e o download do PDF da proposta no ambiente de produção.",
      },
    ],
  },
  {
    version: "1.8.2",
    date: "22/07/2026",
    entries: [
      {
        type: "feature",
        text: "Cobrança — Confirmação de envio: novo campo no Resumo (Informações de Negócio) do board de Cobrança. Para marcar o negócio como Ganho na etapa Operações, é obrigatório que a Confirmação de envio esteja como 'Sim'.",
      },
      {
        type: "feature",
        text: "Proposta — editar dados do cliente: botões de edição ao lado de 'Empresa / Cliente' e 'Aos cuidados de' permitem ajustar, apenas naquela proposta, os dados exibidos (nome, CNPJ, endereço, cidade/UF, e-mail, telefone e nome/e-mail da pessoa). Os dados valem no display e no PDF; o cadastro do Cliente não é alterado. Há um botão para restaurar os dados do cadastro.",
      },
      {
        type: "improvement",
        text: "Serviço — filtro de produto: o filtro de produto no board de Serviço/Cobrança agora permite selecionar vários produtos (múltipla seleção com caixas de seleção), mostrando os cards de qualquer um dos produtos marcados.",
      },
      {
        type: "improvement",
        text: "Serviço — OS não é mais exigida: avançar de 'Liberados do Laboratório' para 'Dados Preenchidos' deixou de exigir a OS anexada, e o campo de anexar OS foi removido do Resumo (a OC continua disponível).",
      },
      {
        type: "fix",
        text: "Histórico do card — contagem de Atividades: o número na aba 'Atividades' agora reflete as tarefas exibidas na lista (antes contava cada evento — criada, concluída, editada — dando a impressão de que faltavam itens). O total de eventos aparece no detalhe.",
      },
      {
        type: "fix",
        text: "Proposta — PDF em produção: corrigida a geração/visualização e download do PDF da proposta que retornava erro no ambiente de produção.",
      },
    ],
  },
  {
    version: "1.8.1",
    date: "14/07/2026",
    entries: [
      {
        type: "fix",
        text: "Mensagem ao marcar Ganho/Perdido: ao tentar marcar um negócio como Ganho (ou Perdido, ou ao reabrir), o sistema mostrava apenas um erro genérico. Agora exibe o motivo real — por exemplo, \"Preencha o campo 'É venda ou locação' no Resumo antes de marcar o negócio como Ganho\" — deixando claro o que falta preencher.",
      },
      {
        type: "fix",
        text: "Histórico do card: o histórico trazia apenas os eventos mais recentes e não havia como acessar os antigos. Agora o card carrega um histórico bem maior e a lista ganhou um botão 'Mostrar mais' (e 'Mostrar todos'), exibindo 10 eventos por vez com o total à vista.",
      },
    ],
  },
  {
    version: "1.8.0",
    date: "09/07/2026",
    entries: [
      {
        type: "feature",
        text: "Módulo de Serviços em produção: o módulo completo — boards, propostas comerciais e catálogo de serviços — foi liberado para o time de Serviço (administrador, gerente e perfil 'serviço').",
      },
      {
        type: "feature",
        text: "Boards de Serviço: dois boards com funil e regras próprias — 'Serviço' (funil oficial, 7 etapas) e 'Cobrança' (Serviços - Atrasados, 6 etapas). Cada etapa tem obrigatoriedades para avançar, e Ganho/Perdido só pelos botões (com motivo da perda).",
      },
      {
        type: "feature",
        text: "Dashboard de Serviço: indicadores próprios (pipeline, ganhos, perdidos, ticket médio, taxa de ganho, atividades), recalibrações vencidas e a vencer (30/50/90 dias), funil, ranking de colaboradores e motivos de perda. É possível alternar entre as visões 'Serviço' e 'Cobrança'.",
      },
      {
        type: "feature",
        text: "Propostas Comerciais: novo módulo com a página 'Propostas' na barra lateral e uma seção 'Propostas' dentro do card. Permite criar, editar, visualizar e excluir propostas, com numeração automática própria.",
      },
      {
        type: "feature",
        text: "PDF da proposta: gerado com a identidade da H&S e anexado automaticamente ao card sempre que a proposta é criada, editada ou vinculada. Pode ser visualizado e baixado pela seção do card e pela página de Propostas.",
      },
      {
        type: "feature",
        text: "Proposta a partir do card: ao criar pelo card, a proposta já vem com Cliente, Pessoa e os itens preenchidos, além do texto padrão de calibração com Modelo e Aparelhos.",
      },
      {
        type: "feature",
        text: "Endereço de entrega: é possível informar um endereço de entrega diferente do de cobrança, com busca automática pelo CEP. No PDF, os dois endereços aparecem lado a lado.",
      },
      {
        type: "feature",
        text: "Proposta compartilhada entre cards: a mesma proposta pode ser vinculada a vários cards e boards (ex.: criada na Cobrança e reaproveitada no Serviço). A listagem mostra todos os cards vinculados.",
      },
      {
        type: "feature",
        text: "Marcador da proposta: classificação automática em 'aprovada', 'não aprovada' ou 'em aberto', derivada da situação dos cards vinculados.",
      },
      {
        type: "feature",
        text: "Histórico de versões da proposta: a cada edição salva, a versão anterior é arquivada. Um novo ícone de histórico mostra a data, quem alterou e permite visualizar e baixar o PDF de cada versão anterior.",
      },
      {
        type: "feature",
        text: "Botão 'Atualizar dados' na proposta: ao editar, repuxa do card as informações atuais de Cliente, Pessoa e itens (serviços), perguntando se deve reconstruir também o texto de Modelo/Aparelhos. As mudanças só valem após salvar — e ficam registradas no histórico.",
      },
      {
        type: "feature",
        text: "Catálogo de Serviços: nova aba 'Serviço' na barra lateral, para cadastrar os tipos de serviço (ex.: calibração) com nome, código, preço e categoria. No card, os serviços são vinculados com quantidade, preço e desconto.",
      },
      {
        type: "improvement",
        text: "Valor do negócio: passa a ser a soma dos totais das propostas vinculadas ao card, refletido no Resumo, no card do board e na dashboard.",
      },
      {
        type: "improvement",
        text: "Produtos no card de Serviço: deixam de trabalhar com valores. Agora registram apenas a quantidade de produtos e de aparelhos (com os dados do laboratório por aparelho). Preço, desconto e condições de pagamento saíram da seção — o valor fica nas propostas.",
      },
      {
        type: "improvement",
        text: "Catálogo de Produtos: removido o campo 'Valor da Calibração', que agora é atribuição do catálogo de Serviços.",
      },
      {
        type: "improvement",
        text: "Regras de avanço: as etapas que exigiam produto passam a exigir produto e serviço vinculados. As etapas de Proposta passam a exigir uma proposta vinculada ao card, em vez de um documento anexado no Resumo.",
      },
      {
        type: "improvement",
        text: "Vendedor da proposta: preenchido automaticamente com quem criou a proposta e não muda quando outra pessoa edita.",
      },
      {
        type: "improvement",
        text: "Campos da proposta: máscaras de CEP, CPF/CNPJ e telefone; Desconto e Frete aceitam vírgula (padrão brasileiro); limites de tamanho nos demais campos.",
      },
    ],
  },
  {
    version: "1.7.36",
    date: "26/06/2026",
    entries: [
      {
        type: "feature",
        text: "Etiqueta 'Parado 7d+': cards parados há 7 dias ou mais ganham uma etiqueta e destaque em vermelho mais escuro, separando-os dos 'Parado 3d+'. Há também um novo filtro de etiqueta 'Parado 7d+' nos boards de Vendas e Serviço.",
      },
      {
        type: "fix",
        text: "Prospecção — Reunião: a exigência de agendar uma reunião para avançar de 'Conectado' para 'Agendado' passou a valer apenas quando o aparelho Phoebus está vinculado. Acessórios (bocais, impressoras, suportes, etc.) não disparam mais essa regra.",
      },
      {
        type: "improvement",
        text: "Prospecção — Empresa: a obrigatoriedade de vincular a empresa (nome, tipo de relacionamento e segmento) passou da etapa 'Lead Novo → Prospecção' para 'Prospecção → Conectado'.",
      },
    ],
  },
  {
    version: "1.7.35",
    date: "18/06/2026",
    entries: [
      {
        type: "feature",
        text: "Negócio Ganho — Reverter (admin): novo botão permite ao administrador desfazer um negócio marcado como Ganho, devolvendo o card para a última etapa ativa. A ação fica registrada no histórico e o negócio deixa de ser contabilizado como ganho.",
      },
      {
        type: "feature",
        text: "Atividades — Visão por equipe: administradores e gerentes podem alternar a página de Atividades entre Vendedor, SDR e Serviço, vendo as atividades de cada grupo.",
      },
      {
        type: "feature",
        text: "É venda ou locação: novo campo no Resumo do card. O negócio só pode ser marcado como Ganho depois de informar se é venda ou locação.",
      },
      {
        type: "fix",
        text: "Automações agendadas: corrigido um problema no agendador que impedia as automações do tipo 'agendada' de dispararem. Agora voltam a rodar normalmente.",
      },
      {
        type: "fix",
        text: "Datas — Fuso horário: corrigida a exibição de alguns horários que apareciam adiantados (em UTC em vez do horário de Brasília).",
      },
      {
        type: "improvement",
        text: "Cards — Visual: padronização do cabeçalho, abas, botões e da área de clique do título, deixando o card mais consistente e organizado.",
      },
    ],
  },
  {
    version: "1.7.34",
    date: "29/05/2026",
    entries: [
      {
        type: "fix",
        text: "Kanban — Data de fechamento: a data esperada de fechamento nos cards do kanban não avança mais um dia por conta de conversão de fuso horário incorreta.",
      },
      {
        type: "fix",
        text: "Reuniões — Editar: o horário exibido no modal de edição estava 3 horas adiantado (UTC em vez de horário de Brasília). Agora mostra corretamente o horário local.",
      },
      {
        type: "improvement",
        text: "Dashboard SDR — Reuniões Qualificadas: passa a contar cards que entraram na etapa 'Qualificação' do board Aquisição no período, sem depender do vendedor marcar a reunião manualmente. Como Qualificação só é acessível vindo de Reunião Agendada, a métrica reflete fielmente as reuniões que avançaram no funil.",
      },
    ],
  },
  {
    version: "1.7.33",
    date: "22/05/2026",
    entries: [
      {
        type: "fix",
        text: "Reuniões — Responsável: ao criar uma reunião, o sistema agora atribui corretamente ao vendedor do card em vez de quem está criando. Corrige casos em que reuniões feitas pelo SDR ficavam no nome dele e não apareciam no dashboard do vendedor.",
      },
      {
        type: "improvement",
        text: "Reuniões — Validação: não é mais possível agendar uma reunião em cards sem vendedor vinculado. O botão 'Nova Reunião' fica desabilitado com aviso explicativo até que um vendedor seja atribuído ao card.",
      },
    ],
  },
  {
    version: "1.7.32",
    date: "20/05/2026",
    entries: [
      {
        type: "feature",
        text: "Reuniões — Editar: novo botão em reuniões pendentes abre modal pré-preenchido para corrigir título, data, hora, duração, contato e descrição.",
      },
      {
        type: "fix",
        text: "Reuniões — Editar: ao alterar data/hora de uma reunião, o Microsoft Teams/Outlook agora envia automaticamente o e-mail de atualização para todos os participantes.",
      },
      {
        type: "feature",
        text: "Reuniões — Cancelar Reunião: novo botão cancela o evento no Teams/Outlook e move a reunião para a seção 'Reuniões canceladas' no card.",
      },
      {
        type: "feature",
        text: "Reuniões — Seção de canceladas: reuniões canceladas ficam em seção colapsável separada ao final da aba, igual ao histórico de concluídas.",
      },
      {
        type: "improvement",
        text: "Reuniões — Confirmações: botões 'Concluir' e 'Excluir' agora pedem confirmação antes de agir, evitando cliques acidentais.",
      },
      {
        type: "improvement",
        text: "Reuniões — Excluir: botão só aparece em reuniões pendentes. Reuniões concluídas ou canceladas não podem ser excluídas.",
      },
    ],
  },
  {
    version: "1.7.31",
    date: "19/05/2026",
    entries: [
      {
        type: "fix",
        text: "Boards — Movimentação retroativa: ao voltar um card para uma etapa anterior no board de Prospecção, a validação de campos obrigatórios não é mais exibida. As regras continuam sendo aplicadas normalmente ao avançar.",
      },
    ],
  },
  {
    version: "1.7.30",
    date: "15/05/2026",
    entries: [
      {
        type: "feature",
        text: "Dashboard SDR — Reuniões Reagendadas: novo KPI no funil exibindo quantas reuniões tiveram no-show no período, posicionado entre Reuniões Agendadas e Reuniões Qualificadas.",
      },
      {
        type: "feature",
        text: "Dashboard SDR — Funil completo: sequência reorganizada para Novos Leads → Em Prospecção → Conectados → Reuniões Agendadas → Reagendadas → Reuniões Qualificadas.",
      },
      {
        type: "improvement",
        text: "Dashboard SDR — Taxa de Conexão e Taxa de Agendamento: passam a usar 'Em Prospecção' como base do cálculo (Prospecção → Conectado e Prospecção → Agendado).",
      },
      {
        type: "improvement",
        text: "Dashboard SDR — Seção Conversão: ampliada de 4 para 6 cards incluindo Lead → Prospecção, Prospecção → Conectado, Conectado → Agendado, Lead → Agendado, Prospecção → Agendado e Agendado → Ganho.",
      },
    ],
  },
  {
    version: "1.7.29",
    date: "14/05/2026",
    entries: [
      {
        type: "feature",
        text: "Produtos — Desconto global: novo campo de desconto aplicado sobre o total geral, com toggle R$ ou %, painel colapsável e preview em tempo real antes de salvar.",
      },
      {
        type: "feature",
        text: "Produtos — Desconto por produto: campo de desconto no modo de edição de cada produto agora suporta R$ ou %, com toggle visual.",
      },
      {
        type: "feature",
        text: "Produtos — Linha de desconto total: nova linha consolidando a soma dos descontos por produto e o desconto global.",
      },
      {
        type: "feature",
        text: "Motivo de perda: opção 'Terceirizam o serviço' adicionada nos três boards (Prospecção, Aquisição e Expansão).",
      },
      {
        type: "feature",
        text: "Histórico — Agrupamento por tarefa: eventos da mesma tarefa (criação, edição, conclusão, reabertura, exclusão) agrupados em um único card colapsável. Registros anteriores ficam ocultos e podem ser expandidos ao clicar.",
      },
      {
        type: "improvement",
        text: "Produtos: campos de valor e desconto agora aceitam vírgula como separador decimal (centavos).",
      },
    ],
  },
  {
    version: "1.7.28",
    date: "06/05/2026",
    entries: [
      {
        type: "feature",
        text: "Boards — Importação em lote: novo botão 'Importar' abre um assistente de 3 etapas para criar múltiplos cards de uma vez via planilha .xlsx. Baixe o modelo, preencha os dados e faça upload — clientes, contatos e cards são criados automaticamente no Lead Novo do board Prospecção.",
      },
    ],
  },
  {
    version: "1.7.27",
    date: "05/05/2026",
    entries: [
      {
        type: "feature",
        text: "Reunião Teams: ao reagendar uma tarefa do tipo Reunião, o evento no calendário do Outlook é atualizado automaticamente.",
      },
      {
        type: "feature",
        text: "Clientes — Busca por CNPJ: ao preencher o CNPJ, os dados da empresa são buscados automaticamente na Receita Federal e preenchidos nos campos: Razão Social, Nome Fantasia, Email, Telefone, CNAE, Logradouro, Cidade, Estado e País.",
      },
      {
        type: "improvement",
        text: "Tarefas: o SDR responsável pelo card agora pode editar, reagendar e concluir qualquer tarefa dele, mesmo que outro usuário tenha criado.",
      },
      {
        type: "improvement",
        text: "Clientes — formulário: CPF/CNPJ reposicionado no topo dos Dados Principais, ocupando largura total. Cidade, Estado e País agora ficam lado a lado.",
      },
    ],
  },
  {
    version: "1.7.26",
    date: "04/05/2026",
    entries: [
      {
        type: "feature",
        text: "Dashboard: novo filtro 'Mês Passado' no seletor de período das dashboards SDR e Vendedor.",
      },
      {
        type: "feature",
        text: "Dashboard SDR — Reuniões Qualificadas: novo KPI mostrando reuniões que o vendedor compareceu e marcou como concluídas (sem no-show).",
      },
      {
        type: "improvement",
        text: "Dashboard SDR — Reuniões Agendadas: agora conta todas as reuniões agendadas no período, incluindo no-shows. A diferença entre Agendadas e Qualificadas mostra os no-shows.",
      },
      {
        type: "improvement",
        text: "Dashboard SDR — layout dos KPIs: reorganizado em 5 cards na primeira linha e 4 na segunda, igual ao layout do Vendedor.",
      },
    ],
  },
  {
    version: "1.7.25",
    date: "30/04/2026",
    entries: [
      {
        type: "feature",
        text: "Histórico do card: descrição e anotações da tarefa agora aparecem no histórico com os rótulos 'Descrição:' e 'Notas:'.",
      },
      {
        type: "fix",
        text: "Histórico do card: ao criar ou editar uma tarefa, a descrição agora é salva no histórico e exibida corretamente.",
      },
    ],
  },
  {
    version: "1.7.24",
    date: "29/04/2026",
    entries: [
      {
        type: "feature",
        text: "Dashboard Vendedor — Pipeline por Etapa: toggle para alternar entre Aquisição e Prospecção no gráfico de pipeline por etapa.",
      },
      {
        type: "feature",
        text: "Dashboard Vendedor — card Ganhos: novo KPI exibindo total de deals ganhos no período com contagem do dia.",
      },
      {
        type: "improvement",
        text: "Dashboard Vendedor — layout dos KPIs: na tela de tablet, os 2 cards da segunda fila ocupam a largura total sem deixar espaço em branco.",
      },
    ],
  },
  {
    version: "1.7.23",
    date: "27/04/2026",
    entries: [
      {
        type: "feature",
        text: "Exportar Cards — Período de fechamento: novo filtro de data de fechamento (ganho/perdido) no modal de exportação. Cards sem data de fechamento são excluídos quando o filtro está ativo.",
      },
      {
        type: "feature",
        text: "Exportar Cards — novas colunas: planilha passa a incluir CNPJ da empresa, nome/telefone/e-mail do contato e produto(s) vinculado(s) ao card.",
      },
      {
        type: "feature",
        text: "Kanban — filtro 'Criado em': novo filtro de período pela data de criação do lead, alinhado ao filtro 'Período de criação' da exportação.",
      },
      {
        type: "improvement",
        text: "Kanban — filtros de data: 'Entrou na etapa' e 'Criado em' coexistem na barra de filtros e podem ser usados juntos.",
      },
      {
        type: "fix",
        text: "Exportar Cards: empresa, contato e produtos agora são carregados corretamente no modo lista do backend, preenchendo as novas colunas.",
      },
    ],
  },
  {
    version: "1.7.22",
    date: "27/04/2026",
    entries: [
      {
        type: "improvement",
        text: "Cliente — CNAE: campo agora aceita texto livre (ex: 11.22-4-01), sem máscara ou restrição de caracteres.",
      },
      {
        type: "fix",
        text: "Vincular cliente: busca por CNPJ formatado (ex: 08.857) agora funciona corretamente — antes só encontrava sem pontos e barras.",
      },
    ],
  },
  {
    version: "1.7.21",
    date: "27/04/2026",
    entries: [
      {
        type: "improvement",
        text: "Foco: clicar em qualquer lugar da linha da atividade expande ou recolhe os detalhes — não é mais necessário clicar exatamente na setinha.",
      },
    ],
  },
  {
    version: "1.7.20",
    date: "24/04/2026",
    entries: [
      {
        type: "feature",
        text: "Pessoa: 3 novos campos de telefone — Alternativo, Extra 1 e Extra 2 — totalizando 6 números por contato.",
      },
      {
        type: "improvement",
        text: "Ligação: todos os 6 telefones da pessoa aparecem no seletor de número ao ligar (botão rápido e atividades da seção Foco).",
      },
      {
        type: "improvement",
        text: "Dashboard Vendedor: KPI 'Reuniões Agendadas' renomeado para 'Reuniões Realizadas'.",
      },
      {
        type: "fix",
        text: "Card — Clonar: o clone agora sempre vai para 'Lead Novo' (Prospecção), evitando que seja criado em Negócio Ganho ou outra etapa indevida.",
      },
      {
        type: "fix",
        text: "Card — Clonar: título do clone prefixado com [CLONE] para identificação imediata.",
      },
      {
        type: "fix",
        text: "Card — Clonar: botão ocultado quando o card está em Negócio Perdido.",
      },
      {
        type: "fix",
        text: "Card — Clonar: SDR e Vendedor podiam receber erro de permissão (403) ao clonar cards fora da lista 'Lead Novo'. Corrigido — qualquer role pode clonar em qualquer etapa.",
      },
      {
        type: "fix",
        text: "Dashboard Vendedor — Atividades no Período: admin/gerente em 'Todos os Vendedores' exibia atividades de SDRs misturadas. Corrigido para mostrar apenas atividades de vendedores.",
      },
    ],
  },
  {
    version: "1.7.19",
    date: "23/04/2026",
    entries: [
      {
        type: "feature",
        text: "Aquisição: nova etapa 'Aguardando Pedido' entre Negociação e Negócio Ganho — para leads que já decidiram comprar e aguardam a formalização do pedido.",
      },
      {
        type: "improvement",
        text: "Aquisição: para avançar de Diagnóstico e Proposta para Negociação, agora é obrigatório preencher a Data esperada de fechamento, além da proposta em PDF e follow-up pendente.",
      },
      {
        type: "feature",
        text: "Dashboard Vendedor: dois novos gráficos — 'Atividades no Período' (ligação, WhatsApp, e-mail, tarefa, etc.) e 'Cards por Canal' (Inbound, Outbound, Indicação, Parcerias, Eventos, Base) — filtrados pelo período selecionado.",
      },
      {
        type: "feature",
        text: "Dashboard Vendedor: novo card KPI 'Reuniões Agendadas' mostrando reuniões concluídas pelo vendedor no período.",
      },
      {
        type: "feature",
        text: "Card: novo botão 'Clonar' no header do card. Cria uma cópia na mesma lista com resumo, cliente, contato, produto e datas de tracking de boards. Não copia atividades, anotações nem arquivos. Registra nota automática em ambos os cards.",
      },
      {
        type: "fix",
        text: "Dashboard SDR — Reuniões Recebidas: No-Show marcado pelo vendedor (após o card sair do board de Prospecção) agora é corretamente excluído da contagem. Antes, apenas No-Shows marcados ainda na lista 'Agendado' eram descartados.",
      },
    ],
  },
  {
    version: "1.7.18",
    date: "23/04/2026",
    entries: [
      {
        type: "improvement",
        text: "E-mail: ao enviar para várias pessoas, cada destinatário recebe seu próprio e-mail individual — ninguém vê os outros endereços no campo 'Para:'. Funciona como mala direta.",
      },
      {
        type: "feature",
        text: "Foco: novo botão 'Sem e-mail' em atividades de e-mail pendentes. Permite concluir a task registrando que o contato não possui e-mail, sem perder o histórico do trabalho realizado.",
      },
    ],
  },
  {
    version: "1.7.17",
    date: "22/04/2026",
    entries: [
      {
        type: "feature",
        text: "Kanban: novo filtro de período para identificar quando os cards entraram na lista atual (hoje, ontem, esta semana, este mês, trimestre, ano ou datas personalizadas). Útil para ver quais oportunidades chegaram em uma etapa do funil em um intervalo específico.",
      },
      {
        type: "improvement",
        text: "Kanban — barra de filtros: filtro 'Todas as listas' removido; 'Qualquer entrada' aparece antes de 'Qualquer fechamento'; botão 'Fechar' removido — a barra permanece aberta enquanto há filtros ativos.",
      },
    ],
  },
  {
    version: "1.7.16",
    date: "22/04/2026",
    entries: [
      {
        type: "improvement",
        text: "Kanban: cards carregados de 100 em 100 com progresso visível no header (antes carregava tudo de uma vez). Boards grandes como Prospecção (~960 cards) aparecem imediatamente com os primeiros 100 e o restante chega em segundo plano.",
      },
      {
        type: "improvement",
        text: "Backend: SDRs e Vendedores recebem automaticamente apenas os próprios cards — SDR filtra por sdr_id, Vendedor por assigned_to_id. Elimina o tráfego desnecessário de dados que não seriam exibidos.",
      },
      {
        type: "feature",
        text: "Anotações: botão 'Ver mais' aparece quando o card tem mais de 30 anotações, carregando o histórico completo sob demanda sem afetar a performance inicial.",
      },
    ],
  },
  {
    version: "1.7.15",
    date: "22/04/2026",
    entries: [
      {
        type: "improvement",
        text: "Calendário: atividades carregadas apenas para o mês visível (antes buscava todo o histórico). Navegar entre meses recarrega somente o período exibido — muito mais rápido, especialmente para admins que visualizam todos os usuários.",
      },
      {
        type: "improvement",
        text: "Kanban: criar ou editar um card agora recarrega apenas os cards, não o board inteiro. Mover cards via NoShow também usa a rota mais leve. Reduz o número de requisições por ação em até 3×.",
      },
      {
        type: "improvement",
        text: "CardDetails: atividades do histórico limitadas a 30 mais recentes (antes eram 50); notas limitadas a 30 mais recentes com contagem total disponível. Cards com centenas de anotações carregam significativamente mais rápido.",
      },
      {
        type: "improvement",
        text: "Backend — Kanban: listas dos cards pré-carregadas em uma única query antes do loop de montagem da resposta (elimina N+1 de até 1 query por card).",
      },
    ],
  },
  {
    version: "1.7.14",
    date: "17/04/2026",
    entries: [
      {
        type: "feature",
        text: "Atividade E-mail: novo botão 'Já enviado' permite concluir a atividade quando o e-mail foi enviado por fora do sistema, sem precisar usar o compositor.",
      },
      {
        type: "improvement",
        text: "Regras de avanço no board de Prospecção ajustadas: Lead Novo → Prospecção não exige mais nome, e-mail, cargo e área do contato — apenas o contato vinculado. Esses dados passam a ser obrigatórios em Conectado → Agendado.",
      },
      {
        type: "improvement",
        text: "Prospecção → Conectado agora aceita qualquer atividade de contato concluída (ligação, WhatsApp ou e-mail), não apenas ligação.",
      },
      {
        type: "improvement",
        text: "Conectado → Agendado: validação de reunião obrigatória agora considera produto 'bafômetro' (antes era 'Phoebus').",
      },
      {
        type: "fix",
        text: "Criação de atividade: nenhum tipo vem pré-selecionado — o usuário é obrigado a escolher (Ligação, Tarefa, WhatsApp, etc.) antes de salvar, evitando registros incorretos.",
      },
      {
        type: "fix",
        text: "Filtro de SDR no Kanban: ao clicar em 'Limpar filtros', o SDR volta automaticamente para o próprio filtro (não perde a seleção). O filtro permanece travado no próprio ID para SDRs, impedindo visualizar leads de outros SDRs.",
      },
    ],
  },
  {
    version: "1.7.13",
    date: "16/04/2026",
    entries: [
      {
        type: "fix",
        text: "Kanban: filtro de status 'Ganhos', 'Perdidos' e 'Todos' agora funcionam corretamente — os cards correspondentes são buscados ao selecionar cada opção.",
      },
    ],
  },
  {
    version: "1.7.12",
    date: "16/04/2026",
    entries: [
      {
        type: "fix",
        text: "NoShow: após confirmar, o card se move para 'Reagendamento' no Kanban em tempo real — sem precisar pressionar F5. A barra de etapas dentro do próprio card também atualiza na hora.",
      },
      {
        type: "fix",
        text: "NoShow: removida chamada de automação hardcoded (ID 12) que era redundante e sem efeito real no sistema.",
      },
      {
        type: "fix",
        text: "Dashboard: reuniões marcadas como No-Show não entram mais na contagem de 'Reuniões Agendadas' do SDR — a métrica reflete apenas reuniões que de fato aconteceram ou estão previstas.",
      },
    ],
  },
  {
    version: "1.7.11",
    date: "16/04/2026",
    entries: [
      {
        type: "feature",
        text: "Edição de tipo de atividade: no Foco, agora é possível alterar o tipo da atividade (Ligação, WhatsApp, E-mail, Tarefa, Follow Up, etc.) diretamente no modo de edição, sem precisar deletar e recriar.",
      },
      {
        type: "improvement",
        text: "Kanban: board carrega apenas cards ativos, excluindo ganhos e perdidos — redução de ~96% nos dados carregados, tornando a navegação muito mais rápida.",
      },
    ],
  },
  {
    version: "1.7.10",
    date: "15/04/2026",
    entries: [
      {
        type: "fix",
        text: "NoShow corrigido: o card agora é movido corretamente para a lista 'Reagendamento' do board atual. Antes a movimentação falhava silenciosamente por depender de uma automação hardcoded (ID 12) que não existia.",
      },
      {
        type: "improvement",
        text: "Após marcar NoShow, a página recarrega automaticamente para refletir a nova posição do card no pipeline.",
      },
    ],
  },
  {
    version: "1.7.9",
    date: "15/04/2026",
    entries: [
      {
        type: "feature",
        text: "Horário por etapa na cadência: ao configurar um template, cada etapa agora tem um campo de horário. A task criada automaticamente será agendada para o horário definido (ex: 09:00 para manhã, 14:00 para tarde).",
      },
    ],
  },
  {
    version: "1.7.8",
    date: "15/04/2026",
    entries: [
      {
        type: "feature",
        text: "Integração e-mail + cadência: atividades do tipo E-mail criadas pela cadência aparecem no Foco com botão 'Enviar E-mail'. Ao clicar, o compositor abre diretamente (sem trocar de aba) e o envio conclui a tarefa automaticamente avançando a cadência.",
      },
      {
        type: "feature",
        text: "Novo tipo de atividade E-mail disponível no formulário de criação rápida de atividades.",
      },
      {
        type: "improvement",
        text: "Compositor de e-mail abre instantaneamente: o modal aparece de imediato enquanto os e-mails do contato são buscados em background, com indicador de carregamento e bloqueio do envio até completar.",
      },
      {
        type: "improvement",
        text: "No-Show em reuniões agora move o card automaticamente para a etapa 'Reagendamento' no board de Prospecção.",
      },
      {
        type: "fix",
        text: "Botão 'Excluir' na aba de Reuniões agora é visível apenas para Admin e Gerente. Vendedores e SDRs não podem mais excluir reuniões.",
      },
    ],
  },
  {
    version: "1.7.7",
    date: "15/04/2026",
    entries: [
      {
        type: "fix",
        text: "Indicador 'Parado 3d+' corrigido: agora qualquer movimentação no histórico conta — mudança de etapa, tarefa criada/concluída ou anotação. Antes, apenas tarefas e notas eram consideradas, ignorando mudanças de etapa recentes.",
      },
      {
        type: "improvement",
        text: "Cards recém-adicionados ao board nunca entram na contagem de parados, pois a entrada na etapa já conta como movimentação.",
      },
    ],
  },
  {
    version: "1.7.6",
    date: "14/04/2026",
    entries: [
      {
        type: "feature",
        text: "Novo tipo de atividade 'LinkedIn' disponível ao criar atividades — com ícone e cor azul-céu.",
      },
      {
        type: "feature",
        text: "Conclusão de atividades agora tem dois modos: 'Válido' (atividade realizada com sucesso) e 'Não Válido' (tentativa sem resultado, ex: ligação não atendida). Ambos concluem e avançam a cadência. Badge diferenciado exibe o resultado.",
      },
    ],
  },
  {
    version: "1.7.5",
    date: "14/04/2026",
    entries: [
      {
        type: "fix",
        text: "Seção Foco: horário da atividade agora aparece junto à data — ex: '14/04/2026 09:00' em vez de apenas '14 abr.'",
      },
      {
        type: "fix",
        text: "Dashboard — Atividades no Período: contagem corrigida para mostrar apenas atividades concluídas, usando a data de conclusão real. Antes contava todas as atividades criadas no período, incluindo pendentes.",
      },
    ],
  },
  {
    version: "1.7.4",
    date: "14/04/2026",
    entries: [
      {
        type: "feature",
        text: "Sistema de Cadência Individual por Lead: admin/gerente configura templates de cadência em Configurações → Cadências; SDR/Vendedor inicia a cadência no card e as atividades são criadas automaticamente conforme cada etapa é concluída.",
      },
      {
        type: "feature",
        text: "Cadência suporta pausar, retomar e cancelar — pausar suspende a criação automática das próximas tarefas; retomar cria a próxima atividade imediatamente; cancelar mantém as tarefas já criadas sem gerar novas.",
      },
      {
        type: "improvement",
        text: "Módulo 'Cadências' (disparo em lote) renomeado para 'Disparo em Lote' para diferenciar do novo sistema de cadência individual por lead.",
      },
    ],
  },
  {
    version: "1.7.3",
    date: "14/04/2026",
    entries: [
      {
        type: "feature",
        text: "Novo tipo de atividade 'WhatsApp' disponível ao criar atividades — com ícone e cor verde esmeralda em todo o sistema.",
      },
      {
        type: "improvement",
        text: "Calendário (aba Outlook): botão '+ Agendar' agora mostra '+ Agendar Reunião' em roxo e redireciona direto para a aba Reuniões, criando o evento no Teams automaticamente.",
      },
    ],
  },
  {
    version: "1.7.2",
    date: "14/04/2026",
    entries: [
      {
        type: "fix",
        text: "Etiqueta 'Parado 3d+' não aparece mais em cards sem histórico (recém criados ou importados). Agora só marca como parado cards que já tiveram pelo menos uma atividade ou anotação registrada.",
      },
    ],
  },
  {
    version: "1.7.1",
    date: "13/04/2026",
    entries: [
      {
        type: "improvement",
        text: "Parado 3d+ e Parado 7d+ recalculados: agora considera atividades registradas e anotações criadas no período, não mais o tempo que o card ficou na mesma etapa — reflete movimentação real no negócio.",
      },
      {
        type: "improvement",
        text: "Histórico do card: horário exibido ao lado da data em todos os eventos — 'Ontem, 14:30', '3 dias atrás, 10:00', '27 jan. 2026, 09:15'.",
      },
      {
        type: "improvement",
        text: "Abas do card (Atividade, Anotações, Calendário…): scroll horizontal habilitado no desktop quando a janela não tem largura suficiente para exibir todas as abas.",
      },
      {
        type: "fix",
        text: "Seletor de tipo de atividade exibia coluna vazia após remoção de um tipo — grid ajustado para 4 colunas.",
      },
    ],
  },
  {
    version: "1.7.0",
    date: "13/04/2026",
    entries: [
      {
        type: "feature",
        text: "Integração completa com Microsoft Teams: ao criar uma reunião no CRM, o evento é agendado automaticamente no calendário do Outlook e o link Teams é gerado — sem passos extras.",
      },
      {
        type: "feature",
        text: "Seção dedicada 'Reuniões' nas oportunidades: separada das demais atividades, com lista de pendentes, histórico de concluídas e No-Shows.",
      },
      {
        type: "feature",
        text: "Convites automáticos: ao criar uma reunião, o Vendedor responsável e o contato do cliente recebem convite direto no Microsoft Teams/Outlook.",
      },
      {
        type: "feature",
        text: "Análise de reunião com IA: após a reunião, analisa a transcrição do Teams e exibe resumo, sentimento, nível de interesse do cliente, objeções, próximos passos e pontos de atenção.",
      },
      {
        type: "feature",
        text: "Calendário Outlook integrado: nova aba 'Outlook' no calendário do card exibe os eventos reais do usuário no Outlook, com visão mensal e semanal (8h–17h).",
      },
      {
        type: "feature",
        text: "Disponibilidade do Vendedor no calendário: o SDR vê os horários ocupados do Vendedor responsável pelo card diretamente na visão semanal, facilitando o agendamento sem conflitos.",
      },
      {
        type: "improvement",
        text: "Botão para copiar o link Teams da reunião diretamente pelo CRM, sem precisar abrir o Teams.",
      },
    ],
  },
  {
    version: "1.6.26",
    date: "13/04/2026",
    entries: [
      {
        type: "improvement",
        text: "Modal de envio de e-mail padronizado com os componentes do sistema (BaseModal, Button, FormField, Input, Textarea, Alert) — visual consistente com o restante do CRM.",
      },
      {
        type: "fix",
        text: "Assinatura de e-mail não estourava mais o container ao exibir imagens ou tabelas grandes no HTML da assinatura.",
      },
      {
        type: "feature",
        text: "Kanban: rodapé em cada coluna exibe Valor Total dos cards e Valor Ponderado (cards com fechamento previsto no mês atual), com percentual ponderado.",
      },
      {
        type: "feature",
        text: "Kanban: novo filtro 'Etiqueta' para filtrar cards por status de atividade (Atrasada, Para Hoje, Futura, Sem Atividade), parados há mais de 3 dias ou em nutrição por e-mail.",
      },
      {
        type: "feature",
        text: "Kanban: etiquetas visuais nos cards indicando status da próxima atividade (Atrasada, Para Hoje, Futura, Sem Atividade), além das etiquetas já existentes de Parado 3d+ e Em Nutrição.",
      },
      {
        type: "improvement",
        text: "Kanban: cards parados há mais de 3 dias ficam com borda e fundo vermelhos — cálculo usa o histórico de etapas (igual ao dashboard), não a data de última edição.",
      },
    ],
  },
  {
    version: "1.6.25",
    date: "13/04/2026",
    entries: [
      {
        type: "feature",
        text: "Envio de e-mail diretamente pelo CRM via Microsoft 365: compose com destinatários, assunto, corpo e anexos (PDFs, documentos — até 24 MB por arquivo).",
      },
      {
        type: "feature",
        text: "Templates de e-mail: administradores e gerentes podem criar modelos reutilizáveis com variáveis dinâmicas ({{nome_contato}}, {{empresa}}, {{nome_vendedor}}, {{titulo_card}}, {{valor_card}}). Disponíveis para todos os usuários ao compor um e-mail.",
      },
      {
        type: "feature",
        text: "Assinatura de e-mail: cada usuário pode configurar sua assinatura no perfil com texto e imagem (upload), anexada automaticamente a todos os e-mails enviados pelo CRM.",
      },
      {
        type: "improvement",
        text: "Histórico de e-mails no card: exibe destinatários (Para:), corpo completo com 'Ver mais / Ver menos' e chips com os nomes dos arquivos anexados.",
      },
      {
        type: "improvement",
        text: "Aba E-mail no card exibe contador com o total de e-mails enviados, igual às outras seções.",
      },
      {
        type: "fix",
        text: "E-mails enviados não apareciam na aba E-mail do card — enum de tipo de atividade estava incompleto no backend.",
      },
    ],
  },
  {
    version: "1.6.24",
    date: "10/04/2026",
    entries: [
      {
        type: "improvement",
        text: "Dashboard: badge de total no gráfico 'Atividades no Período' (SDR) padronizado — exibe 'X atividades' no canto do cabeçalho.",
      },
      {
        type: "improvement",
        text: "Dashboard Vendedor: gráfico 'Pipeline por Etapa' agora exibe badge com o total de cards no cabeçalho.",
      },
      {
        type: "improvement",
        text: "Exportar PDF do Dashboard agora gera e baixa um arquivo PDF real com todos os KPIs da visão atual (SDR ou Vendedor), em vez de abrir o diálogo de impressão do navegador.",
      },
      {
        type: "improvement",
        text: "Exportar Excel do Dashboard corrigido: exporta os indicadores corretos conforme a visão selecionada (SDR ou Vendedor).",
      },
      {
        type: "improvement",
        text: "Dashboard mobile: filtros empilhados verticalmente, selects ocupando toda a largura, botões Atualizar e Exportar lado a lado com tamanhos iguais.",
      },
      {
        type: "fix",
        text: "Barra de busca de cards não sobrepõe mais a sidebar no mobile.",
      },
      {
        type: "improvement",
        text: "Dashboard SDR: seção 'Cards por Etapa' substituída por 'Atividades no Período' com gráfico de barras por tipo de atividade.",
      },
      {
        type: "improvement",
        text: "Páginas de Atividades e Ligações: filtros reorganizados em painel retrátil, seguindo o padrão das páginas de Clientes e Pessoas.",
      },
      {
        type: "improvement",
        text: "SDR em boards diferentes de Prospecção (board 6): visualização somente leitura — campos bloqueados, botões de edição ocultos e banner de aviso exibido.",
      },
      {
        type: "improvement",
        text: "Board Kanban: botão de três pontos (opções do board) restrito a administradores. Opção 'Exportar Cards' removida.",
      },
    ],
  },
  {
    version: "1.6.23",
    date: "06/04/2026",
    entries: [
      {
        type: "feature",
        text: "Sistema de Cadências: crie conjuntos de metas de atividades (ex: 20 Ligações + 10 E-mails) e dispare a criação automática nas oportunidades mais antigas que ainda não têm aquela atividade pendente.",
      },
      {
        type: "improvement",
        text: "Botão 'Cadências' na página de Atividades para SDRs e Vendedores gerenciarem e dispararem suas cadências.",
      },
    ],
  },
  {
    version: "1.6.22",
    date: "06/04/2026",
    entries: [
      {
        type: "feature",
        text: "Filtro de período no Dashboard: nova opção 'Ontem' para visualizar os KPIs do dia anterior.",
      },
    ],
  },
  {
    version: "1.6.21",
    date: "02/04/2026",
    entries: [
      {
        type: "improvement",
        text: "Dashboard Vendedor totalmente revisado: todos os KPIs agora mostram dados reais filtrados pelo período e pelo vendedor vinculado.",
      },
      {
        type: "improvement",
        text: "Tempo Médio p/ Fechar agora reflete o período selecionado — veja quanto tempo os deals demoram em um mês específico.",
      },
      {
        type: "feature",
        text: "Reuniões Recebidas (SDR): quantas reuniões o time de SDR agendou e enviou para o vendedor no período.",
      },
      {
        type: "feature",
        text: "Propostas Geradas: cards que chegaram à etapa Diagnóstico e Proposta no período.",
      },
      {
        type: "feature",
        text: "Funil de Conversão com 4 taxas reais: Reunião→Qualificação, Qualificação→Proposta, Proposta→Ganho e Taxa Geral do Funil.",
      },
      {
        type: "feature",
        text: "Riscos: Negócios Parados há mais de 7 dias e Propostas em Aberto agora com dados reais.",
      },
      {
        type: "improvement",
        text: "Configurações API4COM: SDRs agora aparecem na lista de ramais, e usuários já vinculados não aparecem mais no formulário.",
      },
    ],
  },
  {
    version: "1.6.20",
    date: "02/04/2026",
    entries: [
      {
        type: "improvement",
        text: "Dashboard SDR totalmente revisado: todos os KPIs agora mostram dados reais filtrados por SDR vinculado ao card.",
      },
      {
        type: "improvement",
        text: "Cards por Etapa: contagem baseada em quando o card entrou na etapa no período selecionado (não o total acumulado), na ordem correta do pipeline.",
      },
      {
        type: "improvement",
        text: "Evolução de Leads: gráfico agora exibe Novos Leads e Reuniões Agendadas por mês — métricas relevantes para o SDR.",
      },
      {
        type: "feature",
        text: "Ranking SDR por reuniões agendadas: mostra quem mais agendou reuniões no período selecionado.",
      },
      {
        type: "feature",
        text: "4 taxas de conversão do funil SDR: Lead→Conectado, Conectado→Agendado, Lead→Agendado e Agendado→Ganho.",
      },
      {
        type: "feature",
        text: "Riscos operacionais: novos indicadores de Leads sem Contato (nenhuma atividade registrada) e Cards Parados há mais de 3 dias sem movimentação.",
      },
    ],
  },
  {
    version: "1.6.19",
    date: "30/03/2026",
    entries: [
      {
        type: "feature",
        text: "Página Ligações: médias por bloco de avaliação (Abertura, Diagnóstico, Fechamento...) exibidas em cards individuais com cor e barra de progresso — calculadas sobre todos os registros filtrados, não só a página atual.",
      },
      {
        type: "improvement",
        text: "Filtro de período na página Ligações substituído pelo seletor padrão do Dashboard: Hoje, Esta Semana, Este Mês, Este Trimestre, Este Ano e Personalizado.",
      },
    ],
  },
  {
    version: "1.6.18",
    date: "30/03/2026",
    entries: [
      {
        type: "feature",
        text: "Automação de nutrição por e-mail: ative o switch na seção 'Automações' do card para iniciar o envio de e-mails diários ao cliente via sistema externo. Quando o cliente responder com interesse, a automação é desligada automaticamente e você recebe uma notificação.",
      },
      {
        type: "improvement",
        text: "Cards em nutrição aparecem ao final de cada lista no Kanban com badge laranja 'Em Nutrição' para identificação rápida.",
      },
      {
        type: "improvement",
        text: "SDR e Vendedor não conseguem avançar o card no pipeline enquanto a nutrição estiver ativa — o sistema exibe um aviso orientando a desativar antes de mover.",
      },
    ],
  },
  {
    version: "1.6.17",
    date: "30/03/2026",
    entries: [
      {
        type: "feature",
        text: "Nova página 'Ligações': visualize e filtre todas as avaliações de ligações geradas pelo agente de IA. Gerentes e admins veem toda a equipe; vendedores veem apenas as próprias ligações.",
      },
      {
        type: "improvement",
        text: "Filtro de vendedor na página de Ligações como dropdown — populado automaticamente com quem já tem avaliações registradas, sem precisar digitar.",
      },
    ],
  },
  {
    version: "1.6.16",
    date: "27/03/2026",
    entries: [
      {
        type: "feature",
        text: "Avaliações de ligações: o agente de IA agora salva diretamente no sistema a transcrição, resumo, próximos passos e avaliação por blocos de cada ligação — com nota final e classificação. Os dados ficam vinculados ao card correspondente.",
      },
    ],
  },
  {
    version: "1.6.15",
    date: "27/03/2026",
    entries: [
      {
        type: "improvement",
        text: "Pipeline: todos os cards agora são criados diretamente em 'Lead Novo' — SDRs, vendedores e cards reabertos entram no funil pelo ponto correto.",
      },
      {
        type: "feature",
        text: "Automações: nova condição 'Criado pelo usuário' no gatilho Card Criado — permite que a automação de atribuição de vendedor dispare apenas para leads que chegam via integração (site), sem afetar cards criados manualmente por SDRs e vendedores.",
      },
    ],
  },
  {
    version: "1.6.14",
    date: "23/03/2026",
    entries: [
      {
        type: "feature",
        text: "Dashboard personalizado por usuário: vendedores e SDRs veem automaticamente apenas seus próprios dados; administradores e gerentes podem usar o novo filtro de usuário no header para visualizar o dashboard de qualquer pessoa da equipe.",
      },
      {
        type: "fix",
        text: "Dashboard: o filtro de período (Hoje, Esta Semana, Este Mês…) agora realmente filtra os dados — antes o valor era enviado mas ignorado pelo servidor.",
      },
      {
        type: "fix",
        text: "Dashboard: 'Abertos no Período' e 'Valor em Pipeline' agora mostram apenas cards criados dentro do período selecionado, não mais o total histórico.",
      },
      {
        type: "improvement",
        text: "Dashboard: Top Performers agora é ordenado pelo valor total faturado (em vez de quantidade de deals), e sempre exibe o ranking completo da equipe mesmo para vendedores e SDRs.",
      },
    ],
  },
  {
    version: "1.6.13",
    date: "20/03/2026",
    entries: [
      {
        type: "fix",
        text: "Relatórios: o filtro 'Filtrar valores do Eixo X' não resetava mais ao abrir o painel de edição de um gráfico já configurado.",
      },
      {
        type: "fix",
        text: "Relatórios: ao filtrar o Eixo X por usuários sem registros no período atual, o gráfico agora exibe as barras com valor 0 em vez de 'Sem dados para exibir'.",
      },
    ],
  },
  {
    version: "1.6.12",
    date: "19/03/2026",
    entries: [
      {
        type: "fix",
        text: "Relatórios: gráfico não ficava mais em branco ao filtrar 'Dividir por' deixando apenas uma série selecionada.",
      },
      {
        type: "feature",
        text: "Relatórios: nova seção 'Filtros Globais' no painel de configuração — permite filtrar os dados por Vendedor, SDR, Etapa ou qualquer outro campo, mesmo quando esses campos já estão ocupados nos eixos X/Y ou no 'Dividir por'. Ideal para ver o desempenho de um vendedor específico sem alterar a estrutura do gráfico.",
      },
    ],
  },
  {
    version: "1.6.11",
    date: "18/03/2026",
    entries: [
      {
        type: "feature",
        text: "Filtros de Canal de Aquisição no board Kanban: dois novos filtros permitem segmentar os cards por canal (ex: Outbound, Inbound) e, ao selecionar um canal, aparece automaticamente o filtro de detalhe correspondente (ex: Cold Call, LinkedIn).",
      },
      {
        type: "improvement",
        text: "Filtros do Kanban agora são salvos automaticamente por board — ao entrar em um card e voltar, os filtros permanecem exatamente como estavam.",
      },
      {
        type: "feature",
        text: "Cards reabertos a partir de negócios perdidos agora exibem um badge 'Reabertura' no kanban e um botão 'Ver card original' nos detalhes do card, facilitando rastrear o histórico do negócio.",
      },
      {
        type: "improvement",
        text: "Correção de dados: cards marcados como perdidos ou ganhos que estavam em listas erradas do pipeline foram movidos automaticamente para as listas corretas (Negócio Perdido / Negócio Ganho) nos boards Prospecção e Aquisição.",
      },
    ],
  },
  {
    version: "1.6.10",
    date: "18/03/2026",
    entries: [
      {
        type: "fix",
        text: "Botões 'Ganho' e 'Perdido' no card agora movem o negócio automaticamente para a lista correta do board (ex: 'Negócio Ganho' no board de Aquisição) — antes apenas marcavam um flag sem mover.",
      },
      {
        type: "improvement",
        text: "Botão 'Ganho' é ocultado automaticamente em boards que não possuem lista de ganho (ex: board de Prospecção), evitando ação inválida.",
      },
      {
        type: "fix",
        text: "Movimentos de card disparados por automações agora aparecem no histórico do card e nos relatórios de Histórico de Etapas — antes ficavam invisíveis.",
      },
    ],
  },
  {
    version: "1.6.9",
    date: "18/03/2026",
    entries: [
      {
        type: "improvement",
        text: "Relatórios: campos Vendedor e SDR adicionados à fonte Histórico de Etapas — agora é possível usar como eixo X ou Dividir por para ver entradas de etapa por responsável.",
      },
      {
        type: "improvement",
        text: "Relatórios: novo filtro de valores do Eixo X — permite selecionar quais categorias exibir no gráfico (ex: mostrar apenas algumas etapas num funil).",
      },
      {
        type: "improvement",
        text: "Relatórios: nova agregação Soma Cumulativa — acumula o valor monetário ao longo do tempo, útil para ver receita acumulada de negócios ganhos.",
      },
      {
        type: "fix",
        text: "Relatórios: corrigido bug na Contagem Cumulativa onde o primeiro ponto já começava com valor incorreto — era contando todos os cards em vez de aplicar os filtros do campo (ex: Negócios Ganhos deveria contar só os ganhos).",
      },
    ],
  },
  {
    version: "1.6.8",
    date: "18/03/2026",
    entries: [
      {
        type: "fix",
        text: "Corrigido bug crítico onde SDRs conseguiam criar cards com responsável vinculado diretamente — o valor era ignorado na criação via Pydantic mas passava em edições. Corrigido no backend (model_copy) e no frontend (remoção explícita do campo no payload de edição).",
      },
      {
        type: "improvement",
        text: "Painel de detalhes dos logs de auditoria em Configurações completamente reformulado: atualizações mostram tabela de comparação antes/depois (somente campos alterados), criações e exclusões mostram o snapshot completo incluindo campos vazios.",
      },
    ],
  },
  {
    version: "1.6.7",
    date: "18/03/2026",
    entries: [
      {
        type: "improvement",
        text: "Logs de Auditoria agora registram o estado completo antes e depois de cada alteração. Em atualizações de cards, boards e usuários é possível ver exatamente o que mudou — valor anterior e valor novo. Em exclusões, o snapshot completo do registro fica salvo para consulta futura.",
      },
      {
        type: "improvement",
        text: "Clientes e Pessoas agora também geram logs de auditoria nas ações de criar, editar e excluir — antes essas ações não eram registradas.",
      },
      {
        type: "improvement",
        text: "Movimentação de card entre listas agora registra a lista de origem e a lista de destino no log. Transferência de responsável registra o responsável anterior e o novo.",
      },
    ],
  },
  {
    version: "1.6.6",
    date: "17/03/2026",
    entries: [
      {
        type: "improvement",
        text: "Logs de Auditoria reformulados: pesquisa manual com botão 'Pesquisar', atalhos de período (Hoje, Ontem, Últimos 7 dias, Este mês), novo filtro por usuário e limite aumentado para 500 registros. Cada log de criação de card agora registra responsável, SDR, lista e valor.",
      },
      {
        type: "fix",
        text: "Correção de segurança: SDR não podia atribuir vendedor pela interface, mas a restrição não era validada no servidor — uma chamada direta à API conseguia burlar isso. Agora o backend força as regras de atribuição independente de como a requisição for feita.",
      },
    ],
  },
  {
    version: "1.6.5",
    date: "17/03/2026",
    entries: [
      {
        type: "feature",
        text: "Filtro de séries no 'Dividir por': ao configurar a divisão de um gráfico (ex: Etapa do Pipeline), agora aparecem checkboxes para escolher exatamente quais séries exibir — muito útil para focar em etapas específicas sem poluir o gráfico com todas as etapas.",
      },
    ],
  },
  {
    version: "1.6.4",
    date: "17/03/2026",
    entries: [
      {
        type: "feature",
        text: "Novo tipo de gráfico: Barras Horizontais. Ideal para funis e rankings com nomes de etapas longos — os rótulos ficam no eixo Y com espaço para leitura confortável.",
      },
      {
        type: "feature",
        text: "Novos campos na fonte 'Histórico de Etapas': Data de Entrada na Etapa (por dia/semana/mês), Data Entrada Prospecção, Aquisição e Expansão. Agora é possível criar gráficos de contagem cumulativa por dia usando 'Dividir por Etapa' para ver o ritmo de entrada de cada etapa ao longo do tempo.",
      },
      {
        type: "improvement",
        text: "Seletor de tipo de gráfico redesenhado: agora exibe 5 ícones por linha sem rótulo de texto, ficando mais compacto. O nome do tipo aparece ao passar o mouse.",
      },
    ],
  },
  {
    version: "1.6.3",
    date: "17/03/2026",
    entries: [
      {
        type: "feature",
        text: "Nova fonte de dados nos relatórios: 'Histórico de Etapas'. Permite criar gráficos de funil mostrando quantos negócios entraram em cada etapa do pipeline dentro de um período — basta selecionar Eixo X = Etapa do Pipeline e Eixo Y = Negócios que Entraram.",
      },
    ],
  },
  {
    version: "1.6.2",
    date: "17/03/2026",
    entries: [
      {
        type: "improvement",
        text: "Agora é possível voltar um card para a etapa anterior do pipeline — mas somente uma etapa por vez. A regra de não pular etapas continua valendo tanto ao avançar quanto ao voltar.",
      },
      {
        type: "improvement",
        text: "Vendedores e SDRs agora visualizam todos os cards do pipeline, independentemente de estarem atribuídos. A restrição de edição continua: cada um só pode editar os cards vinculados a ele.",
      },
    ],
  },
  {
    version: "1.6.1",
    date: "16/03/2026",
    entries: [
      {
        type: "fix",
        text: "Corrigido erro ao clicar em 'Reabrir Negócio' — o sistema tentava criar o card na lista errada e bloqueava a ação. Agora o card reaberto vai direto para a lista Prospecção, como esperado.",
      },
    ],
  },
  {
    version: "1.6.0",
    date: "16/03/2026",
    entries: [
      {
        type: "feature",
        text: "Gamificação agora separa pontos e rankings por board: Prospecção e Aquisição têm rankings independentes, com pontuações distintas para cada tipo de ação realizada em cada board.",
      },
      {
        type: "feature",
        text: "Sistema de comissão para SDR: ao fechar um negócio, o SDR vinculado ao card recebe automaticamente 1/4 dos pontos. Em reuniões realizadas no board Aquisição, o SDR que agendou recebe 1/3 dos pontos.",
      },
      {
        type: "feature",
        text: "Pontos agora são concedidos em mais momentos: criar card, mover card, perder negócio, agendar reunião, realizar ligação, fazer follow-up, concluir tarefa e enviar proposta — cada ação vale pontos de acordo com o board.",
      },
      {
        type: "improvement",
        text: "Rankings calculados automaticamente a cada hora pelo sistema, em vez de recalcular a cada consulta — mais rápido e consistente.",
      },
      {
        type: "improvement",
        text: "Página de Gamificação atualizada: novo seletor de board (Prospecção / Aquisição) nos rankings, cards de perfil com pontos separados por board e posições no ranking exibidas por board.",
      },
      {
        type: "improvement",
        text: "Badges com critério automático agora suportam três tipos de regra: pontos totais, contagem de ações específicas e posição no ranking — todos podendo ser filtrados por board.",
      },
      {
        type: "fix",
        text: "Deletar um badge agora preserva o histórico de conquistas dos usuários que já o tinham — o badge some da lista mas não apaga o registro de quem conquistou.",
      },
    ],
  },
  {
    version: "1.5.3",
    date: "17/03/2026",
    entries: [
      {
        type: "fix",
        text: "Corrigido bug no botão 'Reabrir Negócio': o card era criado mas ficava sem empresa e contato vinculados. Agora empresa e contato do card original são copiados corretamente para o novo card.",
      },
      {
        type: "fix",
        text: "Corrigido erro 403 ao criar card como vendedor ou SDR — o sistema agora permite criar corretamente na lista Prospecção.",
      },
      {
        type: "improvement",
        text: "Na modal de criação de card, o campo 'Lista' agora fica travado para vendedores e SDRs, que só podem criar na lista Prospecção. Admin e Gerente continuam podendo escolher livremente.",
      },
    ],
  },
  {
    version: "1.5.2",
    date: "13/03/2026",
    entries: [
      {
        type: "feature",
        text: "Cinco novos tipos de gráfico nos Relatórios: Área (igual ao de linha, mas com preenchimento abaixo da curva), Dispersão (pontos por categoria), Radar (gráfico aranha, ideal para comparar vendedores em múltiplas métricas), Funil (etapas ordenadas do maior para o menor) e KPI (número grande em destaque com indicador de tendência).",
      },
      {
        type: "feature",
        text: "Novas métricas disponíveis nos Relatórios — fonte Tarefas: Ligações (total), Ligações Concluídas e NoShow (Reuniões). Agora é possível criar gráficos mostrando quantas ligações concluídas e quantos NoShow cada vendedor acumulou por semana.",
      },
      {
        type: "feature",
        text: "Rastreamento de NoShow: reuniões marcadas como NoShow agora ficam registradas no banco de dados com um campo próprio (is_noshow), separando-as de reuniões concluídas normalmente.",
      },
    ],
  },
  {
    version: "1.5.1",
    date: "12/03/2026",
    entries: [
      {
        type: "feature",
        text: "Campos Calculados nos Relatórios: crie métricas derivadas combinando campos existentes com fórmulas aritméticas (ex: [won_count] / [count] * 100 para Taxa de Conversão). Arraste o campo calculado para o eixo Y de qualquer gráfico.",
      },
      {
        type: "feature",
        text: "Autocomplete de campos ao digitar [ na fórmula — selecione o campo da lista sem precisar decorar os nomes.",
      },
      {
        type: "feature",
        text: "Validação da fórmula em tempo real: erros de sintaxe, campos inexistentes e parênteses desbalanceados são detectados antes de salvar.",
      },
    ],
  },
  {
    version: "1.5.0",
    date: "12/03/2026",
    entries: [
      {
        type: "feature",
        text: "Nova página de Atividades: visualize todas as suas atividades pendentes em um único lugar, com filtros por período (hoje, atrasadas, amanhã, semana, todas), tipo, prioridade e responsável. Acessível pelo menu lateral.",
      },
      {
        type: "feature",
        text: "Modo Foco (Iniciar Atividades): disponível para Vendedores e SDRs, permite trabalhar nas atividades em sequência sem sair da página. Cada atividade mostra os dados completos do negócio ao lado — cliente, pessoa de contato, telefones, email, valor, etapa, anotações e mais.",
      },
      {
        type: "feature",
        text: "Dentro do Modo Foco é possível Concluir, Reagendar, marcar NoShow (reuniões), Ligar (ligações), Editar os dados da atividade e Pular para a próxima — tudo sem sair da tela.",
      },
      {
        type: "improvement",
        text: "Atividades processadas (concluídas, reagendadas ou NoShow) são removidas da fila do Modo Foco automaticamente. Atividades puladas permanecem na fila para serem revisitadas.",
      },
      {
        type: "improvement",
        text: "Atividades na página agora exibem no máximo 10 por página, com paginação em todos os filtros incluindo Atrasadas.",
      },
    ],
  },
  {
    version: "1.4.0",
    date: "11/03/2026",
    entries: [
      {
        type: "feature",
        text: "Agent Growth: novo assistente de IA disponível em todas as páginas (botão azul no canto inferior direito). Clique para abrir e escolha uma das opções disponíveis — o assistente responde com base no que você está fazendo no momento. As sugestões mudam dependendo se você está dentro de um card, em um board ou em outra página.",
      },
      {
        type: "feature",
        text: "As ações disponíveis variam de acordo com o seu perfil: Vendedores têm acesso a resumo do negócio, sugestão de próximos passos, geração de e-mails e análise de pipeline. SDRs têm foco em prospecção, cold call e rotina do dia.",
      },
      {
        type: "feature",
        text: "Ações disponíveis para todos: 'O que tenho para fazer hoje' lista suas atividades pendentes e atrasadas; 'Como foi meu dia hoje' analisa suas movimentações, cards avançados e atividades concluídas no dia.",
      },
    ],
  },
  {
    version: "1.3.19",
    date: "11/03/2026",
    entries: [
      {
        type: "feature",
        text: "Notificações nativas do browser: quando um card é atribuído a você, aparece uma notificação no canto da tela — igual às do Gmail e Slack — mesmo com o sistema em outra aba. Ao clicar, vai direto para o card.",
      },
      {
        type: "feature",
        text: "Na primeira vez que entrar no sistema, um aviso aparece pedindo para ativar as notificações do browser. Basta clicar em 'clique aqui para ativar' e aceitar.",
      },
      {
        type: "fix",
        text: "Ao clicar em uma notificação dentro do sistema, agora navega corretamente até o card correspondente.",
      },
    ],
  },
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
