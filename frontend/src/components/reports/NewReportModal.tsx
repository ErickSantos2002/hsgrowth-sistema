import React, { useState, useEffect } from 'react';
import BaseModal from '../common/BaseModal';
import { DataSource, DATA_SOURCE_LABELS } from './reportTypes';

interface NewReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Chamado quando o usuário confirma com nome e fontes válidos */
  onConfirm: (name: string, sources: DataSource[]) => void;
}

const ALL_SOURCES: DataSource[] = ['cards', 'clients', 'persons', 'activities', 'tasks'];

/**
 * Modal de criação de novo relatório.
 *
 * O usuário define o nome e seleciona as fontes de dados.
 * As fontes ficam fixas no relatório: os gráficos só poderão usar
 * as fontes escolhidas aqui.
 */
const NewReportModal: React.FC<NewReportModalProps> = ({ isOpen, onClose, onConfirm }) => {
  const [name, setName] = useState('Novo Relatório');
  const [selectedSources, setSelectedSources] = useState<DataSource[]>(['cards']);

  // Reseta o estado ao abrir o modal
  useEffect(() => {
    if (isOpen) {
      setName('Novo Relatório');
      setSelectedSources(['cards']);
    }
  }, [isOpen]);

  const handleToggle = (source: DataSource) => {
    setSelectedSources((prev) =>
      prev.includes(source) ? prev.filter((s) => s !== source) : [...prev, source]
    );
  };

  const handleConfirm = () => {
    if (!name.trim() || selectedSources.length === 0) return;
    onConfirm(name.trim(), selectedSources);
  };

  const isValid = name.trim() !== '' && selectedSources.length > 0;

  const footer = (
    <div className="flex items-center justify-end gap-3">
      <button
        type="button"
        onClick={onClose}
        className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-gray-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
      >
        Cancelar
      </button>
      <button
        type="button"
        onClick={handleConfirm}
        disabled={!isValid}
        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Criar Relatório
      </button>
    </div>
  );

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Novo Relatório"
      subtitle="Defina o nome e as fontes de dados disponíveis neste relatório"
      size="sm"
      footer={footer}
    >
      <div className="space-y-6">
        {/* Nome do relatório */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Nome do relatório
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Dashboard de Vendas Q1"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && isValid) handleConfirm();
            }}
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500"
          />
        </div>

        {/* Fontes de dados */}
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Fontes de dados
          </label>
          <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
            Selecione ao menos uma. Os gráficos serão limitados a estas fontes.
          </p>
          <div className="space-y-2">
            {ALL_SOURCES.map((source) => (
              <label
                key={source}
                className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
                  selectedSources.includes(source)
                    ? 'border-emerald-500 bg-emerald-50 dark:border-emerald-500/50 dark:bg-emerald-900/10'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 dark:border-slate-700 dark:hover:border-slate-600 dark:hover:bg-slate-800/50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedSources.includes(source)}
                  onChange={() => handleToggle(source)}
                  className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 dark:border-slate-600"
                />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {DATA_SOURCE_LABELS[source]}
                </span>
              </label>
            ))}
          </div>
          {selectedSources.length === 0 && (
            <p className="mt-2 text-xs text-red-500 dark:text-red-400">
              Selecione ao menos uma fonte de dados.
            </p>
          )}
        </div>
      </div>
    </BaseModal>
  );
};

export default NewReportModal;
