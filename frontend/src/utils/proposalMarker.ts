export function markerBadge(m: string): { cls: string; label: string } {
  if (m === "aprovada") return { cls: "bg-green-500/15 text-green-600 dark:text-green-400", label: "Aprovada" };
  if (m === "nao_aprovada") return { cls: "bg-red-500/15 text-red-600 dark:text-red-400", label: "Não aprovada" };
  return { cls: "bg-slate-500/15 text-slate-500 dark:text-slate-400", label: "Em aberto" };
}
