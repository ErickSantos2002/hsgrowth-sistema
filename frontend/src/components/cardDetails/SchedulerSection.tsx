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
      <div className="p-8 bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-2 border-dashed border-slate-700 rounded-lg">
        <div className="text-center space-y-4">
          {/* Ícone */}
          <div className="relative inline-block">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
              <Calendar size={32} className="text-blue-400" />
            </div>
            <div className="absolute -top-1 -right-1 w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center">
              <Clock size={12} className="text-slate-900" />
            </div>
          </div>

          {/* Título */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-1">
              Agendador de Reuniões
            </h3>
            <p className="text-sm text-slate-400">
              Funcionalidade em desenvolvimento
            </p>
          </div>

          {/* Descrição */}
          <div className="max-w-md mx-auto space-y-2">
            <p className="text-sm text-slate-300">
              Em breve você poderá agendar reuniões diretamente do card, com integração a:
            </p>

            <div className="grid grid-cols-2 gap-2 mt-4">
              <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                <Calendar size={20} className="text-blue-400 mb-1" />
                <p className="text-xs font-medium text-white">Google Calendar</p>
              </div>
              <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                <Users size={20} className="text-purple-400 mb-1" />
                <p className="text-xs font-medium text-white">Microsoft Teams</p>
              </div>
            </div>
          </div>

          {/* Recursos planejados */}
          <div className="mt-6 p-4 bg-slate-900/50 rounded-lg border border-slate-700 text-left">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
              Recursos Planejados:
            </p>
            <ul className="space-y-1.5 text-xs text-slate-300">
              <li className="flex items-center gap-2">
                <div className="w-1 h-1 bg-blue-400 rounded-full" />
                Agendamento com disponibilidade automática
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1 h-1 bg-blue-400 rounded-full" />
                Convites automáticos por email
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1 h-1 bg-blue-400 rounded-full" />
                Link de videoconferência integrado
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1 h-1 bg-blue-400 rounded-full" />
                Lembretes automáticos para participantes
              </li>
            </ul>
          </div>

          {/* Badge de status */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-yellow-500/20 border border-yellow-500/30 rounded-full">
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
