import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format,
  isSameMonth, isToday, startOfMonth, startOfWeek, subMonths,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ArrowLeft, Calendar as CalendarIcon, ChevronLeft, ChevronRight, ExternalLink, Loader2, X,
} from "lucide-react";
import serviceActivityService, { ServiceActivityOverviewItem } from "../services/serviceActivityService";
import { TYPE_CONFIG, WEEK_DAYS } from "../constants/cardTaskConfig";
import type { TaskType } from "../constants/cardTaskConfig";
import { extractBrazilDateForInput, formatBrazilDateTime } from "../utils/timezone";

/**
 * Calendário do módulo de SERVIÇO.
 * Mostra as atividades agendadas de todos os cards de serviço — sem divisão
 * por responsável: todos veem as atividades de todos.
 */
const ServiceCalendar: React.FC = () => {
  const navigate = useNavigate();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [items, setItems] = useState<ServiceActivityOverviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dayModal, setDayModal] = useState<{ date: string; items: ServiceActivityOverviewItem[] } | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const all = await serviceActivityService.listAll("all");
        setItems(all.filter((it) => !!it.due_date));
      } catch (e) {
        console.error("Erro ao carregar calendário de serviço:", e);
        setItems([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Agrupa atividades por dia (data do Brasil YYYY-MM-DD)
  const byDay = useMemo(() => {
    const map = new Map<string, ServiceActivityOverviewItem[]>();
    for (const it of items) {
      if (!it.due_date) continue;
      const key = extractBrazilDateForInput(it.due_date);
      const arr = map.get(key) || [];
      arr.push(it);
      map.set(key, arr);
    }
    return map;
  }, [items]);

  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const openCard = (it: ServiceActivityOverviewItem) =>
    navigate(`/servicos/${it.board_id}/cards/${it.service_card_id}`);

  const renderPill = (it: ServiceActivityOverviewItem) => {
    const config = TYPE_CONFIG[(it.activity_type as TaskType)] ?? TYPE_CONFIG.other;
    return (
      <button
        key={it.id}
        onClick={() => openCard(it)}
        title={it.title || config.label}
        className={`flex w-full items-center gap-1 truncate rounded border px-1 py-0.5 text-left text-xs transition-all hover:brightness-125 ${config.pillBg} ${config.pillText} ${config.pillBorder} ${it.is_completed ? "opacity-50 line-through" : ""}`}
      >
        <config.Icon size={10} className="flex-shrink-0" />
        <span className="truncate">{it.title || config.label}</span>
      </button>
    );
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/servicos")}
            className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-gray-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-white"
            title="Voltar para os boards de serviço"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/20 text-violet-600 dark:text-violet-400">
            <CalendarIcon size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Calendário de Serviços</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Todas as atividades agendadas da equipe</p>
          </div>
        </div>

        {/* Navegação de mês */}
        <div className="flex items-center gap-2">
          <button onClick={() => setCurrentMonth((m) => subMonths(m, 1))} className="rounded-lg border border-gray-200 p-2 text-slate-500 transition-colors hover:bg-gray-100 dark:border-slate-700 dark:hover:bg-slate-800">
            <ChevronLeft size={18} />
          </button>
          <span className="min-w-[150px] text-center text-sm font-semibold capitalize text-slate-900 dark:text-white">
            {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
          </span>
          <button onClick={() => setCurrentMonth((m) => addMonths(m, 1))} className="rounded-lg border border-gray-200 p-2 text-slate-500 transition-colors hover:bg-gray-100 dark:border-slate-700 dark:hover:bg-slate-800">
            <ChevronRight size={18} />
          </button>
          <button onClick={() => setCurrentMonth(new Date())} className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-gray-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
            Hoje
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center text-slate-400">
          <Loader2 size={28} className="animate-spin" />
        </div>
      ) : (
        <div className="select-none">
          {/* Dias da semana */}
          <div className="mb-1 grid grid-cols-7">
            {WEEK_DAYS.map((d) => (
              <div key={d} className="py-2 text-center text-xs font-medium text-slate-500">{d}</div>
            ))}
          </div>

          {/* Grade */}
          <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-gray-200 bg-gray-200 dark:border-slate-700 dark:bg-slate-700">
            {calendarDays.map((day) => {
              const dayStr = format(day, "yyyy-MM-dd");
              const dayItems = byDay.get(dayStr) || [];
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isTodayDay = isToday(day);
              const visible = dayItems.slice(0, 3);
              const overflow = dayItems.length - 3;

              return (
                <div
                  key={dayStr}
                  className={`min-h-[88px] p-1.5 transition-colors ${isCurrentMonth ? "bg-white dark:bg-slate-900" : "bg-gray-50/80 dark:bg-slate-900/50"}`}
                >
                  <div className="mb-1 flex items-center justify-end">
                    <span className={`flex h-5 w-5 items-center justify-center rounded-full text-xs font-medium ${
                      isTodayDay ? "bg-violet-500 font-bold text-white"
                      : isCurrentMonth ? "text-slate-900 dark:text-slate-200"
                      : "text-slate-400 dark:text-slate-600"
                    }`}>
                      {format(day, "d")}
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    {visible.map((it) => renderPill(it))}
                    {overflow > 0 && (
                      <button
                        type="button"
                        onClick={() => setDayModal({ date: dayStr, items: dayItems })}
                        className="w-full rounded px-1 py-0.5 text-center text-xs text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-slate-300"
                      >
                        +{overflow} mais
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal "ver todas as atividades do dia" */}
      {dayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setDayModal(null)}>
          <div className="max-h-[80vh] w-full max-w-md overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-slate-700">
              <h3 className="font-semibold capitalize text-slate-900 dark:text-white">
                {format(new Date(dayModal.date + "T12:00:00"), "EEEE, d 'de' MMMM", { locale: ptBR })}
              </h3>
              <button onClick={() => setDayModal(null)} className="rounded-lg p-1 text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800">
                <X size={18} />
              </button>
            </div>
            <div className="max-h-[60vh] space-y-2 overflow-y-auto p-4">
              {dayModal.items.map((it) => {
                const config = TYPE_CONFIG[(it.activity_type as TaskType)] ?? TYPE_CONFIG.other;
                return (
                  <button
                    key={it.id}
                    onClick={() => openCard(it)}
                    className="flex w-full items-start gap-2 rounded-lg border border-gray-200 p-2 text-left transition-colors hover:bg-gray-50 dark:border-slate-700 dark:hover:bg-slate-800"
                  >
                    <span className={`mt-0.5 flex-shrink-0 ${config.pillText}`}><config.Icon size={14} /></span>
                    <div className="min-w-0 flex-1">
                      <p className={`truncate text-sm font-medium text-slate-900 dark:text-white ${it.is_completed ? "line-through opacity-60" : ""}`}>
                        {it.title || config.label}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-blue-500 dark:text-blue-400">
                        <ExternalLink size={10} /> {it.card_title}
                      </p>
                      {it.due_date && (
                        <p className="text-xs text-slate-500 dark:text-slate-400">{formatBrazilDateTime(it.due_date)}{it.user_name ? ` • ${it.user_name}` : ""}</p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceCalendar;
