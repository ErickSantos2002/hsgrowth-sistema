/**
 * Busca geral (Ctrl+K): cards de Vendas e de Serviço/Cobrança numa só chamada.
 * Os resultados de Serviço só vêm para quem acessa o módulo (admin, gerente, serviço).
 */
import api from "./api";

export interface SalesSearchResult {
  id: number;
  title: string;
  board_id: number | null;
  list_name: string | null;        // "Board / Lista"
  assigned_to_name: string | null;
  client_name: string | null;
  value: number | null;
  is_won: boolean;
  is_lost: boolean;
  matched_on: string | null;       // Título, Cliente, CNPJ/CPF, Contato
}

export interface ServiceSearchResult {
  id: number;
  title: string;
  board_id: number | null;
  board_name: string | null;
  list_name: string | null;
  client_name: string | null;
  is_won: boolean;
  is_lost: boolean;
  matched_on: string | null;       // Título, Cliente, CNPJ/CPF, Contato, Nº de série/módulo
}

export interface GlobalSearchResponse {
  vendas: SalesSearchResult[];
  servico: ServiceSearchResult[];
}

class SearchService {
  async global(q: string, limit = 8): Promise<GlobalSearchResponse> {
    const r = await api.get<GlobalSearchResponse>("/api/v1/search/global", { params: { q, limit } });
    return r.data;
  }
}

export default new SearchService();
