import { RespostaDeReunioes } from "../../services/reunioesService";

const BLOCOS = ["Abertura", "Diagnóstico", "Demonstração", "Fechamento"];

const Cartao: React.FC<{ titulo: string; valor: string; detalhe?: string }> = ({
  titulo,
  valor,
  detalhe,
}) => (
  <div className="rounded border border-slate-700/50 bg-slate-800/40 p-3">
    <p className="text-[11px] uppercase tracking-wide text-slate-500">{titulo}</p>
    <p className="mt-1 text-xl font-semibold text-slate-100">{valor}</p>
    {detalhe && <p className="text-[11px] text-slate-400">{detalhe}</p>}
  </div>
);

/**
 * O topo da página.
 *
 * "Próximo passo" ganha um cartão próprio porque é o ponto mais fraco do time
 * hoje: nas 7 reuniões avaliadas pela consultoria, Fechamento ficou entre 43 e
 * 46. Deixar isso visível é metade do trabalho de melhorar.
 */
const ReunioesKpis: React.FC<{ dados: RespostaDeReunioes }> = ({ dados }) => (
  <div className="space-y-3">
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <Cartao titulo="Reuniões" valor={String(dados.total)} detalhe="no período" />
      <Cartao
        titulo="Score médio"
        valor={dados.score_medio !== null ? String(dados.score_medio) : "—"}
        detalhe="só as comparáveis"
      />
      <Cartao titulo="Avaliadas" valor={`${dados.percentual_avaliadas}%`} />
      <Cartao
        titulo="Próximo passo"
        valor={`${dados.percentual_proximo_passo}%`}
        detalhe="fecharam com compromisso"
      />
    </div>

    {Object.keys(dados.media_por_bloco).length > 0 && (
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {BLOCOS.filter((b) => dados.media_por_bloco[b] !== undefined).map((bloco) => (
          <div key={bloco} className="rounded border border-slate-700/40 bg-slate-800/20 p-2.5">
            <p className="text-[11px] text-slate-500">{bloco}</p>
            <p className="text-base font-medium text-slate-200">{dados.media_por_bloco[bloco]}</p>
          </div>
        ))}
      </div>
    )}

    {Object.keys(dados.por_veredito).length > 0 && (
      <div className="flex flex-wrap gap-2">
        {Object.entries(dados.por_veredito).map(([veredito, quantidade]) => (
          <span
            key={veredito}
            className="rounded border border-slate-700/50 bg-slate-800/40 px-2 py-1 text-[11px] text-slate-300"
          >
            {veredito} · {quantidade}
          </span>
        ))}
      </div>
    )}
  </div>
);

export default ReunioesKpis;
