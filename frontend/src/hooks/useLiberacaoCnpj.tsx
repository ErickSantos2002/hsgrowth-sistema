import { useRef, useState } from "react";
import { BaseModal, Button, FormField, Textarea } from "../components/common";
import { showError } from "../utils/toast";

/**
 * Trava de CNPJ em Vendas (CNPJ com um parceiro ou com outro vendedor).
 * O backend responde 409 com detail {code: "cnpj_bloqueado", message, pode_liberar}.
 * Admin/gerente: abre a janela da justificativa e repete o pedido com ela.
 * Os demais: mostra a mensagem ("Fale com o gerente").
 *
 * Uso:
 *   const { comLiberacao, janela } = useLiberacaoCnpj();
 *   const card = await comLiberacao((j) => cardService.create({ ...dados, cnpj_justificativa: j }));
 *   if (card === null) return; // cancelado ou sem permissão
 *   ...e renderizar {janela} no JSX.
 */
type Bloqueio = { code: string; message: string; pode_liberar: boolean };

export function bloqueioDeCnpj(err: unknown): Bloqueio | null {
  const resposta = (err as { response?: { status?: number; data?: { detail?: unknown } } })?.response;
  const d = resposta?.status === 409 ? resposta.data?.detail : null;
  return d && typeof d === "object" && (d as Bloqueio).code === "cnpj_bloqueado" ? (d as Bloqueio) : null;
}

/** Texto do erro da API, inclusive o detail em objeto da trava de CNPJ. */
export function textoDoErro(err: unknown, padrao: string): string {
  const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (detail && typeof detail === "object" && typeof (detail as Bloqueio).message === "string") {
    return (detail as Bloqueio).message;
  }
  return padrao;
}

export function useLiberacaoCnpj() {
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [texto, setTexto] = useState("");
  const resolver = useRef<((v: string | null) => void) | null>(null);

  const pedirJustificativa = (msg: string) =>
    new Promise<string | null>((resolve) => {
      resolver.current = resolve;
      setTexto("");
      setMensagem(msg);
    });

  const fechar = (valor: string | null) => {
    setMensagem(null);
    resolver.current?.(valor);
    resolver.current = null;
  };

  async function comLiberacao<T>(pedido: (justificativa?: string) => Promise<T>): Promise<T | null> {
    try {
      return await pedido();
    } catch (err) {
      const bloqueio = bloqueioDeCnpj(err);
      if (!bloqueio) throw err;
      if (!bloqueio.pode_liberar) {
        showError(bloqueio.message);
        return null;
      }
      const justificativa = await pedirJustificativa(bloqueio.message);
      if (!justificativa) return null;
      return await pedido(justificativa);
    }
  }

  const janela = (
    <BaseModal
      isOpen={mensagem !== null}
      onClose={() => fechar(null)}
      title="CNPJ com outro responsável"
      size="md"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => fechar(null)}>Cancelar</Button>
          <Button onClick={() => fechar(texto.trim())} disabled={!texto.trim()}>Liberar e continuar</Button>
        </div>
      }
    >
      <p className="mb-3 text-sm text-slate-700 dark:text-slate-300">{mensagem}</p>
      <FormField label="Justificativa" required hint={`${texto.length}/500`}>
        <Textarea
          value={texto}
          maxLength={500}
          rows={3}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Por que este card pode seguir mesmo assim"
        />
      </FormField>
      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">A justificativa fica registrada no histórico do card.</p>
    </BaseModal>
  );

  return { comLiberacao, janela };
}
