import React, { useState, useRef, useEffect } from "react";
import { Plus, Filter, Edit, Trash2, RefreshCw, Building, ChevronDown, User } from "lucide-react";
import clientService, { Client } from "../services/clientService";
import { Button, Alert, SearchInput, Pagination } from "../components/common";
import { PageHeader } from "../components/layout";
import ClientModal from "../components/clients/ClientModal";
import { showError, showSuccess } from "../utils/toast";
import { usePagination, useFilter, filterHelpers, useCRUD } from "../hooks";

const Clients: React.FC = () => {
  // Estados locais
  const [showFilters, setShowFilters] = useState(false);
  const [backendError, setBackendError] = useState(false);

  // Hook CRUD - gerencia operações de criar/editar/deletar e loading
  const {
    items: clients,
    loading,
    editing: editingClient,
    showModal,
    setShowModal,
    loadItems: loadClients,
    handleCreate,
    handleEdit,
    handleDelete,
    handleSaveSuccess,
    handleCloseModal,
  } = useCRUD<Client>(
    {
      list: async () => {
        try {
          setBackendError(false);
          const response = await clientService.list({ page: 1, page_size: 10000 });
          return response.clients || [];
        } catch (error) {
          console.error("Erro ao carregar clientes:", error);
          setBackendError(true);
          throw error;
        }
      },
      delete: clientService.delete,
    },
    {
      onSuccess: showSuccess,
      onError: showError,
    }
  );

  // Hook de filtros
  const {
    filteredItems: filteredClients,
    searchTerm,
    setSearchTerm,
    customFilters,
    setCustomFilter,
  } = useFilter<Client>(clients, {
    search: filterHelpers.searchInFields(["name", "company_name", "email", "phone", "document"]),
    status: (client, status) =>
      status === "all" ||
      (status === "active" && client.is_active) ||
      (status === "inactive" && !client.is_active),
  });

  // Hook de paginação
  const pagination = usePagination(filteredClients, 7);

  // Formata data
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("pt-BR");
  };

  return (
    <div className="p-6">
      {/* Header */}
      <PageHeader
        title="Clientes"
        description="Gerencie sua base de clientes"
        icon={Building}
        actions={
          <>
            <Button
              variant="secondary"
              size="sm"
              icon={<RefreshCw size={16} />}
              onClick={loadClients}
              disabled={loading}
            >
              Atualizar
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<Plus size={16} />}
              onClick={handleCreate}
            >
              Novo Cliente
            </Button>
          </>
        }
      />

      {/* Aviso de backend não implementado */}
      {backendError && (
        <Alert type="warning" title="Endpoint não implementado" className="mb-4">
          O backend ainda não implementou o endpoint <code>/api/v1/clients</code>.
          A estrutura do frontend está pronta. Após implementar o endpoint, essa página funcionará automaticamente.
        </Alert>
      )}

      {/* Busca e Filtros */}
      <div className="flex flex-col gap-3 md:flex-row">
        <SearchInput
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Buscar por nome, empresa, email, telefone ou CPF/CNPJ..."
        />

        {/* Botão de filtros */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm transition-colors ${
            showFilters
              ? "border-emerald-600 bg-emerald-600 text-white"
              : "border-gray-300 bg-white text-slate-700 hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          }`}
        >
          <Filter size={16} />
          Filtros
        </button>
      </div>

      {/* Painel de filtros */}
      {showFilters && (
        <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
          <div className="flex flex-wrap gap-3">
            <div>
              <label className="mb-2 block text-sm text-slate-600 dark:text-slate-400">Status</label>
              <div className="min-w-[170px]">
                <SelectMenu
                  value={customFilters.status || "all"}
                  options={[
                    { value: "all", label: "Todos" },
                    { value: "active", label: "Ativos" },
                    { value: "inactive", label: "Inativos" },
                  ]}
                  onChange={(value) => setCustomFilter("status", value)}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Contador */}
      <div className="mb-4 text-sm text-slate-600 dark:text-slate-400">
        {filteredClients.length} cliente{filteredClients.length !== 1 ? "s" : ""} encontrado
        {filteredClients.length !== 1 ? "s" : ""}
      </div>

      {/* Tabela de clientes */}
      {loading ? (
        <div className="py-12 text-center text-slate-500 dark:text-slate-400">Carregando clientes...</div>
      ) : filteredClients.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-gray-50 py-12 text-center dark:border-slate-700 dark:bg-slate-800/50">
          <p className="mb-4 text-slate-500 dark:text-slate-400">
            {searchTerm || (customFilters.status && customFilters.status !== "all")
              ? "Nenhum cliente encontrado com os filtros aplicados"
              : "Nenhum cliente cadastrado ainda"}
          </p>
          {!searchTerm && (!customFilters.status || customFilters.status === "all") && (
            <Button variant="primary" icon={<Plus size={16} />} onClick={handleCreate}>
              Cadastrar Primeiro Cliente
            </Button>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white backdrop-blur-sm dark:border-slate-700/50 dark:bg-slate-800/30">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 dark:border-slate-700 dark:bg-slate-800/50">
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    Contato
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    Localização
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    Cadastro
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-slate-700/50">
                {pagination.paginatedItems.map((client) => (
                  <tr
                    key={client.id}
                    className="transition-colors hover:bg-gray-50 dark:hover:bg-slate-700/30"
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
                          <div className="font-medium text-slate-900 dark:text-white">{client.name}</div>
                          {client.company_name && (
                            <div className="text-sm text-slate-500 dark:text-slate-400">{client.company_name}</div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Contato */}
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        {client.email && (
                          <div className="text-slate-900 dark:text-white">{client.email}</div>
                        )}
                        {client.phone && (
                          <div className="text-slate-500 dark:text-slate-400">{client.phone}</div>
                        )}
                        {!client.email && !client.phone && (
                          <span className="text-slate-500">-</span>
                        )}
                      </div>
                    </td>

                    {/* Localização */}
                    <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-300">
                      {client.city && client.state
                        ? `${client.city}, ${client.state}`
                        : client.city || client.state || "-"}
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                          client.is_active
                            ? "bg-emerald-500/20 text-slate-900 dark:text-emerald-400"
                            : "bg-red-500/20 text-slate-900 dark:text-red-400"
                        }`}
                      >
                        {client.is_active ? "Ativo" : "Inativo"}
                      </span>
                    </td>

                    {/* Data de cadastro */}
                    <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">
                      {formatDate(client.created_at)}
                    </td>

                    {/* Ações */}
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(client)}
                          className="rounded-lg bg-yellow-600/20 p-2 text-slate-900 dark:text-yellow-400 transition-colors hover:bg-yellow-600/30"
                          title="Editar"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(client)}
                          className="rounded-lg bg-red-600/20 p-2 text-slate-900 dark:text-red-400 transition-colors hover:bg-red-600/30"
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
          {/* Paginação */}
          <Pagination
            {...pagination}
            totalItems={filteredClients.length}
            itemLabel="clientes"
          />
        </div>
      )}

      {/* Modal de Criar/Editar Cliente */}
      <ClientModal
        isOpen={showModal}
        onClose={handleCloseModal}
        onSave={handleSaveSuccess}
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
        className="flex w-full items-center justify-between gap-3 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
      >
        <span className={`truncate ${selectedOption ? "text-slate-900 dark:text-white" : "text-slate-400"}`}>
          {selectedLabel}
        </span>
        <ChevronDown
          size={16}
          className={`text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>
      {isOpen && (
        <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
          {options.map((option) => (
            <button
              key={option.value || option.label}
              type="button"
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className={`w-full px-4 py-2 text-left text-sm text-slate-900 hover:bg-gray-100 dark:text-white dark:hover:bg-slate-800 ${
                option.value === value ? "bg-gray-100 dark:bg-slate-800/70" : ""
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
