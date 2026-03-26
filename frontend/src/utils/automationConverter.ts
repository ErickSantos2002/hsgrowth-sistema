import { Node, Edge } from "reactflow";

/**
 * Converte dados da API para formato React Flow (nodes e edges)
 */
export function convertApiToReactFlow(automation: any): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  if (!automation) {
    return { nodes, edges };
  }

  // Cria o node do trigger
  if (automation.trigger_event) {
    const triggerConditions = automation.trigger_conditions || {};
    // Para card_created/card_moved: injeta board_id no config se ainda não estiver presente,
    // para que o seletor de lista consiga carregar as opções corretamente.
    const triggerConfig =
      (automation.trigger_event === "card_created" || automation.trigger_event === "card_moved") &&
      automation.board_id &&
      !triggerConditions.board_id
        ? { board_id: String(automation.board_id), ...triggerConditions }
        : triggerConditions;

    const triggerNode: Node = {
      id: "trigger_1",
      type: "triggerNode",
      position: { x: 100, y: 100 },
      data: {
        label: formatTriggerLabel(automation.trigger_event),
        triggerType: automation.trigger_event,
        config: triggerConfig,
      },
    };
    nodes.push(triggerNode);
  }

  // Cria nodes das actions
  if (automation.actions && Array.isArray(automation.actions)) {
    automation.actions.forEach((action: any, index: number) => {
      const actionNode: Node = {
        id: `action_${index + 1}`,
        type: "actionNode",
        position: { x: 100 + (index * 250), y: 300 },
        data: {
          label: formatActionLabel(action.type),
          actionType: action.type,
          config: action.params || {},
        },
      };
      nodes.push(actionNode);

      // Conecta trigger com action
      if (nodes.length > 0) {
        edges.push({
          id: `edge_trigger_to_action_${index + 1}`,
          source: "trigger_1",
          target: `action_${index + 1}`,
          animated: true,
        });
      }
    });
  }

  return { nodes, edges };
}

/**
 * Converte nodes e edges do React Flow para formato da API
 */
export function convertReactFlowToApi(
  nodes: Node[],
  edges: Edge[],
  automationName: string,
  boardId: number
): any {
  // Separa triggers e actions
  const triggerNodes = nodes.filter((n) => n.type === "triggerNode");
  const actionNodes = nodes.filter((n) => n.type === "actionNode");

  if (triggerNodes.length === 0) {
    throw new Error("É necessário ter pelo menos um gatilho (trigger)");
  }

  if (triggerNodes.length > 1) {
    throw new Error("Só é permitido ter um gatilho (trigger) por automação. Por favor, remova os gatilhos extras.");
  }

  if (actionNodes.length === 0) {
    throw new Error("É necessário ter pelo menos uma ação");
  }

  // Pega o primeiro trigger (por enquanto suportamos apenas 1 trigger)
  const triggerNode = triggerNodes[0];
  const triggerType = triggerNode.data.triggerType;
  const triggerConfig = triggerNode.data.config || {};

  // Monta trigger_conditions baseado no config
  // Remove board_id das conditions (é usado só para carregar listas no UI, não é uma condition real)
  let triggerConditions = null;
  if (triggerConfig && Object.keys(triggerConfig).length > 0) {
    const { board_id: _board_id, ...conditionsOnly } = triggerConfig;
    if (Object.keys(conditionsOnly).length > 0) {
      triggerConditions = conditionsOnly;
    }
  }

  // Monta array de actions seguindo a ordem das conexões (BFS a partir do trigger)
  const orderedActions: any[] = [];
  const visited = new Set<string>();
  const queue: string[] = [triggerNode.id];

  visited.add(triggerNode.id);

  // Faz uma busca em largura (BFS) a partir do trigger
  while (queue.length > 0) {
    const currentNodeId = queue.shift()!;

    // Encontra todas as conexões que saem deste node
    const outgoingEdges = edges.filter((e) => e.source === currentNodeId);

    outgoingEdges.forEach((edge) => {
      const targetId = edge.target;

      // Se ainda não visitou este node
      if (!visited.has(targetId)) {
        visited.add(targetId);
        queue.push(targetId);

        // Se for uma action, adiciona ao array
        const actionNode = actionNodes.find((n) => n.id === targetId);
        if (actionNode) {
          orderedActions.push({
            type: actionNode.data.actionType,
            params: actionNode.data.config || {},
          });
        }
      }
    });
  }

  // Se não encontrou actions conectadas, adiciona todas as actions disponíveis
  if (orderedActions.length === 0 && actionNodes.length > 0) {
    actionNodes.forEach((actionNode) => {
      orderedActions.push({
        type: actionNode.data.actionType,
        params: actionNode.data.config || {},
      });
    });
  }

  // Monta objeto final
  return {
    name: automationName,
    description: `Automação criada no construtor visual`,
    board_id: boardId,
    automation_type: "trigger",
    trigger_event: triggerType,
    trigger_conditions: triggerConditions,
    actions: orderedActions,
    is_active: true,
    priority: 50,
  };
}

/**
 * Formata label do trigger
 */
function formatTriggerLabel(triggerType: string): string {
  const labels: Record<string, string> = {
    card_created: "Card Criado",
    card_won: "Card Ganho",
    card_lost: "Card Perdido",
    card_moved: "Card Movido",
    card_overdue: "Card Atrasado",
    card_assigned: "Card Atribuído",
    card_updated: "Card Atualizado",
    scheduled: "Agendado",
  };
  return labels[triggerType] || triggerType;
}

/**
 * Formata label da action
 */
function formatActionLabel(actionType: string): string {
  const labels: Record<string, string> = {
    move_card: "Mover Card",
    assign_card: "Atribuir Vendedor",
    assign_round_robin: "Rodízio de Vendedores",
    send_notification: "Enviar Notificação",
    mark_won: "Marcar como Ganho",
    mark_lost: "Marcar como Perdido",
  };
  return labels[actionType] || actionType;
}

/**
 * Valida se a automação tem estrutura mínima necessária
 */
export function validateAutomation(nodes: Node[], edges: Edge[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (nodes.length === 0) {
    errors.push("Adicione pelo menos um gatilho e uma ação ao canvas");
    return { valid: false, errors };
  }

  const triggers = nodes.filter((n) => n.type === "triggerNode");
  const actions = nodes.filter((n) => n.type === "actionNode");

  if (triggers.length === 0) {
    errors.push("Adicione pelo menos um gatilho (trigger)");
  }

  if (triggers.length > 1) {
    errors.push("Só é permitido ter um gatilho (trigger) por automação. Remova os extras.");
  }

  if (actions.length === 0) {
    errors.push("Adicione pelo menos uma ação");
  }

  if (edges.length === 0 && triggers.length > 0 && actions.length > 0) {
    errors.push("Conecte o gatilho a pelo menos uma ação");
  }

  // Verifica se todos os nodes estão configurados
  const unconfiguredNodes = nodes.filter((n) => {
    const config = n.data.config;
    // Permite nodes sem config (alguns não precisam)
    return false; // Por enquanto não valida config
  });

  return { valid: errors.length === 0, errors };
}
