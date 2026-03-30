import api from './api';

export interface UncoveredBlock {
  name: string;
  suggestion: string;
}

export interface MatrixBlock {
  block: string;
  grade: number | null;
  justification: string;
  not_applicable: boolean;
  uncovered_blocks: UncoveredBlock[];
}

export interface CallEvaluation {
  id: number;
  card_id: number;
  call_log_id: number | null;
  ramal: string | null;
  vendedor_name: string | null;
  transcript: string | null;
  summary: string;
  next_steps: string | null;
  general_evaluation: string | null;
  situation: string | null;
  matrix_evaluation: MatrixBlock[] | null;
  final_score: number | null;
  classification: string | null;
  created_at: string;
  updated_at: string;
}

export interface CallEvaluationListParams {
  page?: number;
  page_size?: number;
  classification?: string;
  vendedor_name?: string;
  date_from?: string;
  date_to?: string;
}

export interface CallEvaluationListResponse {
  items: CallEvaluation[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  average_score: number | null;
  by_classification: Record<string, number>;
}

const callEvaluationService = {
  list: async (params?: CallEvaluationListParams): Promise<CallEvaluationListResponse> => {
    const response = await api.get('/api/v1/call-evaluations/', { params });
    return response.data;
  },

  listByCard: async (cardId: number): Promise<CallEvaluation[]> => {
    const response = await api.get(`/api/v1/call-evaluations/card/${cardId}`);
    return response.data;
  },

  listVendedores: async (): Promise<string[]> => {
    const response = await api.get('/api/v1/call-evaluations/vendedores');
    return response.data;
  },

  getById: async (id: number): Promise<CallEvaluation> => {
    const response = await api.get(`/api/v1/call-evaluations/${id}`);
    return response.data;
  },
};

export default callEvaluationService;
