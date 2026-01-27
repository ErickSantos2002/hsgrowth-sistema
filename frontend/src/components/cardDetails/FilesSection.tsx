import React from "react";
import { Paperclip, Upload, FileText, Image, FileSpreadsheet, AlertCircle } from "lucide-react";

/**
 * Seção de Arquivos - Em desenvolvimento
 * Placeholder para funcionalidade futura de upload e gerenciamento de arquivos
 */
const FilesSection: React.FC = () => {
  return (
    <div className="space-y-4">
      {/* Estado em desenvolvimento */}
      <div className="p-8 bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-2 border-dashed border-slate-700 rounded-lg">
        <div className="text-center space-y-4">
          {/* Ícone */}
          <div className="relative inline-block">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center">
              <Paperclip size={32} className="text-cyan-400" />
            </div>
            <div className="absolute -top-1 -right-1 w-6 h-6 bg-cyan-500 rounded-full flex items-center justify-center">
              <Upload size={12} className="text-slate-900" />
            </div>
          </div>

          {/* Título */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-1">
              Gerenciamento de Arquivos
            </h3>
            <p className="text-sm text-slate-400">
              Funcionalidade em desenvolvimento
            </p>
          </div>

          {/* Descrição */}
          <div className="max-w-md mx-auto space-y-2">
            <p className="text-sm text-slate-300">
              Em breve você poderá anexar e gerenciar documentos, propostas, contratos e outros arquivos importantes:
            </p>

            {/* Tipos de arquivo suportados */}
            <div className="grid grid-cols-3 gap-2 mt-4">
              <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                <FileText size={20} className="text-blue-400 mb-1 mx-auto" />
                <p className="text-xs font-medium text-white">PDF / DOC</p>
              </div>
              <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                <Image size={20} className="text-green-400 mb-1 mx-auto" />
                <p className="text-xs font-medium text-white">Imagens</p>
              </div>
              <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                <FileSpreadsheet size={20} className="text-emerald-400 mb-1 mx-auto" />
                <p className="text-xs font-medium text-white">Planilhas</p>
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
                <div className="w-1 h-1 bg-cyan-400 rounded-full" />
                Upload por drag & drop
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1 h-1 bg-cyan-400 rounded-full" />
                Visualização inline de PDFs e imagens
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1 h-1 bg-cyan-400 rounded-full" />
                Versionamento de documentos
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1 h-1 bg-cyan-400 rounded-full" />
                Compartilhamento com clientes
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1 h-1 bg-cyan-400 rounded-full" />
                Busca por conteúdo (OCR)
              </li>
            </ul>
          </div>

          {/* Área de upload mockada */}
          <div className="mt-4 p-6 border-2 border-dashed border-slate-700 rounded-lg bg-slate-800/30">
            <Upload size={24} className="text-slate-600 mx-auto mb-2" />
            <p className="text-sm text-slate-500">
              Arraste arquivos aqui ou clique para selecionar
            </p>
            <p className="text-xs text-slate-600 mt-1">
              (Disponível em breve)
            </p>
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

export default FilesSection;
