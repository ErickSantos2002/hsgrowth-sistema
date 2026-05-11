import React, { useState, useRef, useCallback } from "react";
import {
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  X,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Eye,
} from "lucide-react";
import BaseModal from "../common/BaseModal";
import cardService from "../../services/cardService";
import { CardImportRowResult } from "../../types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

type Step = "instructions" | "upload" | "preview" | "result";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const ImportCardsModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [step, setStep] = useState<Step>("instructions");
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<{
    total: number;
    created: number;
    errors: number;
    rows: CardImportRowResult[];
  } | null>(null);
  const [results, setResults] = useState<{
    total: number;
    created: number;
    errors: number;
    rows: CardImportRowResult[];
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClose = () => {
    setStep("instructions");
    setFile(null);
    setFileError(null);
    setPreviewData(null);
    setResults(null);
    setLoading(false);
    onClose();
  };

  const validateFile = (f: File): string | null => {
    if (!f.name.toLowerCase().endsWith(".xlsx") && !f.name.toLowerCase().endsWith(".xls")) {
      return "Apenas arquivos .xlsx são aceitos.";
    }
    if (f.size > MAX_FILE_SIZE) {
      return "Arquivo muito grande. Tamanho máximo: 5 MB.";
    }
    return null;
  };

  const handleFileSelect = (f: File) => {
    const error = validateFile(f);
    if (error) {
      setFileError(error);
      setFile(null);
    } else {
      setFileError(null);
      setFile(f);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) handleFileSelect(dropped);
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = () => setDragging(false);

  const handleDownloadTemplate = async () => {
    setDownloadingTemplate(true);
    try {
      await cardService.downloadImportTemplate();
    } catch {
      // silently fail
    } finally {
      setDownloadingTemplate(false);
    }
  };

  const handlePreview = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const res = await cardService.previewImport(file);
      setPreviewData({
        total: res.total,
        created: res.created,
        errors: res.errors,
        rows: res.results,
      });
      setStep("preview");
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail ||
        "Erro inesperado ao processar a planilha. Verifique o arquivo e tente novamente.";
      setPreviewData({
        total: 0,
        created: 0,
        errors: 1,
        rows: [{ row: 0, status: "error", card_id: null, title: null, message: msg }],
      });
      setStep("preview");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const res = await cardService.importCards(file);
      setResults({
        total: res.total,
        created: res.created,
        errors: res.errors,
        rows: res.results,
      });
      setStep("result");
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail ||
        "Erro inesperado ao importar. Tente novamente.";
      setResults({
        total: 0,
        created: 0,
        errors: 1,
        rows: [{ row: 0, status: "error", card_id: null, title: null, message: msg }],
      });
      setStep("result");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setStep("upload");
    setFile(null);
    setFileError(null);
    setPreviewData(null);
    setResults(null);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // ─── Results table (shared between preview and result) ────────────────────

  const ResultsTable = ({ data, isPreview }: { data: typeof previewData; isPreview: boolean }) =>
    data ? (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center dark:border-slate-700 dark:bg-slate-800/50">
            <p className="text-2xl font-bold text-slate-800 dark:text-white">{data.total}</p>
            <p className="text-xs text-slate-500">Total</p>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-center dark:border-emerald-800/40 dark:bg-emerald-900/20">
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{data.created}</p>
            <p className="text-xs text-emerald-600 dark:text-emerald-400">
              {isPreview ? "Serão criados" : "Criados"}
            </p>
          </div>
          <div
            className={`rounded-xl border p-3 text-center ${
              data.errors > 0
                ? "border-red-200 bg-red-50 dark:border-red-800/40 dark:bg-red-900/20"
                : "border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50"
            }`}
          >
            <p
              className={`text-2xl font-bold ${
                data.errors > 0 ? "text-red-600 dark:text-red-400" : "text-slate-400"
              }`}
            >
              {data.errors}
            </p>
            <p
              className={`text-xs ${
                data.errors > 0 ? "text-red-600 dark:text-red-400" : "text-slate-500"
              }`}
            >
              Erros
            </p>
          </div>
        </div>

        {isPreview && data.errors > 0 && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-400">
            <AlertCircle size={14} className="mt-0.5 shrink-0" />
            <span>
              Existem linhas com erro. Você pode confirmar a importação assim mesmo (as linhas com erro
              serão ignoradas) ou voltar e corrigir o arquivo antes de importar.
            </span>
          </div>
        )}

        <div className="max-h-64 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">Linha</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">Título</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">Status</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">Mensagem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {data.rows.map((r, idx) => (
                <tr key={idx} className="bg-white dark:bg-slate-900">
                  <td className="px-3 py-2 text-slate-500">{r.row || "—"}</td>
                  <td className="max-w-[160px] truncate px-3 py-2 text-slate-700 dark:text-slate-300">
                    {r.title || "—"}
                  </td>
                  <td className="px-3 py-2">
                    {r.status === "success" ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                        <CheckCircle size={11} /> {isPreview ? "OK" : "Criado"}
                      </span>
                    ) : r.status === "skipped" ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500 dark:bg-slate-700 dark:text-slate-400">
                        — Ignorado
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/40 dark:text-red-400">
                        <XCircle size={11} /> Erro
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-500 dark:text-slate-400">{r.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    ) : null;

  // ─── Footer por etapa ────────────────────────────────────────────────────────

  const footerInstructions = (
    <div className="flex w-full items-center justify-between">
      <button
        onClick={handleClose}
        className="rounded-lg px-4 py-2 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
      >
        Cancelar
      </button>
      <button
        onClick={() => setStep("upload")}
        className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        Próximo <ArrowRight size={16} />
      </button>
    </div>
  );

  const footerUpload = (
    <div className="flex w-full items-center justify-between">
      <button
        onClick={() => setStep("instructions")}
        className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
      >
        <ArrowLeft size={16} /> Voltar
      </button>
      <button
        onClick={handlePreview}
        disabled={!file || loading}
        className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Analisando...
          </>
        ) : (
          <>
            <Eye size={16} />
            Analisar Prévia
          </>
        )}
      </button>
    </div>
  );

  const footerPreview = (
    <div className="flex w-full items-center justify-between">
      <button
        onClick={() => setStep("upload")}
        className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
      >
        <ArrowLeft size={16} /> Voltar e corrigir
      </button>
      <button
        onClick={handleConfirmImport}
        disabled={loading || (previewData?.created ?? 0) === 0}
        className="flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Importando...
          </>
        ) : (
          <>
            <CheckCircle size={16} />
            Confirmar Importação
          </>
        )}
      </button>
    </div>
  );

  const footerResult = (
    <div className="flex w-full items-center justify-between">
      <button
        onClick={handleReset}
        className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
      >
        <RotateCcw size={16} /> Importar outro
      </button>
      <button
        onClick={handleClose}
        className="flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-700"
      >
        <CheckCircle size={16} /> Concluir
      </button>
    </div>
  );

  const footer =
    step === "instructions"
      ? footerInstructions
      : step === "upload"
      ? footerUpload
      : step === "preview"
      ? footerPreview
      : footerResult;

  // ─── Stepper visual ──────────────────────────────────────────────────────────

  const steps = [
    { key: "instructions", label: "Instruções" },
    { key: "upload", label: "Upload" },
    { key: "preview", label: "Prévia" },
    { key: "result", label: "Resultado" },
  ];
  const currentIdx = steps.findIndex((s) => s.key === step);

  const Stepper = (
    <div className="mb-6 flex items-center justify-center gap-0">
      {steps.map((s, i) => (
        <React.Fragment key={s.key}>
          <div className="flex flex-col items-center">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                i < currentIdx
                  ? "bg-emerald-500 text-white"
                  : i === currentIdx
                  ? "bg-blue-600 text-white"
                  : "bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400"
              }`}
            >
              {i < currentIdx ? <CheckCircle size={16} /> : i + 1}
            </div>
            <span className="mt-1 text-xs text-slate-500 dark:text-slate-400">{s.label}</span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={`mb-5 h-0.5 w-12 transition-colors ${
                i < currentIdx ? "bg-emerald-400" : "bg-slate-200 dark:bg-slate-700"
              }`}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );

  // ─── Conteúdo por etapa ──────────────────────────────────────────────────────

  const StepInstructions = (
    <div className="space-y-4">
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-800/40 dark:bg-blue-900/20">
        <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
          Todos os cards importados serão criados em{" "}
          <span className="font-bold">Lead Novo</span> do board{" "}
          <span className="font-bold">Prospecção</span>.
        </p>
      </div>

      <div className="space-y-3">
        {[
          {
            num: "1",
            title: "Baixe o modelo",
            desc: "Clique no botão abaixo para baixar a planilha modelo no formato .xlsx.",
          },
          {
            num: "2",
            title: "Preencha os dados",
            desc: "Preencha as colunas com as informações dos leads. Clientes e contatos serão criados e vinculados automaticamente.",
          },
          {
            num: "3",
            title: "Analise a prévia",
            desc: "Antes de criar os cards, o sistema mostrará uma prévia com o que será criado e os erros encontrados.",
          },
          {
            num: "4",
            title: "Confirme a importação",
            desc: "Se estiver tudo certo, confirme. Erros em linhas individuais não cancelam as demais.",
          },
        ].map((item) => (
          <div key={item.num} className="flex gap-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
              {item.num}
            </div>
            <div>
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{item.title}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={handleDownloadTemplate}
        disabled={downloadingTemplate}
        className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-emerald-400 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-60 dark:border-emerald-600/50 dark:bg-emerald-900/20 dark:text-emerald-400 dark:hover:bg-emerald-900/30"
      >
        {downloadingTemplate ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <Download size={16} />
        )}
        Baixar Modelo .xlsx
      </button>
    </div>
  );

  const StepUpload = (
    <div className="space-y-4">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 transition-colors ${
          dragging
            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
            : file
            ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20"
            : "border-slate-300 bg-slate-50 hover:border-slate-400 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800/50 dark:hover:border-slate-500"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFileSelect(f);
          }}
        />

        {file ? (
          <>
            <FileSpreadsheet size={40} className="text-emerald-500" />
            <div className="text-center">
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{file.name}</p>
              <p className="text-xs text-slate-500">{formatFileSize(file.size)}</p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setFile(null);
                setFileError(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700"
            >
              <X size={12} /> Remover
            </button>
          </>
        ) : (
          <>
            <Upload size={36} className="text-slate-400" />
            <div className="text-center">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Arraste o arquivo aqui ou clique para selecionar
              </p>
              <p className="text-xs text-slate-400">Apenas .xlsx — máximo 5 MB</p>
            </div>
          </>
        )}
      </div>

      {fileError && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800/40 dark:bg-red-900/20 dark:text-red-400">
          <AlertCircle size={16} className="shrink-0" />
          {fileError}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center gap-2 py-2 text-sm text-slate-500">
          <Loader2 size={16} className="animate-spin" />
          Analisando planilha...
        </div>
      )}
    </div>
  );

  const StepPreview = (
    <div className="space-y-3">
      <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 dark:border-blue-800/40 dark:bg-blue-900/20">
        <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
          Prévia — nenhum card foi criado ainda. Confirme para importar.
        </p>
      </div>
      <ResultsTable data={previewData} isPreview={true} />
    </div>
  );

  const StepResult = (
    <div className="space-y-3">
      <ResultsTable data={results} isPreview={false} />
    </div>
  );

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Importar Cards em Lote"
      subtitle="Crie múltiplos cards de uma vez via planilha Excel"
      size="lg"
      footer={footer}
    >
      {Stepper}
      {step === "instructions" && StepInstructions}
      {step === "upload" && StepUpload}
      {step === "preview" && StepPreview}
      {step === "result" && StepResult}
    </BaseModal>
  );
};

export default ImportCardsModal;
