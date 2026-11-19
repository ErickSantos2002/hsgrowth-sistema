import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BaseModal, Button, FormField, SelectMenu, Textarea } from "../common";
import { mascarar } from "./campos";
import { PERFIS_GESTAO } from "../../constants/parcerias";
import { useAuth } from "../../hooks/useAuth";
import { useConfirm } from "../../contexts/ConfirmContext";
import liberacoesCnpjService, { Liberacao, SituacaoDaLiberacao } from "../../services/liberacoesCnpjService";
import { textoDoErro } from "../../hooks/useLiberacaoCnpj";
import { showError, showSuccess } from "../../utils/toast";

/**
 * Aba Liberações da Consulta de CNPJ (1.11.32).
 * Gestão: todos os pedidos, com Liberar e Recusar. Vendedor/SDR: os próprios, com Cancelar.
 */

const SITUACAO: Record<SituacaoDaLiberacao, { rotulo: string; cor: string }> = {
  pendente: { rotulo: "Pendente", cor: "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  liberado: { rotulo: "Liberado", cor: "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  recusado: { rotulo: "Recusado", cor: "border-red-500/40 bg-red-500/10 text-red-600 dark:text-red-400" },
  cancelado: { rotulo: "Cancelado", cor: "border-slate-400/40 bg-slate-400/10 text-slate-500 dark:text-slate-400" },
};

const FILTROS = [
  { value: "pendente", label: "Pendentes" },
  { value: "liberado", label: "Liberados" },
  { value: "recusado", label: "Recusados" },
  { value: "cancelado", label: "Cancelados" },
  { value: "", label: "Todos" },
];

const quando = (iso: string | null) => (iso ? new Date(`${iso}Z`).toLocaleString("pt-BR") : "—");

type Decisao = { pedido: Liberacao; acao: "liberar" | "recusar" };

interface Props {
  /** Avisa a página (e o menu) que a contagem de pendentes mudou. */
  onMudou?: () => void;
}

export default function LiberacoesCnpj({ onMudou }: Props) {
  const { user } = useAuth();
  const gestao = PERFIS_GESTAO.includes(user?.role ?? "");
  const { confirm } = useConfirm();

  const [situacao, setSituacao] = useState<string>("pendente");
  const [pedidos, setPedidos] = useState<Liberacao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [decisao, setDecisao] = useState<Decisao | null>(null);
  const [nota, setNota] = useState("");
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      setPedidos(await liberacoesCnpjService.listar((situacao || undefined) as SituacaoDaLiberacao | undefined));
    } catch (err) {
      showError(textoDoErro(err, "Erro ao carregar os pedidos."));
    } finally {
      setCarregando(false);
    }
  }, [situacao]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const abrirDecisao = (pedido: Liberacao, acao: Decisao["acao"]) => {
    setNota("");
    setDecisao({ pedido, acao });
  };

  const decidir = async () => {
    if (!decisao) return;
    setSalvando(true);
    try {
      if (decisao.acao === "liberar") {
        await liberacoesCnpjService.liberar(decisao.pedido.id, nota.trim());
        showSuccess("Liberado. O card já está com quem pediu.");
      } else {
        await liberacoesCnpjService.recusar(decisao.pedido.id, nota.trim());
        showSuccess("Pedido recusado. Quem pediu recebe o motivo no sino.");
      }
      setDecisao(null);
    } catch (err) {
      // Ex.: a lista do card foi apagada. O pedido continua pendente; a mensagem diz o que houve.
      showError(textoDoErro(err, "Erro ao decidir o pedido."));
    } finally {
      setSalvando(false);
      carregar();
      onMudou?.();
    }
  };

  const cancelar = async (pedido: Liberacao) => {
    const ok = await confirm({
      title: "Cancelar pedido",
      message: `Cancelar o pedido de liberação de ${pedido.empresa}?`,
      confirmText: "Cancelar pedido",
      isDanger: true,
    });
    if (!ok) return;
    try {
      await liberacoesCnpjService.cancelar(pedido.id);
      showSuccess("Pedido cancelado.");
      carregar();
    } catch (err) {
      showError(textoDoErro(err, "Erro ao cancelar o pedido."));
    }
  };

  const liberando = decisao?.acao === "liberar";

  return (
    <div className="space-y-3 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Pedidos de liberação</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {gestao
              ? "Vendedores e SDRs barrados pela trava pedem aqui. Ao liberar, o card é criado (ou a empresa vinculada) em nome de quem pediu."
              : "Seus pedidos. O card só é criado quando o gerente liberar."}
          </p>
        </div>
        <div className="w-full sm:w-48">
          <SelectMenu value={situacao} options={FILTROS} onChange={setSituacao} />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 text-xs uppercase text-slate-500 dark:border-slate-700/50 dark:text-slate-400">
            <tr>
              <th className="py-2 pr-3">Quando</th>
              {gestao && <th className="py-2 pr-3">Quem pediu</th>}
              <th className="py-2 pr-3">Empresa</th>
              <th className="py-2 pr-3">Pedido</th>
              <th className="py-2 pr-3">Estava</th>
              <th className="py-2 pr-3">Motivo</th>
              <th className="py-2 pr-3">Situação</th>
              <th className="py-2 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
            {pedidos.map((p) => (
              <tr key={p.id} className="align-top text-slate-700 dark:text-slate-200">
                <td className="whitespace-nowrap py-2 pr-3">{quando(p.created_at)}</td>
                {gestao && <td className="py-2 pr-3">{p.solicitante ?? "—"}</td>}
                <td className="py-2 pr-3">
                  <div className="font-medium text-slate-900 dark:text-white">{p.empresa}</div>
                  <div className="whitespace-nowrap text-xs text-slate-500 dark:text-slate-400">{mascarar("cnpj", p.cnpj)}</div>
                </td>
                <td className="py-2 pr-3">
                  <div>{p.kind === "criar_card" ? "Criar card" : "Vincular ao card"}</div>
                  {p.card_id ? (
                    <Link to={`/cards/${p.card_id}`} className="text-xs text-blue-600 hover:underline dark:text-blue-400">
                      {p.titulo_do_card ?? `Card #${p.card_id}`}
                    </Link>
                  ) : (
                    <div className="text-xs text-slate-500 dark:text-slate-400">{p.titulo_do_card}</div>
                  )}
                </td>
                <td className="max-w-[16rem] py-2 pr-3 text-xs text-slate-500 dark:text-slate-400">{p.blocked_with}</td>
                <td className="max-w-[16rem] py-2 pr-3">{p.reason}</td>
                <td className="py-2 pr-3">
                  <span className={`whitespace-nowrap rounded border px-2 py-0.5 text-xs font-medium ${SITUACAO[p.status].cor}`}>
                    {SITUACAO[p.status].rotulo}
                  </span>
                  {p.decided_at && p.status !== "cancelado" && (
                    <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {p.decisor} · {quando(p.decided_at)}
                    </div>
                  )}
                  {p.decision_note && (
                    <div className="mt-1 max-w-[14rem] text-xs text-slate-600 dark:text-slate-300">{p.decision_note}</div>
                  )}
                </td>
                <td className="py-2 text-right">
                  {p.status === "pendente" && gestao && (
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="success" onClick={() => abrirDecisao(p, "liberar")}>Liberar</Button>
                      <Button size="sm" variant="danger" onClick={() => abrirDecisao(p, "recusar")}>Recusar</Button>
                    </div>
                  )}
                  {p.status === "pendente" && !gestao && p.requested_by_id === user?.id && (
                    <Button size="sm" variant="secondary" onClick={() => cancelar(p)}>Cancelar</Button>
                  )}
                </td>
              </tr>
            ))}
            {!carregando && pedidos.length === 0 && (
              <tr><td colSpan={gestao ? 8 : 7} className="py-6 text-center text-slate-400">Nenhum pedido</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <BaseModal
        isOpen={decisao !== null}
        onClose={() => setDecisao(null)}
        title={liberando ? "Liberar CNPJ" : "Recusar pedido"}
        size="md"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setDecisao(null)}>Voltar</Button>
            <Button
              variant={liberando ? "success" : "danger"}
              onClick={decidir}
              loading={salvando}
              disabled={!liberando && !nota.trim()}
            >
              {liberando ? "Liberar" : "Recusar"}
            </Button>
          </div>
        }
      >
        {decisao && (
          <div className="space-y-3">
            <p className="text-sm text-slate-700 dark:text-slate-300">
              <strong>{decisao.pedido.solicitante}</strong> pediu para{" "}
              {decisao.pedido.kind === "criar_card" ? "criar um card" : "vincular ao card dele"} a empresa{" "}
              <strong>{decisao.pedido.empresa}</strong>. O CNPJ estava {decisao.pedido.blocked_with}.
            </p>
            <p className="text-sm text-slate-700 dark:text-slate-300">Motivo: {decisao.pedido.reason}</p>
            <FormField
              label={liberando ? "Observação (opcional)" : "Motivo da recusa"}
              required={!liberando}
              hint={`${nota.length}/500`}
            >
              <Textarea value={nota} maxLength={500} rows={3} onChange={(e) => setNota(e.target.value)} />
            </FormField>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {liberando
                ? "O card é criado (ou a empresa vinculada) em nome de quem pediu, e a liberação fica no histórico do card."
                : "Quem pediu recebe o motivo no sino."}
            </p>
          </div>
        )}
      </BaseModal>
    </div>
  );
}
