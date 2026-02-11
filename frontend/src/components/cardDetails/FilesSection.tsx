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
      <div className="rounded-lg border-2 border-dashed border-slate-700 bg-gradient-to-br from-slate-800/50 to-slate-900/50 p-8">
        <div className="space-y-4 text-center">
          {/* Ícone */}
          <div className="relative inline-block">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-500/20">
              <Paperclip size={32} className="text-cyan-400" />
            </div>
            <div className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-cyan-500">
              <Upload size={12} className="text-slate-900" />
            </div>
          </div>

          {/* Título */}
          <div>
            <h3 className="mb-1 text-lg font-semibold text-white">
              Gerenciamento de Arquivos
            </h3>
            <p className="text-sm text-slate-400">
              Funcionalidade em desenvolvimento
            </p>
          </div>

          {/* Descrição */}
          <div className="mx-auto max-w-md space-y-2">
            <p className="text-sm text-slate-300">
              Em breve você poderá anexar e gerenciar documentos, propostas, contratos e outros arquivos importantes:
            </p>

            {/* Tipos de arquivo suportados */}
            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-3">
                <FileText size={20} className="mx-auto mb-1 text-blue-400" />
                <p className="text-xs font-medium text-white">PDF / DOC</p>
              </div>
              <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-3">
                <Image size={20} className="mx-auto mb-1 text-green-400" />
                <p className="text-xs font-medium text-white">Imagens</p>
              </div>
              <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-3">
                <FileSpreadsheet size={20} className="mx-auto mb-1 text-emerald-400" />
                <p className="text-xs font-medium text-white">Planilhas</p>
              </div>
            </div>
          </div>

          {/* Recursos planejados */}
          <div className="mt-6 rounded-lg border border-slate-700 bg-slate-900/50 p-4 text-left">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Recursos Planejados:
            </p>
            <ul className="space-y-1.5 text-xs text-slate-300">
              <li className="flex items-center gap-2">
                <div className="h-1 w-1 rounded-full bg-cyan-400" />
                Upload por drag & drop
              </li>
              <li className="flex items-center gap-2">
                <div className="h-1 w-1 rounded-full bg-cyan-400" />
                Visualização inline de PDFs e imagens
              </li>
              <li className="flex items-center gap-2">
                <div className="h-1 w-1 rounded-full bg-cyan-400" />
                Versionamento de documentos
              </li>
              <li className="flex items-center gap-2">
                <div className="h-1 w-1 rounded-full bg-cyan-400" />
                Compartilhamento com clientes
              </li>
              <li className="flex items-center gap-2">
                <div className="h-1 w-1 rounded-full bg-cyan-400" />
                Busca por conteúdo (OCR)
              </li>
            </ul>
          </div>

          {/* Área de upload mockada */}
          <div className="mt-4 rounded-lg border-2 border-dashed border-slate-700 bg-slate-800/30 p-6">
            <Upload size={24} className="mx-auto mb-2 text-slate-600" />
            <p className="text-sm text-slate-500">
              Arraste arquivos aqui ou clique para selecionar
            </p>
            <p className="mt-1 text-xs text-slate-600">
              (Disponível em breve)
            </p>
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

export default FilesSection;
