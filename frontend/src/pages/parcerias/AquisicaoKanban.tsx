import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { Button, LoadingSpinner } from "../../components/common";
import KanbanParcerias from "../../components/parcerias/KanbanParcerias";
import ModalTrava from "../../components/parcerias/ModalTrava";
import NovoParceiroModal from "../../components/parcerias/NovoParceiroModal";
import { useAuth } from "../../hooks/useAuth";
import { showError } from "../../utils/toast";
import { EVIDENCIA_LABEL, PERFIS_GESTAO } from "../../constants/parcerias";
import parceriasService, { Etapa, MoverPayload, Parceiro, mensagemDeErro } from "../../services/parceriasService";

export default function AquisicaoKanban() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const gestao = PERFIS_GESTAO.includes(user?.role ?? "");
  const podeMover = gestao || user?.role === "partner";

  const [etapas, setEtapas] = useState<Etapa[]>([]);
  const [parceiros, setParceiros] = useState<Parceiro[]>([]);
  const [carregando, setCarregando] = useState(true);
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

  if (carregando) return <LoadingSpinner />;

  return (
    <div className="flex h-full flex-col p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Aquisição de Parceiros</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Da prospecção até a ativação do parceiro.</p>
        </div>
        {gestao && (
          <Button icon={<Plus size={16} />} onClick={() => setNovo(true)}>Novo parceiro</Button>
        )}
      </div>

      <div className="min-h-0 flex-1">
        <KanbanParcerias
          etapas={etapas}
          itens={parceiros}
          idDe={(p) => p.id}
          etapaDe={(p) => p.stage}
          onAbrir={(p) => navigate(`/parcerias/aquisicao/${p.id}`)}
          onMover={podeMover ? (p, destino) => (destino === "perdido" ? setPerdendo(p) : mover(p, destino)) : undefined}
          renderCard={(p) => (
            <>
              <p className="text-sm font-medium text-slate-900 dark:text-white">{p.name}</p>
              {p.main_contact_name && <p className="text-xs text-slate-500">{p.main_contact_name}</p>}
              {p.hs_owner_name && <p className="mt-1 text-xs text-slate-400">H&S: {p.hs_owner_name}</p>}
              {p.activation_evidence && (
                <span className="mt-2 inline-block rounded bg-emerald-500/15 px-1.5 py-0.5 text-[11px] text-emerald-700 dark:text-emerald-400">
                  {EVIDENCIA_LABEL[p.activation_evidence]}
                </span>
              )}
            </>
          )}
        />
      </div>

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
