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
      criteria: badge.criteria || { field: "total_points", operator: ">=", value: 0 },
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
        alert("Badge atualizado com sucesso!");
      } else {
        await gamificationService.createBadge(formData);
        alert("Badge criado com sucesso!");
      }
      setIsModalOpen(false);
      loadData();
    } catch (error: any) {
      alert(`Erro: ${error.response?.data?.detail || "Erro ao salvar badge"}`);
    }
  };

  const handleDeleteBadge = async (badgeId: number) => {
    if (!confirm("Tem certeza que deseja deletar este badge?")) return;

    try {
      await gamificationService.deleteBadge(badgeId);
      alert("Badge deletado com sucesso!");
      loadData();
    } catch (error: any) {
      alert(`Erro: ${error.response?.data?.detail || "Erro ao deletar badge"}`);
    }
  };

  const handleAwardBadge = async () => {
    if (!selectedBadge || !selectedUserId) {
      alert("Selecione um usuário!");
      return;
    }

    try {
      await gamificationService.awardBadge(selectedBadge.id, selectedUserId);
      alert("Badge atribuído com sucesso!");
      setIsAwardModalOpen(false);
    } catch (error: any) {
      alert(`Erro: ${error.response?.data?.detail || "Erro ao atribuir badge"}`);
    }
  };

  const filteredBadges = badges.filter((badge) =>
    badge.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
          <p className="text-slate-400">Carregando badges...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <Award className="text-yellow-400" size={32} />
          Gerenciar Badges
        </h1>
        <p className="text-slate-400 mt-1">Criar, editar e atribuir badges do sistema</p>
      </div>

      {/* Actions */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Buscar badges..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <button
          onClick={loadData}
          className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white hover:bg-slate-700 transition-colors flex items-center gap-2"
        >
          <RefreshCw size={18} />
          Atualizar
        </button>
        <button
          onClick={openCreateModal}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-white transition-colors flex items-center gap-2"
        >
          <Plus size={18} />
          Novo Badge
        </button>
      </div>

      {/* Badges Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredBadges.map((badge) => (
          <div
            key={badge.id}
            className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 hover:bg-slate-800/70 transition-colors"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center">
                  <Award className="text-yellow-400" size={24} />
                </div>
                <div>
                  <h3 className="font-semibold text-white">{badge.name}</h3>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
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

            <p className="text-sm text-slate-300 mb-4">{badge.description}</p>

            {badge.criteria_type === "automatic" && badge.criteria && (
              <div className="text-xs text-slate-400 mb-4 bg-slate-900/50 p-2 rounded">
                Critério: {badge.criteria.field} {badge.criteria.operator} {badge.criteria.value}
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => openAwardModal(badge)}
                className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white text-sm transition-colors flex items-center justify-center gap-2"
              >
                <UserPlus size={16} />
                Atribuir
              </button>
              <button
                onClick={() => openEditModal(badge)}
                className="px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white transition-colors"
              >
                <Edit2 size={16} />
              </button>
              <button
                onClick={() => handleDeleteBadge(badge.id)}
                className="px-3 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white transition-colors"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredBadges.length === 0 && (
        <div className="text-center py-12 bg-slate-800/50 border border-slate-700 rounded-xl">
          <Award className="mx-auto text-slate-600 mb-4" size={48} />
          <p className="text-slate-400">Nenhum badge encontrado</p>
        </div>
      )}

      {/* Modal Criar/Editar Badge */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-white mb-4">
                {isEditMode ? "Editar Badge" : "Novo Badge"}
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Nome <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Ex: Vendedor do Mês"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Descrição</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    rows={3}
                    placeholder="Descrição do badge..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
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
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    disabled={isEditMode} // Não permite mudar tipo
                  >
                    <option value="manual">Manual (atribuído por admin)</option>
                    <option value="automatic">Automático (regra do sistema)</option>
                  </select>
                </div>

                {formData.criteria_type === "automatic" && (
                  <div className="space-y-3 p-4 bg-slate-900/50 rounded-lg">
                    <p className="text-sm text-slate-300 font-medium">Critério Automático</p>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Campo</label>
                        <select
                          value={formData.criteria.field}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              criteria: { ...formData.criteria, field: e.target.value },
                            })
                          }
                          className="w-full px-2 py-1 bg-slate-800 border border-slate-700 rounded text-white text-sm"
                        >
                          <option value="total_points">Pontos Totais</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Operador</label>
                        <select
                          value={formData.criteria.operator}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              criteria: { ...formData.criteria, operator: e.target.value },
                            })
                          }
                          className="w-full px-2 py-1 bg-slate-800 border border-slate-700 rounded text-white text-sm"
                        >
                          <option value=">=">&gt;=</option>
                          <option value=">">&gt;</option>
                          <option value="==">=</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Valor</label>
                        <input
                          type="number"
                          value={formData.criteria.value}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              criteria: { ...formData.criteria, value: parseInt(e.target.value) },
                            })
                          }
                          className="w-full px-2 py-1 bg-slate-800 border border-slate-700 rounded text-white text-sm"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white transition-colors flex items-center justify-center gap-2"
                  >
                    <X size={18} />
                    Cancelar
                  </button>
                  <button
                    onClick={handleSaveBadge}
                    className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-white transition-colors flex items-center justify-center gap-2"
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-md">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-white mb-4">Atribuir Badge</h2>
              <p className="text-slate-300 mb-4">
                Badge: <span className="font-semibold text-yellow-400">{selectedBadge.name}</span>
              </p>

              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Selecione o Vendedor <span className="text-red-400">*</span>
                </label>
                <select
                  value={selectedUserId || ""}
                  onChange={(e) => setSelectedUserId(parseInt(e.target.value))}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                  className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleAwardBadge}
                  className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-white transition-colors"
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
