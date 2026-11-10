import { useState } from "react";
import BaseModal from "../common/BaseModal";
import { Button, Input } from "../common";
import { convite, type StatusAcesso } from "../../services/acessosService";
import { mensagemDeErro } from "../../services/parceriasService";
import { showError, showSuccess, showWarning } from "../../utils/toast";

interface Props {
  /** Rota POST do convite (users/{id}/convite, .../acessos/{id}/convite ou .../equipe/{id}/acesso/convite). */
  url: string;
  status?: StatusAcesso | string | null;
  onFeito?: () => void;
}

const botao = "text-xs text-slate-500 hover:text-emerald-500 disabled:opacity-50";

/** Reenviar convite e Copiar link — só aparecem enquanto o convite não foi aceito. */
export default function AcoesDoConvite({ url, status, onFeito }: Props) {
  const [ocupado, setOcupado] = useState(false);
  const [linkManual, setLinkManual] = useState<string | null>(null);

  if (status !== "convite_pendente" && status !== "convite_expirado") return null;

  const reenviar = async () => {
    setOcupado(true);
    try {
      const r = await convite(url, true);
      if (r.email_enviado) showSuccess("Convite reenviado");
      else showWarning("Não conseguimos enviar o e-mail. Use Copiar link.");
      onFeito?.();
    } catch (err) {
      showError(mensagemDeErro(err, "Erro ao reenviar o convite."));
    } finally {
      setOcupado(false);
    }
  };

  const copiar = async () => {
    setOcupado(true);
    try {
      const r = await convite(url, false);
      onFeito?.();
      if (!r.link) { showError("O servidor não devolveu o link."); return; }
      try {
        await navigator.clipboard.writeText(r.link);
        showSuccess("Link copiado. Ele vale 7 dias e só pode ser usado uma vez.");
      } catch {
        // clipboard indisponível (ex.: http em homologação): mostra o link para copiar na mão
        setLinkManual(r.link);
      }
    } catch (err) {
      showError(mensagemDeErro(err, "Erro ao gerar o link."));
    } finally {
      setOcupado(false);
    }
  };

  return (
    <>
      <button type="button" className={botao} onClick={reenviar} disabled={ocupado}>Reenviar</button>
      <button type="button" className={botao} onClick={copiar} disabled={ocupado}>Copiar link</button>
      <BaseModal
        isOpen={linkManual !== null}
        onClose={() => setLinkManual(null)}
        title="Copiar link do convite"
        subtitle="Não foi possível copiar automaticamente. Selecione e copie o link abaixo."
        size="lg"
        footer={<div className="flex justify-end"><Button variant="secondary" onClick={() => setLinkManual(null)}>Fechar</Button></div>}
      >
        <Input readOnly value={linkManual ?? ""} onFocus={(e) => e.currentTarget.select()} autoFocus />
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">O link vale 7 dias e só pode ser usado uma vez.</p>
      </BaseModal>
    </>
  );
}
