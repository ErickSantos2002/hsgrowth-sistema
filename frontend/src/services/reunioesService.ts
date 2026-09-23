import api from "./api";

/** Uma reunião na lista da página. */
export interface ReuniaoDaLista {
  task_id: number;
  card_id: number;
  titulo: string;
  cliente: string | null;
  vendedor: string | null;
  sdr: string | null;
  /** Onde a reunião aconteceu. */
  tipo: "CRM" | "Teams" | "—";
  /** O assunto da reunião, como escolhido na criação. */
  tipo_reuniao: string | null;
  tipo_reuniao_rotulo: string | null;
  quando: string | null;
  duracao_minutos: number | null;
  avaliada: boolean;
  selo: "sem gravação" | "gravada" | "avaliada" | "no-show";
  score: number | null;
  veredito: string | null;
}

/** Uma linha do quadro por pessoa — só o gestor recebe. */
export interface LinhaDoQuadro {
  vendedor?: string;
  sdr?: string;
  reunioes: number;
  score_medio: number | null;
  media_por_bloco: Record<string, number>;
}

export interface PessoaDoFiltro {
  id: number;
  nome: string;
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
  por_vendedor: LinhaDoQuadro[];
  por_sdr: LinhaDoQuadro[];
  vendedores: PessoaDoFiltro[];
  sdrs: PessoaDoFiltro[];
  tipos_de_reuniao: { id: string; rotulo: string }[];
}

export interface FiltrosDeReunioes {
  page?: number;
  page_size?: number;
  date_from?: string;
  date_to?: string;
  /** Id de quem conduziu, ou "sem" para reuniões sem responsável. */
  vendedor?: string;
  /** Id do SDR do negócio, ou "sem" para negócios sem SDR. */
  sdr?: string;
  veredito?: string;
  /** Id do tipo, ou "sem" para reuniões de antes do padrão. */
  tipo_reuniao?: string;
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
