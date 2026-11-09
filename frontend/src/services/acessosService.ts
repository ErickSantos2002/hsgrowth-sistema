import api from "./api";

export type StatusAcesso = "ativo" | "convite_pendente" | "convite_expirado" | "desativado";
export type ModoAcesso = "convite" | "senha";
export interface ConviteResposta { status_acesso: StatusAcesso; link?: string | null; email_enviado: boolean }

/** Reenviar (enviar=true) ou só gerar o link para copiar (enviar=false). */
export async function convite(url: string, enviar: boolean) {
  return (await api.post<ConviteResposta>(url, { enviar })).data;
}
