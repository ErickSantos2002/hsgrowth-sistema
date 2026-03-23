import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { reportService } from "../services";
import { DashboardKPIs } from "../types";
import { useAuth } from "../hooks/useAuth";
import toast from "react-hot-toast";

// Tipo para o período selecionado (exportado)
export type PeriodType = "today" | "week" | "month" | "quarter" | "year";

// Interface do contexto
interface DashboardContextData {
  kpis: DashboardKPIs | null;
  loading: boolean;
  error: string | null;
  period: PeriodType;
  lastUpdate: Date | null;
  selectedUserId: number | null;
  setSelectedUserId: (userId: number | null) => void;
  fetchDashboardData: () => Promise<void>;
  handleRefresh: () => void;
  setPeriod: (period: PeriodType) => void;
}

// Criação do contexto
const DashboardContext = createContext<DashboardContextData>({} as DashboardContextData);

// Hook customizado para usar o contexto
export const useDashboard = () => {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error("useDashboard deve ser usado dentro de um DashboardProvider");
  }
  return context;
};

// Provider do contexto
interface DashboardProviderProps {
  children: ReactNode;
}

export const DashboardProvider: React.FC<DashboardProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [kpis, setKpis] = useState<DashboardKPIs | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriodState] = useState<PeriodType>("month");
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [selectedUserId, setSelectedUserIdState] = useState<number | null>(null);

  // Para salesperson/sdr, força o filtro no próprio usuário (o backend já filtra,
  // mas manter o estado evita que o seletor do frontend fique em "Todos")
  useEffect(() => {
    if (user?.role === "salesperson" || user?.role === "sdr") {
      setSelectedUserIdState(user.id);
    } else {
      setSelectedUserIdState(null);
    }
  }, [user?.id, user?.role]);

  const setSelectedUserId = (userId: number | null) => {
    setSelectedUserIdState(userId);
  };

  // Busca os dados do dashboard
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const effectiveUserId =
        user?.role === "salesperson" || user?.role === "sdr" ? user.id : selectedUserId ?? undefined;

      const data = await reportService.getDashboardKPIs(period, undefined, effectiveUserId ?? undefined);
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

  // Handler para refresh manual
  const handleRefresh = () => {
    toast.success("Atualizando dados...");
    fetchDashboardData();
  };

  // Handler para alterar período (também recarrega dados)
  const setPeriod = (newPeriod: PeriodType) => {
    setPeriodState(newPeriod);
    setLoading(true);

    const effectiveUserId =
      user?.role === "salesperson" || user?.role === "sdr" ? user.id : selectedUserId ?? undefined;

    reportService.getDashboardKPIs(newPeriod, undefined, effectiveUserId ?? undefined).then((data) => {
      setKpis(data);
      setLastUpdate(new Date());
      setLoading(false);
    }).catch((err) => {
      console.error("❌ Erro ao buscar dados:", err);
      setError(err?.response?.data?.detail || "Erro ao carregar dashboard");
      toast.error("Erro ao carregar dados");
      setLoading(false);
    });
  };

  return (
    <DashboardContext.Provider
      value={{
        kpis,
        loading,
        error,
        period,
        lastUpdate,
        selectedUserId,
        setSelectedUserId,
        fetchDashboardData,
        handleRefresh,
        setPeriod,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
};
