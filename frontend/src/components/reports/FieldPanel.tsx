import React, { useState } from 'react';
import { Calendar, DollarSign, Tag, User, Hash, GripVertical, Plus, Pencil } from 'lucide-react';
import { SearchInput } from '../common/SearchInput';
import { DataSource, FieldDefinition, FieldCatalog, DATA_SOURCE_LABELS, AxisField, CalculatedField } from './reportTypes';

interface FieldPanelProps {
  /** Fontes de dados permitidas neste relatório (definidas na criação) */
  activeSources: DataSource[];
  /** Catálogo de campos carregado da API pelo componente pai */
  fieldCatalog: FieldCatalog;
  /** Campos calculados definidos no relatório */
  calculatedFields?: CalculatedField[];
  /** Abre o modal para criar um novo campo calculado */
  onAddCalculatedField?: () => void;
  /** Abre o modal para editar um campo calculado existente */
  onEditCalculatedField?: (field: CalculatedField) => void;
}

/** Ícone correspondente ao tipo de campo */
const FieldIcon: React.FC<{ fieldType: FieldDefinition['field_type'] }> = ({ fieldType }) => {
  const cls = 'shrink-0 text-slate-400 dark:text-slate-500';
  switch (fieldType) {
    case 'date':
      return <Calendar size={13} className={cls} />;
    case 'currency':
      return <DollarSign size={13} className={cls} />;
    case 'category':
      return <Tag size={13} className={cls} />;
    case 'user':
      return <User size={13} className={cls} />;
    case 'number':
      return <Hash size={13} className={cls} />;
    default:
      return null;
  }
};

/**
 * Painel esquerdo do builder de relatórios.
 *
 * Exibe os campos disponíveis das fontes de dados escolhidas na criação do relatório.
 * Cada campo é arrastável (draggable) para os eixos X/Y no painel direito.
 * Os dados do campo são serializados no dataTransfer para que a zona de drop
 * possa validar e aceitar ou rejeitar sem estado global.
 */
const FieldPanel: React.FC<FieldPanelProps> = ({
  activeSources,
  fieldCatalog,
  calculatedFields,
  onAddCalculatedField,
  onEditCalculatedField,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Retorna os campos de uma fonte filtrados pelo termo de busca
  const getVisibleFields = (source: DataSource): FieldDefinition[] =>
    (fieldCatalog[source] ?? []).filter(
      (field) => !searchTerm || field.label.toLowerCase().includes(searchTerm.toLowerCase())
    );

  const hasVisibleFields = activeSources.some(
    (source) => getVisibleFields(source).length > 0
  );

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-gray-200 bg-white dark:border-slate-700/50 dark:bg-slate-900">
      <div className="flex flex-1 flex-col overflow-hidden p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Campos Disponíveis
        </p>

        {/* Wrapper block para neutralizar o flex-1 interno do SearchInput */}
        <div className="mb-3">
          <SearchInput
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Filtrar campos..."
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          {!hasVisibleFields && (
            <p className="mt-2 text-center text-xs text-slate-400 dark:text-slate-500">
              Nenhum campo encontrado.
            </p>
          )}

          {/* Campos agrupados por fonte de dados */}
          {activeSources.map((source) => {
            const fields = getVisibleFields(source);
            if (fields.length === 0) return null;

            return (
              <div key={source} className="mb-4">
                <p className="mb-1.5 px-1 text-xs font-medium text-slate-400 dark:text-slate-500">
                  — {DATA_SOURCE_LABELS[source]} —
                </p>
                <div className="space-y-0.5">
                  {fields.map((field) => {
                    // Monta o objeto AxisField completo para serializar no drag
                    const axisField: AxisField = {
                      key: field.key,
                      label: field.label,
                      source,
                      field_type: field.field_type,
                      groupable: field.groupable,
                      aggregatable: field.aggregatable,
                    };

                    return (
                      <div
                        key={`${source}-${field.key}`}
                        draggable
                        onDragStart={(e) => {
                          // Serializa os dados completos do campo para leitura no onDrop
                          e.dataTransfer.setData(
                            'application/json',
                            JSON.stringify(axisField)
                          );
                          // Tipos extras indicam capacidade — lidos em onDragOver
                          // sem a restrição de segurança do getData()
                          if (field.groupable) {
                            e.dataTransfer.setData('application/field-groupable', 'true');
                          }
                          if (field.aggregatable) {
                            e.dataTransfer.setData('application/field-aggregatable', 'true');
                          }
                          // Marca campos de data para que a zona "Dividir por" possa rejeitar
                          if (field.field_type === 'date') {
                            e.dataTransfer.setData('application/field-date', 'true');
                          }
                          e.dataTransfer.effectAllowed = 'copy';
                        }}
                        className="flex cursor-grab items-center gap-2 rounded-md px-2 py-1.5 text-xs text-slate-600 transition-colors hover:bg-slate-50 active:cursor-grabbing dark:text-slate-300 dark:hover:bg-slate-800/50"
                      >
                        {/* Ícone de arrastar — sinaliza visualmente que o item é draggable */}
                        <GripVertical size={11} className="shrink-0 text-slate-300 dark:text-slate-600" />
                        <FieldIcon fieldType={field.field_type} />
                        <span className="leading-none">{field.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Seção de campos calculados — sempre visível (mesmo sem campos ainda) */}
          <div className="mt-2 border-t border-gray-100 pt-3 dark:border-slate-700/50">
            <div className="mb-1.5 flex items-center justify-between px-1">
              <p className="text-xs font-medium text-slate-400 dark:text-slate-500">
                — Calculados —
              </p>
              {onAddCalculatedField && (
                <button
                  type="button"
                  onClick={onAddCalculatedField}
                  title="Criar campo calculado"
                  className="rounded p-0.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-300"
                >
                  <Plus size={12} />
                </button>
              )}
            </div>

            {(!calculatedFields || calculatedFields.length === 0) ? (
              <p className="px-1 text-xs text-slate-300 dark:text-slate-600">
                Clique em + para criar
              </p>
            ) : (
              <div className="space-y-0.5">
                {calculatedFields.map((cf) => (
                  <div
                    key={cf.id}
                    draggable
                    onDragStart={(e) => {
                      // Campos calculados serializam um payload especial com is_calculated=true
                      // A zona de drop do eixo Y detecta esse flag e cria CalculatedYFieldConfig
                      e.dataTransfer.setData(
                        'application/json',
                        JSON.stringify({
                          is_calculated: true,
                          calculated_field_id: cf.id,
                          label: cf.name,
                          source: cf.source,
                        })
                      );
                      // Marca como agregável para que o eixo Y aceite o drop
                      e.dataTransfer.setData('application/field-aggregatable', 'true');
                      e.dataTransfer.effectAllowed = 'copy';
                    }}
                    className="group flex cursor-grab items-center gap-2 rounded-md px-2 py-1.5 text-xs text-slate-600 transition-colors hover:bg-slate-50 active:cursor-grabbing dark:text-slate-300 dark:hover:bg-slate-800/50"
                  >
                    <GripVertical size={11} className="shrink-0 text-slate-300 dark:text-slate-600" />
                    {/* Badge "fx" identifica visualmente o campo como calculado */}
                    <span className="shrink-0 font-mono text-xs font-bold text-blue-500 dark:text-blue-400">
                      fx
                    </span>
                    <span className="min-w-0 flex-1 truncate leading-none">{cf.name}</span>
                    {onEditCalculatedField && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditCalculatedField(cf);
                        }}
                        title="Editar campo calculado"
                        className="shrink-0 rounded p-0.5 text-slate-300 opacity-0 transition-opacity group-hover:opacity-100 hover:text-slate-500 dark:text-slate-600 dark:hover:text-slate-400"
                      >
                        <Pencil size={10} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
};

export default FieldPanel;
