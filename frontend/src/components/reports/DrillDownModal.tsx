import React from 'react';
import { ExternalLink, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import LoadingSpinner from '../common/LoadingSpinner';
import BaseModal from '../common/BaseModal';
import { formatCurrency } from '../../utils/formatters';
import type { DrillDownCard } from './reportTypes';

interface DrillDownModalProps {
  /** Título da modal (ex: "Prospecção — Esta Semana") */
  title: string;
  cards: DrillDownCard[];
  total: number;
  loading: boolean;
  onClose: () => void;
  /** Navega para o card ao clicar no ícone de link */
  onOpenCard: (cardId: number) => void;
}

/** Badge colorido de status do card */
const StatusBadge: React.FC<{ status: DrillDownCard['status'] }> = ({ status }) => {
  const styles = {
    Aberto:  'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
    Ganho:   'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    Perdido: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  };
  const icons = {
    Aberto:  <Minus size={10} />,
    Ganho:   <TrendingUp size={10} />,
    Perdido: <TrendingDown size={10} />,
  };

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${styles[status]}`}>
      {icons[status]}
      {status}
    </span>
  );
};

/**
 * Modal de drill-down dos gráficos de relatório.
 *
 * Exibe os cards que compõem a barra/fatia clicada no gráfico,
 * usando o BaseModal padrão do sistema.
 * Limitado a 200 registros pelo backend.
 */
const DrillDownModal: React.FC<DrillDownModalProps> = ({
  title,
  cards,
  total,
  loading,
  onClose,
  onOpenCard,
}) => {
  // Monta o subtítulo com a contagem de negócios (fica disponível após o carregamento)
  const subtitle = loading
    ? undefined
    : `${total} ${total === 1 ? 'negócio' : 'negócios'}${
        total === 200 ? ' (máximo exibido — refine os filtros para ver mais)' : ''
      }`;

  return (
    <BaseModal
      isOpen={true}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      size="xl"
      titleClassName="text-lg"
    >
      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <LoadingSpinner size="md" />
        </div>
      ) : cards.length === 0 ? (
        <div className="flex h-48 flex-col items-center justify-center gap-2 text-slate-400 dark:text-slate-500">
          <p className="text-sm">Nenhum negócio encontrado</p>
        </div>
      ) : (
        /*
         * -mx-6 cancela o padding horizontal do BaseModal para a tabela ir de borda a borda.
         * overflow-auto cria um contexto de scroll próprio, evitando conflito com o p-6
         * do BaseModal e garantindo que o sticky top-0 funcione corretamente (sem overlap).
         * max-h-full limita a altura ao espaço disponível no BaseModal.
         */
        <div className="-mx-6 overflow-auto max-h-full">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-slate-800/80">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 dark:text-slate-400">Título</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 dark:text-slate-400">Quadro / Etapa</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 dark:text-slate-400">Vendedor</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-500 dark:text-slate-400">Valor</th>
                <th className="px-4 py-2.5 text-center text-xs font-semibold text-slate-500 dark:text-slate-400">Status</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-500 dark:text-slate-400">Criado em</th>
                <th className="w-8 px-2 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
              {cards.map((card) => (
                <tr
                  key={card.id}
                  className="group transition-colors hover:bg-gray-50 dark:hover:bg-slate-800/40"
                >
                  {/* Título */}
                  <td className="max-w-[220px] px-4 py-2.5">
                    <span className="block truncate font-medium text-slate-800 dark:text-slate-200">
                      {card.title}
                    </span>
                  </td>
                  {/* Quadro / Etapa */}
                  <td className="px-4 py-2.5">
                    <span className="text-slate-500 dark:text-slate-400">{card.board_name}</span>
                    <span className="mx-1 text-slate-300 dark:text-slate-600">/</span>
                    <span className="text-slate-700 dark:text-slate-300">{card.list_name}</span>
                  </td>
                  {/* Vendedor */}
                  <td className="px-4 py-2.5 text-slate-600 dark:text-slate-400">
                    {card.assigned_to_name ?? <span className="italic text-slate-400">—</span>}
                  </td>
                  {/* Valor */}
                  <td className="px-4 py-2.5 text-right font-medium text-slate-800 dark:text-slate-200">
                    {card.value != null
                      ? formatCurrency(card.value)
                      : <span className="text-slate-400">—</span>}
                  </td>
                  {/* Status */}
                  <td className="px-4 py-2.5 text-center">
                    <StatusBadge status={card.status} />
                  </td>
                  {/* Data */}
                  <td className="px-4 py-2.5 text-right text-xs text-slate-400 dark:text-slate-500">
                    {new Date(card.created_at).toLocaleDateString('pt-BR')}
                  </td>
                  {/* Botão abrir */}
                  <td className="px-2 py-2.5">
                    <button
                      onClick={() => onOpenCard(card.id)}
                      title="Abrir negócio"
                      className="rounded p-1 text-slate-300 opacity-0 transition-opacity group-hover:opacity-100 hover:text-emerald-500 dark:text-slate-600 dark:hover:text-emerald-400"
                    >
                      <ExternalLink size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </BaseModal>
  );
};

export default DrillDownModal;
