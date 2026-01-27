import api from "./api";

/**
 * Tipos para Products
 */
export interface Product {
  id: number;
  name: string;
  description?: string;
  sku?: string;
  unit_price: number;
  currency: string;
  category?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateProductRequest {
  name: string;
  description?: string;
  sku?: string;
  unit_price: number;
  currency?: string;
  category?: string;
  is_active?: boolean;
}

export interface UpdateProductRequest {
  name?: string;
  description?: string;
  sku?: string;
  unit_price?: number;
  currency?: string;
  category?: string;
  is_active?: boolean;
}

export interface ProductListResponse {
  products: Product[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface CardProduct {
  id: number;
  card_id: number;
  product_id: number;
  quantity: number;
  unit_price: number;
  discount: number;
  notes?: string;
  subtotal: number;
  total: number;
  created_at: string;
  updated_at: string;
  product_name?: string;
  product_sku?: string;
  product_category?: string;
}

export interface CreateCardProductRequest {
  product_id: number;
  quantity: number;
  unit_price: number;
  discount?: number;
  notes?: string;
}

export interface UpdateCardProductRequest {
  quantity?: number;
  unit_price?: number;
  discount?: number;
  notes?: string;
}

export interface CardProductSummary {
  items: CardProduct[];
  total_items: number;
  subtotal: number;
  total_discount: number;
  total: number;
}

/**
 * Serviço de produtos
 */
class ProductService {
  // ========== CATÁLOGO DE PRODUTOS ==========

  /**
   * Cria um novo produto no catálogo
   */
  async create(data: CreateProductRequest): Promise<Product> {
    const response = await api.post<Product>("/api/v1/products", data);
    return response.data;
  }

  /**
   * Lista produtos com filtros
   */
  async list(params?: {
    page?: number;
    page_size?: number;
    search?: string;
    category?: string;
    is_active?: boolean;
  }): Promise<ProductListResponse> {
    const response = await api.get<ProductListResponse>("/api/v1/products", { params });
    return response.data;
  }

  /**
   * Busca um produto por ID
   */
  async getById(id: number): Promise<Product> {
    const response = await api.get<Product>(`/api/v1/products/${id}`);
    return response.data;
  }

  /**
   * Atualiza um produto
   */
  async update(id: number, data: UpdateProductRequest): Promise<Product> {
    const response = await api.put<Product>(`/api/v1/products/${id}`, data);
    return response.data;
  }

  /**
   * Deleta um produto (soft delete)
   */
  async delete(id: number): Promise<void> {
    await api.delete(`/api/v1/products/${id}`);
  }

  // ========== PRODUTOS DO CARD ==========

  /**
   * Adiciona um produto a um card
   */
  async addToCard(cardId: number, data: CreateCardProductRequest): Promise<CardProduct> {
    const response = await api.post<CardProduct>(`/api/v1/products/cards/${cardId}`, data);
    return response.data;
  }

  /**
   * Lista produtos de um card com totais
   */
  async getCardProducts(cardId: number): Promise<CardProductSummary> {
    const response = await api.get<CardProductSummary>(`/api/v1/products/cards/${cardId}`);
    return response.data;
  }

  /**
   * Atualiza um produto do card
   */
  async updateCardProduct(cardProductId: number, data: UpdateCardProductRequest): Promise<CardProduct> {
    const response = await api.put<CardProduct>(
      `/api/v1/products/cards/items/${cardProductId}`,
      data
    );
    return response.data;
  }

  /**
   * Remove um produto de um card
   */
  async removeFromCard(cardProductId: number): Promise<void> {
    await api.delete(`/api/v1/products/cards/items/${cardProductId}`);
  }
}

export default new ProductService();
