import React from "react";
import { Handle, Position, useReactFlow } from "reactflow";
import { Zap, FilePlus, Mail, Bell, UserPlus, Tag, MoveRight, Edit, Settings, X, Copy } from "lucide-react";

interface ActionNodeProps {
  id: string;
  data: {
    label: string;
    actionType: string;
    config?: any;
  };
}

const ActionNode: React.FC<ActionNodeProps> = ({ id, data }) => {
  const { deleteElements, getNodes, setNodes } = useReactFlow();

  // Handler para deletar o node
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation(); // Evita que o click no X selecione o node
    deleteElements({ nodes: [{ id }] });
  };

  // Handler para duplicar o node
  const handleDuplicate = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nodes = getNodes();
    const nodeToDuplicate = nodes.find((n) => n.id === id);
    if (!nodeToDuplicate) return;

    // Cria novo ID único
    const newId = `node_${Date.now()}`;
    const newNode = {
      ...nodeToDuplicate,
      id: newId,
      position: {
        x: nodeToDuplicate.position.x + 50,
        y: nodeToDuplicate.position.y + 50,
      },
      selected: false,
    };

    setNodes([...nodes, newNode]);
  };

  // Mapeia ícones por tipo de ação
  const getIcon = () => {
    switch (data.actionType) {
      case "create_card":
        return <FilePlus size={20} className="text-blue-400" />;
      case "send_email":
        return <Mail size={20} className="text-yellow-400" />;
      case "create_notification":
        return <Bell size={20} className="text-purple-400" />;
      case "assign_user":
        return <UserPlus size={20} className="text-green-400" />;
      case "add_tag":
        return <Tag size={20} className="text-pink-400" />;
      case "move_to_list":
        return <MoveRight size={20} className="text-indigo-400" />;
      case "update_field":
        return <Edit size={20} className="text-orange-400" />;
      default:
        return <Zap size={20} className="text-emerald-400" />;
    }
  };

  // Cor do border por tipo
  const getBorderColor = () => {
    switch (data.actionType) {
      case "create_card":
        return "border-blue-500";
      case "send_email":
        return "border-yellow-500";
      case "create_notification":
        return "border-purple-500";
      case "assign_user":
        return "border-green-500";
      case "add_tag":
        return "border-pink-500";
      case "move_to_list":
        return "border-indigo-500";
      case "update_field":
        return "border-orange-500";
      default:
        return "border-emerald-500";
    }
  };

  return (
    <div
      className={`bg-slate-800 border-2 ${getBorderColor()} rounded-lg shadow-xl min-w-[200px] transition-all hover:shadow-2xl relative group`}
    >
      {/* Botões de ação (aparecem no hover) */}
      <div className="absolute -top-2 -right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <button
          onClick={handleDuplicate}
          className="w-5 h-5 bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg"
          title="Duplicar"
        >
          <Copy size={11} />
        </button>
        <button
          onClick={handleDelete}
          className="w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg"
          title="Deletar"
        >
          <X size={12} />
        </button>
      </div>

      {/* Handle de entrada (top) */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-emerald-500 !border-2 !border-white"
      />

      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600/20 to-emerald-800/20 px-4 py-2 border-b border-slate-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap size={14} className="text-emerald-400" />
            <span className="text-xs font-semibold text-emerald-300 uppercase tracking-wide">
              Ação
            </span>
          </div>
          {data.config && Object.keys(data.config).length > 0 && (
            <div className="flex items-center gap-1 px-2 py-0.5 bg-emerald-500/20 border border-emerald-500/30 rounded-full">
              <Settings size={10} className="text-emerald-400" />
              <span className="text-[10px] font-medium text-emerald-300">OK</span>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-center gap-3 mb-2">
          {getIcon()}
          <span className="text-white font-medium text-sm">{data.label}</span>
        </div>
        {data.config && (
          <div className="text-xs text-slate-400 mt-2">
            {data.config.targetBoardName && `Board: ${data.config.targetBoardName}`}
            {data.config.emailTo && `Para: ${data.config.emailTo}`}
          </div>
        )}
      </div>

      {/* Handle de saída (bottom) - para encadear ações */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-emerald-500 !border-2 !border-white"
      />
    </div>
  );
};

export default ActionNode;
