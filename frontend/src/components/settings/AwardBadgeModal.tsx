import React, { useState, useEffect } from "react";
import { Award, Users, CheckCircle, AlertCircle } from "lucide-react";
import { Badge } from "../../services/gamificationService";
import { User } from "../../types";
import BaseModal from "../common/BaseModal";
import { Button } from "../common";

interface AwardBadgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAward: (badgeId: number, userIds: number[]) => Promise<void>;
  badges: Badge[]; // Apenas badges manuais ativas
  users: User[]; // Lista de vendedores
}

const AwardBadgeModal: React.FC<AwardBadgeModalProps> = ({ isOpen, onClose, onAward, badges, users }) => {
  const [selectedBadge, setSelectedBadge] = useState<number | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Reset ao abrir/fechar
  useEffect(() => {
    if (!isOpen) {
      setSelectedBadge(null);
      setSelectedUsers([]);
      setError("");
    }
  }, [isOpen]);

  const handleToggleUser = (userId: number) => {
    if (selectedUsers.includes(userId)) {
      setSelectedUsers(selectedUsers.filter((id) => id !== userId));
    } else {
      setSelectedUsers([...selectedUsers, userId]);
    }
  };

  const handleToggleAll = () => {
    if (selectedUsers.length === users.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(users.map((u) => u.id));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validações
    if (!selectedBadge) {
      setError("Selecione uma badge");
      return;
    }

    if (selectedUsers.length === 0) {
      setError("Selecione pelo menos um vendedor");
      return;
    }

    try {
      setLoading(true);
      setError("");
      await onAward(selectedBadge, selectedUsers);
      onClose();
    } catch (error: any) {
      console.error("Erro ao atribuir badge:", error);
      setError(error.response?.data?.detail || "Erro ao atribuir badge");
    } finally {
      setLoading(false);
    }
  };

  const selectedBadgeData = badges.find((b) => b.id === selectedBadge);

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Atribuir Badge"
      subtitle="Conceda uma badge manualmente a vendedores"
      size="2xl"
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            loading={loading}
            disabled={badges.length === 0 || users.length === 0}
          >
            Atribuir Badge
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6">
          {/* Erro geral */}
          {error && (
            <div className="flex items-start gap-3 p-4 bg-red-900/20 border border-red-700 rounded-lg">
              <AlertCircle className="text-red-400 flex-shrink-0 mt-0.5" size={20} />
              <div>
                <p className="text-red-400 font-medium">Erro</p>
                <p className="text-red-300 text-sm mt-1">{error}</p>
              </div>
            </div>
          )}

          {/* Selecionar Badge */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-3">
              Selecione a Badge <span className="text-red-400">*</span>
            </label>

            {badges.length === 0 ? (
              <div className="text-center py-8 bg-slate-900 border border-slate-700 rounded-lg">
                <Award className="mx-auto text-slate-600 mb-2" size={40} />
                <p className="text-slate-400 text-sm">Nenhuma badge manual ativa disponível</p>
                <p className="text-slate-500 text-xs mt-1">Crie badges manuais na aba Badges</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {badges.map((badge) => (
                  <button
                    key={badge.id}
                    type="button"
                    onClick={() => setSelectedBadge(badge.id)}
                    className={`p-4 rounded-lg border text-left transition-all ${
                      selectedBadge === badge.id
                        ? "border-emerald-500 bg-emerald-600/20"
                        : "border-slate-700 bg-slate-900 hover:bg-slate-800 hover:border-slate-600"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-3xl">{badge.icon_url || "🏆"}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-white truncate">{badge.name}</p>
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2">{badge.description}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Preview Badge Selecionada */}
          {selectedBadgeData && (
            <div className="p-4 bg-emerald-600/10 border border-emerald-700 rounded-lg">
              <p className="text-xs text-emerald-400 font-medium mb-2">Badge Selecionada:</p>
              <div className="flex items-center gap-3">
                <span className="text-4xl">{selectedBadgeData.icon_url || "🏆"}</span>
                <div>
                  <p className="font-semibold text-white">{selectedBadgeData.name}</p>
                  <p className="text-sm text-slate-300">{selectedBadgeData.description}</p>
                </div>
              </div>
            </div>
          )}

          {/* Selecionar Vendedores */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-slate-300">
                Selecione os Vendedores <span className="text-red-400">*</span>
              </label>
              <button
                type="button"
                onClick={handleToggleAll}
                className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
                disabled={loading}
              >
                {selectedUsers.length === users.length ? "Desmarcar Todos" : "Selecionar Todos"}
              </button>
            </div>

            {users.length === 0 ? (
              <div className="text-center py-8 bg-slate-900 border border-slate-700 rounded-lg">
                <Users className="mx-auto text-slate-600 mb-2" size={40} />
                <p className="text-slate-400 text-sm">Nenhum vendedor disponível</p>
              </div>
            ) : (
              <div className="max-h-64 overflow-y-auto bg-slate-900 border border-slate-700 rounded-lg">
                {users.map((user) => (
                  <label
                    key={user.id}
                    className={`flex items-center gap-3 p-4 cursor-pointer transition-colors hover:bg-slate-800 ${
                      selectedUsers.includes(user.id) ? "bg-emerald-600/10" : ""
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(user.id)}
                      onChange={() => handleToggleUser(user.id)}
                      className="w-4 h-4 text-emerald-600 bg-slate-800 border-slate-600 rounded focus:ring-emerald-500"
                      disabled={loading}
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">{user.name}</p>
                      <p className="text-xs text-slate-400">{user.email}</p>
                    </div>
                    {selectedUsers.includes(user.id) && <CheckCircle className="text-emerald-400" size={18} />}
                  </label>
                ))}
              </div>
            )}

            {selectedUsers.length > 0 && (
              <p className="text-xs text-slate-400 mt-2">
                {selectedUsers.length} vendedor(es) selecionado(s)
              </p>
            )}
          </div>

        </form>
    </BaseModal>
  );
};

export default AwardBadgeModal;
