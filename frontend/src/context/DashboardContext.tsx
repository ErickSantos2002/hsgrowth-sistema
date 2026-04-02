import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { reportService } from "../services";
import { DashboardKPIs } from "../types";
import { useAuth } from "../hooks/useAuth";
import toast from "react-hot-toast";

export type PeriodType = "today" | "week" | "month" | "quarter" | "year" | "custom";
export type ViewType = "sdr" | "vendedor";

interface DashboardContextData {
  kpis: DashboardKPIs | null;
  loading: boolean;
  error: string | null;
  period: PeriodType;
  customStart: string;
  customEnd: string;
  setCustomRange: (start: string, end: string) => void;
  lastUpdate: Date | null;
  selectedUserId: number | null;
  setSelectedUserId: (userId: number | null) => void;
  view: ViewType;
  setView: (view: ViewType) => void;
  fetchDashboardData: (overridePeriod?: PeriodType, overrideView?: ViewType, overrideStart?: string, overrideEnd?: string) => Promise<void>;
  handleRefresh: () => void;
  setPeriod: (period: PeriodType) => void;
}

const DashboardContext = createContext<DashboardContextData>({} as DashboardContextData);

export const useDashboard = () => {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error("useDashboard deve ser usado dentro de um DashboardProvider");
  }
  return context;
};

interface DashboardProviderProps {
  children: ReactNode;
}

export const DashboardProvider: React.FC<DashboardProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [kpis, setKpis] = useState<DashboardKPIs | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriodState] = useState<PeriodType>("month");
  const [customStart, setCustomStart] = useState<string>("");
  const [customEnd, setCustomEnd] = useState<string>("");
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [selectedUserId, setSelectedUserIdState] = useState<number | null>(null);
  const [view, setViewState] = useState<ViewType>(
    user?.role === "salesperson" ? "vendedor" : "sdr"
  );

  // Para salesperson/sdr, força o filtro no próprio usuário e define a view correta
  useEffect(() => {
    if (user?.role === "salesperson") {
      setSelectedUserIdState(user.id);
      setViewState("vendedor");
    } else if (user?.role === "sdr") {
      setSelectedUserIdState(user.id);
      setViewState("sdr");
    } else {
      setSelectedUserIdState(null);
    }
  }, [user?.id, user?.role]);

  const setSelectedUserId = (userId: number | null) => {
    setSelectedUserIdState(userId);
  };

  const setView = (newView: ViewType) => {
    setViewState(newView);
    setSelectedUserIdState(null);
  };

  const getEffectiveUserId = () => {
    return user?.role === "salesperson" || user?.role === "sdr"
      ? user.id
      : selectedUserId ?? undefined;
  };

  const fetchDashboardData = async (
    overridePeriod?: PeriodType,
    overrideView?: ViewType,
    overrideStart?: string,
    overrideEnd?: string,
  ) => {
    const p = overridePeriod ?? period;
    const v = overrideView ?? view;
    try {
      setLoading(true);
      setError(null);
      const data = await reportService.getDashboardKPIs(
        p,
        undefined,
        getEffectiveUserId(),
        p === "custom" ? (overrideStart ?? customStart) : undefined,
        p === "custom" ? (overrideEnd ?? customEnd) : undefined,
        v,
      );
      setKpis(data);
      setLastUpdate(new Date());
    } catch (err: any) {
      console.error("❌ Erro ao buscar dados do dashboard:", err);
      setError(err?.response?.data?.detail || "Erro ao carregar dashboard");
      toast.error("Erro ao carregar dados do dashboard");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    toast.success("Atualizando dados...");
    fetchDashboardData();
  };

  const setPeriod = (newPeriod: PeriodType) => {
    if (newPeriod === "custom") {
      setPeriodState(newPeriod);
      setCustomEnd(new Date().toISOString().split("T")[0]);
      return;
    }
    setPeriodState(newPeriod);
    fetchDashboardData(newPeriod);
  };

  const setCustomRange = (start: string, end: string) => {
    setCustomStart(start);
    setCustomEnd(end);
    if (!start || !end) return;
    fetchDashboardData("custom", undefined, start, end);
  };

  return (
    <DashboardContext.Provider
      value={{
        kpis,
        loading,
        error,
        period,
        customStart,
        customEnd,
        setCustomRange,
        lastUpdate,
        selectedUserId,
        setSelectedUserId,
        view,
        setView,
        fetchDashboardData,
        handleRefresh,
        setPeriod,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
};
