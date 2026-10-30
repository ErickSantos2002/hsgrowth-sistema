import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { Button, LoadingSpinner, SelectMenu } from "../../components/common";
import KanbanParcerias from "../../components/parcerias/KanbanParcerias";
import ModalTrava, { faltasParaMover, temFalta } from "../../components/parcerias/ModalTrava";
import NovaOportunidadeModal from "../../components/parcerias/NovaOportunidadeModal";
import { useAuth } from "../../hooks/useAuth";
import { showError } from "../../utils/toast";
import { LOSS_REASONS_ACQUISITION } from "../../constants/blueprintOptions";
import { ELEGIBILIDADE_COR, ELEGIBILIDADE_LABEL, PERFIS_GESTAO, formatarMoeda } from "../../constants/parcerias";
import parceriasService, {
  Etapa, MoverPayload, Oportunidade, Parceiro, mensagemDeErro,
} from "../../services/parceriasService";

export default function OportunidadesKanban() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const gestao = PERFIS_GESTAO.includes(user?.role ?? "");
  const ehParceiro = user?.role === "partner";
  const podeMover = gestao || ehParceiro;

  const [etapas, setEtapas] = useState<Etapa[]>([]);
  const [ops, setOps] = useState<Oportunidade[]>([]);
  const [parceiros, setParceiros] = useState<Parceiro[]>([]);
  const [filtro, setFiltro] = useState("");
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

  return (
    <div className="flex h-full flex-col p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Pipeline de Parceiros</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Oportunidades registradas pelos parceiros.</p>
        </div>
        <div className="flex items-center gap-3">
          {!ehParceiro && (
            <div className="w-56">
              <SelectMenu
                value={filtro}
                options={[{ value: "", label: "Todos os parceiros" }, ...parceiros.map((p) => ({ value: String(p.id), label: p.name }))]}
                onChange={setFiltro}
              />
            </div>
          )}
          {podeMover && (
            <Button icon={<Plus size={16} />} onClick={() => setNova(true)}>Nova oportunidade</Button>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1">
        <KanbanParcerias
          etapas={etapas}
          itens={ops}
          idDe={(o) => o.id}
          etapaDe={(o) => o.stage}
          onAbrir={(o) => navigate(`/parcerias/oportunidades/${o.id}`)}
          onMover={podeMover ? aoMover : undefined}
          renderCard={(o) => (
            <>
              <p className="text-sm font-medium text-slate-900 dark:text-white">{o.title}</p>
              <p className="text-xs text-slate-500">{o.company_name}</p>
              {!ehParceiro && <p className="text-xs text-slate-400">{o.partner_name}</p>}
              {o.seller_name && <p className="text-xs text-slate-400">Vendedor: {o.seller_name}</p>}
              <div className="mt-2 flex items-center justify-between">
                <span className={`rounded px-1.5 py-0.5 text-[11px] ${ELEGIBILIDADE_COR[o.eligibility_status]}`}>
                  {ELEGIBILIDADE_LABEL[o.eligibility_status]}
                </span>
                {o.total_value > 0 && (
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{formatarMoeda(o.total_value)}</span>
                )}
              </div>
            </>
          )}
        />
      </div>

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
