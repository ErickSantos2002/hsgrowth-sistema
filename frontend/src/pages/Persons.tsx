import React, { useState, useRef, useEffect } from "react";
import { Plus, Filter, Edit, Trash2, RefreshCw, Users, ChevronDown, Briefcase, Mail, User } from "lucide-react";
import personService, { Person } from "../services/personService";
import { Button, Alert, SearchInput, Pagination } from "../components/common";
import { PageHeader } from "../components/layout";
import PersonModal from "../components/persons/PersonModal";
import { showError, showSuccess } from "../utils/toast";
import { usePagination, useFilter, filterHelpers, useCRUD } from "../hooks";
import { useAuth } from "../hooks/useAuth";

const Persons: React.FC = () => {
  const { user } = useAuth();

  // Visualizadores têm acesso somente leitura
  const isViewer = user?.role === "viewer";

  // Estados locais
  const [showFilters, setShowFilters] = useState(false);
  const [backendError, setBackendError] = useState(false);

  // Hook CRUD - gerencia operações de criar/editar/deletar e loading
  const {
    items: persons,
    loading,
    editing: editingPerson,
    showModal,
    setShowModal,
    loadItems: loadPersons,
    handleCreate,
    handleEdit,
    handleDelete,
    handleSaveSuccess,
    handleCloseModal,
  } = useCRUD<Person>(
    {
      list: async () => {
        try {
          setBackendError(false);
          const response = await personService.list({ page: 1, page_size: 10000 });
          return response.persons || [];
        } catch (error) {
          console.error("Erro ao carregar pessoas:", error);
          setBackendError(true);
          throw error;
        }
      },
      delete: personService.delete,
    },
    {
      onSuccess: showSuccess,
      onError: showError,
    }
  );

  // Hook de filtros
  const {
    filteredItems: filteredPersons,
    searchTerm,
    setSearchTerm,
    customFilters,
    setCustomFilter,
  } = useFilter<Person>(persons, {
    search: filterHelpers.searchInFields([
      "name",
      "position",
      "email",
      "email_commercial",
      "email_personal",
      "phone",
      "phone_commercial",
      "phone_whatsapp",
    ]),
    status: (person, status) =>
      status === "all" ||
      (status === "active" && person.is_active) ||
      (status === "inactive" && !person.is_active),
  });

  // Hook de paginação
  const pagination = usePagination(filteredPersons, 7);

  // Formata data
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("pt-BR");
  };

  // Formata telefone
  const formatPhone = (phone: string | undefined | null) => {
    if (!phone) return "-";
    const cleaned = phone.replace(/\D/g, "");

    // Celular: (00) 00000-0000
    if (cleaned.length === 11) {
      return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
    }
    // Fixo: (00) 0000-0000
    if (cleaned.length === 10) {
      return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
    }
    return phone;
  };

  return (
    <div className="p-6">
      {/* Header */}
      <PageHeader
        title="Pessoas"
        description="Gerencie seus contatos e pessoas"
        icon={Users}
        actions={
          <>
            <Button
              variant="secondary"
              size="sm"
              icon={<RefreshCw size={16} />}
              onClick={loadPersons}
              disabled={loading}
            >
              Atualizar
            </Button>
            {/* Botão de criar oculto para visualizadores */}
            {!isViewer && (
              <Button
                variant="primary"
                size="sm"
                icon={<Plus size={16} />}
                onClick={handleCreate}
              >
                Nova Pessoa
              </Button>
            )}
          </>
        }
      />

      {/* Aviso de backend não implementado */}
      {backendError && (
        <Alert type="warning" title="Erro ao carregar" className="mb-4">
          Não foi possível carregar a lista de pessoas. Verifique a conexão com o backend.
        </Alert>
      )}

      {/* Busca e Filtros */}
      <div className="flex flex-col gap-3 md:flex-row">
        <SearchInput
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Buscar por nome, email, telefone ou cargo..."
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
        {filteredPersons.length} pessoa{filteredPersons.length !== 1 ? "s" : ""} encontrada
        {filteredPersons.length !== 1 ? "s" : ""}
      </div>

      {/* Tabela de pessoas */}
      {loading ? (
        <div className="py-12 text-center text-slate-500 dark:text-slate-400">Carregando pessoas...</div>
      ) : filteredPersons.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-gray-50 py-12 text-center dark:border-slate-700 dark:bg-slate-800/50">
          <p className="mb-4 text-slate-500 dark:text-slate-400">
            {searchTerm || (customFilters.status && customFilters.status !== "all")
              ? "Nenhuma pessoa encontrada com os filtros aplicados"
              : "Nenhuma pessoa cadastrada ainda"}
          </p>
          {!searchTerm && (!customFilters.status || customFilters.status === "all") && (
            <Button variant="primary" icon={<Plus size={16} />} onClick={handleCreate}>
              Cadastrar Primeira Pessoa
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
                    Pessoa
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    Cargo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    Contato
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
                {pagination.paginatedItems.map((person) => (
                  <tr
                    key={person.id}
                    className="transition-colors hover:bg-gray-50 dark:hover:bg-slate-700/30"
                  >
                    {/* Pessoa */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/20 text-blue-400">
                          <User size={20} />
                        </div>
                        <div>
                          <div className="font-medium text-slate-900 dark:text-white">{person.name}</div>
                        </div>
                      </div>
                    </td>

                    {/* Cargo */}
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        {person.position ? (
                          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                            <Briefcase size={14} className="text-slate-500 dark:text-slate-400" />
                            {person.position}
                          </div>
                        ) : (
                          <span className="text-slate-500">-</span>
                        )}
                      </div>
                    </td>

                    {/* Contato */}
                    <td className="px-6 py-4">
                      <div className="space-y-1 text-sm">
                        {(person.email_commercial || person.email) && (
                          <div className="flex items-center gap-2 text-blue-400">
                            <Mail size={14} />
                            {person.email_commercial || person.email}
                          </div>
                        )}
                        {person.phone_whatsapp && (
                          <div className="text-slate-500 dark:text-slate-400">
                            {formatPhone(person.phone_whatsapp)}
                          </div>
                        )}
                        {!person.email && !person.email_commercial && !person.phone_whatsapp && (
                          <span className="text-slate-500">-</span>
                        )}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                          person.is_active
                            ? "bg-emerald-500/20 text-slate-900 dark:text-emerald-400"
                            : "bg-red-500/20 text-slate-900 dark:text-red-400"
                        }`}
                      >
                        {person.is_active ? "Ativo" : "Inativo"}
                      </span>
                    </td>

                    {/* Data de cadastro */}
                    <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">
                      {formatDate(person.created_at)}
                    </td>

                    {/* Ações - ocultas para visualizadores */}
                    <td className="px-6 py-4">
                      {!isViewer && (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEdit(person)}
                            className="rounded-lg bg-yellow-600/20 p-2 text-slate-900 dark:text-yellow-400 transition-colors hover:bg-yellow-600/30"
                            title="Editar"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(person)}
                            className="rounded-lg bg-red-600/20 p-2 text-slate-900 dark:text-red-400 transition-colors hover:bg-red-600/30"
                            title="Deletar"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Paginação */}
          <Pagination
            {...pagination}
            totalItems={filteredPersons.length}
            itemLabel="pessoas"
          />
        </div>
      )}

      {/* Modal de Criar/Editar Pessoa */}
      <PersonModal
        isOpen={showModal}
        onClose={handleCloseModal}
        onSave={handleSaveSuccess}
        person={editingPerson}
      />
    </div>
  );
};

export default Persons;

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
