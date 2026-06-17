import React, { useState, useRef, useEffect } from "react";
import { FileText, Plus, Trash2, Edit, Save, X, Image } from "lucide-react";
import serviceActivityService, { ServiceCardActivity } from "../../services/serviceActivityService";
import NoteRenderer from "../cardDetails/NoteRenderer";
import { sanitizeNoteHTML } from "../../utils/sanitizeNote";
import { showError, showWarning } from "../../utils/toast";
import { useConfirm } from "../../contexts/ConfirmContext";
import { convertUTCToBrazil } from "../../utils/timezone";

interface ServiceNotesSectionProps {
  boardId: number;
  cardId: number;
  activities: ServiceCardActivity[];
  reload: () => Promise<void> | void;
}

interface Note {
  id: number;
  content: string;
  created_at: string;
  updated_at: string;
  user_name: string;
}

/**
 * Seção de Anotações do card de serviços — espelha o padrão do board de vendas.
 * Suporta texto livre e imagens coladas (Ctrl+V), comprimidas e salvas como base64.
 */
const ServiceNotesSection: React.FC<ServiceNotesSectionProps> = ({ boardId, cardId, activities, reload }) => {
  const { confirm } = useConfirm();
  const [isCreating, setIsCreating] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [isPastingImage, setIsPastingImage] = useState(false);

  const newNoteRef = useRef<HTMLDivElement>(null);
  const editNoteRef = useRef<HTMLDivElement>(null);

  const notes: Note[] = activities
    .filter((a) => a.category === "anotacao")
    .map((a) => ({
      id: a.id,
      content: a.description || "",
      created_at: a.created_at,
      updated_at: a.updated_at,
      user_name: a.user_name || "Sistema",
    }));

  // Popula o editor de edição ao iniciar
  useEffect(() => {
    if (editingNoteId !== null && editNoteRef.current) {
      const note = notes.find((n) => n.id === editingNoteId);
      if (note) editNoteRef.current.innerHTML = sanitizeNoteHTML(note.content);
    }
  }, [editingNoteId]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Comprime/redimensiona imagem via canvas (máx 800px, JPEG 80%) */
  const compressImage = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new window.Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const maxWidth = 800;
          let { width, height } = img;
          if (width > maxWidth) { height = Math.round((height * maxWidth) / width); width = maxWidth; }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) { reject(new Error("Canvas não suportado")); return; }
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", 0.8));
        };
        img.onerror = () => reject(new Error("Erro ao carregar imagem"));
        img.src = event.target?.result as string;
      };
      reader.onerror = () => reject(new Error("Erro ao ler arquivo"));
      reader.readAsDataURL(file);
    });

  const insertImageAtCursor = (base64: string, divRef: React.RefObject<HTMLDivElement | null>) => {
    if (!divRef.current) return;
    divRef.current.focus();
    const selection = window.getSelection();
    const imgEl = document.createElement("img");
    imgEl.src = base64;
    imgEl.alt = "Imagem colada";
    imgEl.style.cssText = "max-width: 100%; border-radius: 8px; margin: 6px 0; display: block;";
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      range.insertNode(imgEl);
      range.setStartAfter(imgEl);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    } else {
      divRef.current.appendChild(document.createElement("br"));
      divRef.current.appendChild(imgEl);
    }
  };

  const handlePaste = async (e: React.ClipboardEvent<HTMLDivElement>, divRef: React.RefObject<HTMLDivElement | null>) => {
    const items = Array.from(e.clipboardData.items);
    const imageItem = items.find((item) => item.type.startsWith("image/"));
    if (!imageItem) return;
    e.preventDefault();
    setIsPastingImage(true);
    try {
      const file = imageItem.getAsFile();
      if (!file) return;
      const base64 = await compressImage(file);
      insertImageAtCursor(base64, divRef);
    } catch {
      showError("Não foi possível processar a imagem. Tente novamente.");
    } finally {
      setIsPastingImage(false);
    }
  };

  const convertEditorToText = (div: HTMLDivElement): string => {
    const clone = div.cloneNode(true) as HTMLElement;
    clone.querySelectorAll("br").forEach((br) => br.replaceWith("\n"));
    clone.querySelectorAll("div, p").forEach((block) => block.prepend(document.createTextNode("\n")));
    const text = clone.innerText ?? clone.textContent ?? "";
    return text.replace(/\n{3,}/g, "\n\n");
  };

  const getContent = (divRef: React.RefObject<HTMLDivElement | null>): string => {
    if (!divRef.current) return "";
    const hasImages = divRef.current.querySelectorAll("img").length > 0;
    if (hasImages) return divRef.current.innerHTML.replace(/&nbsp;/g, " ").trim();
    return convertEditorToText(divRef.current).trim();
  };

  const hasContent = (divRef: React.RefObject<HTMLDivElement | null>): boolean => {
    if (!divRef.current) return false;
    return divRef.current.innerText.trim().length > 0 || divRef.current.querySelectorAll("img").length > 0;
  };

  const handleCreateNote = async () => {
    if (!hasContent(newNoteRef)) { showWarning("Digite o conteúdo da anotação"); return; }
    try {
      setLoading(true);
      await serviceActivityService.create(boardId, cardId, { category: "anotacao", description: getContent(newNoteRef) });
      if (newNoteRef.current) newNoteRef.current.innerHTML = "";
      setIsCreating(false);
      await reload();
    } catch {
      showError("Erro ao criar anotação");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEdit = async (noteId: number) => {
    if (!hasContent(editNoteRef)) { showWarning("O conteúdo não pode estar vazio"); return; }
    try {
      setLoading(true);
      await serviceActivityService.update(boardId, cardId, noteId, { description: getContent(editNoteRef) });
      setEditingNoteId(null);
      await reload();
    } catch {
      showError("Erro ao atualizar anotação");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteNote = async (noteId: number) => {
    const ok = await confirm({ title: "Excluir anotação", message: "Tem certeza que deseja excluir esta anotação? Esta ação não pode ser desfeita.", confirmText: "Excluir", isDanger: true });
    if (!ok) return;
    try {
      setLoading(true);
      await serviceActivityService.remove(boardId, cardId, noteId);
      await reload();
    } catch {
      showError("Erro ao deletar anotação");
    } finally {
      setLoading(false);
    }
  };

  const formatRelativeTime = (dateStr: string) => {
    const date = convertUTCToBrazil(dateStr);
    const diffMs = new Date().getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return "Agora mesmo";
    if (diffMins < 60) return `${diffMins} min atrás`;
    if (diffHours < 24) return `${diffHours}h atrás`;
    if (diffDays === 1) return "Ontem";
    if (diffDays < 7) return `${diffDays} dias atrás`;
    return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
  };

  return (
    <div className="space-y-4">
      {/* Botão criar */}
      {!isCreating && (
        <button
          onClick={() => { setIsCreating(true); setTimeout(() => newNoteRef.current?.focus(), 50); }}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-4 py-3 text-emerald-300 transition-colors hover:bg-emerald-500/25 hover:text-emerald-200"
        >
          <Plus size={18} /> <span>Adicionar anotação</span>
        </button>
      )}

      {/* Formulário de criação */}
      {isCreating && (
        <div className="space-y-3 rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-100/50 dark:bg-slate-800/50 p-4">
          {isPastingImage && (
            <div className="flex items-center gap-2 rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-sm text-blue-400">
              <Image size={14} className="animate-pulse" /> Processando imagem...
            </div>
          )}
          <div
            ref={newNoteRef}
            contentEditable
            suppressContentEditableWarning
            onPaste={(e) => handlePaste(e, newNoteRef)}
            data-placeholder="Digite sua anotação aqui... (Cole imagens com Ctrl+V)"
            className="note-editor min-h-[100px] w-full rounded-lg border border-gray-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
          />
          <p className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
            <Image size={11} /> Cole prints e imagens diretamente com Ctrl+V
          </p>
          <div className="flex gap-2">
            <button onClick={() => { setIsCreating(false); if (newNoteRef.current) newNoteRef.current.innerHTML = ""; }} disabled={loading}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 font-medium text-white transition-colors hover:bg-red-700">
              <X size={18} /> Cancelar
            </button>
            <button onClick={handleCreateNote} disabled={loading || isPastingImage}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50">
              <Save size={18} /> Salvar
            </button>
          </div>
        </div>
      )}

      {/* Lista */}
      {notes.length === 0 ? (
        <div className="rounded-lg border border-gray-200/50 dark:border-slate-700/50 bg-gray-100/30 dark:bg-slate-800/30 p-8 text-center">
          <FileText size={32} className="mx-auto mb-2 text-slate-600" />
          <p className="text-sm text-slate-400">Nenhuma anotação ainda</p>
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Adicione observações, lembretes ou informações importantes</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <div key={note.id} className="overflow-hidden break-words rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-100/50 dark:bg-slate-800/50 p-4 transition-colors hover:bg-slate-700/30">
              {editingNoteId === note.id ? (
                <div className="space-y-3">
                  {isPastingImage && (
                    <div className="flex items-center gap-2 rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-sm text-blue-400">
                      <Image size={14} className="animate-pulse" /> Processando imagem...
                    </div>
                  )}
                  <div ref={editNoteRef} contentEditable suppressContentEditableWarning onPaste={(e) => handlePaste(e, editNoteRef)}
                    className="note-editor min-h-[80px] w-full rounded-lg border border-blue-500 bg-white/50 dark:bg-slate-900/50 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <p className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500"><Image size={11} /> Cole prints e imagens diretamente com Ctrl+V</p>
                  <div className="flex gap-2">
                    <button onClick={() => handleSaveEdit(note.id)} disabled={loading || isPastingImage}
                      className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"><Save size={14} /> Salvar</button>
                    <button onClick={() => setEditingNoteId(null)} disabled={loading}
                      className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-red-700"><X size={14} /> Cancelar</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="mb-2 flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-xs font-medium text-white">
                        {note.user_name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-white">{note.user_name}</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500">{formatRelativeTime(note.created_at)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setEditingNoteId(note.id)} disabled={loading}
                        className="rounded p-1.5 text-slate-400 transition-colors hover:bg-slate-600 hover:text-blue-400" title="Editar"><Edit size={14} /></button>
                      <button onClick={() => handleDeleteNote(note.id)} disabled={loading}
                        className="rounded p-1.5 text-slate-400 transition-colors hover:bg-slate-600 hover:text-red-400" title="Excluir"><Trash2 size={14} /></button>
                    </div>
                  </div>
                  <NoteRenderer content={sanitizeNoteHTML(note.content)} />
                  {new Date(note.updated_at).getTime() - new Date(note.created_at).getTime() > 2000 && (
                    <p className="mt-2 text-xs italic text-slate-400 dark:text-slate-500">Editado em {formatRelativeTime(note.updated_at)}</p>
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

export default ServiceNotesSection;
