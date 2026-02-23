import React from "react";
import { Handle, Position, useReactFlow } from "reactflow";
import { Zap, CheckCircle, XCircle, MoveRight, Clock, Calendar, Plus, Settings, X, Copy } from "lucide-react";

interface TriggerNodeProps {
  id: string;
  data: {
    label: string;
    triggerType: string;
    boardName?: string;
    config?: any;
  };
}

const TriggerNode: React.FC<TriggerNodeProps> = ({ id, data }) => {
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

  // Mapeia ícones por tipo de trigger
  const getIcon = () => {
    switch (data.triggerType) {
      case "card_created":
        return <Plus size={20} className="text-blue-400" />;
      case "card_won":
        return <CheckCircle size={20} className="text-green-400" />;
      case "card_lost":
        return <XCircle size={20} className="text-red-400" />;
      case "card_moved":
        return <MoveRight size={20} className="text-purple-400" />;
      case "card_overdue":
        return <Clock size={20} className="text-orange-400" />;
      case "scheduled":
        return <Calendar size={20} className="text-cyan-400" />;
      default:
        return <Zap size={20} className="text-purple-400" />;
    }
  };

  // Cor do border por tipo
  const getBorderColor = () => {
    switch (data.triggerType) {
      case "card_created":
        return "border-blue-500";
      case "card_won":
        return "border-green-500";
      case "card_lost":
        return "border-red-500";
      case "card_moved":
        return "border-purple-500";
      case "card_overdue":
        return "border-orange-500";
      case "scheduled":
        return "border-cyan-500";
      default:
        return "border-purple-500";
    }
  };

  return (
    <div
      className={`border-2 bg-gray-100 dark:bg-slate-800 ${getBorderColor()} group relative min-w-[200px] rounded-lg shadow-xl transition-all hover:shadow-2xl`}
    >
      {/* Botões de ação (aparecem no hover) */}
      <div className="absolute -right-2 -top-2 z-10 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          onClick={handleDuplicate}
          className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-white shadow-lg hover:bg-blue-600"
          title="Duplicar"
        >
          <Copy size={11} />
        </button>
        <button
          onClick={handleDelete}
          className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white shadow-lg hover:bg-red-600"
          title="Deletar"
        >
          <X size={12} />
        </button>
      </div>

      {/* Header */}
      <div className="border-b border-gray-200 dark:border-slate-700 bg-gradient-to-r from-purple-600/20 to-purple-800/20 px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap size={14} className="text-purple-400" />
            <span className="text-xs font-semibold uppercase tracking-wide text-purple-300">
              Trigger
            </span>
          </div>
          {data.config && Object.keys(data.config).length > 0 && (
            <div className="flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/20 px-2 py-0.5">
              <Settings size={10} className="text-emerald-400" />
              <span className="text-[10px] font-medium text-emerald-300">OK</span>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="mb-2 flex items-center gap-3">
          {getIcon()}
          <span className="text-sm font-medium text-slate-900 dark:text-white">{data.label}</span>
        </div>
        {data.boardName && (
          <div className="mt-2 text-xs text-slate-400 dark:text-slate-400">Board: {data.boardName}</div>
        )}
      </div>

      {/* Handle de saída (bottom) */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-3 !w-3 !border-2 !border-white !bg-purple-500"
      />
    </div>
  );
};

export default TriggerNode;
