import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, ClipboardCheck, Trello } from "lucide-react";
import { LoadingSpinner } from "../../components/common";
import CabecalhoBoard, { BotaoNovo } from "../../components/parcerias/CabecalhoBoard";
import KanbanParcerias, { CardBadge, CardPadrao } from "../../components/parcerias/KanbanParcerias";
import ModalTrava from "../../components/parcerias/ModalTrava";
import NovoParceiroModal from "../../components/parcerias/NovoParceiroModal";
import { useAuth } from "../../hooks/useAuth";
import { showError } from "../../utils/toast";
import { BOARDS_PARCERIAS, EVIDENCIA_LABEL, PERFIS_GESTAO, PERFIS_QUE_EDITAM, QUALIFICACAO_OPCOES } from "../../constants/parcerias";
import parceriasService, { Etapa, MoverPayload, Parceiro, mensagemDeErro } from "../../services/parceriasService";

const BOARD = BOARDS_PARCERIAS.find((b) => b.chave === "aquisicao")!;

export default function AquisicaoKanban() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const gestao = PERFIS_GESTAO.includes(user?.role ?? "");
  const podeMover = PERFIS_QUE_EDITAM.includes(user?.role ?? "");

  const [etapas, setEtapas] = useState<Etapa[]>([]);
  const [parceiros, setParceiros] = useState<Parceiro[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState("");
  const [novo, setNovo] = useState(false);
  const [perdendo, setPerdendo] = useState<Parceiro | null>(null);

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

  const mover = async (parceiro: Parceiro, destino: string, extras: Partial<MoverPayload> = {}) => {
    try {
      await parceriasService.moverParceiro(parceiro.id, { stage: destino, ...extras });
    } catch (err) {
      showError(mensagemDeErro(err, "Não foi possível mover o parceiro."));
    }
    await carregar();
  };

  const aoMover = (parceiro: Parceiro, destino: string) => {
    if (destino === "ativado") return showError("O parceiro vai para Ativado sozinho, na primeira evidência de uso do canal.");
    if (destino === "perdido") {
      if (!gestao) return showError("Só admin ou gerente marcam o parceiro como Perdido.");
      return setPerdendo(parceiro);
    }
    mover(parceiro, destino);
  };

  if (carregando) return <LoadingSpinner />;

  const termo = busca.trim().toLowerCase();
  const visiveis = parceiros.filter(
    (p) => !termo || [p.name, p.main_contact_name, p.cnpj].some((v) => v?.toLowerCase().includes(termo))
  );

  return (
    <div className="flex h-full flex-col bg-gray-50 dark:bg-gradient-to-br dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <CabecalhoBoard board={BOARD} busca={busca} onBusca={setBusca} placeholderBusca="Buscar por parceiro, contato ou CNPJ...">
        {gestao && <BotaoNovo rotulo="Novo Parceiro" onClick={() => setNovo(true)} />}
      </CabecalhoBoard>

      <KanbanParcerias
        etapas={etapas}
        itens={visiveis}
        idDe={(p) => p.id}
        etapaDe={(p) => p.stage}
        onAbrir={(p) => navigate(`/parcerias/aquisicao/${p.id}`)}
        onMover={podeMover ? aoMover : undefined}
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
      <ModalTrava
        isOpen={!!perdendo}
        destinoNome="Perdido"
        faltas={{ motivo: true, data: false, modalidade: false }}
        onClose={() => setPerdendo(null)}
        onConfirmar={(extras) => {
          if (perdendo) mover(perdendo, "perdido", extras);
          setPerdendo(null);
        }}
      />
    </div>
  );
}
