import React from "react";
import { Calendar, Clock, Users, AlertCircle } from "lucide-react";

/**
 * Seção de Agendador de Reuniões - Em desenvolvimento
 * Placeholder para funcionalidade futura
 */
const SchedulerSection: React.FC = () => {
  return (
    <div className="space-y-4">
      {/* Estado em desenvolvimento */}
      <div className="rounded-lg border-2 border-dashed border-gray-200 dark:border-slate-700 bg-gradient-to-br from-slate-800/50 to-slate-900/50 p-8">
        <div className="space-y-4 text-center">
          {/* Ícone */}
          <div className="relative inline-block">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20">
              <Calendar size={32} className="text-blue-400" />
            </div>
            <div className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-yellow-500">
              <Clock size={12} className="text-slate-900" />
            </div>
          </div>

          {/* Título */}
          <div>
            <h3 className="mb-1 text-lg font-semibold text-slate-900 dark:text-white">
              Agendador de Reuniões
            </h3>
            <p className="text-sm text-slate-400 dark:text-slate-400">
              Funcionalidade em desenvolvimento
            </p>
          </div>

          {/* Descrição */}
          <div className="mx-auto max-w-md space-y-2">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Em breve você poderá agendar reuniões diretamente do card, com integração a:
            </p>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-100/50 dark:bg-slate-800/50 p-3">
                <Calendar size={20} className="mb-1 text-blue-400" />
                <p className="text-xs font-medium text-slate-900 dark:text-white">Google Calendar</p>
              </div>
              <div className="rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-100/50 dark:bg-slate-800/50 p-3">
                <Users size={20} className="mb-1 text-purple-400" />
                <p className="text-xs font-medium text-slate-900 dark:text-white">Microsoft Teams</p>
              </div>
            </div>
          </div>

          {/* Recursos planejados */}
          <div className="mt-6 rounded-lg border border-gray-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 p-4 text-left">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-400">
              Recursos Planejados:
            </p>
            <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
              <li className="flex items-center gap-2">
                <div className="h-1 w-1 rounded-full bg-blue-400" />
                Agendamento com disponibilidade automática
              </li>
              <li className="flex items-center gap-2">
                <div className="h-1 w-1 rounded-full bg-blue-400" />
                Convites automáticos por email
              </li>
              <li className="flex items-center gap-2">
                <div className="h-1 w-1 rounded-full bg-blue-400" />
                Link de videoconferência integrado
              </li>
              <li className="flex items-center gap-2">
                <div className="h-1 w-1 rounded-full bg-blue-400" />
                Lembretes automáticos para participantes
              </li>
            </ul>
          </div>

          {/* Badge de status */}
          <div className="inline-flex items-center gap-2 rounded-full border border-yellow-500/30 bg-yellow-500/20 px-3 py-1.5">
            <AlertCircle size={14} className="text-yellow-400" />
            <span className="text-xs font-medium text-yellow-300">
              Previsão: Próxima Sprint
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SchedulerSection;
