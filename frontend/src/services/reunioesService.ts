import api from "./api";

/** Uma reunião na lista da página. */
export interface ReuniaoDaLista {
  task_id: number;
  card_id: number;
  titulo: string;
  cliente: string | null;
  vendedor: string | null;
  quando: string | null;
  duracao_minutos: number | null;
  selo: "sem gravação" | "gravada" | "avaliada" | "no-show";
  score: number | null;
  veredito: string | null;
}

/** Uma linha do quadro por pessoa — só o gestor recebe. */
export interface LinhaDoVendedor {
  vendedor: string;
  reunioes: number;
  score_medio: number | null;
  media_por_bloco: Record<string, number>;
}

export interface RespostaDeReunioes {
  items: ReuniaoDaLista[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  score_medio: number | null;
  por_veredito: Record<string, number>;
  media_por_bloco: Record<string, number>;
  percentual_avaliadas: number;
  percentual_proximo_passo: number;
  por_vendedor: LinhaDoVendedor[];
  vendedores: { id: number; nome: string }[];
}

export interface FiltrosDeReunioes {
  page?: number;
  page_size?: number;
  date_from?: string;
  date_to?: string;
  vendedor_id?: number;
  veredito?: string;
  estado?: "todas" | "sem_gravacao" | "avaliadas" | "nao_avaliadas";
}

const reunioesService = {
  /** Lista e indicadores numa chamada só — os indicadores valem para o período. */
  async listar(filtros: FiltrosDeReunioes = {}): Promise<RespostaDeReunioes> {
    const response = await api.get("/api/v1/reunioes", { params: filtros });
    return response.data;
  },
};

export default reunioesService;
