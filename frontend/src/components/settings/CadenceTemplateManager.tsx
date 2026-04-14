import React, { useState, useEffect } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  ChevronDown,
  ChevronRight,
  GripVertical,
  Power,
  PowerOff,
  Loader2,
  X,
  Save,
  ListOrdered,
} from "lucide-react";
import cadenceService, {
  CadenceTemplate,
  CadenceStep,
  CadenceStepInput,
  CreateTemplateRequest,
  ACTIVITY_TYPE_OPTIONS,
} from "../../services/cadenceService";
import { showSuccess, showError } from "../../utils/toast";
import { useConfirm } from "../../contexts/ConfirmContext";

// ─── Tipos internos ───────────────────────────────────────────────────────────

type View = "list" | "form";

interface StepForm extends CadenceStepInput {
  _key: string; // key único para React
}

const emptyStep = (order: number): StepForm => ({
  _key: `${Date.now()}-${Math.random()}`,
  order,
  day_offset: order,
  activity_type: "call",
  title: "",
  description: "",
  priority: "normal",
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PRIORITY_LABELS: Record<string, string> = {
  normal: "Normal",
  high: "Alta",
  urgent: "Urgente",
};

const PRIORITY_COLORS: Record<string, string> = {
  normal: "bg-blue-500/20 text-blue-300 border-blue-500/40",
  high: "bg-yellow-500/20 text-yellow-300 border-yellow-500/40",
  urgent: "bg-red-500/20 text-red-300 border-red-500/40",
};

const ACTIVITY_COLORS: Record<string, string> = {
  call: "text-blue-400",
  email: "text-orange-400",
  whatsapp: "text-emerald-400",
  task: "text-green-400",
  meeting: "text-purple-400",
  follow_up: "text-yellow-400",
  other: "text-slate-400",
};

// ─── Componente ───────────────────────────────────────────────────────────────

const CadenceTemplateManager: React.FC = () => {
  const { confirm } = useConfirm();
  const [view, setView] = useState<View>("list");
  const [templates, setTemplates] = useState<CadenceTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Form state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formActive, setFormActive] = useState(true);
  const [formSteps, setFormSteps] = useState<StepForm[]>([emptyStep(1)]);

  // ── Load ────────────────────────────────────────────────────────────────────

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const data = await cadenceService.listTemplates();
      setTemplates(data);
    } catch {
      showError("Erro ao carregar templates de cadência.");
    } finally {
      setLoading(false);
    }
  };

  // ── Form helpers ─────────────────────────────────────────────────────────────

  const openCreate = () => {
    setEditingId(null);
    setFormName("");
    setFormDescription("");
    setFormActive(true);
    setFormSteps([emptyStep(1)]);
    setView("form");
  };

  const openEdit = (t: CadenceTemplate) => {
    setEditingId(t.id);
    setFormName(t.name);
    setFormDescription(t.description || "");
    setFormActive(t.is_active);
    setFormSteps(
      t.steps.map((s) => ({
        _key: `${s.id}`,
        order: s.order,
        day_offset: s.day_offset,
        activity_type: s.activity_type,
        title: s.title,
        description: s.description || "",
        priority: s.priority,
      }))
    );
    setView("form");
  };

  const addStep = () => {
    const nextOrder = formSteps.length + 1;
    const lastDayOffset = formSteps[formSteps.length - 1]?.day_offset ?? 0;
    setFormSteps((prev) => [
      ...prev,
      { ...emptyStep(nextOrder), day_offset: lastDayOffset + 2 },
    ]);
  };

  const removeStep = (key: string) => {
    setFormSteps((prev) =>
      prev
        .filter((s) => s._key !== key)
        .map((s, i) => ({ ...s, order: i + 1 }))
    );
  };

  const updateStep = (key: string, field: keyof StepForm, value: string | number) => {
    setFormSteps((prev) =>
      prev.map((s) => (s._key === key ? { ...s, [field]: value } : s))
    );
  };

  // ── Save ────────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!formName.trim()) {
      showError("Informe um nome para o template.");
      return;
    }
    if (formSteps.length === 0) {
      showError("Adicione pelo menos uma etapa.");
      return;
    }
    for (const s of formSteps) {
      if (!s.title.trim()) {
        showError(`A etapa ${s.order} precisa de um título.`);
        return;
      }
      if (s.day_offset < 1) {
        showError(`A etapa ${s.order} precisa ter dia ≥ 1.`);
        return;
      }
    }

    setSaving(true);
    try {
      const payload: CreateTemplateRequest = {
        name: formName.trim(),
        description: formDescription.trim() || undefined,
        is_active: formActive,
        steps: formSteps.map(({ _key, ...s }) => s),
      };

      if (editingId) {
        const updated = await cadenceService.updateTemplate(editingId, payload);
        setTemplates((prev) => prev.map((t) => (t.id === editingId ? updated : t)));
        showSuccess("Template atualizado!");
      } else {
        const created = await cadenceService.createTemplate(payload);
        setTemplates((prev) => [created, ...prev]);
        showSuccess("Template criado!");
      }
      setView("list");
    } catch (err: any) {
      showError(err?.response?.data?.detail || "Erro ao salvar template.");
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ──────────────────────────────────────────────────────────────────

  const handleDelete = async (t: CadenceTemplate) => {
    const ok = await confirm({
      title: "Excluir template",
      message: `Tem certeza que deseja excluir "${t.name}"? Esta ação não pode ser desfeita.`,
      confirmLabel: "Excluir",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await cadenceService.deleteTemplate(t.id);
      setTemplates((prev) => prev.filter((x) => x.id !== t.id));
      showSuccess("Template excluído.");
    } catch (err: any) {
      showError(err?.response?.data?.detail || "Erro ao excluir template.");
    }
  };

  // ── Toggle active ────────────────────────────────────────────────────────────

  const handleToggleActive = async (t: CadenceTemplate) => {
    try {
      const updated = await cadenceService.updateTemplate(t.id, { is_active: !t.is_active });
      setTemplates((prev) => prev.map((x) => (x.id === t.id ? updated : x)));
    } catch {
      showError("Erro ao alterar status do template.");
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={24} className="animate-spin text-slate-400" />
      </div>
    );
  }

  if (view === "form") {
    return (
      <div className="space-y-6">
        {/* Header do form */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              {editingId ? "Editar Template" : "Novo Template de Cadência"}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Configure o nome e as etapas da cadência. Cada etapa gera uma atividade automaticamente no lead.
            </p>
          </div>
          <button
            onClick={() => setView("list")}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X size={18} />
          </button>
        </div>

        {/* Nome e descrição */}
        <div className="space-y-4 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 p-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
              Nome do template *
            </label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="Ex: Cadência Inbound, Cadência Outbound..."
              className="w-full rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
              Descrição (opcional)
            </label>
            <input
              type="text"
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="Descreva quando usar esta cadência..."
              className="w-full rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setFormActive(!formActive)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
                formActive ? "bg-emerald-500" : "bg-gray-300 dark:bg-slate-600"
              }`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                  formActive ? "translate-x-4" : "translate-x-1"
                }`}
              />
            </button>
            <span className="text-sm text-slate-600 dark:text-slate-400">
              {formActive ? "Ativo — aparece para os SDRs" : "Inativo — oculto para os SDRs"}
            </span>
          </div>
        </div>

        {/* Etapas */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Etapas da cadência ({formSteps.length})
            </h4>
            <button
              onClick={addStep}
              className="flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-400 hover:bg-emerald-500/20"
            >
              <Plus size={13} />
              Adicionar etapa
            </button>
          </div>

          <div className="space-y-3">
            {formSteps.map((step, idx) => (
              <div
                key={step._key}
                className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4"
              >
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <GripVertical size={14} className="text-slate-400" />
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      Etapa {step.order}
                    </span>
                  </div>
                  {formSteps.length > 1 && (
                    <button
                      onClick={() => removeStep(step._key)}
                      className="rounded p-1 text-slate-400 hover:bg-red-500/10 hover:text-red-400"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  {/* Dia útil */}
                  <div>
                    <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Dia útil *</label>
                    <input
                      type="number"
                      min={1}
                      value={step.day_offset}
                      onChange={(e) => updateStep(step._key, "day_offset", parseInt(e.target.value) || 1)}
                      className="w-full rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  {/* Tipo */}
                  <div>
                    <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Tipo *</label>
                    <select
                      value={step.activity_type}
                      onChange={(e) => updateStep(step._key, "activity_type", e.target.value)}
                      className="w-full rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
                    >
                      {ACTIVITY_TYPE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Prioridade */}
                  <div>
                    <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Prioridade</label>
                    <select
                      value={step.priority}
                      onChange={(e) => updateStep(step._key, "priority", e.target.value)}
                      className="w-full rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
                    >
                      <option value="normal">Normal</option>
                      <option value="high">Alta</option>
                      <option value="urgent">Urgente</option>
                    </select>
                  </div>

                  {/* Título */}
                  <div className="col-span-2 md:col-span-4">
                    <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Título da atividade *</label>
                    <input
                      type="text"
                      value={step.title}
                      onChange={(e) => updateStep(step._key, "title", e.target.value)}
                      placeholder="Ex: Warm Call Manhã, Cold Mail, Msg WhatsApp..."
                      className="w-full rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  {/* Descrição/instrução */}
                  <div className="col-span-2 md:col-span-4">
                    <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">
                      Instrução para o SDR (opcional)
                    </label>
                    <input
                      type="text"
                      value={step.description}
                      onChange={(e) => updateStep(step._key, "description", e.target.value)}
                      placeholder="Ex: Ligar no período da manhã, antes das 11h..."
                      className="w-full rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-gray-200 dark:border-slate-700 pt-4">
          <button
            onClick={() => setView("list")}
            className="rounded-lg border border-gray-200 dark:border-slate-700 px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            {editingId ? "Salvar alterações" : "Criar template"}
          </button>
        </div>
      </div>
    );
  }

  // ── List view ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="mb-1 text-xl font-semibold text-slate-900 dark:text-white">Templates de Cadência</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Configure sequências de atividades automáticas para leads. Os SDRs escolhem o template ao iniciar uma cadência em um card.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus size={16} />
          Novo Template
        </button>
      </div>

      {templates.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 dark:border-slate-700 py-16 text-center">
          <ListOrdered size={32} className="mb-3 text-slate-300 dark:text-slate-600" />
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Nenhum template criado ainda</p>
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
            Crie um template para que os SDRs possam iniciar cadências nos leads.
          </p>
          <button
            onClick={openCreate}
            className="mt-4 flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus size={16} />
            Criar primeiro template
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map((t) => (
            <div
              key={t.id}
              className={`rounded-xl border transition-colors ${
                t.is_active
                  ? "border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  : "border-gray-200 dark:border-slate-700/50 bg-gray-50 dark:bg-slate-800/30 opacity-60"
              }`}
            >
              {/* Header do card */}
              <div className="flex items-center gap-3 p-4">
                <button
                  onClick={() => setExpandedId(expandedId === t.id ? null : t.id)}
                  className="flex flex-1 items-center gap-3 text-left"
                >
                  {expandedId === t.id ? (
                    <ChevronDown size={16} className="flex-shrink-0 text-slate-400" />
                  ) : (
                    <ChevronRight size={16} className="flex-shrink-0 text-slate-400" />
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-900 dark:text-white">{t.name}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        t.is_active
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "bg-slate-500/20 text-slate-400"
                      }`}>
                        {t.is_active ? "Ativo" : "Inativo"}
                      </span>
                    </div>
                    {t.description && (
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{t.description}</p>
                    )}
                    <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
                      {t.steps.length} etapa{t.steps.length !== 1 ? "s" : ""} •{" "}
                      {t.steps.length > 0 ? `até o dia útil ${Math.max(...t.steps.map((s) => s.day_offset))}` : ""}
                    </p>
                  </div>
                </button>

                {/* Ações */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleToggleActive(t)}
                    title={t.is_active ? "Desativar" : "Ativar"}
                    className="rounded-lg p-2 text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700"
                  >
                    {t.is_active ? <PowerOff size={15} /> : <Power size={15} />}
                  </button>
                  <button
                    onClick={() => openEdit(t)}
                    className="rounded-lg p-2 text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700"
                  >
                    <Edit2 size={15} />
                  </button>
                  <button
                    onClick={() => handleDelete(t)}
                    className="rounded-lg p-2 text-slate-400 hover:bg-red-500/10 hover:text-red-400"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              {/* Etapas expandidas */}
              {expandedId === t.id && t.steps.length > 0 && (
                <div className="border-t border-gray-100 dark:border-slate-700 px-4 pb-4 pt-3">
                  <div className="space-y-2">
                    {t.steps.map((step) => (
                      <div
                        key={step.id}
                        className="flex items-center gap-3 rounded-lg bg-gray-50 dark:bg-slate-900/50 px-3 py-2"
                      >
                        <span className="w-16 flex-shrink-0 text-xs font-medium text-slate-400">
                          Dia {step.day_offset}
                        </span>
                        <span className={`text-xs font-medium ${ACTIVITY_COLORS[step.activity_type] || "text-slate-400"}`}>
                          {ACTIVITY_TYPE_OPTIONS.find((o) => o.value === step.activity_type)?.label ?? step.activity_type}
                        </span>
                        <span className="flex-1 truncate text-sm text-slate-700 dark:text-slate-300">{step.title}</span>
                        <span className={`rounded border px-1.5 py-0.5 text-xs ${PRIORITY_COLORS[step.priority] || PRIORITY_COLORS.normal}`}>
                          {PRIORITY_LABELS[step.priority] ?? step.priority}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CadenceTemplateManager;
