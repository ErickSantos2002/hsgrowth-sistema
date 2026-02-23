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
            <div className="flex items-start gap-3 rounded-lg border border-red-700 bg-red-900/20 p-4">
              <AlertCircle className="mt-0.5 flex-shrink-0 text-red-400" size={20} />
              <div>
                <p className="font-medium text-red-400">Erro</p>
                <p className="mt-1 text-sm text-red-300">{error}</p>
              </div>
            </div>
          )}

          {/* Selecionar Badge */}
          <div>
            <label className="mb-3 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Selecione a Badge <span className="text-red-400">*</span>
            </label>

            {badges.length === 0 ? (
              <div className="rounded-lg border border-gray-200 bg-gray-50 py-8 text-center dark:border-slate-700 dark:bg-slate-900">
                <Award className="mx-auto mb-2 text-slate-400 dark:text-slate-600" size={40} />
                <p className="text-sm text-slate-600 dark:text-slate-400">Nenhuma badge manual ativa disponível</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">Crie badges manuais na aba Badges</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {badges.map((badge) => (
                  <button
                    key={badge.id}
                    type="button"
                    onClick={() => setSelectedBadge(badge.id)}
                    className={`rounded-lg border p-4 text-left transition-all ${
                      selectedBadge === badge.id
                        ? "border-emerald-500 bg-emerald-600/20"
                        : "border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-gray-100 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600 dark:hover:bg-slate-800"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-3xl">{badge.icon_url || "🏆"}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-slate-900 dark:text-white">{badge.name}</p>
                        <p className="mt-1 line-clamp-2 text-xs text-slate-600 dark:text-slate-400">{badge.description}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Preview Badge Selecionada */}
          {selectedBadgeData && (
            <div className="rounded-lg border border-emerald-700 bg-emerald-600/10 p-4">
              <p className="mb-2 text-xs font-medium text-emerald-400">Badge Selecionada:</p>
              <div className="flex items-center gap-3">
                <span className="text-4xl">{selectedBadgeData.icon_url || "🏆"}</span>
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">{selectedBadgeData.name}</p>
                  <p className="text-sm text-slate-700 dark:text-slate-300">{selectedBadgeData.description}</p>
                </div>
              </div>
            </div>
          )}

          {/* Selecionar Vendedores */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Selecione os Vendedores <span className="text-red-400">*</span>
              </label>
              <button
                type="button"
                onClick={handleToggleAll}
                className="text-xs text-emerald-400 transition-colors hover:text-emerald-300"
                disabled={loading}
              >
                {selectedUsers.length === users.length ? "Desmarcar Todos" : "Selecionar Todos"}
              </button>
            </div>

            {users.length === 0 ? (
              <div className="rounded-lg border border-gray-200 bg-gray-50 py-8 text-center dark:border-slate-700 dark:bg-slate-900">
                <Users className="mx-auto mb-2 text-slate-400 dark:text-slate-600" size={40} />
                <p className="text-sm text-slate-600 dark:text-slate-400">Nenhum vendedor disponível</p>
              </div>
            ) : (
              <div className="max-h-64 overflow-y-auto rounded-lg border border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-900">
                {users.map((user) => (
                  <label
                    key={user.id}
                    className={`flex cursor-pointer items-center gap-3 p-4 transition-colors hover:bg-gray-100 dark:hover:bg-slate-800 ${
                      selectedUsers.includes(user.id) ? "bg-emerald-600/10" : ""
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(user.id)}
                      onChange={() => handleToggleUser(user.id)}
                      className="h-4 w-4 rounded border-gray-300 bg-white text-emerald-600 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-800"
                      disabled={loading}
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-900 dark:text-white">{user.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
                    </div>
                    {selectedUsers.includes(user.id) && <CheckCircle className="text-emerald-400" size={18} />}
                  </label>
                ))}
              </div>
            )}

            {selectedUsers.length > 0 && (
              <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
                {selectedUsers.length} vendedor(es) selecionado(s)
              </p>
            )}
          </div>

        </form>
    </BaseModal>
  );
};

export default AwardBadgeModal;
