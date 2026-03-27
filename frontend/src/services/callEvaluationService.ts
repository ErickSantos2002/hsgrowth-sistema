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

const callEvaluationService = {
  listByCard: async (cardId: number): Promise<CallEvaluation[]> => {
    const response = await api.get(`/api/v1/call-evaluations/card/${cardId}`);
    return response.data;
  },

  getById: async (id: number): Promise<CallEvaluation> => {
    const response = await api.get(`/api/v1/call-evaluations/${id}`);
    return response.data;
  },
};

export default callEvaluationService;
