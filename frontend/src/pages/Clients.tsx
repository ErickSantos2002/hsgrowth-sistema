import React, { useState, useEffect, useRef } from "react";
import { Plus, Search, Filter, Edit, Trash2, RefreshCw, Building, User, Users, ChevronDown } from "lucide-react";
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
  const [currentPage, setCurrentPage] = useState(1);

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
   * Carrega lista de clientes do backend (todas de uma vez)
   */
  const loadClients = async () => {
    try {
      setLoading(true);
      setBackendError(false);

      // Carrega todos os clientes de uma vez com page_size alto
      const response = await clientService.list({
        page: 1,
        page_size: 10000, // Suficiente para pegar todos os registros de uma vez
      });

      setClients(response.clients || []);
    } catch (error) {
      console.error("Erro ao carregar clientes:", error);
      setBackendError(true);
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

  const itemsPerPage = 7;
  const totalItems = filteredClients.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const paginatedClients = filteredClients.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterActive, clients.length]);

  const getPageNumbers = () => {
    const maxButtons = 5;
    let start = Math.max(1, safePage - Math.floor(maxButtons / 2));
    let end = start + maxButtons - 1;

    if (end > totalPages) {
      end = totalPages;
      start = Math.max(1, end - maxButtons + 1);
    }

    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  };

  const pageNumbers = getPageNumbers();

  // Formata data
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("pt-BR");
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="flex items-center gap-3 text-3xl font-bold text-white">
              <Users className="text-white" size={32} />
              Clientes
            </h1>
            <p className="mt-1 text-slate-400">Gerencie sua base de clientes</p>
          </div>
          <div className="hidden items-center gap-3 md:flex">
            <Button
              variant="secondary"
              size="sm"
              icon={<RefreshCw size={16} />}
              onClick={loadClients}
              disabled={loading}
              className="py-2.5 sm:min-w-[140px] sm:py-2"
            >
              <span className="hidden sm:inline">Atualizar</span>
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<Plus size={16} />}
              onClick={handleCreate}
              className="sm:min-w-[140px]"
            >
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
        <div className="flex flex-col gap-3 md:flex-row">
          <div className="flex gap-3 md:hidden">
            <Button
              variant="secondary"
              size="sm"
              icon={<RefreshCw size={16} />}
              onClick={loadClients}
              disabled={loading}
              className="flex-1 py-2.5"
            >
              Atualizar
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<Plus size={16} />}
              onClick={handleCreate}
              className="flex-1"
            >
              Novo Cliente
            </Button>
          </div>
          {/* Campo de busca */}
          <div className="relative flex-1">
            <Search
              size={20}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="Buscar por nome, empresa, email ou telefone."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 py-2 pl-10 pr-4 text-sm text-white placeholder-slate-400 placeholder:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 sm:text-base placeholder:sm:text-base"
            />
          </div>

          {/* Botão de filtros */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 rounded-lg border px-4 py-2 transition-colors ${
              showFilters
                ? "border-emerald-600 bg-emerald-600 text-white"
                : "border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
          >
            <Filter size={16} />
            Filtros
          </button>
        </div>

        {/* Painel de filtros */}
        {showFilters && (
          <div className="mt-3 rounded-lg border border-slate-700 bg-slate-800/50 p-4">
            <div className="flex flex-wrap gap-3">
              <div>
                <label className="mb-2 block text-sm text-slate-400">Status</label>
                <div className="min-w-[170px]">
                  <SelectMenu
                    value={filterActive}
                    options={[
                      { value: "all", label: "Todos" },
                      { value: "active", label: "Ativos" },
                      { value: "inactive", label: "Inativos" },
                    ]}
                    onChange={setFilterActive}
                  />
                </div>
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
        <div className="py-12 text-center text-slate-400">Carregando clientes...</div>
      ) : filteredClients.length === 0 ? (
        <div className="rounded-xl border border-slate-700 bg-slate-800/50 py-12 text-center">
          <p className="mb-4 text-slate-400">
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
        <div className="overflow-hidden rounded-xl border border-slate-700/50 bg-slate-800/30 backdrop-blur-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-800/50">
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Contato
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Localização
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Cadastro
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {paginatedClients.map((client) => (
                  <tr
                    key={client.id}
                    className="transition-colors hover:bg-slate-700/30"
                  >
                    {/* Cliente */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-lg ${
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
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
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
                          className="rounded-lg bg-yellow-600/20 p-2 text-yellow-400 transition-colors hover:bg-yellow-600/30"
                          title="Editar"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(client)}
                          className="rounded-lg bg-red-600/20 p-2 text-red-400 transition-colors hover:bg-red-600/30"
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
          <div className="flex flex-col gap-4 border-t border-slate-700/60 px-4 py-4 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left">
            <div className="text-sm text-slate-400">
              Mostrando {totalItems === 0 ? 0 : startIndex + 1} a {endIndex} de {totalItems}{" "}
              registros
            </div>
            <div className="flex items-center justify-center gap-3 sm:justify-end">
              <div className="flex items-center gap-2 sm:hidden">
                <button
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  disabled={safePage === 1}
                  className={`h-9 w-10 rounded-lg border text-sm transition-colors ${
                    safePage === 1
                      ? "border-slate-700 text-slate-600"
                      : "border-slate-600 text-slate-200 hover:border-emerald-500 hover:text-white"
                  }`}
                >
                  {"<"}
                </button>
                <div className="flex min-w-[42px] items-center justify-center rounded-lg border border-slate-600 px-2 py-2 text-sm text-white">
                  {safePage}
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                  disabled={safePage === totalPages}
                  className={`h-9 w-10 rounded-lg border text-sm transition-colors ${
                    safePage === totalPages
                      ? "border-slate-700 text-slate-600"
                      : "border-slate-600 text-slate-200 hover:border-emerald-500 hover:text-white"
                  }`}
                >
                  {">"}
                </button>
              </div>
              <div className="hidden items-center gap-2 sm:flex">
                <button
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  disabled={safePage === 1}
                  className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                    safePage === 1
                      ? "border-slate-700 text-slate-600"
                      : "border-slate-600 text-slate-300 hover:border-emerald-500 hover:text-white"
                  }`}
                >
                  Anterior
                </button>
                {pageNumbers.map((page) => (
                  <button
                    key={page}
                    type="button"
                    onClick={() => setCurrentPage(page)}
                    className={`h-9 w-9 rounded-lg border text-sm transition-colors ${
                      page === safePage
                        ? "border-emerald-500 bg-emerald-500 text-white"
                        : "border-slate-600 text-slate-300 hover:border-emerald-500 hover:text-white"
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                  disabled={safePage === totalPages}
                  className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                    safePage === totalPages
                      ? "border-slate-700 text-slate-600"
                      : "border-slate-600 text-slate-300 hover:border-emerald-500 hover:text-white"
                  }`}
                >
                  Proxima
                </button>
              </div>
            </div>
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

// ==================== COMPONENTE AUXILIAR: SELECT MENU ====================
interface SelectOption {
  value: string;
  label: string;
}

interface SelectMenuProps {
  value: string;
  options: SelectOption[];
  placeholder?: string;
  onChange: (value: string) => void;
}

const SelectMenu: React.FC<SelectMenuProps> = ({
  value,
  options,
  placeholder,
  onChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find((option) => option.value === value);
  const selectedLabel = selectedOption?.label || placeholder || "Selecione";

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="flex w-full items-center justify-between gap-3 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
      >
        <span className={`truncate ${selectedOption ? "" : "text-slate-400"}`}>
          {selectedLabel}
        </span>
        <ChevronDown
          size={16}
          className={`text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>
      {isOpen && (
        <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-lg border border-slate-700 bg-slate-900 shadow-lg">
          {options.map((option) => (
            <button
              key={option.value || option.label}
              type="button"
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className={`w-full px-4 py-2 text-left text-sm text-white hover:bg-slate-800 ${
                option.value === value ? "bg-slate-800/70" : ""
              }`}
            >
              <span className="truncate">{option.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
