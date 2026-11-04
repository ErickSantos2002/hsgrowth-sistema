import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, ShieldCheck } from "lucide-react";
import { LoadingSpinner, SelectMenu } from "../../components/common";
import CabecalhoBoard, { BotaoNovo } from "../../components/parcerias/CabecalhoBoard";
import KanbanParcerias, { CardBadge, CardPadrao } from "../../components/parcerias/KanbanParcerias";
import ModalTrava, { faltasParaMover, temFalta } from "../../components/parcerias/ModalTrava";
import NovaOportunidadeModal from "../../components/parcerias/NovaOportunidadeModal";
import { limparCnpj, mascarar } from "../../components/parcerias/campos";
import { useAuth } from "../../hooks/useAuth";
import { showError } from "../../utils/toast";
import { LOSS_REASONS_ACQUISITION } from "../../constants/blueprintOptions";
import {
  BOARDS_PARCERIAS, ELEGIBILIDADE_COR, ELEGIBILIDADE_LABEL, PERFIS_QUE_EDITAM, formatarMoeda,
} from "../../constants/parcerias";
import parceriasService, {
  Etapa, MoverPayload, Oportunidade, Parceiro, mensagemDeErro,
} from "../../services/parceriasService";

const BOARD = BOARDS_PARCERIAS.find((b) => b.chave === "oportunidades")!;
const FINAIS = ["ganho", "perdido"];

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
  const ehParceiro = user?.role === "partner";
  const podeMover = PERFIS_QUE_EDITAM.includes(user?.role ?? "");

  const [etapas, setEtapas] = useState<Etapa[]>([]);
  const [ops, setOps] = useState<Oportunidade[]>([]);
  const [parceiros, setParceiros] = useState<Parceiro[]>([]);
  const [filtro, setFiltro] = useState("");
  const [busca, setBusca] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [nova, setNova] = useState(false);
  const [pendente, setPendente] = useState<{ op: Oportunidade; destino: string } | null>(null);

  const carregar = useCallback(async () => {
    try {
      const [e, o, p] = await Promise.all([
        parceriasService.etapas(),
        parceriasService.listarOportunidades(filtro ? Number(filtro) : undefined),
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
  }, [filtro]);

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
  const visiveis = ops.filter(
    (o) =>
      !termo ||
      [o.title, o.company_name, o.partner_name, o.seller_name].some((v) => v?.toLowerCase().includes(termo)) ||
      (documento.length >= 3 && o.cnpj?.includes(documento))
  );

  return (
    <div className="flex h-full flex-col bg-gray-50 dark:bg-gradient-to-br dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <CabecalhoBoard board={BOARD} busca={busca} onBusca={setBusca} placeholderBusca="Buscar por título, empresa ou CNPJ...">
        {!ehParceiro && (
          <div className="w-56">
            <SelectMenu
              size="sm"
              value={filtro}
              options={[{ value: "", label: "Todos os parceiros" }, ...parceiros.map((p) => ({ value: String(p.id), label: p.name }))]}
              onChange={setFiltro}
            />
          </div>
        )}
        {podeMover && <BotaoNovo rotulo="Nova Oportunidade" onClick={() => setNova(true)} />}
      </CabecalhoBoard>

      <KanbanParcerias
        etapas={etapas}
        itens={visiveis}
        idDe={(o) => o.id}
        etapaDe={(o) => o.stage}
        onAbrir={(o) => navigate(`/parcerias/oportunidades/${o.id}`)}
        onMover={podeMover ? aoMover : undefined}
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
              linhas={[o.company_name, ehParceiro ? mascarar("cnpj", o.cnpj) : o.partner_name]}
              pendencia={o.pending_status}
              quantidade={o.pending_count}
              badges={
                <>
                  <CardBadge cls={ELEGIBILIDADE_COR[o.eligibility_status]} icon={<ShieldCheck size={11} />} label={ELEGIBILIDADE_LABEL[o.eligibility_status]} />
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
        onClose={() => setPendente(null)}
        onConfirmar={(extras) => {
          if (pendente) mover(pendente.op, pendente.destino, extras);
          setPendente(null);
        }}
      />
    </div>
  );
}
