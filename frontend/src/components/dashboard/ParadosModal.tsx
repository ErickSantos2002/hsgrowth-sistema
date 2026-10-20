import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { BaseModal } from "../common";
import reportService, { CardParado } from "../../services/reportService";
import { useDashboard } from "../../context/DashboardContext";

interface ParadosModalProps {
  janela: 3 | 7;
  view: "sdr" | "vendedor";
  isOpen: boolean;
  onClose: () => void;
}

/**
 * A lista por trás dos números de parados da dashboard.
 *
 * Em 16/10/2026 foi preciso consultar o banco para achar o card parado da
 * Claudia — estava em Aquisição, e ela procurava em Prospecção. Por isso cada
 * linha mostra o board e a lista.
 */
const ParadosModal: React.FC<ParadosModalProps> = ({ janela, view, isOpen, onClose }) => {
  const { selectedUserId } = useDashboard();
  const navigate = useNavigate();
  const [cards, setCards] = useState<CardParado[] | null>(null);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    let cancelado = false;
    setCards(null);
    setErro(false);
    reportService
      .getParados(janela, selectedUserId, view)
      .then((r) => { if (!cancelado) setCards(r.cards); })
      .catch(() => { if (!cancelado) setErro(true); });
    return () => { cancelado = true; };
  }, [isOpen, janela, selectedUserId, view]);

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      closeOnOverlayClick
      size="xl"
      title={`Parados há mais de ${janela} dias úteis`}
      subtitle="Sem tarefa, anotação ou mudança de etapa no período, e sem atividade agendada"
    >
      {erro ? (
        <p className="py-6 text-center text-sm text-red-500">Não foi possível carregar a lista.</p>
      ) : cards === null ? (
        <div className="flex justify-center py-8">
          <Loader2 size={24} className="animate-spin text-slate-400" />
        </div>
      ) : cards.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">Nenhum card parado.</p>
      ) : (
        <div className="max-h-[60vh] overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-white text-xs text-slate-500 dark:bg-slate-900 dark:text-slate-400">
              <tr>
                <th className="py-2 pr-3 font-medium">Card</th>
                <th className="py-2 pr-3 font-medium">Board / lista</th>
                <th className="py-2 pr-3 font-medium">Vendedor</th>
                <th className="py-2 pr-3 font-medium">SDR</th>
                <th className="py-2 text-right font-medium">Parado há</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
              {cards.map((c) => (
                <tr
                  key={c.card_id}
                  onClick={() => { onClose(); navigate(c.link); }}
                  title="Abrir o card"
                  className="cursor-pointer text-slate-700 hover:bg-gray-50 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <td className="py-2 pr-3 font-medium">{c.titulo}</td>
                  <td className="py-2 pr-3 text-xs text-slate-500 dark:text-slate-400">
                    {c.board || "—"} · {c.lista || "—"}
                  </td>
                  <td className="py-2 pr-3">{c.vendedor || "—"}</td>
                  <td className="py-2 pr-3">{c.sdr || "—"}</td>
                  <td className="whitespace-nowrap py-2 text-right tabular-nums">
                    {c.dias_parado !== null ? `${c.dias_parado} ${c.dias_parado === 1 ? "dia" : "dias"}` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {cards.length >= 200 && (
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Mostrando os 200 parados há mais tempo.</p>
          )}
        </div>
      )}
    </BaseModal>
  );
};

export default ParadosModal;
