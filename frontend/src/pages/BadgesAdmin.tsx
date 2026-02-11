import React, { useState, useEffect } from "react";
import {
  Award,
  Plus,
  Edit2,
  Trash2,
  RefreshCw,
  Search,
  UserPlus,
  Save,
  X,
} from "lucide-react";
import gamificationService, { Badge, UserBadge } from "../services/gamificationService";
import userService from "../services/userService";
import { User } from "../types";
import { showSuccess, showError, showWarning } from "../utils/toast";
import { LoadingSpinner } from "../components/common";

const BadgesAdmin: React.FC = () => {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAwardModalOpen, setIsAwardModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);

  // Form data
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    icon_url: "",
    criteria_type: "manual" as "manual" | "automatic",
    criteria: { field: "total_points", operator: ">=", value: 0 },
  });

  // Award modal data
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [badgesData, usersData] = await Promise.all([
        gamificationService.getAllBadges(),
        userService.listActive(),
      ]);
      setBadges(badgesData);
      setUsers(usersData.filter((u) => u.role === "salesperson"));
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setFormData({
      name: "",
      description: "",
      icon_url: "",
      criteria_type: "manual",
      criteria: { field: "total_points", operator: ">=", value: 0 },
    });
    setIsEditMode(false);
    setSelectedBadge(null);
    setIsModalOpen(true);
  };

  const openEditModal = (badge: Badge) => {
    setFormData({
      name: badge.name,
      description: badge.description || "",
      icon_url: badge.icon_url || "",
      criteria_type: badge.criteria_type,
      criteria: (badge.criteria || { field: "total_points", operator: ">=", value: 0 }) as any,
    });
    setIsEditMode(true);
    setSelectedBadge(badge);
    setIsModalOpen(true);
  };

  const openAwardModal = (badge: Badge) => {
    setSelectedBadge(badge);
    setSelectedUserId(null);
    setIsAwardModalOpen(true);
  };

  const handleSaveBadge = async () => {
    try {
      if (isEditMode && selectedBadge) {
        await gamificationService.updateBadge(selectedBadge.id, formData);
        showSuccess("Badge atualizado com sucesso!");
      } else {
        await gamificationService.createBadge(formData);
        showSuccess("Badge criado com sucesso!");
      }
      setIsModalOpen(false);
      loadData();
    } catch (error: any) {
      showError(error.response?.data?.detail || "Erro ao salvar badge");
    }
  };

  const handleDeleteBadge = async (badgeId: number) => {
    if (!confirm("Tem certeza que deseja deletar este badge?")) return;

    try {
      await gamificationService.deleteBadge(badgeId);
      showSuccess("Badge deletado com sucesso!");
      loadData();
    } catch (error: any) {
      showError(error.response?.data?.detail || "Erro ao deletar badge");
    }
  };

  const handleAwardBadge = async () => {
    if (!selectedBadge || !selectedUserId) {
      showWarning("Selecione um usuário!");
      return;
    }

    try {
      await gamificationService.awardBadge(selectedBadge.id, selectedUserId);
      showSuccess("Badge atribuído com sucesso!");
      setIsAwardModalOpen(false);
    } catch (error: any) {
      showError(error.response?.data?.detail || "Erro ao atribuir badge");
    }
  };

  const filteredBadges = badges.filter((badge) =>
    badge.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-slate-400">Carregando badges...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="flex items-center gap-3 text-3xl font-bold text-white">
          <Award className="text-yellow-400" size={32} />
          Gerenciar Badges
        </h1>
        <p className="mt-1 text-slate-400">Criar, editar e atribuir badges do sistema</p>
      </div>

      {/* Actions */}
      <div className="mb-6 flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 transform text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Buscar badges..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 py-2 pl-10 pr-4 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <button
          onClick={loadData}
          className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-white transition-colors hover:bg-slate-700"
        >
          <RefreshCw size={18} />
          Atualizar
        </button>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-white transition-colors hover:bg-emerald-700"
        >
          <Plus size={18} />
          Novo Badge
        </button>
      </div>

      {/* Badges Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredBadges.map((badge) => (
          <div
            key={badge.id}
            className="rounded-xl border border-slate-700 bg-slate-800/50 p-6 transition-colors hover:bg-slate-800/70"
          >
            <div className="mb-4 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-500/20">
                  <Award className="text-yellow-400" size={24} />
                </div>
                <div>
                  <h3 className="font-semibold text-white">{badge.name}</h3>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      badge.criteria_type === "automatic"
                        ? "bg-blue-500/20 text-blue-400"
                        : "bg-purple-500/20 text-purple-400"
                    }`}
                  >
                    {badge.criteria_type === "automatic" ? "Automático" : "Manual"}
                  </span>
                </div>
              </div>
            </div>

            <p className="mb-4 text-sm text-slate-300">{badge.description}</p>

            {badge.criteria_type === "automatic" && badge.criteria && (
              <div className="mb-4 rounded bg-slate-900/50 p-2 text-xs text-slate-400">
                Critério: {badge.criteria.field} {badge.criteria.operator} {badge.criteria.value}
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => openAwardModal(badge)}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm text-white transition-colors hover:bg-blue-700"
              >
                <UserPlus size={16} />
                Atribuir
              </button>
              <button
                onClick={() => openEditModal(badge)}
                className="rounded-lg bg-yellow-600/20 p-2 text-yellow-400 transition-colors hover:bg-yellow-600/30"
                title="Editar badge"
              >
                <Edit2 size={16} />
              </button>
              <button
                onClick={() => handleDeleteBadge(badge.id)}
                className="rounded-lg bg-red-600/20 p-2 text-red-400 transition-colors hover:bg-red-600/30"
                title="Deletar badge"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredBadges.length === 0 && (
        <div className="rounded-xl border border-slate-700 bg-slate-800/50 py-12 text-center">
          <Award className="mx-auto mb-4 text-slate-600" size={48} />
          <p className="text-slate-400">Nenhum badge encontrado</p>
        </div>
      )}

      {/* Modal Criar/Editar Badge */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-slate-700 bg-slate-800">
            <div className="p-6">
              <h2 className="mb-4 text-2xl font-bold text-white">
                {isEditMode ? "Editar Badge" : "Novo Badge"}
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    Nome <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Ex: Vendedor do Mês"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">Descrição</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    rows={3}
                    placeholder="Descrição do badge..."
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    Tipo de Critério
                  </label>
                  <select
                    value={formData.criteria_type}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        criteria_type: e.target.value as "manual" | "automatic",
                      })
                    }
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    disabled={isEditMode} // Não permite mudar tipo
                  >
                    <option value="manual">Manual (atribuído por admin)</option>
                    <option value="automatic">Automático (regra do sistema)</option>
                  </select>
                </div>

                {formData.criteria_type === "automatic" && (
                  <div className="space-y-3 rounded-lg bg-slate-900/50 p-4">
                    <p className="text-sm font-medium text-slate-300">Critério Automático</p>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="mb-1 block text-xs text-slate-400">Campo</label>
                        <select
                          value={formData.criteria.field}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              criteria: { ...formData.criteria, field: e.target.value },
                            })
                          }
                          className="w-full rounded border border-slate-700 bg-slate-800 px-2 py-1 text-sm text-white"
                        >
                          <option value="total_points">Pontos Totais</option>
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-slate-400">Operador</label>
                        <select
                          value={formData.criteria.operator}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              criteria: { ...formData.criteria, operator: e.target.value },
                            })
                          }
                          className="w-full rounded border border-slate-700 bg-slate-800 px-2 py-1 text-sm text-white"
                        >
                          <option value=">=">&gt;=</option>
                          <option value=">">&gt;</option>
                          <option value="==">=</option>
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-slate-400">Valor</label>
                        <input
                          type="number"
                          value={formData.criteria.value}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              criteria: { ...formData.criteria, value: parseInt(e.target.value) },
                            })
                          }
                          className="w-full rounded border border-slate-700 bg-slate-800 px-2 py-1 text-sm text-white"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-slate-700 px-4 py-2 text-white transition-colors hover:bg-slate-600"
                  >
                    <X size={18} />
                    Cancelar
                  </button>
                  <button
                    onClick={handleSaveBadge}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-white transition-colors hover:bg-emerald-700"
                  >
                    <Save size={18} />
                    Salvar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Atribuir Badge */}
      {isAwardModalOpen && selectedBadge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-800">
            <div className="p-6">
              <h2 className="mb-4 text-2xl font-bold text-white">Atribuir Badge</h2>
              <p className="mb-4 text-slate-300">
                Badge: <span className="font-semibold text-yellow-400">{selectedBadge.name}</span>
              </p>

              <div className="mb-6">
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Selecione o Vendedor <span className="text-red-400">*</span>
                </label>
                <select
                  value={selectedUserId || ""}
                  onChange={(e) => setSelectedUserId(parseInt(e.target.value))}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Selecione...</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setIsAwardModalOpen(false)}
                  className="flex-1 rounded-lg bg-slate-700 px-4 py-2 text-white transition-colors hover:bg-slate-600"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleAwardBadge}
                  className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-white transition-colors hover:bg-emerald-700"
                  disabled={!selectedUserId}
                >
                  Atribuir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BadgesAdmin;
