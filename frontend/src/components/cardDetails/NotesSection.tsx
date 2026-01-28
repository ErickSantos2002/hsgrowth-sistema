import React, { useState } from "react";
import { FileText, Plus, Trash2, Edit, Save, X } from "lucide-react";
import cardNoteService from "../../services/cardNoteService";

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
 * Exibida na aba "Anotações" da coluna direita
 */
const NotesSection: React.FC<NotesSectionProps> = ({ cardId, notes, onUpdate }) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState("");
  const [loading, setLoading] = useState(false);

  /**
   * Cria uma nova anotação
   */
  const handleCreateNote = async () => {
    if (!newNoteContent.trim()) {
      alert("Digite o conteúdo da anotação");
      return;
    }

    try {
      setLoading(true);

      await cardNoteService.create({
        card_id: cardId,
        content: newNoteContent,
      });

      setNewNoteContent("");
      setIsCreating(false);
      onUpdate();
    } catch (error) {
      console.error("Erro ao criar nota:", error);
      alert("Erro ao criar anotação");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Inicia edição de uma nota
   */
  const handleStartEdit = (note: Note) => {
    setEditingNoteId(note.id);
    setEditContent(note.content);
  };

  /**
   * Salva edição da nota
   */
  const handleSaveEdit = async (noteId: number) => {
    if (!editContent.trim()) {
      alert("O conteúdo não pode estar vazio");
      return;
    }

    try {
      setLoading(true);

      await cardNoteService.update(noteId, {
        content: editContent,
      });

      setEditingNoteId(null);
      setEditContent("");
      onUpdate();
    } catch (error) {
      console.error("Erro ao atualizar nota:", error);
      alert("Erro ao atualizar anotação");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Cancela edição
   */
  const handleCancelEdit = () => {
    setEditingNoteId(null);
    setEditContent("");
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
      alert("Erro ao deletar anotação");
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

    return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
  };

  return (
    <div className="space-y-4">
      {/* Botão para criar nova nota */}
      {!isCreating && (
        <button
          onClick={() => setIsCreating(true)}
          className="w-full px-4 py-3 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors flex items-center justify-center gap-2"
        >
          <Plus size={18} />
          <span>Adicionar anotação</span>
        </button>
      )}

      {/* Formulário de criação */}
      {isCreating && (
        <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-lg space-y-3">
          <textarea
            value={newNoteContent}
            onChange={(e) => setNewNoteContent(e.target.value)}
            placeholder="Digite sua anotação aqui..."
            rows={4}
            autoFocus
            className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none"
          />

          <div className="flex gap-2">
            <button
              onClick={handleCreateNote}
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Save size={18} />
              Salvar
            </button>
            <button
              onClick={() => {
                setIsCreating(false);
                setNewNoteContent("");
              }}
              disabled={loading}
              className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
            >
              <X size={18} />
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Lista de notas */}
      {notes.length === 0 ? (
        <div className="p-8 bg-slate-800/30 border border-slate-700/50 rounded-lg text-center">
          <FileText size={32} className="mx-auto text-slate-600 mb-2" />
          <p className="text-sm text-slate-400">Nenhuma anotação ainda</p>
          <p className="text-xs text-slate-500 mt-1">
            Adicione observações, lembretes ou informações importantes
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <div
              key={note.id}
              className="p-4 bg-slate-800/50 border border-slate-700 rounded-lg hover:bg-slate-700/30 transition-colors"
            >
              {editingNoteId === note.id ? (
                // Modo de edição
                <div className="space-y-3">
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    rows={4}
                    autoFocus
                    className="w-full px-3 py-2 bg-slate-900/50 border border-blue-500 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSaveEdit(note.id)}
                      disabled={loading}
                      className="flex-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
                    >
                      <Save size={14} />
                      Salvar
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      disabled={loading}
                      className="flex-1 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg font-medium text-sm transition-colors"
                    >
                      <X size={14} />
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                // Modo de visualização
                <>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-medium text-xs">
                        {note.user_name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{note.user_name}</p>
                        <p className="text-xs text-slate-500">{formatRelativeTime(note.created_at)}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleStartEdit(note)}
                        disabled={loading}
                        className="p-1.5 hover:bg-slate-600 rounded text-slate-400 hover:text-blue-400 transition-colors"
                        title="Editar"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteNote(note.id)}
                        disabled={loading}
                        className="p-1.5 hover:bg-slate-600 rounded text-slate-400 hover:text-red-400 transition-colors"
                        title="Excluir"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <p className="text-sm text-slate-300 whitespace-pre-wrap">{note.content}</p>

                  {note.updated_at !== note.created_at && (
                    <p className="text-xs text-slate-500 mt-2 italic">
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
