import React, { useState, useRef, useMemo, useEffect } from "react";
import { Plus, Filter, Edit, Trash2, RefreshCw, Package, ChevronDown, Wrench } from "lucide-react";
import productService, { Product } from "../services/productService";
import { Button, Alert, SearchInput, Pagination } from "../components/common";
import { PageHeader } from "../components/layout";
import ProductModal from "../components/products/ProductModal";
import ServiceProductsTab from "../components/products/ServiceProductsTab";
import { showError, showSuccess } from "../utils/toast";
import { usePagination, useFilter, filterHelpers, useCRUD } from "../hooks";
import { useAuth } from "../hooks/useAuth";

const Products: React.FC = () => {
  const { user } = useAuth();

  // Visualizadores têm acesso somente leitura
  const isViewer = user?.role === "viewer";

  // Aba ativa: catálogo de Vendas (atual) ou de Serviço (equipamentos, leitura).
  const [activeTab, setActiveTab] = useState<"vendas" | "servico">("vendas");

  // Estados locais
  const [showFilters, setShowFilters] = useState(false);
  const [backendError, setBackendError] = useState(false);

  // Hook CRUD - gerencia operações de criar/editar/deletar e loading
  const {
    items: products,
    loading,
    editing: editingProduct,
    showModal,
    setShowModal,
    loadItems: loadProducts,
    handleCreate,
    handleEdit,
    handleDelete,
    handleSaveSuccess,
    handleCloseModal,
  } = useCRUD<Product>(
    {
      list: async () => {
        try {
          setBackendError(false);
          const response = await productService.list({ page: 1, page_size: 100 });
          return response.products || [];
        } catch (error) {
          console.error("Erro ao carregar produtos:", error);
          setBackendError(true);
          throw error;
        }
      },
      delete: productService.delete,
    },
    {
      onSuccess: showSuccess,
      onError: showError,
    }
  );

  // Hook de filtros
  const {
    filteredItems: filteredProducts,
    searchTerm,
    setSearchTerm,
    customFilters,
    setCustomFilter,
    categoryFilter,
    setCategoryFilter,
  } = useFilter<Product>(products, {
    search: filterHelpers.searchInFields(["name", "sku", "category"]),
    status: (product, status) =>
      status === "all" ||
      (status === "active" && product.is_active) ||
      (status === "inactive" && !product.is_active),
    category: (product, category) => category === "all" || product.category === category,
  });

  // Hook de paginação
  const pagination = usePagination(filteredProducts, 7);

  // Extrai categorias únicas dos produtos
  const categories = useMemo(
    () =>
      Array.from(new Set(products.filter((p) => p.category).map((p) => p.category))).sort(),
    [products]
  );

  // Formata data
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("pt-BR");
  };

  // Formata preço
  const formatPrice = (price: number, currency: string) => {
    const currencySymbols: { [key: string]: string } = {
      BRL: "R$",
      USD: "$",
      EUR: "€",
    };

    const symbol = currencySymbols[currency] || currency;
    const formatted = price.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return `${symbol} ${formatted}`;
  };

  return (
    <div className="p-6">
      {/* Header */}
      <PageHeader
        title="Produtos"
        description="Gerencie seu catálogo de produtos e o de equipamentos de serviço"
        icon={Package}
      />

      {/* Abas */}
      <div className="mb-6 flex gap-2 border-b border-gray-200 dark:border-slate-700">
        <button
          onClick={() => setActiveTab("vendas")}
          className={`border-b-2 px-4 py-2 font-medium transition-colors ${
            activeTab === "vendas"
              ? "border-emerald-400 text-emerald-400"
              : "border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          }`}
        >
          <div className="flex items-center gap-2">
            <Package size={16} />
            Produtos
          </div>
        </button>
        <button
          onClick={() => setActiveTab("servico")}
          className={`border-b-2 px-4 py-2 font-medium transition-colors ${
            activeTab === "servico"
              ? "border-emerald-400 text-emerald-400"
              : "border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          }`}
        >
          <div className="flex items-center gap-2">
            <Wrench size={16} />
            Produtos de Serviço
          </div>
        </button>
      </div>

      {/* ─── Aba: Produtos de Serviço (equipamentos, somente leitura) ─── */}
      {activeTab === "servico" && <ServiceProductsTab />}

      {/* ─── Aba: Produtos (catálogo de Vendas) ─── */}
      {activeTab === "vendas" && (
      <>
      {/* Ações da aba de Vendas */}
      <div className="mb-4 flex justify-end gap-2">
        <Button
          variant="secondary"
          size="sm"
          icon={<RefreshCw size={16} />}
          onClick={loadProducts}
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
            Novo Produto
          </Button>
        )}
      </div>

      {/* Aviso de backend não implementado */}
      {backendError && (
        <Alert type="warning" title="Endpoint não implementado" className="mb-4">
          O backend ainda não implementou o endpoint <code>/api/v1/products</code>.
          A estrutura do frontend está pronta. Após implementar o endpoint, essa página funcionará automaticamente.
        </Alert>
      )}

      {/* Busca e Filtros */}
      <div className="flex flex-col gap-3 md:flex-row">
        <SearchInput
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Buscar por nome, SKU ou categoria..."
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
            <div>
              <label className="mb-2 block text-sm text-slate-600 dark:text-slate-400">Categoria</label>
              <div className="min-w-[200px]">
                <SelectMenu
                  value={categoryFilter}
                  options={[
                    { value: "all", label: "Todas" },
                    ...categories.map((cat) => ({
                      value: cat!,
                      label: cat!,
                    })),
                  ]}
                  onChange={setCategoryFilter}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Contador */}
      <div className="mb-4 text-sm text-slate-600 dark:text-slate-400">
        {filteredProducts.length} produto{filteredProducts.length !== 1 ? "s" : ""} encontrado
        {filteredProducts.length !== 1 ? "s" : ""}
      </div>

      {/* Tabela de produtos */}
      {loading ? (
        <div className="py-12 text-center text-slate-500 dark:text-slate-400">Carregando produtos...</div>
      ) : filteredProducts.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-gray-50 py-12 text-center dark:border-slate-700 dark:bg-slate-800/50">
          <p className="mb-4 text-slate-500 dark:text-slate-400">
            {searchTerm || (customFilters.status && customFilters.status !== "all") || categoryFilter !== "all"
              ? "Nenhum produto encontrado com os filtros aplicados"
              : "Nenhum produto cadastrado ainda"}
          </p>
          {!searchTerm && (!customFilters.status || customFilters.status === "all") && categoryFilter === "all" && (
            <Button variant="primary" icon={<Plus size={16} />} onClick={handleCreate}>
              Cadastrar Primeiro Produto
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
                    Produto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    Categoria
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    Preço
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
                {pagination.paginatedItems.map((product) => (
                  <tr
                    key={product.id}
                    className="transition-colors hover:bg-gray-50 dark:hover:bg-slate-700/30"
                  >
                    {/* Produto */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
                          <Package size={20} />
                        </div>
                        <div>
                          <div className="font-medium text-slate-900 dark:text-white">{product.name}</div>
                          {product.sku && (
                            <div className="text-sm text-slate-500 dark:text-slate-400">SKU: {product.sku}</div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Categoria */}
                    <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-300">
                      {product.category || "-"}
                    </td>

                    {/* Preço */}
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900 dark:text-white">
                        {formatPrice(product.unit_price, product.currency)}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                          product.is_active
                            ? "bg-emerald-500/20 text-slate-900 dark:text-emerald-400"
                            : "bg-red-500/20 text-slate-900 dark:text-red-400"
                        }`}
                      >
                        {product.is_active ? "Ativo" : "Inativo"}
                      </span>
                    </td>

                    {/* Data de cadastro */}
                    <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">
                      {formatDate(product.created_at)}
                    </td>

                    {/* Ações - ocultas para visualizadores */}
                    <td className="px-6 py-4">
                      {!isViewer && (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEdit(product)}
                            className="rounded-lg bg-yellow-600/20 p-2 text-slate-900 dark:text-yellow-400 transition-colors hover:bg-yellow-600/30"
                            title="Editar"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(product)}
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
            totalItems={filteredProducts.length}
            itemLabel="produtos"
          />
        </div>
      )}

      {/* Modal de Criar/Editar Produto */}
      <ProductModal
        isOpen={showModal}
        onClose={handleCloseModal}
        onSave={handleSaveSuccess}
        product={editingProduct}
      />
      </>
      )}
    </div>
  );
};

export default Products;

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
