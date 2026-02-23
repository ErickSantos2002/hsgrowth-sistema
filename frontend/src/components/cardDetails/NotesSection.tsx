import React, { useState, useRef, useEffect } from "react";
import { FileText, Plus, Trash2, Edit, Save, X, Image } from "lucide-react";
import cardNoteService from "../../services/cardNoteService";
import NoteRenderer from "./NoteRenderer";
import { showError, showWarning } from "../../utils/toast";

interface Note {
  id: number;
  content: string;
  created_at: string;
  updated_at: string;
  user_name: string;
}

interface NotesSectionProps {
  cardId: number;
  notes: Note[];
  onUpdate: () => void;
}

/**
 * Seção de Anotações - Lista e gerencia notas do card
 * Suporta texto livre e imagens coladas (Ctrl+V)
 * Imagens são comprimidas e armazenadas como base64 na nota
 */
const NotesSection: React.FC<NotesSectionProps> = ({ cardId, notes, onUpdate }) => {
  const [isCreating, setIsCreating] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [isPastingImage, setIsPastingImage] = useState(false);

  // Refs para os divs contentEditable (criação e edição)
  const newNoteRef = useRef<HTMLDivElement>(null);
  const editNoteRef = useRef<HTMLDivElement>(null);

  /**
   * Quando inicia o modo de edição, popula o contenteditable com o conteúdo da nota
   */
  useEffect(() => {
    if (editingNoteId !== null && editNoteRef.current) {
      const note = notes.find((n) => n.id === editingNoteId);
      if (note) {
        editNoteRef.current.innerHTML = note.content;
      }
    }
  }, [editingNoteId]);

  /**
   * Comprime e redimensiona uma imagem via canvas
   * Limita a 800px de largura e comprime como JPEG qualidade 80%
   * Reduz drasticamente o tamanho do base64 armazenado no banco
   */
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (event) => {
        const img = new window.Image();

        img.onload = () => {
          const canvas = document.createElement("canvas");
          const maxWidth = 800;
          let { width, height } = img;

          // Redimensiona proporcionalmente se largura > 800px
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");
          if (!ctx) {
            reject(new Error("Canvas não suportado"));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);

          // Comprime como JPEG com qualidade 80%
          resolve(canvas.toDataURL("image/jpeg", 0.8));
        };

        img.onerror = () => reject(new Error("Erro ao carregar imagem"));
        img.src = event.target?.result as string;
      };

      reader.onerror = () => reject(new Error("Erro ao ler arquivo"));
      reader.readAsDataURL(file);
    });
  };

  /**
   * Insere uma imagem base64 no cursor atual do contenteditable
   */
  const insertImageAtCursor = (base64: string, divRef: React.RefObject<HTMLDivElement | null>) => {
    if (!divRef.current) return;

    divRef.current.focus();
    const selection = window.getSelection();

    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.deleteContents();

      const imgEl = document.createElement("img");
      imgEl.src = base64;
      imgEl.alt = "Imagem colada";
      imgEl.style.cssText =
        "max-width: 100%; border-radius: 8px; margin: 6px 0; display: block;";

      range.insertNode(imgEl);

      // Move o cursor para depois da imagem
      range.setStartAfter(imgEl);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    } else {
      // Fallback: adiciona no final se não houver seleção
      divRef.current.appendChild(document.createElement("br"));
      const imgEl = document.createElement("img");
      imgEl.src = base64;
      imgEl.alt = "Imagem colada";
      imgEl.style.cssText =
        "max-width: 100%; border-radius: 8px; margin: 6px 0; display: block;";
      divRef.current.appendChild(imgEl);
    }
  };

  /**
   * Handler de paste para o contenteditable
   * Intercepta imagens do clipboard, comprime e insere como base64
   * Texto puro passa pelo comportamento padrão do navegador
   */
  const handlePaste = async (
    e: React.ClipboardEvent<HTMLDivElement>,
    divRef: React.RefObject<HTMLDivElement | null>
  ) => {
    const items = Array.from(e.clipboardData.items);
    const imageItem = items.find((item) => item.type.startsWith("image/"));

    // Sem imagem no clipboard: deixa o comportamento padrão (colar texto)
    if (!imageItem) return;

    e.preventDefault();
    setIsPastingImage(true);

    try {
      const file = imageItem.getAsFile();
      if (!file) return;

      const base64 = await compressImage(file);
      insertImageAtCursor(base64, divRef);
    } catch (error) {
      console.error("Erro ao processar imagem colada:", error);
      showError("Não foi possível processar a imagem. Tente novamente.");
    } finally {
      setIsPastingImage(false);
    }
  };

  /**
   * Lê o HTML do contenteditable para salvar no banco
   */
  const getContent = (divRef: React.RefObject<HTMLDivElement | null>): string => {
    return divRef.current?.innerHTML.trim() ?? "";
  };

  /**
   * Verifica se o contenteditable tem conteúdo real (texto ou imagem)
   */
  const hasContent = (divRef: React.RefObject<HTMLDivElement | null>): boolean => {
    if (!divRef.current) return false;
    const hasText = divRef.current.innerText.trim().length > 0;
    const hasImages = divRef.current.querySelectorAll("img").length > 0;
    return hasText || hasImages;
  };

  /**
   * Cria uma nova anotação
   */
  const handleCreateNote = async () => {
    if (!hasContent(newNoteRef)) {
      showWarning("Digite o conteúdo da anotação");
      return;
    }

    try {
      setLoading(true);

      await cardNoteService.create({
        card_id: cardId,
        content: getContent(newNoteRef),
      });

      // Limpa o editor após salvar
      if (newNoteRef.current) {
        newNoteRef.current.innerHTML = "";
      }
      setIsCreating(false);
      onUpdate();
    } catch (error) {
      console.error("Erro ao criar nota:", error);
      showError("Erro ao criar anotação");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Inicia edição de uma nota
   */
  const handleStartEdit = (note: Note) => {
    setEditingNoteId(note.id);
  };

  /**
   * Salva edição da nota
   */
  const handleSaveEdit = async (noteId: number) => {
    if (!hasContent(editNoteRef)) {
      showWarning("O conteúdo não pode estar vazio");
      return;
    }

    try {
      setLoading(true);

      await cardNoteService.update(noteId, {
        content: getContent(editNoteRef),
      });

      setEditingNoteId(null);
      onUpdate();
    } catch (error) {
      console.error("Erro ao atualizar nota:", error);
      showError("Erro ao atualizar anotação");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Cancela edição
   */
  const handleCancelEdit = () => {
    setEditingNoteId(null);
  };

  /**
   * Deleta uma nota
   */
  const handleDeleteNote = async (noteId: number) => {
    if (!confirm("Tem certeza que deseja excluir esta anotação?")) return;

    try {
      setLoading(true);
      await cardNoteService.delete(noteId);
      onUpdate();
    } catch (error) {
      console.error("Erro ao deletar nota:", error);
      showError("Erro ao deletar anotação");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Formata data relativa
   */
  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return "Agora mesmo";
    if (diffMins < 60) return `${diffMins} min atrás`;
    if (diffHours < 24) return `${diffHours}h atrás`;
    if (diffDays === 1) return "Ontem";
    if (diffDays < 7) return `${diffDays} dias atrás`;

    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-4">
      {/* Botão para criar nova nota */}
      {!isCreating && (
        <button
          onClick={() => {
            setIsCreating(true);
            // Foca o editor após renderizar
            setTimeout(() => newNoteRef.current?.focus(), 50);
          }}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-4 py-3 text-emerald-300 transition-colors hover:bg-emerald-500/25 hover:text-emerald-200"
        >
          <Plus size={18} />
          <span>Adicionar anotação</span>
        </button>
      )}

      {/* Formulário de criação */}
      {isCreating && (
        <div className="space-y-3 rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-100/50 dark:bg-slate-800/50 p-4">
          {/* Indicador de processamento de imagem */}
          {isPastingImage && (
            <div className="flex items-center gap-2 rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-sm text-blue-400">
              <Image size={14} className="animate-pulse" />
              Processando imagem...
            </div>
          )}

          {/* Editor contentEditable */}
          <div
            ref={newNoteRef}
            contentEditable
            suppressContentEditableWarning
            onPaste={(e) => handlePaste(e, newNoteRef)}
            data-placeholder="Digite sua anotação aqui... (Cole imagens com Ctrl+V)"
            className="note-editor min-h-[100px] w-full rounded-lg border border-gray-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
          />

          {/* Dica de imagem */}
          <p className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
            <Image size={11} />
            Cole prints e imagens diretamente com Ctrl+V
          </p>

          <div className="flex gap-2">
            <button
              onClick={handleCreateNote}
              disabled={loading || isPastingImage}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-medium text-slate-900 dark:text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
            >
              <Save size={18} />
              Salvar
            </button>
            <button
              onClick={() => {
                setIsCreating(false);
                if (newNoteRef.current) newNoteRef.current.innerHTML = "";
              }}
              disabled={loading}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 font-medium text-slate-900 dark:text-white transition-colors hover:bg-red-700"
            >
              <X size={18} />
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Lista de notas */}
      {notes.length === 0 ? (
        <div className="rounded-lg border border-gray-200/50 dark:border-slate-700/50 bg-gray-100/30 dark:bg-slate-800/30 p-8 text-center">
          <FileText size={32} className="mx-auto mb-2 text-slate-600" />
          <p className="text-sm text-slate-400 dark:text-slate-500 dark:text-slate-400">Nenhuma anotação ainda</p>
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
            Adicione observações, lembretes ou informações importantes
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <div
              key={note.id}
              className="rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-100/50 dark:bg-slate-800/50 p-4 transition-colors hover:bg-slate-700/30"
            >
              {editingNoteId === note.id ? (
                // Modo de edição
                <div className="space-y-3">
                  {/* Indicador de processamento de imagem na edição */}
                  {isPastingImage && (
                    <div className="flex items-center gap-2 rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-sm text-blue-400">
                      <Image size={14} className="animate-pulse" />
                      Processando imagem...
                    </div>
                  )}

                  <div
                    ref={editNoteRef}
                    contentEditable
                    suppressContentEditableWarning
                    onPaste={(e) => handlePaste(e, editNoteRef)}
                    className="note-editor min-h-[80px] w-full rounded-lg border border-blue-500 bg-white/50 dark:bg-slate-900/50 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />

                  <p className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
                    <Image size={11} />
                    Cole prints e imagens diretamente com Ctrl+V
                  </p>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSaveEdit(note.id)}
                      disabled={loading || isPastingImage}
                      className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-slate-900 dark:text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
                    >
                      <Save size={14} />
                      Salvar
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      disabled={loading}
                      className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-slate-900 dark:text-white transition-colors hover:bg-red-700"
                    >
                      <X size={14} />
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                // Modo de visualização
                <>
                  <div className="mb-2 flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-xs font-medium text-slate-900 dark:text-white">
                        {note.user_name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-white">{note.user_name}</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500">
                          {formatRelativeTime(note.created_at)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleStartEdit(note)}
                        disabled={loading}
                        className="rounded p-1.5 text-slate-400 dark:text-slate-500 dark:text-slate-400 transition-colors hover:bg-slate-600 hover:text-blue-400"
                        title="Editar"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteNote(note.id)}
                        disabled={loading}
                        className="rounded p-1.5 text-slate-400 dark:text-slate-500 dark:text-slate-400 transition-colors hover:bg-slate-600 hover:text-red-400"
                        title="Excluir"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <NoteRenderer content={note.content} />

                  {note.updated_at !== note.created_at && (
                    <p className="mt-2 text-xs italic text-slate-400 dark:text-slate-500">
                      Editado em {formatRelativeTime(note.updated_at)}
                    </p>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NotesSection;
