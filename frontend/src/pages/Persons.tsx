import React, { useState, useEffect, useRef } from "react";
import { Plus, Search, Filter, Edit, Trash2, RefreshCw, User, Users, ChevronDown, Briefcase, Mail } from "lucide-react";
import personService, { Person } from "../services/personService";
import { Button, Alert } from "../components/common";
import PersonModal from "../components/persons/PersonModal";

const Persons: React.FC = () => {
  // Estados
  const [persons, setPersons] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterActive, setFilterActive] = useState<string>("all"); // all, active, inactive
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Estados do modal
  const [showModal, setShowModal] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);

  // Backend error state
  const [backendError, setBackendError] = useState(false);

  /**
   * Carrega as pessoas ao montar o componente
   */
  useEffect(() => {
    loadPersons();
  }, []);

  /**
   * Carrega lista de pessoas do backend (todas de uma vez)
   */
  const loadPersons = async () => {
    try {
      setLoading(true);
      setBackendError(false);

      // Carrega todas as pessoas de uma vez com page_size alto
      const response = await personService.list({
        page: 1,
        page_size: 10000, // Suficiente para pegar todos os registros de uma vez
      });

      setPersons(response.persons || []);
    } catch (error) {
      console.error("Erro ao carregar pessoas:", error);
      setBackendError(true);
      setPersons([]);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Abre modal para criar nova pessoa
   */
  const handleCreate = () => {
    setEditingPerson(null);
    setShowModal(true);
  };

  /**
   * Abre modal para editar pessoa
   */
  const handleEdit = (person: Person) => {
    setEditingPerson(person);
    setShowModal(true);
  };

  /**
   * Deleta uma pessoa
   */
  const handleDelete = async (person: Person) => {
    if (confirm(`Tem certeza que deseja deletar a pessoa "${person.name}"?`)) {
      try {
        await personService.delete(person.id);
        await loadPersons();
      } catch (error) {
        console.error("Erro ao deletar pessoa:", error);
        alert("Erro ao deletar pessoa");
      }
    }
  };

  /**
   * Salva pessoa (criar ou editar)
   */
  const handleSave = async () => {
    await loadPersons();
    setShowModal(false);
  };

  /**
   * Filtra pessoas baseado na busca e filtros
   */
  const filteredPersons = persons.filter((person) => {
    // Filtro de busca
    const matchesSearch =
      !searchTerm ||
      person.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      person.position?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      person.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      person.email_commercial?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      person.email_personal?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      person.phone?.includes(searchTerm) ||
      person.phone_commercial?.includes(searchTerm) ||
      person.phone_whatsapp?.includes(searchTerm);

    // Filtro de status
    const matchesStatus =
      filterActive === "all" ||
      (filterActive === "active" && person.is_active) ||
      (filterActive === "inactive" && !person.is_active);

    return matchesSearch && matchesStatus;
  });

  const itemsPerPage = 7;
  const totalItems = filteredPersons.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const paginatedPersons = filteredPersons.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterActive, persons.length]);

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
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Users className="text-white" size={32} />
              Pessoas
            </h1>
            <p className="text-slate-400 mt-1">Gerencie seus contatos e pessoas</p>
          </div>
          <div className="hidden md:flex items-center gap-3">
            <Button
              variant="secondary"
              size="sm"
              icon={<RefreshCw size={16} />}
              onClick={loadPersons}
              disabled={loading}
              className="py-2.5 sm:py-2 sm:min-w-[140px]"
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
              Nova Pessoa
            </Button>
          </div>
        </div>

        {/* Aviso de backend não implementado */}
        {backendError && (
          <Alert type="warning" title="Erro ao carregar" className="mb-4">
            Não foi possível carregar a lista de pessoas. Verifique a conexão com o backend.
          </Alert>
        )}

        {/* Busca e Filtros */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex gap-3 md:hidden">
            <Button
              variant="secondary"
              size="sm"
              icon={<RefreshCw size={16} />}
              onClick={loadPersons}
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
              Nova Pessoa
            </Button>
          </div>
          {/* Campo de busca */}
          <div className="flex-1 relative">
            <Search
              size={20}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="Buscar por nome, email, telefone ou cargo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm sm:text-base text-white placeholder:text-sm placeholder:sm:text-base placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
        {filteredPersons.length} pessoa{filteredPersons.length !== 1 ? "s" : ""} encontrada
        {filteredPersons.length !== 1 ? "s" : ""}
      </div>

      {/* Tabela de pessoas */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">Carregando pessoas...</div>
      ) : filteredPersons.length === 0 ? (
        <div className="text-center py-12 bg-slate-800/50 border border-slate-700 rounded-xl">
          <p className="text-slate-400 mb-4">
            {searchTerm || filterActive !== "all"
              ? "Nenhuma pessoa encontrada com os filtros aplicados"
              : "Nenhuma pessoa cadastrada ainda"}
          </p>
          {!searchTerm && filterActive === "all" && (
            <Button variant="primary" icon={<Plus size={16} />} onClick={handleCreate}>
              Cadastrar Primeira Pessoa
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
                    Pessoa
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Cargo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Contato
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
                {paginatedPersons.map((person) => (
                  <tr
                    key={person.id}
                    className="hover:bg-slate-700/30 transition-colors"
                  >
                    {/* Pessoa */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-500/20 text-blue-400">
                          <User size={20} />
                        </div>
                        <div>
                          <div className="font-medium text-white">{person.name}</div>
                        </div>
                      </div>
                    </td>

                    {/* Cargo */}
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        {person.position ? (
                          <div className="flex items-center gap-2 text-slate-300">
                            <Briefcase size={14} className="text-slate-400" />
                            {person.position}
                          </div>
                        ) : (
                          <span className="text-slate-500">-</span>
                        )}
                      </div>
                    </td>

                    {/* Contato */}
                    <td className="px-6 py-4">
                      <div className="text-sm space-y-1">
                        {(person.email_commercial || person.email) && (
                          <div className="flex items-center gap-2 text-blue-400">
                            <Mail size={14} />
                            {person.email_commercial || person.email}
                          </div>
                        )}
                        {person.phone_whatsapp && (
                          <div className="text-slate-400">
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
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          person.is_active
                            ? "bg-emerald-500/20 text-emerald-400"
                            : "bg-red-500/20 text-red-400"
                        }`}
                      >
                        {person.is_active ? "Ativo" : "Inativo"}
                      </span>
                    </td>

                    {/* Data de cadastro */}
                    <td className="px-6 py-4 text-sm text-slate-400">
                      {formatDate(person.created_at)}
                    </td>

                    {/* Ações */}
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(person)}
                          className="p-2 hover:bg-yellow-500/20 rounded-lg transition-colors text-yellow-400 hover:text-yellow-300"
                          title="Editar"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(person)}
                          className="p-2 hover:bg-red-500/20 rounded-lg transition-colors text-red-400 hover:text-red-300"
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

      {/* Modal de Criar/Editar Pessoa */}
      <PersonModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSave={handleSave}
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
        className="w-full flex items-center justify-between gap-3 px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
