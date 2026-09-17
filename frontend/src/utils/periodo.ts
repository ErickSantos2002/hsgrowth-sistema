/**
 * Converte o período escolhido na barra de filtros em datas.
 *
 * Os mesmos rótulos do Dashboard (Hoje, Esta Semana, Este Mês...), para quem
 * usa as duas telas não precisar aprender dois jeitos de filtrar.
 */
export type Periodo =
  | "today"
  | "yesterday"
  | "week"
  | "month"
  | "last_month"
  | "quarter"
  | "year"
  | "all"
  | "custom";

export const OPCOES_DE_PERIODO: { value: Periodo; label: string }[] = [
  { value: "today", label: "Hoje" },
  { value: "yesterday", label: "Ontem" },
  { value: "week", label: "Esta Semana" },
  { value: "month", label: "Este Mês" },
  { value: "last_month", label: "Mês Passado" },
  { value: "quarter", label: "Este Trimestre" },
  { value: "year", label: "Este Ano" },
  { value: "all", label: "Todo o Período" },
  { value: "custom", label: "Personalizado" },
];

const iso = (d: Date) => {
  // Data local, não UTC: `toISOString` em 31/01 às 22h no Brasil devolveria
  // 01/02, e o filtro perderia o último dia do mês.
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mes}-${dia}`;
};

export interface IntervaloDeDatas {
  date_from?: string;
  date_to?: string;
}

export function datasDoPeriodo(
  periodo: Periodo,
  inicioPersonalizado?: string,
  fimPersonalizado?: string
): IntervaloDeDatas {
  const hoje = new Date();

  switch (periodo) {
    case "today":
      return { date_from: iso(hoje), date_to: iso(hoje) };

    case "yesterday": {
      const ontem = new Date(hoje);
      ontem.setDate(hoje.getDate() - 1);
      return { date_from: iso(ontem), date_to: iso(ontem) };
    }

    case "week": {
      // Semana começando no domingo, como no Dashboard
      const inicio = new Date(hoje);
      inicio.setDate(hoje.getDate() - hoje.getDay());
      return { date_from: iso(inicio), date_to: iso(hoje) };
    }

    case "month":
      return {
        date_from: iso(new Date(hoje.getFullYear(), hoje.getMonth(), 1)),
        date_to: iso(hoje),
      };

    case "last_month":
      return {
        date_from: iso(new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1)),
        date_to: iso(new Date(hoje.getFullYear(), hoje.getMonth(), 0)),
      };

    case "quarter": {
      const primeiroMesDoTrimestre = Math.floor(hoje.getMonth() / 3) * 3;
      return {
        date_from: iso(new Date(hoje.getFullYear(), primeiroMesDoTrimestre, 1)),
        date_to: iso(hoje),
      };
    }

    case "year":
      return {
        date_from: iso(new Date(hoje.getFullYear(), 0, 1)),
        date_to: iso(hoje),
      };

    case "custom":
      return { date_from: inicioPersonalizado, date_to: fimPersonalizado };

    case "all":
    default:
      return {};
  }
}
