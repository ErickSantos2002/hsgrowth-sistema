import React from "react";
import { X, Sparkles, Mail, Bell, MoveRight, AlertTriangle } from "lucide-react";
import { Node, Edge } from "reactflow";

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
];

interface TemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (nodes: Node[], edges: Edge[]) => void;
}

const TemplatesModal: React.FC<TemplatesModalProps> = ({ isOpen, onClose, onSelectTemplate }) => {
  if (!isOpen) return null;

  const handleSelectTemplate = (template: Template) => {
    onSelectTemplate(template.nodes, template.edges);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <div>
            <h2 className="text-2xl font-semibold text-white flex items-center gap-2">
              <Sparkles size={24} className="text-purple-400" />
              Biblioteca de Templates
            </h2>
            <p className="text-slate-400 text-sm mt-1">
              Escolha um template pronto e personalize como quiser
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates.map((template) => (
              <div
                key={template.id}
                onClick={() => handleSelectTemplate(template)}
                className="group bg-slate-900/50 border border-slate-700 hover:border-purple-500 rounded-lg p-5 cursor-pointer transition-all hover:shadow-lg hover:shadow-purple-500/10"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 p-3 bg-slate-800 rounded-lg group-hover:bg-slate-700 transition-colors">
                    {template.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-white font-medium group-hover:text-purple-400 transition-colors">
                        {template.name}
                      </h3>
                      <span className="px-2 py-0.5 bg-slate-700 text-slate-300 text-xs rounded">
                        {template.category}
                      </span>
                    </div>
                    <p className="text-slate-400 text-sm leading-relaxed">
                      {template.description}
                    </p>
                    <div className="flex items-center gap-3 mt-3 text-xs text-slate-500">
                      <span>{template.nodes.length} nodes</span>
                      <span>•</span>
                      <span>{template.edges.length} conexões</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-700 bg-slate-900/50">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Sparkles size={16} className="text-purple-400" />
            <span>
              Dica: Você pode personalizar qualquer template depois de carregar no canvas
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemplatesModal;
