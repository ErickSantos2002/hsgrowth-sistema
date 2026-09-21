import React, { useMemo, useState } from "react";
import { Filter, RefreshCw, Wrench, Plus, Edit, Trash2 } from "lucide-react";
import serviceProductService, { ServiceProduct } from "../../services/serviceProductService";
import { Button, SearchInput, Pagination, SelectMenu } from "../common";
import ServiceProductModal from "./ServiceProductModal";
import { showError, showSuccess } from "../../utils/toast";
import { usePagination, useCRUD } from "../../hooks";
import { useAuth } from "../../hooks/useAuth";

/**
 * Aba "Produtos de Serviço" da página Produtos.
 *
 * Catálogo de EQUIPAMENTOS do módulo de Serviços (`service_products`), separado do
 * catálogo de Vendas. Permite cadastrar/editar/excluir à mão. A maior parte das
 * entradas nasce da integração com o GestorHS; editar uma delas é seguro (o
 * resolver casa por modelo normalizado, não pelo nome), mas excluir um equipamento
 * do GestorHS pode fazê-lo reaparecer se a integração voltar a ver aquele modelo.
 * Não há coluna de preço: em Serviços o valor do negócio vem das propostas.
 */

// Traduz a origem do registro para uma etiqueta legível.
const origemLabel = (source?: string | null) => {
  if (source === "gestorhs") return { texto: "GestorHS", cls: "bg-sky-500/20 text-sky-700 dark:text-sky-300" };
  if (source === "migracao-vendas") return { texto: "Vendas (migrado)", cls: "bg-amber-500/20 text-amber-700 dark:text-amber-300" };
  return { texto: "Manual", cls: "bg-slate-500/20 text-slate-700 dark:text-slate-300" };
};

const ServiceProductsTab: React.FC = () => {
  const { user } = useAuth();
  const isViewer = user?.role === "viewer";

  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [origemFilter, setOrigemFilter] = useState("all");

  const {
    items,
    loading,
    editing,
    showModal,
    loadItems,
    handleCreate,
    handleEdit,
    handleDelete,
    handleSaveSuccess,
    handleCloseModal,
  } = useCRUD<ServiceProduct>(
    {
      // Sem is_active => backend retorna ativos E inativos (gestão vê os dois).
      list: () => serviceProductService.list({ limit: 1000 }),
      delete: serviceProductService.delete,
    },
    { onSuccess: showSuccess, onError: showError }
  );

  const filtered = useMemo(() => {
    const termo = searchTerm.trim().toLowerCase();
    return items.filter((p) => {
      if (termo) {
        const alvo = `${p.name} ${p.sku ?? ""} ${p.category ?? ""}`.toLowerCase();
        if (!alvo.includes(termo)) return false;
      }
      if (statusFilter === "active" && !p.is_active) return false;
      if (statusFilter === "inactive" && p.is_active) return false;
      if (origemFilter === "gestorhs" && p.external_source !== "gestorhs") return false;
      if (origemFilter === "manual" && p.external_source) return false;
      return true;
    });
  }, [items, searchTerm, statusFilter, origemFilter]);

  const pagination = usePagination(filtered, 7);

  const formatDate = (date: string) => new Date(date).toLocaleDateString("pt-BR");

  return (
    <div>
      {/* Ações */}
      <div className="mb-4 flex justify-end gap-2">
        <Button variant="secondary" size="sm" icon={<RefreshCw size={16} />} onClick={() => loadItems()} disabled={loading}>
          Atualizar
        </Button>
        {!isViewer && (
          <Button variant="primary" size="sm" icon={<Plus size={16} />} onClick={handleCreate}>
            Novo Produto de Serviço
          </Button>
        )}
      </div>

      {/* Busca e filtros */}
      <div className="flex flex-col gap-3 md:flex-row">
        <SearchInput value={searchTerm} onChange={setSearchTerm} placeholder="Buscar por nome, SKU ou categoria..." />
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

      {showFilters && (
        <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
          <div className="flex flex-wrap gap-3">
            <div>
              <label className="mb-2 block text-sm text-slate-600 dark:text-slate-400">Status</label>
              <div className="min-w-[170px]">
                <SelectMenu
                  value={statusFilter}
                  options={[
                    { value: "all", label: "Todos" },
                    { value: "active", label: "Ativos" },
                    { value: "inactive", label: "Inativos" },
                  ]}
                  onChange={setStatusFilter}
                />
              </div>
            </div>
            <div>
              <label className="mb-2 block text-sm text-slate-600 dark:text-slate-400">Origem</label>
              <div className="min-w-[170px]">
                <SelectMenu
                  value={origemFilter}
                  options={[
                    { value: "all", label: "Todas" },
                    { value: "gestorhs", label: "GestorHS" },
                    { value: "manual", label: "Manual" },
                  ]}
                  onChange={setOrigemFilter}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Contador */}
      <div className="mb-4 mt-3 text-sm text-slate-600 dark:text-slate-400">
        {filtered.length} equipamento{filtered.length !== 1 ? "s" : ""} encontrado{filtered.length !== 1 ? "s" : ""}
      </div>

      {loading ? (
        <div className="py-12 text-center text-slate-500 dark:text-slate-400">Carregando equipamentos...</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-gray-50 py-12 text-center dark:border-slate-700 dark:bg-slate-800/50">
          <p className="mb-4 text-slate-500 dark:text-slate-400">
            {searchTerm || statusFilter !== "all" || origemFilter !== "all"
              ? "Nenhum equipamento encontrado com os filtros aplicados"
              : "Nenhum equipamento no catálogo ainda"}
          </p>
          {!isViewer && !searchTerm && statusFilter === "all" && origemFilter === "all" && (
            <Button variant="primary" icon={<Plus size={16} />} onClick={handleCreate}>
              Cadastrar Primeiro Equipamento
            </Button>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white backdrop-blur-sm dark:border-slate-700/50 dark:bg-slate-800/30">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 dark:border-slate-700 dark:bg-slate-800/50">
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">Equipamento</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">Categoria</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">Origem</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">Cadastro</th>
                  {!isViewer && (
                    <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">Ações</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-slate-700/50">
                {pagination.paginatedItems.map((p) => {
                  const origem = origemLabel(p.external_source);
                  return (
                    <tr key={p.id} className="transition-colors hover:bg-gray-50 dark:hover:bg-slate-700/30">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-500/20 text-sky-400">
                            <Wrench size={20} />
                          </div>
                          <div>
                            <div className="font-medium text-slate-900 dark:text-white">{p.name}</div>
                            {p.sku && <div className="text-sm text-slate-500 dark:text-slate-400">SKU: {p.sku}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-300">{p.category || "-"}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${origem.cls}`}>{origem.texto}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                            p.is_active
                              ? "bg-emerald-500/20 text-slate-900 dark:text-emerald-400"
                              : "bg-red-500/20 text-slate-900 dark:text-red-400"
                          }`}
                        >
                          {p.is_active ? "Ativo" : "Inativo"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">{formatDate(p.created_at)}</td>
                      {!isViewer && (
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleEdit(p)}
                              className="rounded-lg bg-yellow-600/20 p-2 text-slate-900 transition-colors hover:bg-yellow-600/30 dark:text-yellow-400"
                              title="Editar"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => handleDelete(p)}
                              className="rounded-lg bg-red-600/20 p-2 text-slate-900 transition-colors hover:bg-red-600/30 dark:text-red-400"
                              title="Deletar"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination {...pagination} totalItems={filtered.length} itemLabel="equipamentos" />
        </div>
      )}

      {/* Modal de Criar/Editar Equipamento */}
      <ServiceProductModal
        isOpen={showModal}
        onClose={handleCloseModal}
        onSave={handleSaveSuccess}
        product={editing}
      />
    </div>
  );
};

export default ServiceProductsTab;
