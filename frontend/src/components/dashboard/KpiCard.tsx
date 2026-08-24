import React from "react";
import CountUp from "react-countup";
import { Info } from "lucide-react";

interface KpiCardProps {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: number | string | null;
  format?: "number" | "currency" | "percent" | "days" | "text";
  sub?: React.ReactNode;
  highlight?: "green" | "red" | "yellow" | "blue" | "purple" | "orange";
  unavailable?: boolean;
  className?: string;
  /** Texto explicativo mostrado ao passar o mouse no ícone ℹ️ (como é calculado). */
  info?: string;
}

const highlightBorder: Record<string, string> = {
  green:  "border-emerald-500/30 dark:border-emerald-500/20",
  red:    "border-red-500/30 dark:border-red-500/20",
  yellow: "border-yellow-500/30 dark:border-yellow-500/20",
  blue:   "border-blue-500/30 dark:border-blue-500/20",
  purple: "border-purple-500/30 dark:border-purple-500/20",
  orange: "border-orange-500/30 dark:border-orange-500/20",
};

const KpiCard: React.FC<KpiCardProps> = ({
  icon, iconBg, label, value, format = "number", sub, highlight, unavailable, className, info,
}) => {
  const borderClass = highlight ? highlightBorder[highlight] : "border-gray-200 dark:border-slate-700/50";

  const renderValue = () => {
    if (unavailable || value === null || value === undefined) {
      return <span className="text-3xl font-bold text-slate-400 dark:text-slate-500">—</span>;
    }
    if (format === "text") {
      return <span className="text-3xl font-bold text-slate-900 dark:text-white">{value}</span>;
    }
    const n = Number(value);
    if (format === "currency") {
      return (
        <CountUp
          end={n}
          duration={1.4}
          decimals={2}
          decimal=","
          separator="."
          prefix="R$ "
          className="text-2xl font-bold text-slate-900 dark:text-white"
        />
      );
    }
    if (format === "percent") {
      return (
        <CountUp
          end={n}
          duration={1.4}
          decimals={1}
          decimal=","
          suffix="%"
          className="text-3xl font-bold text-slate-900 dark:text-white"
        />
      );
    }
    if (format === "days") {
      return (
        <span className="text-3xl font-bold text-slate-900 dark:text-white">
          <CountUp end={n} duration={1.4} decimals={1} decimal="," /> dias
        </span>
      );
    }
    return (
      <CountUp
        end={n}
        duration={1.4}
        separator="."
        className="text-3xl font-bold text-slate-900 dark:text-white"
      />
    );
  };

  return (
    <div className={`rounded-xl border ${borderClass} bg-white dark:bg-slate-800/50 p-5 transition-all hover:shadow-sm${className ? ` ${className}` : ""}`}>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div className={`rounded-lg ${iconBg} p-2.5`}>{icon}</div>
          {info && (
            <div className="group relative flex">
              <Info size={13} className="cursor-help text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-slate-200" />
              <div
                role="tooltip"
                className="pointer-events-none absolute left-0 top-6 z-50 w-60 rounded-lg border border-gray-200 bg-white p-2.5 text-left text-[11px] leading-relaxed text-slate-600 opacity-0 shadow-xl transition-opacity duration-150 group-hover:opacity-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
              >
                {info}
              </div>
            </div>
          )}
        </div>
        <div className="text-right">
          <p className="mb-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
          {renderValue()}
        </div>
      </div>
      {sub && <div className="text-xs text-slate-500 dark:text-slate-400">{sub}</div>}
    </div>
  );
};

export default KpiCard;
