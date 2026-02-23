import React from "react";
import { Sparkles, Mail, Bell, MoveRight, AlertTriangle, UserCheck, Edit } from "lucide-react";
import { Node, Edge } from "reactflow";
import { BaseModal, Alert } from "../common";

interface Template {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  category: string;
  nodes: Node[];
  edges: Edge[];
}

const templates: Template[] = [
  {
    id: "card-won-email",
    name: "Card Ganho → Enviar Email",
    description: "Quando um card for marcado como ganho, envia um email automático",
    icon: <Mail size={24} className="text-blue-400" />,
    category: "Vendas",
    nodes: [
      {
        id: "trigger_1",
        type: "triggerNode",
        position: { x: 100, y: 100 },
        data: {
          label: "Card Ganho",
          triggerType: "card_won",
          config: { board_id: "1" },
        },
      },
      {
        id: "action_1",
        type: "actionNode",
        position: { x: 100, y: 250 },
        data: {
          label: "Enviar Email",
          actionType: "send_email",
          config: {
            to: "{client_email}",
            subject: "Parabéns! Negócio Fechado",
            body: "Olá {client_name}, ficamos muito felizes em fechar negócio com você!",
          },
        },
      },
    ],
    edges: [
      {
        id: "edge_1",
        source: "trigger_1",
        target: "action_1",
        animated: true,
      },
    ],
  },
  {
    id: "card-overdue-notification",
    name: "Card Atrasado → Notificar",
    description: "Notifica o responsável quando um card está atrasado há mais de 3 dias",
    icon: <AlertTriangle size={24} className="text-orange-400" />,
    category: "Gestão",
    nodes: [
      {
        id: "trigger_2",
        type: "triggerNode",
        position: { x: 100, y: 100 },
        data: {
          label: "Card Atrasado",
          triggerType: "card_overdue",
          config: { days_overdue: 3 },
        },
      },
      {
        id: "action_2",
        type: "actionNode",
        position: { x: 100, y: 250 },
        data: {
          label: "Criar Notificação",
          actionType: "create_notification",
          config: {
            recipient_type: "assigned_user",
            message: "Atenção! O card está atrasado há 3 dias.",
          },
        },
      },
    ],
    edges: [
      {
        id: "edge_2",
        source: "trigger_2",
        target: "action_2",
        animated: true,
      },
    ],
  },
  {
    id: "card-won-postsale",
    name: "Vendas → Pós-Venda",
    description: "Move automaticamente cards ganhos em Vendas para o board de Pós-Venda",
    icon: <MoveRight size={24} className="text-green-400" />,
    category: "Vendas",
    nodes: [
      {
        id: "trigger_3",
        type: "triggerNode",
        position: { x: 100, y: 100 },
        data: {
          label: "Card Ganho",
          triggerType: "card_won",
          config: { board_id: "1" },
        },
      },
      {
        id: "action_3",
        type: "actionNode",
        position: { x: 100, y: 250 },
        data: {
          label: "Criar Card",
          actionType: "create_card",
          config: {
            target_board_id: "2",
            target_list_id: "1",
            title: "Cliente: {client_name}",
            description: "Transferido automaticamente de Vendas",
          },
        },
      },
      {
        id: "action_4",
        type: "actionNode",
        position: { x: 100, y: 400 },
        data: {
          label: "Criar Notificação",
          actionType: "create_notification",
          config: {
            recipient_type: "board_owner",
            message: "Novo cliente no Pós-Venda: {client_name}",
          },
        },
      },
    ],
    edges: [
      {
        id: "edge_3",
        source: "trigger_3",
        target: "action_3",
        animated: true,
      },
      {
        id: "edge_4",
        source: "action_3",
        target: "action_4",
        animated: true,
      },
    ],
  },
  {
    id: "new-card-assign",
    name: "Novo Card → Atribuir Usuário",
    description: "Atribui automaticamente novos cards para um vendedor específico",
    icon: <Sparkles size={24} className="text-purple-400" />,
    category: "Gestão",
    nodes: [
      {
        id: "trigger_4",
        type: "triggerNode",
        position: { x: 100, y: 100 },
        data: {
          label: "Card Criado",
          triggerType: "card_created",
          config: { board_id: "1" },
        },
      },
      {
        id: "action_5",
        type: "actionNode",
        position: { x: 100, y: 250 },
        data: {
          label: "Atribuir Usuário",
          actionType: "assign_user",
          config: {
            user_id: "1",
            notify_user: true,
          },
        },
      },
      {
        id: "action_6",
        type: "actionNode",
        position: { x: 100, y: 400 },
        data: {
          label: "Adicionar Tag",
          actionType: "add_tag",
          config: {
            tag_name: "Novo Lead",
            tag_color: "blue",
          },
        },
      },
    ],
    edges: [
      {
        id: "edge_5",
        source: "trigger_4",
        target: "action_5",
        animated: true,
      },
      {
        id: "edge_6",
        source: "action_5",
        target: "action_6",
        animated: true,
      },
    ],
  },
  {
    id: "daily-reminder",
    name: "Lembrete Diário de Follow-up",
    description: "Envia notificação diária às 9h para revisar cards em negociação",
    icon: <Bell size={24} className="text-cyan-400" />,
    category: "Gestão",
    nodes: [
      {
        id: "trigger_5",
        type: "triggerNode",
        position: { x: 100, y: 100 },
        data: {
          label: "Agendado",
          triggerType: "scheduled",
          config: {
            frequency: "daily",
            time: "09:00",
          },
        },
      },
      {
        id: "action_7",
        type: "actionNode",
        position: { x: 100, y: 250 },
        data: {
          label: "Criar Notificação",
          actionType: "create_notification",
          config: {
            recipient_type: "all_users",
            message: "Bom dia! Não esqueça de revisar os cards em negociação hoje.",
          },
        },
      },
    ],
    edges: [
      {
        id: "edge_7",
        source: "trigger_5",
        target: "action_7",
        animated: true,
      },
    ],
  },
  {
    id: "card-won-update-client",
    name: "Negócio Ganho → Cliente",
    description: "Quando um negócio for ganho, atualiza o tipo de relacionamento para 'Cliente'",
    icon: <UserCheck size={24} className="text-green-400" />,
    category: "Vendas",
    nodes: [
      {
        id: "trigger_6",
        type: "triggerNode",
        position: { x: 100, y: 100 },
        data: {
          label: "Card Ganho",
          triggerType: "card_won",
          config: {},
        },
      },
      {
        id: "action_8",
        type: "actionNode",
        position: { x: 100, y: 250 },
        data: {
          label: "Atualizar Campo do Cliente",
          actionType: "update_client_field",
          config: {
            field_name: "relationship_type",
            value: "Cliente",
          },
        },
      },
    ],
    edges: [
      {
        id: "edge_8",
        source: "trigger_6",
        target: "action_8",
        animated: true,
      },
    ],
  },
  {
    id: "card-moved-to-prospect",
    name: "Reunião Agendada → Prospect",
    description: "Quando um card move para 'Reunião Agendada', atualiza o cliente para 'Prospect'",
    icon: <Edit size={24} className="text-purple-400" />,
    category: "Vendas",
    nodes: [
      {
        id: "trigger_7",
        type: "triggerNode",
        position: { x: 100, y: 100 },
        data: {
          label: "Card Movido",
          triggerType: "card_moved",
          config: {
            // to_list_id deve ser configurado depois
          },
        },
      },
      {
        id: "action_9",
        type: "actionNode",
        position: { x: 100, y: 250 },
        data: {
          label: "Atualizar Campo do Cliente",
          actionType: "update_client_field",
          config: {
            field_name: "relationship_type",
            value: "Prospect",
          },
        },
      },
    ],
    edges: [
      {
        id: "edge_9",
        source: "trigger_7",
        target: "action_9",
        animated: true,
      },
    ],
  },
];

interface TemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (_nodes: Node[], _edges: Edge[]) => void;
}

const TemplatesModal: React.FC<TemplatesModalProps> = ({ isOpen, onClose, onSelectTemplate }) => {
  const handleSelectTemplate = (template: Template) => {
    onSelectTemplate(template.nodes, template.edges);
    onClose();
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Biblioteca de Templates"
      subtitle="Escolha um template pronto e personalize como quiser"
      size="xl"
    >
      <div className="space-y-4">
        {/* Grid de templates */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {templates.map((template) => (
            <div
              key={template.id}
              onClick={() => handleSelectTemplate(template)}
              className="group cursor-pointer rounded-lg border border-gray-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 p-5 transition-all hover:border-purple-500 hover:shadow-lg hover:shadow-purple-500/10"
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 rounded-lg bg-gray-100 dark:bg-slate-800 p-3 transition-colors group-hover:bg-gray-200 dark:hover:bg-slate-700">
                  {template.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex items-center gap-2">
                    <h3 className="font-medium text-slate-900 dark:text-white transition-colors group-hover:text-purple-400">
                      {template.name}
                    </h3>
                    <span className="rounded bg-gray-200 dark:bg-slate-700 px-2 py-0.5 text-xs text-slate-600 dark:text-slate-300">
                      {template.category}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed text-slate-400 dark:text-slate-400">
                    {template.description}
                  </p>
                  <div className="mt-3 flex items-center gap-3 text-xs text-slate-400 dark:text-slate-500">
                    <span>{template.nodes.length} nodes</span>
                    <span>•</span>
                    <span>{template.edges.length} conexões</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Dica */}
        <Alert type="info">
          <strong>Dica:</strong> Você pode personalizar qualquer template depois de carregar no canvas
        </Alert>
      </div>
    </BaseModal>
  );
};

export default TemplatesModal;
