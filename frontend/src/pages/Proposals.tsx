import React, { useState, useRef, useEffect } from "react";
import { Plus, RefreshCw, FileText, ChevronDown, Eye, Pencil, Download } from "lucide-react";
import { useNavigate } from "react-router-dom";
import proposalService, { Proposal } from "../services/proposalService";
import { Button, SearchInput, Pagination } from "../components/common";
import { PageHeader } from "../components/layout";
import ProposalModal from "../components/proposals/ProposalModal";
import { showError } from "../utils/toast";
import { useFilter, filterHelpers, usePagination } from "../hooks";
import { markerBadge } from "../utils/proposalMarker";
import { viewProposalPdf, downloadProposalPdf } from "../utils/proposalPdf";

const Proposals: React.FC = () => {
  const navigate = useNavigate();

  // Estado local
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Carrega propostas
  const loadProposals = async () => {
    setLoading(true);
    try {
      const response = await proposalService.list(1, 500);
      setProposals(response.items || []);
    } catch (error) {
      console.error("Erro ao carregar propostas:", error);
      showError("Erro ao carregar propostas");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProposals();
  }, []);

  // Hook de filtros
  const {
    filteredItems: filteredProposals,
    searchTerm,
    setSearchTerm,
    customFilters,
    setCustomFilter,
  } = useFilter<Proposal>(proposals, {
    search: (proposal, term) => {
      const lower = term.toLowerCase();
      return (
        (proposal.client_name?.toLowerCase().includes(lower) ?? false) ||
        String(proposal.number).includes(lower)
      );
    },
    marker: (proposal, marker) => marker === "all" || proposal.marker === marker,
  });

  // Hook de paginação
  const pagination = usePagination(filteredProposals, 10);

  // Formatação de data dd/mm/aaaa
  const formatDate = (date?: string | null): string => {
    if (!date) return "—";
    try {
      const [y, m, d] = date.split("T")[0].split("-");
      return `${d}/${m}/${y}`;
    } catch {
      return "—";
    }
  };

  // Formatação de moeda
  const formatCurrency = (value: number): string => {
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  // Abre modal de criação
  const handleCreate = () => {
    setEditingId(null);
    setShowModal(true);
  };

  // Abre modal de edição
  const handleEdit = (proposal: Proposal) => {
    setEditingId(proposal.id);
    setShowModal(true);
  };

  // Callback ao salvar
  const handleSaved = async () => {
    setShowModal(false);
    setEditingId(null);
    await loadProposals();
  };

  // Fecha modal
  const handleClose = () => {
    setShowModal(false);
    setEditingId(null);
  };

  const markerFilter = customFilters.marker || "all";

  return (
    <div className="p-6">
      {/* Header */}
      <PageHeader
        title="Propostas"
        description="Gerencie suas propostas comerciais"
        icon={FileText}
        actions={
          <>
            <Button
              variant="secondary"
              size="sm"
              icon={<RefreshCw size={16} />}
              onClick={loadProposals}
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
              Nova proposta
            </Button>
          </>
        }
      />

      {/* Busca e Filtros */}
      <div className="flex flex-col gap-3 md:flex-row">
        <div className="flex-1">
          <SearchInput
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Buscar por cliente ou número..."
          />
        </div>
        <div className="min-w-[200px]">
          <SelectMenu
            value={markerFilter}
            options={[
              { value: "all", label: "Todas" },
              { value: "aprovada", label: "Aprovada" },
              { value: "nao_aprovada", label: "Não aprovada" },
              { value: "em_aberto", label: "Em aberto" },
            ]}
            onChange={(value) => setCustomFilter("marker", value)}
          />
        </div>
      </div>

      {/* Contador */}
      <div className="mb-4 mt-3 text-sm text-slate-600 dark:text-slate-400">
        {filteredProposals.length} proposta{filteredProposals.length !== 1 ? "s" : ""} encontrada
        {filteredProposals.length !== 1 ? "s" : ""}
      </div>

      {/* Tabela */}
      {loading ? (
        <div className="py-12 text-center text-slate-500 dark:text-slate-400">Carregando propostas...</div>
      ) : filteredProposals.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-gray-50 py-12 text-center dark:border-slate-700 dark:bg-slate-800/50">
          <p className="mb-4 text-slate-500 dark:text-slate-400">
            {searchTerm || markerFilter !== "all"
              ? "Nenhuma proposta encontrada com os filtros aplicados"
              : "Nenhuma proposta cadastrada ainda"}
          </p>
          {!searchTerm && markerFilter === "all" && (
            <Button variant="primary" icon={<Plus size={16} />} onClick={handleCreate}>
              Criar Primeira Proposta
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
                    Número
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    Data
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    CNPJ
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    Valor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    Marcador
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    Card Vinculado
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    Ação
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-slate-700/50">
                {pagination.paginatedItems.map((p) => {
                  const b = markerBadge(p.marker);
                  return (
                    <tr
                      key={p.id}
                      onClick={() => handleEdit(p)}
                      className="cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-slate-700/30"
                    >
                      {/* Número */}
                      <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                        #{p.number}
                      </td>

                      {/* Data */}
                      <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-300">
                        {formatDate(p.date)}
                      </td>

                      {/* Cliente */}
                      <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-300">
                        {p.client_name || "—"}
                      </td>

                      {/* CNPJ */}
                      <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-300">
                        {p.client_document || "—"}
                      </td>

                      {/* Valor */}
                      <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                        {formatCurrency(p.total)}
                      </td>

                      {/* Marcador */}
                      <td className="px-6 py-4">
                        <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${b.cls}`}>
                          {b.label}
                        </span>
                      </td>

                      {/* Card Vinculado */}
                      <td className="px-6 py-4">
                        {p.service_card_id && p.board_id ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/servicos/${p.board_id}/cards/${p.service_card_id}`);
                            }}
                            className="text-blue-500 hover:underline"
                          >
                            #{p.service_card_id}
                          </button>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Ação */}
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); viewProposalPdf(p.id); }}
                            title="Visualizar PDF"
                            className="rounded p-1.5 text-slate-400 transition-colors hover:bg-gray-100 hover:text-blue-500 dark:hover:bg-slate-700/50"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleEdit(p); }}
                            title="Editar"
                            className="rounded p-1.5 text-slate-400 transition-colors hover:bg-gray-100 hover:text-emerald-500 dark:hover:bg-slate-700/50"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); downloadProposalPdf(p.id, p.number); }}
                            title="Baixar PDF"
                            className="rounded p-1.5 text-slate-400 transition-colors hover:bg-gray-100 hover:text-slate-700 dark:hover:bg-slate-700/50 dark:hover:text-white"
                          >
                            <Download size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {/* Paginação */}
          <Pagination
            {...pagination}
            totalItems={filteredProposals.length}
            itemLabel="propostas"
          />
        </div>
      )}

      {/* Modal de Criar/Editar Proposta */}
      <ProposalModal
        isOpen={showModal}
        onClose={handleClose}
        onSaved={handleSaved}
        proposalId={editingId ?? undefined}
      />
    </div>
  );
};

export default Proposals;

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
