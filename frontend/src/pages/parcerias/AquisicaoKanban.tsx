import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, ClipboardCheck, Trello } from "lucide-react";
import { LoadingSpinner } from "../../components/common";
import CabecalhoBoard, { BotaoNovo } from "../../components/parcerias/CabecalhoBoard";
import {
  FiltroPeriodo, FiltroSelect, OPCOES_ETIQUETA, PainelFiltros, noPeriodo, opcoesUnicas, useFiltrosSalvos,
} from "../../components/parcerias/FiltrosBoard";
import KanbanParcerias, { CardBadge, CardPadrao } from "../../components/parcerias/KanbanParcerias";
import NovoParceiroModal from "../../components/parcerias/NovoParceiroModal";
import { useAuth } from "../../hooks/useAuth";
import { showError } from "../../utils/toast";
import { BOARDS_PARCERIAS, EVIDENCIA_LABEL, PERFIS_DO_PARCEIRO, PERFIS_GESTAO, QUALIFICACAO_OPCOES } from "../../constants/parcerias";
import parceriasService, { Etapa, Parceiro, mensagemDeErro } from "../../services/parceriasService";

const BOARD = BOARDS_PARCERIAS.find((b) => b.chave === "aquisicao")!;

const FILTROS_PADRAO = {
  tipo: "", indicador: "", responsavel: "", qualificacao: "", etiqueta: "",
  criado: "", criadoDe: "", criadoAte: "",
};

export default function AquisicaoKanban() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const gestao = PERFIS_GESTAO.includes(user?.role ?? "");
  // Parceiro e hunter só veem os próprios cards e os das indicadas: os filtros da H&S não fazem sentido para eles.
  const externo = PERFIS_DO_PARCEIRO.includes(user?.role ?? "");
  const { f, mudar, limpar, ativos } = useFiltrosSalvos("parcerias_filtros_aquisicao_v1", FILTROS_PADRAO);

  const [etapas, setEtapas] = useState<Etapa[]>([]);
  const [parceiros, setParceiros] = useState<Parceiro[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState("");
  const [novo, setNovo] = useState(false);

  const carregar = useCallback(async () => {
    try {
      const [e, p] = await Promise.all([parceriasService.etapas(), parceriasService.listarParceiros()]);
      setEtapas(e.aquisicao);
      setParceiros(p);
    } catch (err) {
      showError(mensagemDeErro(err, "Erro ao carregar os parceiros."));
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  if (carregando) return <LoadingSpinner />;

  const termo = busca.trim().toLowerCase();
  const igualOuSem = (filtro: string, valor: string | number | null | undefined) =>
    !filtro || (filtro === "sem" ? valor == null || valor === "" : String(valor ?? "") === filtro);
  const visiveis = parceiros.filter(
    (p) =>
      (!termo || [p.name, p.main_contact_name, p.cnpj].some((v) => v?.toLowerCase().includes(termo))) &&
      (!f.tipo || (p.kind ?? "empresa") === f.tipo) &&
      igualOuSem(f.indicador, p.indicated_by_partner_id) &&
      igualOuSem(f.responsavel, p.hs_owner_id) &&
      igualOuSem(f.qualificacao, p.qualification_status) &&
      (!f.etiqueta || (p.pending_status ?? "none") === f.etiqueta) &&
      noPeriodo(p.created_at, f.criado, f.criadoDe, f.criadoAte)
  );

  const filtros = (
    <PainelFiltros ativos={ativos} onLimpar={limpar}>
      {!externo && (
        <>
          <FiltroSelect valor={f.tipo} onChange={(v) => mudar("tipo", v)} largura="min-w-[150px]" opcoes={[
            { value: "", label: "Empresas e hunters" },
            { value: "empresa", label: "Só empresas" },
            { value: "hunter", label: "Só hunters" },
          ]} />
          <FiltroSelect valor={f.indicador} onChange={(v) => mudar("indicador", v)} largura="min-w-[190px]" opcoes={[
            { value: "", label: "Qualquer indicação" },
            { value: "sem", label: "Sem indicação" },
            ...opcoesUnicas(parceiros.map((p) => [p.indicated_by_partner_id, p.indicated_by_name])).map((o) => ({ ...o, label: `Indicado por ${o.label}` })),
          ]} />
          <FiltroSelect valor={f.responsavel} onChange={(v) => mudar("responsavel", v)} largura="min-w-[190px]" opcoes={[
            { value: "", label: "Todos os responsáveis H&S" },
            { value: "sem", label: "Sem responsável" },
            ...opcoesUnicas(parceiros.map((p) => [p.hs_owner_id, p.hs_owner_name])),
          ]} />
          <FiltroSelect valor={f.qualificacao} onChange={(v) => mudar("qualificacao", v)} opcoes={[
            { value: "", label: "Qualquer qualificação" },
            ...QUALIFICACAO_OPCOES,
            { value: "sem", label: "Sem qualificação" },
          ]} />
        </>
      )}
      <FiltroSelect valor={f.etiqueta} onChange={(v) => mudar("etiqueta", v)} opcoes={OPCOES_ETIQUETA} />
      <FiltroPeriodo
        rotulo="Qualquer cadastro" periodo={f.criado} de={f.criadoDe} ate={f.criadoAte}
        onPeriodo={(v) => mudar("criado", v)} onDe={(v) => mudar("criadoDe", v)} onAte={(v) => mudar("criadoAte", v)}
      />
    </PainelFiltros>
  );

  return (
    <div className="flex h-full flex-col bg-gray-50 dark:bg-gradient-to-br dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <CabecalhoBoard
        board={BOARD} busca={busca} onBusca={setBusca} placeholderBusca="Buscar por parceiro, contato ou CNPJ..."
        filtros={filtros} filtrosAtivos={ativos}
      >
        {gestao && <BotaoNovo rotulo="Novo Parceiro" onClick={() => setNovo(true)} />}
      </CabecalhoBoard>

      <KanbanParcerias
        etapas={etapas}
        itens={visiveis}
        idDe={(p) => p.id}
        etapaDe={(p) => p.stage}
        // Sem onMover: as situações mudam sozinhas (convite e aceite) ou pelo botão Bloquear.
        onAbrir={(p) => navigate(`/parcerias/aquisicao/${p.id}`)}
        onAdicionar={gestao ? () => setNovo(true) : undefined}
        renderCard={(p) => {
          // Só as oportunidades ainda em negociação (fora Ganho e Perdido).
          const totalOps = Object.entries(p.oportunidades_por_etapa ?? {})
            .filter(([etapa]) => etapa !== "ganho" && etapa !== "perdido")
            .reduce((soma, [, qtd]) => soma + qtd, 0);
          const qualificacao = QUALIFICACAO_OPCOES.find((q) => q.value === p.qualification_status)?.label;
          return (
            <CardPadrao
              titulo={p.name}
              linhas={[
                p.main_contact_name ?? "Sem contato",
                [p.segment, p.region].filter(Boolean).join(" · "),
              ]}
              pendencia={p.pending_status}
              quantidade={p.pending_count}
              badges={
                <>
                  {qualificacao && (
                    <CardBadge cls="bg-blue-500/15 text-blue-600 dark:text-blue-400" icon={<ClipboardCheck size={11} />} label={qualificacao} />
                  )}
                  {p.kind === "hunter" && (
                    <CardBadge cls="bg-purple-500/15 text-purple-600 dark:text-purple-400" label="Hunter" />
                  )}
                  {totalOps > 0 && (
                    <CardBadge cls="bg-gray-100 text-slate-500 dark:bg-slate-700/50 dark:text-slate-400" icon={<Trello size={11} />} label={totalOps > 1 ? `${totalOps} oportunidades abertas` : "1 oportunidade aberta"} />
                  )}
                  {p.activation_evidence && (
                    <CardBadge cls="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" icon={<CheckCircle2 size={11} />} label={EVIDENCIA_LABEL[p.activation_evidence]} />
                  )}
                </>
              }
              pessoas={[p.hs_owner_name]}
            />
          );
        }}
      />

      <NovoParceiroModal
        isOpen={novo}
        onClose={() => setNovo(false)}
        onCriado={(p) => {
          setNovo(false);
          navigate(`/parcerias/aquisicao/${p.id}`);
        }}
      />
    </div>
  );
}
