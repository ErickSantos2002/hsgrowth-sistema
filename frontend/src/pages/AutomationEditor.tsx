import React, { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  Connection,
  Edge,
  Node,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
  BackgroundVariant,
  SelectionMode,
} from "reactflow";
import "reactflow/dist/style.css";
import { ArrowLeft, Save, Play, Trash2, Sparkles } from "lucide-react";

import TriggerNode from "../components/automations/TriggerNode";
import ActionNode from "../components/automations/ActionNode";
import NodesSidebar from "../components/automations/NodesSidebar";
import NodeConfigPanel from "../components/automations/NodeConfigPanel";
import CustomEdge from "../components/automations/CustomEdge";
import TemplatesModal from "../components/automations/TemplatesModal";

// Tipos de nodes customizados
const nodeTypes = {
  triggerNode: TriggerNode,
  actionNode: ActionNode,
};

// Tipos de edges customizados
const edgeTypes = {
  default: CustomEdge,
};

let nodeId = 0;
const getId = () => `node_${nodeId++}`;

const AutomationEditorContent: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const [automationName, setAutomationName] = useState(
    id === "new" ? "Nova Automação" : "Vendas → Pós-Venda Automático"
  );

  // Estados do React Flow
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [selectedNodesCount, setSelectedNodesCount] = useState(0);
  const [copiedNodes, setCopiedNodes] = useState<Node[]>([]);

  // Estados para Undo/Redo
  const [history, setHistory] = useState<{ nodes: Node[]; edges: Edge[] }[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isCtrlPressed, setIsCtrlPressed] = useState(false);
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);

  // Conectar nodes
  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  // Drag and Drop da sidebar para o canvas
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData("application/reactflow-type");
      const category = event.dataTransfer.getData("application/reactflow-category");

      if (!type || !reactFlowWrapper.current || !reactFlowInstance) return;

      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
      const position = reactFlowInstance.project({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });

      // Formata o label baseado no tipo
      const formatLabel = (nodeType: string) => {
        const labels: Record<string, string> = {
          card_created: "Card Criado",
          card_won: "Card Ganho",
          card_lost: "Card Perdido",
          card_moved: "Card Movido",
          card_overdue: "Card Atrasado",
          scheduled: "Agendado",
          create_card: "Criar Card",
          send_email: "Enviar Email",
          create_notification: "Criar Notificação",
          assign_user: "Atribuir Usuário",
          add_tag: "Adicionar Tag",
          move_to_list: "Mover para Lista",
          update_field: "Atualizar Campo",
        };
        return labels[nodeType] || nodeType;
      };

      const newNode: Node = {
        id: getId(),
        type: category === "trigger" ? "triggerNode" : "actionNode",
        position,
        data: {
          label: formatLabel(type),
          [category === "trigger" ? "triggerType" : "actionType"]: type,
        },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance, setNodes]
  );

  const onDragStart = (event: React.DragEvent, nodeType: string, category: string) => {
    event.dataTransfer.setData("application/reactflow-type", nodeType);
    event.dataTransfer.setData("application/reactflow-category", category);
    event.dataTransfer.effectAllowed = "move";
  };

  // Handler para clique no node
  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  // Handler para rastrear seleção múltipla
  const onSelectionChange = useCallback(
    ({ nodes: selectedNodes }: { nodes: Node[] }) => {
      setSelectedNodesCount(selectedNodes.length);

      // Se não há nodes selecionados ou há mais de 1, fecha o painel de configuração
      if (selectedNodes.length !== 1) {
        setSelectedNode(null);
      } else if (selectedNodes.length === 1) {
        // Se há apenas 1 selecionado, abre o painel
        setSelectedNode(selectedNodes[0]);
      }
    },
    []
  );

  // Salvar configuração do node
  const handleSaveNodeConfig = useCallback(
    (nodeId: string, config: any) => {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === nodeId) {
            return {
              ...node,
              data: {
                ...node.data,
                config,
              },
            };
          }
          return node;
        })
      );
    },
    [setNodes]
  );

  // Fechar painel de configuração
  const handleCloseConfigPanel = () => {
    setSelectedNode(null);
  };

  // Deletar nodes com tecla Delete
  const onNodesDelete = useCallback((deleted: Node[]) => {
    // Se o node deletado era o selecionado, fecha o painel
    if (selectedNode && deleted.some(n => n.id === selectedNode.id)) {
      setSelectedNode(null);
    }
  }, [selectedNode]);

  // Validar automação antes de salvar
  const validateAutomation = (): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];

    // Verifica se tem nodes
    if (nodes.length === 0) {
      errors.push("Adicione pelo menos um gatilho e uma ação ao canvas");
      return { valid: false, errors };
    }

    // Separa triggers e actions
    const triggers = nodes.filter(n => n.type === "triggerNode");
    const actions = nodes.filter(n => n.type === "actionNode");

    // Verifica se tem pelo menos 1 trigger
    if (triggers.length === 0) {
      errors.push("Adicione pelo menos um gatilho (trigger)");
    }

    // Verifica se tem pelo menos 1 action
    if (actions.length === 0) {
      errors.push("Adicione pelo menos uma ação");
    }

    // Verifica se há conexões
    if (edges.length === 0 && triggers.length > 0 && actions.length > 0) {
      errors.push("Conecte o gatilho a pelo menos uma ação");
    }

    // Verifica se todos os nodes estão configurados
    const unconfiguredNodes = nodes.filter(n => {
      const config = n.data.config;
      return !config || Object.keys(config).length === 0;
    });

    if (unconfiguredNodes.length > 0) {
      const nodeLabels = unconfiguredNodes.map(n => n.data.label).join(", ");
      errors.push(`Configure todos os nodes: ${nodeLabels}`);
    }

    // Verifica se triggers estão conectados a actions
    if (triggers.length > 0 && actions.length > 0 && edges.length > 0) {
      const disconnectedTriggers = triggers.filter(trigger => {
        return !edges.some(edge => edge.source === trigger.id);
      });

      if (disconnectedTriggers.length > 0) {
        const triggerLabels = disconnectedTriggers.map(t => t.data.label).join(", ");
        errors.push(`Conecte os gatilhos: ${triggerLabels}`);
      }
    }

    return { valid: errors.length === 0, errors };
  };

  const handleSave = () => {
    // Valida antes de salvar
    const validation = validateAutomation();

    if (!validation.valid) {
      const errorMessage = validation.errors.join("\n• ");
      alert(`Não é possível salvar a automação:\n\n• ${errorMessage}`);
      return;
    }

    // TODO: Salvar no backend
    console.log("Salvando automação:", {
      name: automationName,
      nodes,
      edges,
    });
    alert("Automação salva com sucesso!");
    navigate("/automations");
  };

  const handleTest = () => {
    // Valida antes de testar
    const validation = validateAutomation();

    if (!validation.valid) {
      const errorMessage = validation.errors.join("\n• ");
      alert(`Não é possível testar a automação:\n\n• ${errorMessage}`);
      return;
    }

    // TODO: Implementar teste real
    alert("Testando automação... (mock)\n\nAutomação validada com sucesso!");
  };

  const handleClear = () => {
    if (confirm("Tem certeza que deseja limpar todo o canvas?")) {
      setNodes([]);
      setEdges([]);
      setSelectedNode(null); // Fecha o painel de configuração
      setSelectedNodesCount(0);
    }
  };

  // Controles de Zoom
  const handleZoomIn = useCallback(() => {
    if (reactFlowInstance) {
      reactFlowInstance.zoomIn();
    }
  }, [reactFlowInstance]);

  const handleZoomOut = useCallback(() => {
    if (reactFlowInstance) {
      reactFlowInstance.zoomOut();
    }
  }, [reactFlowInstance]);

  const handleFitView = useCallback(() => {
    if (reactFlowInstance) {
      reactFlowInstance.fitView({ padding: 0.2 });
    }
  }, [reactFlowInstance]);

  const handleResetZoom = useCallback(() => {
    if (reactFlowInstance) {
      reactFlowInstance.setViewport({ x: 0, y: 0, zoom: 1 });
    }
  }, [reactFlowInstance]);

  // Atualiza o nível de zoom quando o viewport mudar
  // Carregar template no canvas
  const handleLoadTemplate = useCallback((templateNodes: Node[], templateEdges: Edge[]) => {
    setNodes(templateNodes);
    setEdges(templateEdges);
    setSelectedNode(null);
    setSelectedNodesCount(0);
    // Aguarda um tick para garantir que os nodes foram adicionados
    setTimeout(() => {
      if (reactFlowInstance) {
        reactFlowInstance.fitView({ padding: 0.2 });
      }
    }, 100);
  }, [setNodes, setEdges, reactFlowInstance]);

  // Copiar nodes selecionados (Ctrl+C)
  const handleCopy = useCallback(() => {
    const selectedNodes = nodes.filter((node) => node.selected);
    if (selectedNodes.length > 0) {
      setCopiedNodes(selectedNodes);
      console.log(`Copiado${selectedNodes.length > 1 ? 's' : ''} ${selectedNodes.length} node${selectedNodes.length > 1 ? 's' : ''}`);
    }
  }, [nodes]);

  // Colar nodes copiados (Ctrl+V)
  const handlePaste = useCallback(() => {
    if (copiedNodes.length === 0) return;

    const newNodes = copiedNodes.map((node) => ({
      ...node,
      id: getId(),
      position: {
        x: node.position.x + 50, // Desloca um pouco para direita
        y: node.position.y + 50, // Desloca um pouco para baixo
      },
      selected: false,
    }));

    setNodes((nds) => [...nds, ...newNodes]);
    console.log(`Colado${newNodes.length > 1 ? 's' : ''} ${newNodes.length} node${newNodes.length > 1 ? 's' : ''}`);
  }, [copiedNodes, setNodes]);

  // Duplicar node específico
  const handleDuplicateNode = useCallback(
    (nodeId: string) => {
      const nodeToDuplicate = nodes.find((n) => n.id === nodeId);
      if (!nodeToDuplicate) return;

      const newNode = {
        ...nodeToDuplicate,
        id: getId(),
        position: {
          x: nodeToDuplicate.position.x + 50,
          y: nodeToDuplicate.position.y + 50,
        },
        selected: false,
      };

      setNodes((nds) => [...nds, newNode]);
    },
    [nodes, setNodes]
  );

  // Salvar snapshot no histórico
  const saveToHistory = useCallback(() => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({ nodes, edges });
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [nodes, edges, history, historyIndex]);

  // Undo
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1];
      setNodes(prevState.nodes);
      setEdges(prevState.edges);
      setHistoryIndex(historyIndex - 1);
    }
  }, [history, historyIndex, setNodes, setEdges]);

  // Redo
  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      setNodes(nextState.nodes);
      setEdges(nextState.edges);
      setHistoryIndex(historyIndex + 1);
    }
  }, [history, historyIndex, setNodes, setEdges]);

  // Detecta quando Ctrl está pressionado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Control") {
        setIsCtrlPressed(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Control") {
        setIsCtrlPressed(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  // Salva no histórico quando nodes ou edges mudam (com debounce)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      // Só salva se houver mudanças reais
      const lastState = history[historyIndex];
      const hasChanges =
        !lastState ||
        JSON.stringify(lastState.nodes) !== JSON.stringify(nodes) ||
        JSON.stringify(lastState.edges) !== JSON.stringify(edges);

      if (hasChanges && (nodes.length > 0 || edges.length > 0 || history.length === 0)) {
        saveToHistory();
      }
    }, 500); // Debounce de 500ms

    return () => clearTimeout(timeoutId);
  }, [nodes, edges]); // Removido saveToHistory das deps para evitar loop

  // Atalhos de teclado (Ctrl+C, Ctrl+V, Ctrl+Z, Ctrl+Shift+Z, Zoom)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInputField = target.tagName === "INPUT" || target.tagName === "TEXTAREA";

      // Ctrl+C - Copiar
      if ((e.ctrlKey || e.metaKey) && e.key === "c" && !isInputField) {
        e.preventDefault();
        handleCopy();
      }

      // Ctrl+V - Colar
      if ((e.ctrlKey || e.metaKey) && e.key === "v" && !isInputField) {
        e.preventDefault();
        handlePaste();
      }

      // Ctrl+Z - Undo
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey && !isInputField) {
        e.preventDefault();
        handleUndo();
      }

      // Ctrl+Shift+Z ou Ctrl+Y - Redo
      if (
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "z") ||
        ((e.ctrlKey || e.metaKey) && e.key === "y")
      ) {
        if (!isInputField) {
          e.preventDefault();
          handleRedo();
        }
      }

      // Ctrl+Plus (ou =) - Zoom In
      if ((e.ctrlKey || e.metaKey) && (e.key === "+" || e.key === "=") && !isInputField) {
        e.preventDefault();
        handleZoomIn();
      }

      // Ctrl+Minus - Zoom Out
      if ((e.ctrlKey || e.metaKey) && e.key === "-" && !isInputField) {
        e.preventDefault();
        handleZoomOut();
      }

      // Ctrl+0 - Reset Zoom
      if ((e.ctrlKey || e.metaKey) && e.key === "0" && !isInputField) {
        e.preventDefault();
        handleResetZoom();
      }

      // Ctrl+1 - Fit View
      if ((e.ctrlKey || e.metaKey) && e.key === "1" && !isInputField) {
        e.preventDefault();
        handleFitView();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleCopy, handlePaste, handleUndo, handleRedo, handleZoomIn, handleZoomOut, handleResetZoom, handleFitView]);

  return (
    <div className="h-screen flex flex-col bg-slate-900">
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700 px-6 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4 min-w-0 flex-1">
            <button
              onClick={() => navigate("/automations")}
              className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
              title="Voltar"
            >
              <ArrowLeft size={20} className="text-slate-400" />
            </button>
            <input
              type="text"
              value={automationName}
              onChange={(e) => setAutomationName(e.target.value)}
              className="text-xl font-semibold text-white bg-transparent border-none focus:outline-none focus:ring-0 flex-1 min-w-0 truncate"
              placeholder="Nome da automação"
            />
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 sm:justify-end">
            <button
              onClick={() => setShowTemplatesModal(true)}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
            >
              <Sparkles size={16} />
              <span className="hidden sm:inline">Templates</span>
            </button>
            <button
              onClick={handleClear}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
            >
              <Trash2 size={16} />
              <span className="hidden sm:inline">Limpar Tudo</span>
            </button>
            <button
              onClick={handleTest}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Play size={16} />
              <span className="hidden sm:inline">Testar</span>
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-3 sm:px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors shadow-lg shadow-purple-500/30"
            >
              <Save size={16} />
              <span className="hidden sm:inline">Salvar</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-auto sm:overflow-hidden">
        {/* Canvas */}
        <div className="flex-1 min-w-[900px] min-h-[600px] sm:min-w-0 sm:min-h-0" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodesDelete={onNodesDelete}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onSelectionChange={onSelectionChange}
            onInit={setReactFlowInstance}
            onDrop={onDrop}
            onDragOver={onDragOver}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            deleteKeyCode="Delete"
            selectionKeyCode="Shift"
            multiSelectionKeyCode="Control"
            selectionOnDrag={!isCtrlPressed}
            panOnDrag={isCtrlPressed ? true : [1, 2]}
            panOnScroll={true}
            selectionMode={SelectionMode.Partial}
            className="bg-slate-900"
            defaultEdgeOptions={{
              animated: true,
              style: { stroke: "#8b5cf6", strokeWidth: 2 },
            }}
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={20}
              size={1}
              color="#475569"
            />
            <Controls className="!bg-slate-800 !border-slate-700" showInteractive={false} />
            <MiniMap
              className="!bg-slate-800 !border-slate-700"
              style={{ bottom: 10, right: -5}}
              nodeColor={(node) => {
                if (node.type === "triggerNode") return "#a855f7";
                if (node.type === "actionNode") return "#10b981";
                return "#6b7280";
              }}
            />
          </ReactFlow>
        </div>

        {/* Sidebar - Alterna entre lista de nodes e painel de configuração */}
        <div className="min-w-[280px] w-[320px] shrink-0">
          {selectedNode ? (
            <NodeConfigPanel
              node={selectedNode}
              onClose={handleCloseConfigPanel}
              onSave={handleSaveNodeConfig}
            />
          ) : (
            <NodesSidebar onDragStart={onDragStart} />
          )}
        </div>
      </div>

      {/* Modal de Templates */}
      <TemplatesModal
        isOpen={showTemplatesModal}
        onClose={() => setShowTemplatesModal(false)}
        onSelectTemplate={handleLoadTemplate}
      />
    </div>
  );
};

// Wrapper com Provider
const AutomationEditor: React.FC = () => {
  return (
    <ReactFlowProvider>
      <AutomationEditorContent />
    </ReactFlowProvider>
  );
};

export default AutomationEditor;
