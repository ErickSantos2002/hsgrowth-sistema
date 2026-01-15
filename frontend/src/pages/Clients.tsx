import React, { useState, useEffect } from "react";
import { Plus, Search, Filter, Edit, Trash2, RefreshCw, Building, User } from "lucide-react";
import clientService, { Client } from "../services/clientService";
import { Button, Alert } from "../components/common";
import ClientModal from "../components/clients/ClientModal";

const Clients: React.FC = () => {
  // Estados
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterActive, setFilterActive] = useState<string>("all"); // all, active, inactive
  const [showFilters, setShowFilters] = useState(false);

  // Estados do modal
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  // Backend não implementado ainda
  const [backendError, setBackendError] = useState(false);

  /**
   * Carrega os clientes ao montar o componente
   */
  useEffect(() => {
    loadClients();
  }, []);

  /**
   * Carrega lista de clientes do backend
   */
  const loadClients = async () => {
    try {
      setLoading(true);
      setBackendError(false);

      const response = await clientService.list({
        page: 1,
        page_size: 100,
      });

      setClients(response.clients || []);
    } catch (error) {
      console.error("Erro ao carregar clientes:", error);
      setBackendError(true);
      // Por enquanto, sem clientes
      setClients([]);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Abre modal para criar novo cliente
   */
  const handleCreate = () => {
    setEditingClient(null);
    setShowModal(true);
  };

  /**
   * Abre modal para editar cliente
   */
  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setShowModal(true);
  };

  /**
   * Deleta um cliente
   */
  const handleDelete = async (client: Client) => {
    if (confirm(`Tem certeza que deseja deletar o cliente "${client.name}"?`)) {
      try {
        await clientService.delete(client.id);
        await loadClients();
      } catch (error) {
        console.error("Erro ao deletar cliente:", error);
        alert("Erro ao deletar cliente");
      }
    }
  };

  /**
   * Salva cliente (criar ou editar)
   */
  const handleSave = async () => {
    await loadClients();
    setShowModal(false);
  };

  /**
   * Filtra clientes baseado na busca e filtros
   */
  const filteredClients = clients.filter((client) => {
    // Filtro de busca
    const matchesSearch =
      !searchTerm ||
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.phone?.includes(searchTerm);

    // Filtro de status
    const matchesStatus =
      filterActive === "all" ||
      (filterActive === "active" && client.is_active) ||
      (filterActive === "inactive" && !client.is_active);

    return matchesSearch && matchesStatus;
  });

  // Formata data
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("pt-BR");
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Clientes</h1>
            <p className="text-slate-400 mt-1">Gerencie sua base de clientes</p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              size="sm"
              icon={<RefreshCw size={16} />}
              onClick={loadClients}
              disabled={loading}
            >
              Atualizar
            </Button>
            <Button variant="primary" size="sm" icon={<Plus size={16} />} onClick={handleCreate}>
              Novo Cliente
            </Button>
          </div>
        </div>

        {/* Aviso de backend não implementado */}
        {backendError && (
          <Alert type="warning" title="Endpoint não implementado" className="mb-4">
            O backend ainda não implementou o endpoint <code>/api/v1/clients</code>.
            A estrutura do frontend está pronta. Após implementar o endpoint, essa página funcionará automaticamente.
          </Alert>
        )}

        {/* Busca e Filtros */}
        <div className="flex flex-col md:flex-row gap-3">
          {/* Campo de busca */}
          <div className="flex-1 relative">
            <Search
              size={20}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="Buscar por nome, empresa, email ou telefone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Botão de filtros */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-2 rounded-lg border transition-colors flex items-center gap-2 ${
              showFilters
                ? "bg-emerald-600 border-emerald-600 text-white"
                : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
            }`}
          >
            <Filter size={16} />
            Filtros
          </button>
        </div>

        {/* Painel de filtros */}
        {showFilters && (
          <div className="mt-3 p-4 bg-slate-800/50 border border-slate-700 rounded-lg">
            <div className="flex flex-wrap gap-3">
              <div>
                <label className="text-sm text-slate-400 block mb-2">Status</label>
                <select
                  value={filterActive}
                  onChange={(e) => setFilterActive(e.target.value)}
                  className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="all">Todos</option>
                  <option value="active">Ativos</option>
                  <option value="inactive">Inativos</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Contador */}
      <div className="mb-4 text-sm text-slate-400">
        {filteredClients.length} cliente{filteredClients.length !== 1 ? "s" : ""} encontrado
        {filteredClients.length !== 1 ? "s" : ""}
      </div>

      {/* Tabela de clientes */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">Carregando clientes...</div>
      ) : filteredClients.length === 0 ? (
        <div className="text-center py-12 bg-slate-800/50 border border-slate-700 rounded-xl">
          <p className="text-slate-400 mb-4">
            {searchTerm || filterActive !== "all"
              ? "Nenhum cliente encontrado com os filtros aplicados"
              : "Nenhum cliente cadastrado ainda"}
          </p>
          {!searchTerm && filterActive === "all" && (
            <Button variant="primary" icon={<Plus size={16} />} onClick={handleCreate}>
              Cadastrar Primeiro Cliente
            </Button>
          )}
        </div>
      ) : (
        <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-800/50 border-b border-slate-700">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Contato
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Localização
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Cadastro
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {filteredClients.map((client) => (
                  <tr
                    key={client.id}
                    className="hover:bg-slate-700/30 transition-colors"
                  >
                    {/* Cliente */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            client.company_name
                              ? "bg-blue-500/20 text-blue-400"
                              : "bg-emerald-500/20 text-emerald-400"
                          }`}
                        >
                          {client.company_name ? <Building size={20} /> : <User size={20} />}
                        </div>
                        <div>
                          <div className="font-medium text-white">{client.name}</div>
                          {client.company_name && (
                            <div className="text-sm text-slate-400">{client.company_name}</div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Contato */}
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        {client.email && (
                          <div className="text-white">{client.email}</div>
                        )}
                        {client.phone && (
                          <div className="text-slate-400">{client.phone}</div>
                        )}
                        {!client.email && !client.phone && (
                          <span className="text-slate-500">-</span>
                        )}
                      </div>
                    </td>

                    {/* Localização */}
                    <td className="px-6 py-4 text-sm text-slate-300">
                      {client.city && client.state
                        ? `${client.city}, ${client.state}`
                        : client.city || client.state || "-"}
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          client.is_active
                            ? "bg-emerald-500/20 text-emerald-400"
                            : "bg-red-500/20 text-red-400"
                        }`}
                      >
                        {client.is_active ? "Ativo" : "Inativo"}
                      </span>
                    </td>

                    {/* Data de cadastro */}
                    <td className="px-6 py-4 text-sm text-slate-400">
                      {formatDate(client.created_at)}
                    </td>

                    {/* Ações */}
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(client)}
                          className="p-2 hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-white"
                          title="Editar"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(client)}
                          className="p-2 hover:bg-red-500/20 rounded-lg transition-colors text-slate-400 hover:text-red-400"
                          title="Deletar"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de Criar/Editar Cliente */}
      <ClientModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSave={handleSave}
        client={editingClient}
      />
    </div>
  );
};

export default Clients;
