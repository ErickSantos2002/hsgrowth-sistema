import React, { useState, useEffect } from "react";
import { Plus, Trash2, Zap, Pencil, Check, X, ChevronDown } from "lucide-react";
import BaseModal from "../common/BaseModal";
import { Button } from "../common";
import cadenciaService, {
  Cadencia,
  CadenciaItemInput,
  TriggerResult,
  ACTIVITY_TYPE_OPTIONS,
  getActivityTypeLabel,
} from "../../services/cadenciaService";

interface CadenciaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type View = "list" | "form" | "result";

interface FormState {
  name: string;
  itens: CadenciaItemInput[];
}

const EMPTY_FORM: FormState = {
  name: "",
  itens: [{ activity_type: "ligacao", quantity: 10 }],
};

const CadenciaModal: React.FC<CadenciaModalProps> = ({ isOpen, onClose }) => {
  const [view, setView] = useState<View>("list");
  const [cadencias, setCadencias] = useState<Cadencia[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [triggering, setTriggering] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [triggerResult, setTriggerResult] = useState<TriggerResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Carrega cadências ao abrir
  useEffect(() => {
    if (!isOpen) return;
    setView("list");
    setError(null);
    loadCadencias();
  }, [isOpen]);

  const loadCadencias = async () => {
    setLoading(true);
    try {
      const data = await cadenciaService.listMy();
      setCadencias(data);
    } catch {
      setError("Erro ao carregar cadências.");
    } finally {
      setLoading(false);
    }
  };

  // ─── Form handlers ────────────────────────────────────────────────────────

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError(null);
    setView("form");
  };

  const openEdit = (c: Cadencia) => {
    setEditingId(c.id);
    setForm({
      name: c.name,
      itens: c.itens.map((i) => ({ activity_type: i.activity_type, quantity: i.quantity })),
    });
    setError(null);
    setView("form");
  };

  const addItem = () => {
    setForm((f) => ({ ...f, itens: [...f.itens, { activity_type: "ligacao", quantity: 10 }] }));
  };

  const removeItem = (index: number) => {
    setForm((f) => ({ ...f, itens: f.itens.filter((_, i) => i !== index) }));
  };

  const updateItem = (index: number, field: keyof CadenciaItemInput, value: string | number) => {
    setForm((f) => {
      const itens = [...f.itens];
      itens[index] = { ...itens[index], [field]: value };
      return { ...f, itens };
    });
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setError("Informe um nome para a cadência."); return; }
    if (form.itens.length === 0) { setError("Adicione pelo menos um tipo de atividade."); return; }
    for (const item of form.itens) {
      if (!item.quantity || item.quantity < 1) { setError("Quantidade deve ser maior que zero."); return; }
    }

    setSaving(true);
    setError(null);
    try {
      if (editingId) {
        const updated = await cadenciaService.update(editingId, { name: form.name, itens: form.itens });
        setCadencias((prev) => prev.map((c) => (c.id === editingId ? updated : c)));
      } else {
        const created = await cadenciaService.create({ name: form.name, itens: form.itens });
        setCadencias((prev) => [created, ...prev]);
      }
      setView("list");
    } catch {
      setError("Erro ao salvar cadência.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Remover esta cadência?")) return;
    try {
      await cadenciaService.delete(id);
      setCadencias((prev) => prev.filter((c) => c.id !== id));
    } catch {
      setError("Erro ao remover cadência.");
    }
  };

  const handleTrigger = async (id: number) => {
    setTriggering(id);
    setError(null);
    try {
      const result = await cadenciaService.trigger(id);
      setTriggerResult(result);
      setView("result");
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(msg ?? "Erro ao disparar cadência.");
    } finally {
      setTriggering(null);
    }
  };

  // ─── Render helpers ───────────────────────────────────────────────────────

  const renderList = () => (
    <div className="space-y-3">
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </p>
      )}

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
        </div>
      ) : cadencias.length === 0 ? (
        <div className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
          Nenhuma cadência criada ainda.
        </div>
      ) : (
        cadencias.map((c) => (
          <div
            key={c.id}
            className="rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-700/50 dark:bg-slate-800/40"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-900 dark:text-white truncate">{c.name}</span>
                  {!c.is_active && (
                    <span className="text-xs text-slate-400 dark:text-slate-500">(inativa)</span>
                  )}
                </div>
                <div className="mt-1 flex flex-wrap gap-2">
                  {c.itens.map((item) => (
                    <span
                      key={item.id}
                      className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                    >
                      {getActivityTypeLabel(item.activity_type)} × {item.quantity}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => openEdit(c)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-300"
                  title="Editar"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => handleDelete(c.id)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
                  title="Remover"
                >
                  <Trash2 size={14} />
                </button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleTrigger(c.id)}
                  disabled={triggering === c.id || !c.is_active}
                  icon={<Zap size={13} />}
                >
                  {triggering === c.id ? "Disparando..." : "Disparar"}
                </Button>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );

  const renderForm = () => (
    <div className="space-y-4">
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </p>
      )}

      {/* Nome */}
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
          Nome da cadência
        </label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="Ex: Cadência Semanal"
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500"
        />
      </div>

      {/* Itens */}
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
          Atividades
        </label>
        <div className="space-y-2">
          {form.itens.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2">
              {/* Tipo */}
              <div className="relative flex-1">
                <select
                  value={item.activity_type}
                  onChange={(e) => updateItem(idx, "activity_type", e.target.value)}
                  className="w-full appearance-none rounded-lg border border-gray-300 bg-white px-3 py-2 pr-8 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                >
                  {ACTIVITY_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
              {/* Quantidade */}
              <input
                type="number"
                min={1}
                max={500}
                value={item.quantity}
                onChange={(e) => updateItem(idx, "quantity", parseInt(e.target.value) || 1)}
                className="w-20 rounded-lg border border-gray-300 bg-white px-3 py-2 text-center text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              />
              {/* Remover */}
              <button
                onClick={() => removeItem(idx)}
                disabled={form.itens.length === 1}
                className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-red-900/20"
                title="Remover tipo"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
        <button
          onClick={addItem}
          className="mt-2 flex items-center gap-1 text-sm text-blue-600 hover:underline dark:text-blue-400"
        >
          <Plus size={14} />
          Adicionar tipo de atividade
        </button>
      </div>
    </div>
  );

  const renderResult = () => {
    if (!triggerResult) return null;
    const allZero = triggerResult.total_activities_created === 0;
    return (
      <div className="space-y-4">
        <div className={`rounded-xl p-4 ${allZero ? "bg-amber-50 dark:bg-amber-900/20" : "bg-emerald-50 dark:bg-emerald-900/20"}`}>
          <p className={`font-semibold ${allZero ? "text-amber-700 dark:text-amber-300" : "text-emerald-700 dark:text-emerald-300"}`}>
            {allZero
              ? "Nenhuma atividade criada — todos os cards já têm atividades pendentes desses tipos."
              : `${triggerResult.total_activities_created} atividade${triggerResult.total_activities_created !== 1 ? "s" : ""} criada${triggerResult.total_activities_created !== 1 ? "s" : ""} com sucesso!`}
          </p>
        </div>
        <div className="space-y-2">
          {triggerResult.itens.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-2 dark:border-slate-700/50">
              <span className="text-sm text-slate-700 dark:text-slate-300">
                {getActivityTypeLabel(item.activity_type)}
              </span>
              <span className="text-sm font-medium text-slate-900 dark:text-white">
                {item.created}/{item.requested} criadas ({item.cards_affected} cards)
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ─── Título e footer por view ──────────────────────────────────────────────

  const titles: Record<View, string> = {
    list: "Disparo em Lote",
    form: editingId ? "Editar Disparo" : "Novo Disparo",
    result: "Resultado do Disparo",
  };

  const footer = (
    <div className="flex items-center justify-between gap-3">
      <div>
        {view === "form" && (
          <Button variant="ghost" size="sm" onClick={() => setView("list")}>
            Voltar
          </Button>
        )}
        {view === "result" && (
          <Button variant="ghost" size="sm" onClick={() => setView("list")}>
            Voltar
          </Button>
        )}
      </div>
      <div className="flex gap-2">
        {view === "list" && (
          <>
            <Button variant="ghost" size="sm" onClick={onClose}>Fechar</Button>
            <Button variant="primary" size="sm" onClick={openCreate} icon={<Plus size={14} />}>
              Novo Disparo
            </Button>
          </>
        )}
        {view === "form" && (
          <>
            <Button variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
            <Button variant="primary" size="sm" onClick={handleSave} disabled={saving} icon={<Check size={14} />}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </>
        )}
        {view === "result" && (
          <Button variant="primary" size="sm" onClick={onClose}>Fechar</Button>
        )}
      </div>
    </div>
  );

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={titles[view]}
      subtitle={view === "list" ? "Gerencie suas cadências de atividades" : undefined}
      size="md"
      footer={footer}
    >
      {view === "list" && renderList()}
      {view === "form" && renderForm()}
      {view === "result" && renderResult()}
    </BaseModal>
  );
};

export default CadenciaModal;
