import type { StatusAcesso } from "../../services/acessosService";

const ESTILOS: Record<StatusAcesso, { rotulo: string; classe: string }> = {
  ativo: { rotulo: "Ativo", classe: "bg-emerald-500/20 text-slate-900 dark:text-emerald-400" },
  convite_pendente: { rotulo: "Convite pendente", classe: "bg-amber-500/20 text-slate-900 dark:text-amber-400" },
  convite_expirado: { rotulo: "Convite expirado", classe: "bg-red-500/20 text-slate-900 dark:text-red-400" },
  desativado: { rotulo: "Desativado", classe: "bg-slate-500/20 text-slate-900 dark:text-slate-400" },
};

export default function StatusDoAcesso({ status }: { status?: StatusAcesso | string | null }) {
  const e = status ? ESTILOS[status as StatusAcesso] : undefined;
  if (!e) return null;
  return (
    <span className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${e.classe}`}>{e.rotulo}</span>
  );
}
