import { useEffect, useRef, useState } from "react";
import { Download, FileText, Upload } from "lucide-react";
import { Button, FormField, Input } from "../common";
import { showError, showSuccess } from "../../utils/toast";
import parceriasService, { Parceiro, apiDeAtividades, mensagemDeErro } from "../../services/parceriasService";

interface Props {
  parceiro: Parceiro;
  podeEditar: boolean;
  onParceiro: (p: Parceiro) => void;
}

/**
 * Aba "Contrato" do parceiro: data e arquivo do contrato assinado.
 * Os dois são exigidos para sair de Formalização; o arquivo também fica no histórico.
 */
export default function ContratoDoParceiro({ parceiro, podeEditar, onParceiro }: Props) {
  const [data, setData] = useState(parceiro.contract_date ?? "");
  const [salvando, setSalvando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const arquivo = useRef<HTMLInputElement>(null);

  useEffect(() => setData(parceiro.contract_date ?? ""), [parceiro.contract_date]);

  const salvarData = async () => {
    setSalvando(true);
    try {
      onParceiro(await parceriasService.atualizarParceiro(parceiro.id, { contract_date: data || null }));
      showSuccess("Data do contrato salva.");
    } catch (err) {
      showError(mensagemDeErro(err, "Erro ao salvar a data do contrato."));
    } finally {
      setSalvando(false);
    }
  };

  const anexar = async (file?: File) => {
    if (!file) return;
    setEnviando(true);
    try {
      onParceiro(await parceriasService.anexarContrato(parceiro.id, file));
      showSuccess("Contrato anexado.");
    } catch (err) {
      showError(mensagemDeErro(err, "Erro ao anexar o contrato."));
    } finally {
      setEnviando(false);
      if (arquivo.current) arquivo.current.value = "";
    }
  };

  const baixar = () => {
    if (parceiro.contract_activity_id == null) return;
    apiDeAtividades({ tipo: "parceiro", id: parceiro.id })
      .downloadFile(parceiro.contract_activity_id, parceiro.contract_file_name ?? "contrato")
      .catch((err) => showError(mensagemDeErro(err, "Erro ao baixar o contrato.")));
  };

  const temArquivo = parceiro.contract_activity_id != null && !!parceiro.contract_file_name;
  const completo = temArquivo && !!parceiro.contract_date;

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500 dark:text-slate-400">
        {completo
          ? "Contrato assinado registrado."
          : "Para passar de Formalização para Onboarding, anexe o contrato assinado e preencha a data."}
      </p>

      <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 dark:border-slate-700/50 dark:bg-slate-800/30">
        <FormField label="Data do contrato">
          <div className="flex items-center gap-2">
            <Input type="date" value={data} disabled={!podeEditar} onChange={(e) => setData(e.target.value)} />
            {podeEditar && data !== (parceiro.contract_date ?? "") && (
              <Button size="sm" onClick={salvarData} loading={salvando}>Salvar</Button>
            )}
          </div>
        </FormField>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 dark:border-slate-700/50 dark:bg-slate-800/30">
        <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">Contrato assinado</p>
        {temArquivo ? (
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2 text-sm text-slate-900 dark:text-white">
              <FileText size={18} className="shrink-0 text-emerald-500" />
              <span className="truncate">{parceiro.contract_file_name}</span>
            </div>
            <Button size="sm" variant="secondary" icon={<Download size={14} />} onClick={baixar}>
              Baixar
            </Button>
          </div>
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">Nenhum contrato anexado.</p>
        )}
        {podeEditar && (
          <>
            <input ref={arquivo} type="file" className="hidden" onChange={(e) => anexar(e.target.files?.[0])} />
            <Button size="sm" className="mt-3" icon={<Upload size={14} />} onClick={() => arquivo.current?.click()} loading={enviando}>
              {temArquivo ? "Trocar contrato" : "Anexar contrato"}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
