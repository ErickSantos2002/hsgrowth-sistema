import { useState, useEffect } from "react";

/**
 * Interface genérica para serviços CRUD
 * Define os métodos que o serviço deve implementar
 */
interface CRUDService<T, CreateData = Partial<T>, UpdateData = Partial<T>> {
  list: (filters?: any) => Promise<T[] | { items?: T[]; [key: string]: any }>;
  create?: (data: CreateData) => Promise<T>;
  update?: (id: number, data: UpdateData) => Promise<T>;
  delete?: (id: number) => Promise<void>;
}

/**
 * Opções para callbacks do hook
 */
interface UseCRUDOptions {
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
  autoLoad?: boolean; // Carregar automaticamente ao montar (padrão: true)
}

/**
 * Hook reutilizável para operações CRUD
 * Elimina duplicação de lógica de listagem, criação, edição e deleção
 *
 * @param service - Serviço com métodos CRUD (list, create, update, delete)
 * @param options - Callbacks opcionais para sucesso/erro
 * @returns Objeto com estado e funções CRUD
 */
export function useCRUD<T extends { id: number }, CreateData = Partial<T>, UpdateData = Partial<T>>(
  service: CRUDService<T, CreateData, UpdateData>,
  options: UseCRUDOptions = {}
) {
  const {
    onSuccess,
    onError,
    autoLoad = true,
  } = options;

  // Estado
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<T | null>(null);
  const [showModal, setShowModal] = useState(false);

  /**
   * Carrega lista de items do serviço
   */
  const loadItems = async (filters?: any) => {
    setLoading(true);
    try {
      const response = await service.list(filters);

      // Suporta tanto Array direto quanto objeto com propriedade items/data
      let itemsArray: T[];
      if (Array.isArray(response)) {
        itemsArray = response;
      } else if (response.items) {
        itemsArray = response.items;
      } else {
        // Tenta encontrar array em outras propriedades comuns
        const keys = Object.keys(response);
        const arrayKey = keys.find(key => Array.isArray(response[key]));
        itemsArray = arrayKey ? response[arrayKey] : [];
      }

      setItems(itemsArray);
    } catch (error: any) {
      console.error("Erro ao carregar items:", error);
      onError?.("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Abre modal para criar novo item
   */
  const handleCreate = () => {
    setEditing(null);
    setShowModal(true);
  };

  /**
   * Abre modal para editar item existente
   */
  const handleEdit = (item: T) => {
    setEditing(item);
    setShowModal(true);
  };

  /**
   * Deleta um item
   */
  const handleDelete = async (item: T) => {
    if (!service.delete) {
      console.warn("Serviço não implementa método delete");
      return;
    }

    const itemName = (item as any).name || (item as any).title || `ID ${item.id}`;
    if (!window.confirm(`Tem certeza que deseja deletar "${itemName}"?`)) {
      return;
    }

    try {
      await service.delete(item.id);
      await loadItems();
      onSuccess?.("Item deletado com sucesso");
    } catch (error: any) {
      console.error("Erro ao deletar:", error);
      onError?.("Erro ao deletar item");
    }
  };

  /**
   * Callback para quando o modal salva com sucesso
   * Recarrega a lista e fecha o modal
   */
  const handleSaveSuccess = async () => {
    await loadItems();
    setShowModal(false);
    setEditing(null);
  };

  /**
   * Fecha o modal sem salvar
   */
  const handleCloseModal = () => {
    setShowModal(false);
    setEditing(null);
  };

  // Carrega items automaticamente ao montar
  useEffect(() => {
    if (autoLoad) {
      loadItems();
    }
  }, [autoLoad]);

  return {
    // Estado
    items,
    loading,
    editing,
    showModal,

    // Setters
    setItems,
    setShowModal,
    setEditing,

    // Funções CRUD
    loadItems,
    handleCreate,
    handleEdit,
    handleDelete,
    handleSaveSuccess,
    handleCloseModal,

    // Flags úteis
    isCreating: showModal && !editing,
    isEditing: showModal && !!editing,
  };
}
