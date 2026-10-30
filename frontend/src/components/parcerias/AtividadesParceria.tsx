import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Circle, Trash2 } from "lucide-react";
import { Button, SelectMenu, Textarea, Input } from "../common";
import { showError } from "../../utils/toast";
import { useConfirm } from "../../contexts/ConfirmContext";
import { TIPOS_ATIVIDADE } from "../../constants/parcerias";
import parceriasService, { Atividade, mensagemDeErro } from "../../services/parceriasService";

interface Props {
  alvo: { tipo: "parceiro" | "oportunidade"; id: number };
  somenteLeitura: boolean;
}

const rotulo = (tipo: string) =>
  tipo === "evento" ? "Histórico" : TIPOS_ATIVIDADE.find((t) => t.value === tipo)?.label ?? tipo;

const dataHora = (valor?: string | null) =>
  valor ? new Date(valor).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "";

export default function AtividadesParceria({ alvo, somenteLeitura }: Props) {
  const { confirm } = useConfirm();
  const [itens, setItens] = useState<Atividade[]>([]);
  const [tipo, setTipo] = useState("nota");
  const [texto, setTexto] = useState("");
  const [prazo, setPrazo] = useState("");
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    const lista =
      alvo.tipo === "parceiro"
        ? await parceriasService.atividadesDoParceiro(alvo.id)
        : await parceriasService.atividadesDaOportunidade(alvo.id);
    setItens(lista);
  }, [alvo.tipo, alvo.id]);

  useEffect(() => {
    carregar().catch((e) => showError(mensagemDeErro(e, "Erro ao carregar o histórico.")));
  }, [carregar]);

  const salvar = async () => {
    if (!texto.trim()) return;
    setSalvando(true);
    try {
      // Data/hora local, sem fuso — o mesmo formato que volta para a tela.
      const dados = { type: tipo, description: texto.trim(), due_at: tipo === "tarefa" && prazo ? prazo : undefined };
      if (alvo.tipo === "parceiro") await parceriasService.criarAtividadeDoParceiro(alvo.id, dados);
      else await parceriasService.criarAtividadeDaOportunidade(alvo.id, dados);
      setTexto("");
      setPrazo("");
      await carregar();
    } catch (e) {
      showError(mensagemDeErro(e, "Erro ao salvar a atividade."));
    } finally {
      setSalvando(false);
    }
  };

  const alternar = async (a: Atividade) => {
    try {
      await parceriasService.concluirAtividade(a.id, !a.completed_at);
      await carregar();
    } catch (e) {
      showError(mensagemDeErro(e, "Erro ao concluir a atividade."));
    }
  };

  const excluir = async (a: Atividade) => {
    const ok = await confirm({ title: "Excluir atividade", message: "Excluir esta atividade?", isDanger: true });
    if (!ok) return;
    try {
      await parceriasService.excluirAtividade(a.id);
      await carregar();
    } catch (e) {
      showError(mensagemDeErro(e, "Erro ao excluir a atividade."));
    }
  };

  return (
    <div className="space-y-4">
      {!somenteLeitura && (
        <div className="space-y-2 rounded-lg border border-gray-200 p-3 dark:border-slate-700">
          <div className="flex gap-2">
            <div className="w-40">
              <SelectMenu value={tipo} options={TIPOS_ATIVIDADE} onChange={setTipo} size="sm" />
            </div>
            {tipo === "tarefa" && (
              <Input type="datetime-local" value={prazo} onChange={(e) => setPrazo(e.target.value)} />
            )}
          </div>
          <Textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={2} placeholder="O que aconteceu?" />
          <div className="flex justify-end">
            <Button size="sm" onClick={salvar} loading={salvando} disabled={!texto.trim()}>Registrar</Button>
          </div>
        </div>
      )}

      <ul className="space-y-2">
        {itens.map((a) => (
          <li key={a.id} className="flex gap-3 rounded-lg border border-gray-200 p-3 text-sm dark:border-slate-700">
            {a.type === "tarefa" ? (
              <button onClick={() => !somenteLeitura && alternar(a)} className="mt-0.5 text-emerald-600">
                {a.completed_at ? <CheckCircle2 size={18} /> : <Circle size={18} />}
              </button>
            ) : (
              <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-slate-400" />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {rotulo(a.type)} · {a.user_name || "Sistema"} · {dataHora(a.created_at)}
                {a.due_at && ` · prazo ${dataHora(a.due_at)}`}
              </p>
              <p className={`whitespace-pre-wrap text-slate-800 dark:text-slate-200 ${a.completed_at ? "line-through opacity-60" : ""}`}>
                {a.description}
              </p>
            </div>
            {!somenteLeitura && a.type !== "evento" && (
              <button onClick={() => excluir(a)} className="text-slate-400 hover:text-red-500" title="Excluir">
                <Trash2 size={16} />
              </button>
            )}
          </li>
        ))}
        {itens.length === 0 && <li className="text-sm text-slate-500">Nada registrado ainda.</li>}
      </ul>
    </div>
  );
}
