import React from "react";
import {
  Plus,
  CheckCircle,
  XCircle,
  MoveRight,
  Clock,
  Calendar,
  Bell,
  UserPlus,
  Tag,
  Edit,
} from "lucide-react";

interface NodeType {
  type: string;
  label: string;
  icon: React.ReactNode;
  category: "trigger" | "action";
  color: string;
}

const availableNodes: NodeType[] = [
  // TRIGGERS
  {
    type: "card_created",
    label: "Card Criado",
    icon: <Plus size={18} />,
    category: "trigger",
    color: "blue",
  },
  {
    type: "card_won",
    label: "Card Ganho",
    icon: <CheckCircle size={18} />,
    category: "trigger",
    color: "green",
  },
  {
    type: "card_lost",
    label: "Card Perdido",
    icon: <XCircle size={18} />,
    category: "trigger",
    color: "red",
  },
  {
    type: "card_moved",
    label: "Card Movido",
    icon: <MoveRight size={18} />,
    category: "trigger",
    color: "purple",
  },
  {
    type: "card_overdue",
    label: "Card Atrasado",
    icon: <Clock size={18} />,
    category: "trigger",
    color: "orange",
  },
  {
    type: "scheduled",
    label: "Agendado",
    icon: <Calendar size={18} />,
    category: "trigger",
    color: "cyan",
  },
  {
    type: "manual",
    label: "Manual",
    icon: <Tag size={18} />,
    category: "trigger",
    color: "yellow",
  },
  // AÇÕES
  {
    type: "assign_round_robin",
    label: "Rodízio de Vendedores",
    icon: <UserPlus size={18} />,
    category: "action",
    color: "purple",
  },
  {
    type: "assign_sdr_round_robin",
    label: "Rodízio de SDRs",
    icon: <UserPlus size={18} />,
    category: "action",
    color: "cyan",
  },
  {
    type: "assign_card",
    label: "Atribuir Vendedor",
    icon: <UserPlus size={18} />,
    category: "action",
    color: "green",
  },
  {
    type: "move_card",
    label: "Mover Card",
    icon: <MoveRight size={18} />,
    category: "action",
    color: "indigo",
  },
  {
    type: "mark_won",
    label: "Marcar como Ganho",
    icon: <CheckCircle size={18} />,
    category: "action",
    color: "green",
  },
  {
    type: "mark_lost",
    label: "Marcar como Perdido",
    icon: <XCircle size={18} />,
    category: "action",
    color: "red",
  },
  {
    type: "send_notification",
    label: "Enviar Notificação",
    icon: <Bell size={18} />,
    category: "action",
    color: "blue",
  },
  {
    type: "update_client_field",
    label: "Atualizar Campo do Cliente",
    icon: <Edit size={18} />,
    category: "action",
    color: "yellow",
  },
];

interface NodesSidebarProps {
  onDragStart: (event: React.DragEvent, nodeType: string, category: string) => void;
}

const NodesSidebar: React.FC<NodesSidebarProps> = ({ onDragStart }) => {
  const triggers = availableNodes.filter((n) => n.category === "trigger");
  const actions = availableNodes.filter((n) => n.category === "action");

  return (
    <div className="max-h-[85vh] w-80 overflow-y-auto overflow-x-hidden border-l border-slate-700 bg-slate-800/50 p-4 backdrop-blur sm:max-h-[calc(100vh-70px)]">
      <h3 className="mb-4 text-lg font-semibold text-white">Blocos Disponíveis</h3>
      <p className="mb-6 text-sm text-slate-400">
        Arraste os blocos para o canvas para criar sua automação
      </p>

      {/* TRIGGERS */}
      <div className="mb-6">
        <h4 className="mb-3 text-sm font-medium uppercase tracking-wide text-purple-400">
          🎯 Triggers (Gatilhos)
        </h4>
        <div className="space-y-2">
          {triggers.map((node) => (
            <div
              key={node.type}
              draggable
              onDragStart={(e) => onDragStart(e, node.type, node.category)}
              className="flex cursor-grab items-center gap-3 rounded-lg border border-slate-600 bg-slate-700/50 p-3 transition-all hover:border-purple-500 hover:bg-slate-700 active:cursor-grabbing"
            >
              <div className={`text-${node.color}-400`}>{node.icon}</div>
              <span className="text-sm font-medium text-white">{node.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* AÇÕES */}
      <div>
        <h4 className="mb-3 text-sm font-medium uppercase tracking-wide text-emerald-400">
          ⚡ Ações
        </h4>
        <div className="space-y-2">
          {actions.map((node) => (
            <div
              key={node.type}
              draggable
              onDragStart={(e) => onDragStart(e, node.type, node.category)}
              className="flex cursor-grab items-center gap-3 rounded-lg border border-slate-600 bg-slate-700/50 p-3 transition-all hover:border-emerald-500 hover:bg-slate-700 active:cursor-grabbing"
            >
              <div className={`text-${node.color}-400`}>{node.icon}</div>
              <span className="text-sm font-medium text-white">{node.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Dica */}
      <div className="mt-6 rounded-lg border border-blue-500/30 bg-blue-500/10 p-4">
        <p className="text-xs text-blue-300">
          💡 <strong>Dica:</strong> Conecte um trigger a uma ou mais ações para criar seu fluxo
          automático
        </p>
      </div>
    </div>
  );
};

export default NodesSidebar;
