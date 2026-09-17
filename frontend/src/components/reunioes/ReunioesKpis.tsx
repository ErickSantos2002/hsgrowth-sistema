import { CheckCircle2, Gauge, Target, Video } from "lucide-react";

import KpiCard from "../dashboard/KpiCard";
import { RespostaDeReunioes } from "../../services/reunioesService";

const BLOCOS = ["Abertura", "Diagnóstico", "Demonstração", "Fechamento"];

/**
 * O topo da página, nos mesmos cartões do Dashboard.
 *
 * "Próximo passo" ganha cartão próprio porque é o ponto mais fraco do time
 * hoje: nas 7 reuniões avaliadas pela consultoria, Fechamento ficou entre 43 e
 * 46. Deixar isso visível é metade do trabalho de melhorar.
 */
const ReunioesKpis: React.FC<{ dados: RespostaDeReunioes }> = ({ dados }) => (
  <div className="space-y-4">
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <KpiCard
        icon={<Video size={20} />}
        iconBg="bg-purple-500/20 text-purple-600 dark:text-purple-400"
        label="Reuniões"
        value={dados.total}
        sub="realizadas no período"
        info="Reuniões do período, com ou sem gravação. Canceladas não entram."
      />
      <KpiCard
        icon={<Gauge size={20} />}
        iconBg="bg-blue-500/20 text-blue-600 dark:text-blue-400"
        label="Score médio"
        value={dados.score_medio}
        format="number"
        sub="só as comparáveis"
        highlight="blue"
        info="Média das avaliações com cobertura de pelo menos 70%. Reunião curta ou parcial não recebe score comparável."
      />
      <KpiCard
        icon={<CheckCircle2 size={20} />}
        iconBg="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
        label="Avaliadas"
        value={dados.percentual_avaliadas}
        format="percent"
        sub={`de ${dados.total} reuni${dados.total === 1 ? "ão" : "ões"}`}
        highlight="green"
        info="Quantas reuniões do período já passaram pela avaliação do roteiro."
      />
      <KpiCard
        icon={<Target size={20} />}
        iconBg="bg-orange-500/20 text-orange-600 dark:text-orange-400"
        label="Próximo passo"
        value={dados.percentual_proximo_passo}
        format="percent"
        sub="fecharam com compromisso"
        highlight="orange"
        info="Percentual das reuniões avaliadas em que o critério F6 (próximo passo com compromisso) recebeu nota 1 ou 2."
      />
    </div>

    {Object.keys(dados.media_por_bloco).length > 0 && (
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {BLOCOS.filter((b) => dados.media_por_bloco[b] !== undefined).map((bloco) => (
          <div
            key={bloco}
            className="rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-700/50 dark:bg-slate-800/30"
          >
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {bloco}
            </p>
            <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
              {dados.media_por_bloco[bloco]}
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500">média do bloco</p>
          </div>
        ))}
      </div>
    )}

    {Object.keys(dados.por_veredito).length > 0 && (
      <div className="flex flex-wrap gap-2">
        {Object.entries(dados.por_veredito).map(([veredito, quantidade]) => (
          <span
            key={veredito}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
          >
            {veredito} · <span className="font-semibold">{quantidade}</span>
          </span>
        ))}
      </div>
    )}
  </div>
);

export default ReunioesKpis;
