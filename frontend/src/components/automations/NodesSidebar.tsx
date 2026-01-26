import React from "react";
import {
  Plus,
  CheckCircle,
  XCircle,
  MoveRight,
  Clock,
  Calendar,
  FilePlus,
  Mail,
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
  // AÇÕES
  {
    type: "create_card",
    label: "Criar Card",
    icon: <FilePlus size={18} />,
    category: "action",
    color: "blue",
  },
  {
    type: "send_email",
    label: "Enviar Email",
    icon: <Mail size={18} />,
    category: "action",
    color: "yellow",
  },
  {
    type: "create_notification",
    label: "Criar Notificação",
    icon: <Bell size={18} />,
    category: "action",
    color: "purple",
  },
  {
    type: "assign_user",
    label: "Atribuir Usuário",
    icon: <UserPlus size={18} />,
    category: "action",
    color: "green",
  },
  {
    type: "add_tag",
    label: "Adicionar Tag",
    icon: <Tag size={18} />,
    category: "action",
    color: "pink",
  },
  {
    type: "move_to_list",
    label: "Mover para Lista",
    icon: <MoveRight size={18} />,
    category: "action",
    color: "indigo",
  },
  {
    type: "update_field",
    label: "Atualizar Campo",
    icon: <Edit size={18} />,
    category: "action",
    color: "orange",
  },
];

interface NodesSidebarProps {
  onDragStart: (event: React.DragEvent, nodeType: string, category: string) => void;
}

const NodesSidebar: React.FC<NodesSidebarProps> = ({ onDragStart }) => {
  const triggers = availableNodes.filter((n) => n.category === "trigger");
  const actions = availableNodes.filter((n) => n.category === "action");

  return (
    <div className="w-80 bg-slate-800/50 backdrop-blur border-l border-slate-700 p-4 overflow-y-auto overflow-x-hidden max-h-[85vh] sm:max-h-[calc(100vh-70px)]">
      <h3 className="text-white font-semibold mb-4 text-lg">Blocos Disponíveis</h3>
      <p className="text-slate-400 text-sm mb-6">
        Arraste os blocos para o canvas para criar sua automação
      </p>

      {/* TRIGGERS */}
      <div className="mb-6">
        <h4 className="text-purple-400 font-medium text-sm mb-3 uppercase tracking-wide">
          🎯 Triggers (Gatilhos)
        </h4>
        <div className="space-y-2">
          {triggers.map((node) => (
            <div
              key={node.type}
              draggable
              onDragStart={(e) => onDragStart(e, node.type, node.category)}
              className="flex items-center gap-3 p-3 bg-slate-700/50 hover:bg-slate-700 border border-slate-600 hover:border-purple-500 rounded-lg cursor-grab active:cursor-grabbing transition-all"
            >
              <div className={`text-${node.color}-400`}>{node.icon}</div>
              <span className="text-white text-sm font-medium">{node.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* AÇÕES */}
      <div>
        <h4 className="text-emerald-400 font-medium text-sm mb-3 uppercase tracking-wide">
          ⚡ Ações
        </h4>
        <div className="space-y-2">
          {actions.map((node) => (
            <div
              key={node.type}
              draggable
              onDragStart={(e) => onDragStart(e, node.type, node.category)}
              className="flex items-center gap-3 p-3 bg-slate-700/50 hover:bg-slate-700 border border-slate-600 hover:border-emerald-500 rounded-lg cursor-grab active:cursor-grabbing transition-all"
            >
              <div className={`text-${node.color}-400`}>{node.icon}</div>
              <span className="text-white text-sm font-medium">{node.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Dica */}
      <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
        <p className="text-blue-300 text-xs">
          💡 <strong>Dica:</strong> Conecte um trigger a uma ou mais ações para criar seu fluxo
          automático
        </p>
      </div>
    </div>
  );
};

export default NodesSidebar;
