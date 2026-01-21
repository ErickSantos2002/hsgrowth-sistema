import React from "react";
import {
  EdgeProps,
  getSmoothStepPath,
  EdgeLabelRenderer,
  BaseEdge,
  useReactFlow,
} from "reactflow";
import { X } from "lucide-react";

const CustomEdge: React.FC<EdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
}) => {
  const { deleteElements } = useReactFlow();

  // Calcula o path da edge
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  // Handler para deletar a edge
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteElements({ edges: [{ id }] });
  };

  return (
    <>
      {/* A linha da conexão */}
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} />

      {/* Botão X no meio da linha */}
      <EdgeLabelRenderer>
        <div
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: "all",
          }}
          className="nodrag nopan"
        >
          <button
            onClick={handleDelete}
            className="w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg transition-colors group"
            title="Deletar conexão"
          >
            <X size={10} className="group-hover:scale-110 transition-transform" />
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
};

export default CustomEdge;
