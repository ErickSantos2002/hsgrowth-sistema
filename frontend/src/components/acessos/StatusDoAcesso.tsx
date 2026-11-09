import type { StatusAcesso } from "../../services/acessosService";

const ESTILOS: Record<StatusAcesso, { rotulo: string; classe: string }> = {
  ativo: { rotulo: "Ativo", classe: "bg-emerald-500/20 text-slate-900 dark:text-emerald-400" },
  convite_pendente: { rotulo: "Convite pendente", classe: "bg-amber-500/20 text-slate-900 dark:text-amber-400" },
  convite_expirado: { rotulo: "Convite expirado", classe: "bg-red-500/20 text-slate-900 dark:text-red-400" },
  desativado: { rotulo: "Desativado", classe: "bg-slate-500/20 text-slate-900 dark:text-slate-400" },
};

/** dd/mm da validade (a API manda UTC sem fuso). */
function diaMes(iso?: string | null): string | null {
  if (!iso) return null;
  const d = new Date(/([zZ]|[+-]\d{2}:?\d{2})$/.test(iso) ? iso : `${iso}Z`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

export default function StatusDoAcesso({ status, expiraEm }: { status?: StatusAcesso | string | null; expiraEm?: string | null }) {
  const e = status ? ESTILOS[status as StatusAcesso] : undefined;
  if (!e) return null;
  const dia = status === "convite_pendente" ? diaMes(expiraEm) : null;
  const rotulo = dia ? `${e.rotulo} — expira em ${dia}` : e.rotulo;
  return (
    <span className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${e.classe}`}>{rotulo}</span>
  );
}
