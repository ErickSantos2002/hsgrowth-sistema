import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, CheckCircle2, ShieldCheck } from "lucide-react";
import { LoadingSpinner } from "../../components/common";
import CabecalhoBoard, { BotaoNovo } from "../../components/parcerias/CabecalhoBoard";
import {
  FiltroPeriodo, FiltroSelect, OPCOES_ETIQUETA, PainelFiltros, noPeriodo, opcoesUnicas, useFiltrosSalvos,
} from "../../components/parcerias/FiltrosBoard";
import KanbanParcerias, { CardBadge, CardPadrao } from "../../components/parcerias/KanbanParcerias";
import ModalTrava, { faltasParaMover, temFalta } from "../../components/parcerias/ModalTrava";
import NovaOportunidadeModal from "../../components/parcerias/NovaOportunidadeModal";
import { limparCnpj, mascarar } from "../../components/parcerias/campos";
import { useAuth } from "../../hooks/useAuth";
import { showError } from "../../utils/toast";
import { LOSS_REASONS_ACQUISITION } from "../../constants/blueprintOptions";
import {
  BOARDS_PARCERIAS, ELEGIBILIDADE_COR, ELEGIBILIDADE_LABEL, PERFIS_DO_PARCEIRO, PERFIS_QUE_EDITAM, PERFIS_QUE_INDICAM, formatarMoeda,
} from "../../constants/parcerias";
import parceriasService, {
  Etapa, MoverPayload, Oportunidade, Parceiro, mensagemDeErro,
} from "../../services/parceriasService";

const BOARD = BOARDS_PARCERIAS.find((b) => b.chave === "oportunidades")!;
const FINAIS = ["ganho", "perdido"];

const FILTROS_PADRAO = {
  origem: "todas", parceiro: "", tipo: "", indicador: "", responsavel: "", vendedor: "",
  status: "todas", elegibilidade: "", ganho: "", uf: "", etiqueta: "",
  criado: "", criadoDe: "", criadoAte: "", fechado: "", fechadoDe: "", fechadoAte: "",
};

/** Valor total da coluna, no mesmo quadrinho do rodapé dos boards de Serviço. */
function ValorDaColuna({ ops }: { ops: Oportunidade[] }) {
  const total = ops.reduce((soma, o) => soma + (Number(o.total_value) || 0), 0);
  return (
    <div className="mt-3 flex-shrink-0 rounded-lg border border-gray-200 bg-white/60 px-3 py-2 dark:border-slate-700/40 dark:bg-slate-900/30">
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-500 dark:text-slate-400">Valor total</span>
        <span className="font-semibold text-slate-700 dark:text-slate-200">{formatarMoeda(total)}</span>
      </div>
    </div>
  );
}

export default function OportunidadesKanban() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const ehParceiro = PERFIS_DO_PARCEIRO.includes(user?.role ?? "");
  const indicadora = PERFIS_QUE_INDICAM.includes(user?.role ?? "");
  // Externo só mexe nas oportunidades do próprio canal; as das empresas indicadas ele só acompanha.
  const ehMinha = (o: Oportunidade) => !ehParceiro || o.partner_id === user?.partner_id;
  const podeMover = PERFIS_QUE_EDITAM.includes(user?.role ?? "");

  const [etapas, setEtapas] = useState<Etapa[]>([]);
  const [ops, setOps] = useState<Oportunidade[]>([]);
  const [parceiros, setParceiros] = useState<Parceiro[]>([]);
  const [busca, setBusca] = useState("");
  const { f, mudar, limpar, ativos } = useFiltrosSalvos("parcerias_filtros_oportunidades_v1", FILTROS_PADRAO);
  const [carregando, setCarregando] = useState(true);
  const [nova, setNova] = useState(false);
  const [pendente, setPendente] = useState<{ op: Oportunidade; destino: string } | null>(null);

  const carregar = useCallback(async () => {
    try {
      const [e, o, p] = await Promise.all([
        parceriasService.etapas(),
        parceriasService.listarOportunidades(),
        parceriasService.listarParceiros(),
      ]);
      setEtapas(e.oportunidades);
      setOps(o);
      setParceiros(p);
    } catch (err) {
      showError(mensagemDeErro(err, "Erro ao carregar as oportunidades."));
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const mover = async (op: Oportunidade, destino: string, extras: Partial<MoverPayload> = {}) => {
    try {
      await parceriasService.moverOportunidade(op.id, { stage: destino, ...extras });
    } catch (err) {
      showError(mensagemDeErro(err, "Não foi possível mover a oportunidade."));
    }
    await carregar();
  };

  const aoMover = (op: Oportunidade, destino: string) => {
    if (temFalta(faltasParaMover(destino, op))) setPendente({ op, destino });
    else mover(op, destino);
  };

  if (carregando) return <LoadingSpinner />;

  const termo = busca.trim().toLowerCase();
  const documento = limparCnpj(termo);
  // Tipo, indicação e responsável H&S vêm do parceiro dono da oportunidade.
  const parceiroDe = new Map(parceiros.map((p) => [p.id, p]));
  const igualOuSem = (filtro: string, valor: string | number | null | undefined) =>
    !filtro || (filtro === "sem" ? valor == null || valor === "" : String(valor ?? "") === filtro);
  const fechadaEm = (o: Oportunidade) => (o.stage === "ganho" ? o.won_at : o.stage === "perdido" ? o.lost_at : null);
  const statusOk = (o: Oportunidade) =>
    f.status === "todas" ||
    (f.status === "abertas" && !FINAIS.includes(o.stage)) ||
    (f.status === "ganhas" && o.stage === "ganho") ||
    (f.status === "perdidas" && o.stage === "perdido");
  const ganhoOk = (o: Oportunidade) =>
    !f.ganho ||
    (f.ganho === "a_confirmar" && o.stage === "ganho" && !o.won_confirmed_at) ||
    (f.ganho === "confirmado" && !!o.won_confirmed_at);

  const visiveis = ops.filter((o) => {
    const dono = parceiroDe.get(o.partner_id);
    return (
      (f.origem === "todas" || (f.origem === "minhas") === ehMinha(o)) &&
      (!termo ||
        [o.title, o.company_name, o.partner_name, o.seller_name].some((v) => v?.toLowerCase().includes(termo)) ||
        (documento.length >= 3 && o.cnpj?.includes(documento))) &&
      (!f.parceiro || String(o.partner_id) === f.parceiro) &&
      (!f.tipo || (dono?.kind ?? "empresa") === f.tipo) &&
      igualOuSem(f.indicador, dono?.indicated_by_partner_id) &&
      igualOuSem(f.responsavel, dono?.hs_owner_id) &&
      igualOuSem(f.vendedor, o.seller_member_id) &&
      statusOk(o) &&
      (!f.elegibilidade || o.eligibility_status === f.elegibilidade) &&
      ganhoOk(o) &&
      (!f.uf || (o.company_state ?? "").toUpperCase() === f.uf) &&
      (!f.etiqueta || (o.pending_status ?? "none") === f.etiqueta) &&
      noPeriodo(o.created_at, f.criado, f.criadoDe, f.criadoAte) &&
      noPeriodo(fechadaEm(o), f.fechado, f.fechadoDe, f.fechadoAte)
    );
  });

  const vendedores = opcoesUnicas(ops.map((o) => [o.seller_member_id, o.seller_name]));
  const ufs = [...new Set(ops.map((o) => (o.company_state ?? "").toUpperCase()).filter(Boolean))].sort();

  const filtros = (
    <PainelFiltros ativos={ativos} onLimpar={limpar}>
      {indicadora && (
        <FiltroSelect valor={f.origem} onChange={(v) => mudar("origem", v)} largura="min-w-[170px]" opcoes={[
          { value: "todas", label: "Minhas e das indicadas" },
          { value: "minhas", label: "Só minhas" },
          { value: "indicadas", label: "Só das indicadas" },
        ]} />
      )}
      {!ehParceiro && (
        <>
          <FiltroSelect valor={f.parceiro} onChange={(v) => mudar("parceiro", v)} largura="min-w-[190px]" opcoes={[
            { value: "", label: "Todos os parceiros" },
            ...parceiros.map((p) => ({ value: String(p.id), label: p.name })),
          ]} />
          <FiltroSelect valor={f.tipo} onChange={(v) => mudar("tipo", v)} largura="min-w-[170px]" opcoes={[
            { value: "", label: "Empresa ou hunter" },
            { value: "empresa", label: "Vendidas por empresa" },
            { value: "hunter", label: "Vendidas por hunter" },
          ]} />
          <FiltroSelect valor={f.indicador} onChange={(v) => mudar("indicador", v)} largura="min-w-[190px]" opcoes={[
            { value: "", label: "Qualquer indicação" },
            { value: "sem", label: "Parceiro sem indicação" },
            ...opcoesUnicas(parceiros.map((p) => [p.indicated_by_partner_id, p.indicated_by_name])).map((o) => ({ ...o, label: `Rede de ${o.label}` })),
          ]} />
          <FiltroSelect valor={f.responsavel} onChange={(v) => mudar("responsavel", v)} largura="min-w-[190px]" opcoes={[
            { value: "", label: "Todos os responsáveis H&S" },
            { value: "sem", label: "Sem responsável" },
            ...opcoesUnicas(parceiros.map((p) => [p.hs_owner_id, p.hs_owner_name])),
          ]} />
        </>
      )}
      {vendedores.length > 0 && (
        <FiltroSelect valor={f.vendedor} onChange={(v) => mudar("vendedor", v)} opcoes={[
          { value: "", label: "Todos os vendedores" },
          { value: "sem", label: "Sem vendedor" },
          ...vendedores,
        ]} />
      )}
      <FiltroSelect valor={f.status} onChange={(v) => mudar("status", v)} largura="min-w-[150px]" opcoes={[
        { value: "todas", label: "Todas" },
        { value: "abertas", label: "Apenas abertas" },
        { value: "ganhas", label: "Apenas ganhas" },
        { value: "perdidas", label: "Apenas perdidas" },
      ]} />
      <FiltroSelect valor={f.elegibilidade} onChange={(v) => mudar("elegibilidade", v)} opcoes={[
        { value: "", label: "Qualquer elegibilidade" },
        ...Object.entries(ELEGIBILIDADE_LABEL).map(([value, label]) => ({ value, label })),
      ]} />
      <FiltroSelect valor={f.ganho} onChange={(v) => mudar("ganho", v)} largura="min-w-[150px]" opcoes={[
        { value: "", label: "Qualquer ganho" },
        { value: "a_confirmar", label: "Ganho a confirmar" },
        { value: "confirmado", label: "Ganho confirmado" },
      ]} />
      {ufs.length > 0 && (
        <FiltroSelect valor={f.uf} onChange={(v) => mudar("uf", v)} largura="min-w-[110px]" opcoes={[
          { value: "", label: "Todas as UFs" },
          ...ufs.map((u) => ({ value: u, label: u })),
        ]} />
      )}
      <FiltroSelect valor={f.etiqueta} onChange={(v) => mudar("etiqueta", v)} opcoes={OPCOES_ETIQUETA} />
      <FiltroPeriodo
        rotulo="Qualquer criação" periodo={f.criado} de={f.criadoDe} ate={f.criadoAte}
        onPeriodo={(v) => mudar("criado", v)} onDe={(v) => mudar("criadoDe", v)} onAte={(v) => mudar("criadoAte", v)}
      />
      <FiltroPeriodo
        rotulo="Qualquer fechamento" periodo={f.fechado} de={f.fechadoDe} ate={f.fechadoAte}
        onPeriodo={(v) => mudar("fechado", v)} onDe={(v) => mudar("fechadoDe", v)} onAte={(v) => mudar("fechadoAte", v)}
      />
    </PainelFiltros>
  );

  return (
    <div className="flex h-full flex-col bg-gray-50 dark:bg-gradient-to-br dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <CabecalhoBoard
        board={BOARD} busca={busca} onBusca={setBusca} placeholderBusca="Buscar por título, empresa ou CNPJ..."
        filtros={filtros} filtrosAtivos={ativos}
      >
        {podeMover && <BotaoNovo rotulo="Nova Oportunidade" onClick={() => setNova(true)} />}
      </CabecalhoBoard>

      <KanbanParcerias
        etapas={etapas}
        itens={visiveis}
        idDe={(o) => o.id}
        etapaDe={(o) => o.stage}
        onAbrir={(o) => navigate(`/parcerias/oportunidades/${o.id}`)}
        onMover={podeMover ? aoMover : undefined}
        podeArrastar={ehMinha}
        onAdicionar={podeMover ? () => setNova(true) : undefined}
        rodapeColuna={(daColuna) => <ValorDaColuna ops={daColuna} />}
        renderCard={(o) => {
          const fechamento = o.expected_close_date ? new Date(`${o.expected_close_date}T00:00:00`) : null;
          const hoje = new Date();
          hoje.setHours(0, 0, 0, 0);
          const fechamentoVencido = !!fechamento && fechamento < hoje && !FINAIS.includes(o.stage);
          return (
            <CardPadrao
              titulo={o.title}
              linhas={[o.company_name, ehParceiro && ehMinha(o) ? mascarar("cnpj", o.cnpj) : o.partner_name]}
              pendencia={o.pending_status}
              quantidade={o.pending_count}
              badges={
                <>
                  <CardBadge cls={ELEGIBILIDADE_COR[o.eligibility_status]} icon={<ShieldCheck size={11} />} label={ELEGIBILIDADE_LABEL[o.eligibility_status]} />
                  {o.stage === "ganho" && (
                    <CardBadge
                      cls={o.won_confirmed_at ? "bg-emerald-500/20 text-emerald-500" : "bg-amber-500/20 text-amber-500"}
                      icon={<CheckCircle2 size={11} />}
                      label={o.won_confirmed_at ? "Ganho confirmado" : "Ganho a confirmar"}
                    />
                  )}
                  {fechamento && (
                    <CardBadge
                      cls={fechamentoVencido ? "bg-red-500/20 font-medium text-red-400" : "bg-gray-100 text-slate-500 dark:bg-slate-700/50 dark:text-slate-400"}
                      icon={<Calendar size={11} />}
                      label={fechamento.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                    />
                  )}
                </>
              }
              valor={o.total_value > 0 ? formatarMoeda(o.total_value) : undefined}
              pessoas={[o.seller_name]}
            />
          );
        }}
      />

      <NovaOportunidadeModal
        isOpen={nova}
        parceiros={parceiros}
        escolheParceiro={!ehParceiro}
        onClose={() => setNova(false)}
        onCriada={(o) => {
          setNova(false);
          navigate(`/parcerias/oportunidades/${o.id}`);
        }}
      />
      <ModalTrava
        isOpen={!!pendente}
        destinoNome={etapas.find((e) => e.codigo === pendente?.destino)?.nome ?? ""}
        faltas={pendente ? faltasParaMover(pendente.destino, pendente.op) : { motivo: false, data: false, modalidade: false }}
        motivos={LOSS_REASONS_ACQUISITION}
        externo={ehParceiro}
        onClose={() => setPendente(null)}
        onConfirmar={(extras) => {
          if (pendente) mover(pendente.op, pendente.destino, extras);
          setPendente(null);
        }}
      />
    </div>
  );
}
