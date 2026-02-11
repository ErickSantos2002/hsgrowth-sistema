import React, { useState, useEffect, useRef } from "react";
import { Plus, Search, Filter, Edit, Trash2, RefreshCw, Package, ChevronDown } from "lucide-react";
import productService, { Product } from "../services/productService";
import { Button, Alert } from "../components/common";
import ProductModal from "../components/products/ProductModal";

const Products: React.FC = () => {
  // Estados
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterActive, setFilterActive] = useState<string>("all"); // all, active, inactive
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Estados do modal
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Backend não implementado ainda
  const [backendError, setBackendError] = useState(false);

  /**
   * Carrega os produtos ao montar o componente
   */
  useEffect(() => {
    loadProducts();
  }, []);

  /**
   * Carrega lista de produtos do backend
   */
  const loadProducts = async () => {
    try {
      setLoading(true);
      setBackendError(false);

      const response = await productService.list({
        page: 1,
        page_size: 100,
      });

      setProducts(response.products || []);
    } catch (error) {
      console.error("Erro ao carregar produtos:", error);
      setBackendError(true);
      // Por enquanto, sem produtos
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Abre modal para criar novo produto
   */
  const handleCreate = () => {
    setEditingProduct(null);
    setShowModal(true);
  };

  /**
   * Abre modal para editar produto
   */
  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setShowModal(true);
  };

  /**
   * Deleta um produto
   */
  const handleDelete = async (product: Product) => {
    if (confirm(`Tem certeza que deseja deletar o produto "${product.name}"?`)) {
      try {
        await productService.delete(product.id);
        await loadProducts();
      } catch (error) {
        console.error("Erro ao deletar produto:", error);
        alert("Erro ao deletar produto");
      }
    }
  };

  /**
   * Salva produto (criar ou editar)
   */
  const handleSave = async () => {
    await loadProducts();
    setShowModal(false);
  };

  /**
   * Extrai categorias únicas dos produtos
   */
  const categories = Array.from(
    new Set(products.filter((p) => p.category).map((p) => p.category))
  ).sort();

  /**
   * Filtra produtos baseado na busca e filtros
   */
  const filteredProducts = products.filter((product) => {
    // Filtro de busca
    const matchesSearch =
      !searchTerm ||
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.category?.toLowerCase().includes(searchTerm.toLowerCase());

    // Filtro de status
    const matchesStatus =
      filterActive === "all" ||
      (filterActive === "active" && product.is_active) ||
      (filterActive === "inactive" && !product.is_active);

    // Filtro de categoria
    const matchesCategory =
      filterCategory === "all" || product.category === filterCategory;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  const itemsPerPage = 7;
  const totalItems = filteredProducts.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterActive, filterCategory, products.length]);

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

  // Formata preço
  const formatPrice = (price: number, currency: string) => {
    const currencySymbols: { [key: string]: string } = {
      BRL: "R$",
      USD: "$",
      EUR: "€",
    };

    const symbol = currencySymbols[currency] || currency;
    return `${symbol} ${price.toFixed(2).replace(".", ",")}`;
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="flex items-center gap-3 text-3xl font-bold text-white">
              <Package className="text-white" size={32} />
              Produtos
            </h1>
            <p className="mt-1 text-slate-400">Gerencie seu catálogo de produtos</p>
          </div>
          <div className="hidden items-center gap-3 md:flex">
            <Button
              variant="secondary"
              size="sm"
              icon={<RefreshCw size={16} />}
              onClick={loadProducts}
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
              Novo Produto
            </Button>
          </div>
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
          <div className="flex gap-3 md:hidden">
            <Button
              variant="secondary"
              size="sm"
              icon={<RefreshCw size={16} />}
              onClick={loadProducts}
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
              Novo Produto
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
              placeholder="Buscar por nome, SKU ou categoria..."
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
              <div>
                <label className="mb-2 block text-sm text-slate-400">Categoria</label>
                <div className="min-w-[200px]">
                  <SelectMenu
                    value={filterCategory}
                    options={[
                      { value: "all", label: "Todas" },
                      ...categories.map((cat) => ({
                        value: cat!,
                        label: cat!,
                      })),
                    ]}
                    onChange={setFilterCategory}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Contador */}
      <div className="mb-4 text-sm text-slate-400">
        {filteredProducts.length} produto{filteredProducts.length !== 1 ? "s" : ""} encontrado
        {filteredProducts.length !== 1 ? "s" : ""}
      </div>

      {/* Tabela de produtos */}
      {loading ? (
        <div className="py-12 text-center text-slate-400">Carregando produtos...</div>
      ) : filteredProducts.length === 0 ? (
        <div className="rounded-xl border border-slate-700 bg-slate-800/50 py-12 text-center">
          <p className="mb-4 text-slate-400">
            {searchTerm || filterActive !== "all" || filterCategory !== "all"
              ? "Nenhum produto encontrado com os filtros aplicados"
              : "Nenhum produto cadastrado ainda"}
          </p>
          {!searchTerm && filterActive === "all" && filterCategory === "all" && (
            <Button variant="primary" icon={<Plus size={16} />} onClick={handleCreate}>
              Cadastrar Primeiro Produto
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
                    Produto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Categoria
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Preço
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
                {paginatedProducts.map((product) => (
                  <tr
                    key={product.id}
                    className="transition-colors hover:bg-slate-700/30"
                  >
                    {/* Produto */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
                          <Package size={20} />
                        </div>
                        <div>
                          <div className="font-medium text-white">{product.name}</div>
                          {product.sku && (
                            <div className="text-sm text-slate-400">SKU: {product.sku}</div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Categoria */}
                    <td className="px-6 py-4 text-sm text-slate-300">
                      {product.category || "-"}
                    </td>

                    {/* Preço */}
                    <td className="px-6 py-4">
                      <div className="font-medium text-white">
                        {formatPrice(product.unit_price, product.currency)}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                          product.is_active
                            ? "bg-emerald-500/20 text-emerald-400"
                            : "bg-red-500/20 text-red-400"
                        }`}
                      >
                        {product.is_active ? "Ativo" : "Inativo"}
                      </span>
                    </td>

                    {/* Data de cadastro */}
                    <td className="px-6 py-4 text-sm text-slate-400">
                      {formatDate(product.created_at)}
                    </td>

                    {/* Ações */}
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(product)}
                          className="rounded-lg bg-yellow-600/20 p-2 text-yellow-400 transition-colors hover:bg-yellow-600/30"
                          title="Editar"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(product)}
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

      {/* Modal de Criar/Editar Produto */}
      <ProductModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSave={handleSave}
        product={editingProduct}
      />
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
