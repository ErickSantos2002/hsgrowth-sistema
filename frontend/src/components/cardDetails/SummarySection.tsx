import React from "react";
import { DollarSign, TrendingUp, Calendar, Tag, Clock, Info } from "lucide-react";
import ExpandableSection from "./ExpandableSection";
import EditableField from "./EditableField";
import { Card } from "../../types";
import cardService from "../../services/cardService";

interface SummarySectionProps {
  card: Card;
  onUpdate: () => void;
  hasProducts?: boolean; // Se true, valor fica read-only
}

/**
 * Seção "Resumo" - Informações principais do negócio - Tema escuro
 * Primeira seção da coluna esquerda, expandida por padrão
 */
const SummarySection: React.FC<SummarySectionProps> = ({ card, onUpdate, hasProducts = false }) => {
  /**
   * Atualiza o valor do card
   */
  const handleUpdateValue = async (value: string) => {
    const numericValue = parseFloat(value.replace(/[^0-9.-]/g, ""));
    if (isNaN(numericValue)) {
      alert("Valor inválido");
      return;
    }
    await cardService.update(card.id, { value: numericValue });
    onUpdate();
  };

  /**
   * Atualiza a probabilidade
   */
  const handleUpdateProbability = async (value: string) => {
    const probability = parseInt(value);
    if (isNaN(probability) || probability < 0 || probability > 100) {
      alert("Probabilidade deve ser entre 0 e 100");
      return;
    }
    // Por enquanto salvamos como campo customizado, depois podemos adicionar no modelo
    await cardService.update(card.id, {
      contact_info: {
        ...card.contact_info,
        probability: probability,
      },
    });
    onUpdate();
  };

  /**
   * Atualiza a data esperada de fechamento
   */
  const handleUpdateDueDate = async (value: string) => {
    const dateStr = value.includes("T") ? value : `${value}T12:00:00`;
    await cardService.update(card.id, { due_date: dateStr });
    onUpdate();
  };

  /**
   * Formata valor em moeda brasileira
   */
  const formatCurrency = (value: any) => {
    if (!value) return "R$ 0,00";
    const numValue = typeof value === "number" ? value : parseFloat(value);
    return `R$ ${numValue.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  /**
   * Formata data no padrão brasileiro
   */
  const formatDate = (date: string | null) => {
    if (!date) return "";
    return new Date(date).toLocaleDateString("pt-BR");
  };

  /**
   * Calcula o tempo no funil (idade do card)
   */
  const calculateAge = () => {
    if (!card.created_at) return "0 dias";
    const created = new Date(card.created_at);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - created.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Hoje";
    if (diffDays === 1) return "1 dia";
    if (diffDays < 7) return `${diffDays} dias`;
    if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return `${weeks} semana${weeks > 1 ? "s" : ""}`;
    }
    const months = Math.floor(diffDays / 30);
    return `${months} mês${months > 1 ? "es" : ""}`;
  };

  // Extrai probabilidade do contact_info (temporário até adicionar campo próprio)
  const probability = card.contact_info?.probability || 0;

  return (
    <ExpandableSection
      title="Resumo"
      defaultExpanded={false}
      icon={<Info size={18} />}
    >
      <div className="space-y-4">
        {/* Valor do Negócio */}
        <EditableField
          label="Valor do negócio"
          value={card.value}
          onSave={handleUpdateValue}
          type="number"
          placeholder="R$ 0,00"
          disabled={hasProducts}
          icon={<DollarSign size={14} />}
          format={formatCurrency}
        />

        {hasProducts && (
          <div className="flex items-start gap-2 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <Info size={16} className="text-blue-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-blue-300">
              O valor é calculado automaticamente com base nos produtos cadastrados. Para editar
              manualmente, remova todos os produtos primeiro.
            </p>
          </div>
        )}

        {/* Probabilidade de Fechamento */}
        <EditableField
          label="Probabilidade de fechamento"
          value={probability}
          onSave={handleUpdateProbability}
          type="number"
          placeholder="0%"
          icon={<TrendingUp size={14} />}
          format={(val) => `${val}%`}
        />

        {/* Data Esperada de Fechamento */}
        <EditableField
          label="Data esperada de fechamento"
          value={card.due_date ? card.due_date.split("T")[0] : ""}
          onSave={handleUpdateDueDate}
          type="date"
          placeholder="Não definida"
          icon={<Calendar size={14} />}
          format={formatDate}
        />

        {/* Tags/Etiquetas (Em desenvolvimento) */}
        <div className="space-y-1">
          <div className="flex items-center gap-1 text-sm font-medium text-slate-300">
            <Tag size={14} className="text-slate-400" />
            <span>Tags</span>
          </div>
          <div className="px-3 py-2 border border-amber-700/50 rounded-lg bg-amber-900/10">
            <p className="text-sm text-amber-400/80 italic">
              Em desenvolvimento
            </p>
          </div>
        </div>

        {/* Informações Somente Leitura */}
        <div className="pt-3 border-t border-slate-700/50 space-y-3">
          {/* Data de Criação */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-sm text-slate-400">
              <Clock size={14} />
              <span>Criado em:</span>
            </div>
            <span className="text-sm font-medium text-white">
              {card.created_at ? formatDate(card.created_at) : "-"}
            </span>
          </div>

          {/* Tempo no Funil */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-sm text-slate-400">
              <Clock size={14} />
              <span>Tempo no funil:</span>
            </div>
            <span className="text-sm font-medium text-white">{calculateAge()}</span>
          </div>

          {/* ID do Card */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">ID:</span>
            <span className="text-sm font-mono font-medium text-slate-300">#{card.id}</span>
          </div>
        </div>
      </div>
    </ExpandableSection>
  );
};

export default SummarySection;
