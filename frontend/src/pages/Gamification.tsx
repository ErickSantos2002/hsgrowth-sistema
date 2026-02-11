import React, { useState, useEffect, useRef } from "react";
import { Trophy, Medal, Award, Star, TrendingUp, Crown, Target, Zap, Users as UsersIcon, ChevronDown } from "lucide-react";
import gamificationService, { GamificationSummary, Badge, UserBadge, Ranking } from "../services/gamificationService";
import { useAuth } from "../hooks/useAuth";
import userService from "../services/userService";
import { User } from "../types";

const Gamification: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"profile" | "rankings" | "badges">("profile");
  const [loading, setLoading] = useState(true);

  // Controle de visualização para gerente/admin
  const isManagerOrAdmin = user?.role === "manager" || user?.role === "admin";
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | "team" | null>(null);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement | null>(null);
  const teamIconUrl = "https://img.icons8.com/?size=100&id=9542&format=png&color=ffffff";
  const userIconUrl = "https://img.icons8.com/?size=100&id=98957&format=png&color=000000";
  const userIconStyle: React.CSSProperties = {
    filter: "invert(39%) sepia(72%) saturate(2249%) hue-rotate(260deg) brightness(92%) contrast(90%)",
  };

  // Dados
  const [summary, setSummary] = useState<GamificationSummary | null>(null);
  const [allBadges, setAllBadges] = useState<Badge[]>([]);
  const [myBadges, setMyBadges] = useState<UserBadge[]>([]);
  const [rankings, setRankings] = useState<Ranking[]>([]);
  const [rankingPeriod, setRankingPeriod] = useState<"weekly" | "monthly" | "quarterly" | "annual">("monthly");

  // Estatísticas da equipe (para gerente/admin)
  const [teamStats, setTeamStats] = useState<{
    totalPoints: number;
    averagePoints: number;
    topPerformer: string | null;
    totalBadges: number;
  } | null>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (activeTab === "rankings") {
      loadRankings();
    }
  }, [activeTab, rankingPeriod]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!userMenuRef.current) return;
      if (!userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Carrega dados quando o usuário selecionado muda (para gerente/admin)
  useEffect(() => {
    if (isManagerOrAdmin && selectedUserId !== null) {
      if (selectedUserId === "team") {
        loadTeamStats();
      } else {
        loadUserData(selectedUserId);
      }
    }
  }, [selectedUserId]);

  const loadInitialData = async () => {
    try {
      setLoading(true);

      // Se for gerente/admin, carrega lista de usuários
      if (isManagerOrAdmin) {
        const users = await userService.listActive();
        setAvailableUsers(users.filter(u => u.role === "salesperson"));
        setSelectedUserId("team"); // Inicia com visão da equipe
      }

      // Carrega badges disponíveis (comum para todos) - apenas ativas
      const badgesData = await gamificationService.getAllBadges();
      // Filtra apenas badges ativas para exibição aos usuários
      setAllBadges(badgesData.filter(badge => badge.is_active));

      // Se for vendedor, carrega seus próprios dados
      if (!isManagerOrAdmin) {
        const [summaryData, myBadgesData] = await Promise.all([
          gamificationService.getMySummary(),
          gamificationService.getMyBadges(),
        ]);
        setSummary(summaryData);
        setMyBadges(myBadgesData);
      }
    } catch (error) {
      console.error("Erro ao carregar dados de gamificação:", error);
    } finally {
      setLoading(false);
    }
  };

  // Carrega dados de um usuário específico (para gerente/admin)
  const loadUserData = async (userId: number) => {
    try {
      setLoading(true);
      const [summaryData, userBadgesData] = await Promise.all([
        gamificationService.getUserSummary(userId),
        gamificationService.getUserBadges(userId),
      ]);

      setSummary(summaryData);
      setMyBadges(userBadgesData);
    } catch (error) {
      console.error("Erro ao carregar dados do usuário:", error);
    } finally {
      setLoading(false);
    }
  };

  // Carrega estatísticas da equipe (para gerente/admin)
  const loadTeamStats = async () => {
    try {
      setLoading(true);

      // Carrega dados de todos os vendedores
      const summaries = await Promise.all(
        availableUsers.map(u => gamificationService.getUserSummary(u.id))
      );

      // Calcula estatísticas
      const totalPoints = summaries.reduce((sum, s) => sum + s.total_points, 0);
      const averagePoints = summaries.length > 0 ? totalPoints / summaries.length : 0;
      const topPerformer = summaries.length > 0
        ? summaries.reduce((max, s) => s.total_points > max.total_points ? s : max).user_name
        : null;
      const totalBadges = summaries.reduce((sum, s) => sum + s.badges.length, 0);

      setTeamStats({
        totalPoints,
        averagePoints,
        topPerformer,
        totalBadges,
      });

      // Limpa dados individuais
      setSummary(null);
      setMyBadges([]);
    } catch (error) {
      console.error("Erro ao carregar estatísticas da equipe:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadRankings = async () => {
    try {
      const response = await gamificationService.getRankings(rankingPeriod);
      setRankings(response.rankings || []);
    } catch (error) {
      console.error("Erro ao carregar rankings:", error);
      setRankings([]);
    }
  };

  const getInitials = (name: string) => {
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const getRankMedal = (position: number) => {
    if (position === 1) return { icon: <Crown className="h-5 w-5 sm:h-6 sm:w-6" />, color: "text-yellow-400", bg: "bg-yellow-500/20" };
    if (position === 2) return { icon: <Medal className="h-5 w-5 sm:h-6 sm:w-6" />, color: "text-slate-300", bg: "bg-slate-500/20" };
    if (position === 3) return { icon: <Award className="h-5 w-5 sm:h-6 sm:w-6" />, color: "text-orange-400", bg: "bg-orange-500/20" };
    return null;
  };

  const formatPeriod = (period: string) => {
    const map: Record<string, string> = {
      weekly: "Semanal",
      monthly: "Mensal",
      quarterly: "Trimestral",
      annual: "Anual",
    };
    return map[period] || period;
  };

  const selectedUser =
    typeof selectedUserId === "number" ? availableUsers.find((u) => u.id === selectedUserId) : null;
  const selectedLabel = selectedUser ? selectedUser.name : "Visão Geral da Equipe";
  const selectedIcon = selectedUser ? userIconUrl : teamIconUrl;

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-emerald-500"></div>
          <p className="text-slate-400">Carregando gamificação...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
          <h1 className="flex items-center gap-3 text-3xl font-bold text-white">
            <Trophy className="text-white" size={32} />
            Gamificação
          </h1>
        <p className="mt-1 text-slate-400">
          {isManagerOrAdmin
            ? "Visualize o desempenho da equipe e de vendedores individuais"
            : "Acompanhe seu desempenho, conquistas e posição no ranking"}
        </p>
      </div>

      {/* Seletor de usuário (apenas para gerente/admin) */}
      {isManagerOrAdmin && (
        <div className="mb-6 rounded-xl border border-slate-700 bg-slate-800/50 p-4">
          <label className="mb-2 block text-sm font-medium text-slate-300">
            Visualizar dados de:
          </label>
          <div ref={userMenuRef} className="relative w-full md:w-80">
            <button
              type="button"
              onClick={() => setIsUserMenuOpen((open) => !open)}
              className="flex w-full items-center justify-between gap-3 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 md:w-auto"
            >
              <span className="flex items-center gap-2">
                <img
                  src={selectedIcon}
                  alt=""
                  className="h-5 w-5"
                  style={selectedUser ? userIconStyle : undefined}
                />
                <span className="truncate">{selectedLabel}</span>
              </span>
              <ChevronDown
                size={16}
                className={`text-slate-400 transition-transform ${isUserMenuOpen ? "rotate-180" : ""}`}
              />
            </button>
            {isUserMenuOpen && (
              <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-lg border border-slate-700 bg-slate-900 shadow-lg">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedUserId("team");
                    setIsUserMenuOpen(false);
                  }}
                  className={`flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-white hover:bg-slate-800 ${selectedUserId === "team" || selectedUserId === null ? "bg-slate-800/70" : ""}`}
                >
                  <img src={teamIconUrl} alt="" className="h-5 w-5" />
                  <span>Visão Geral da Equipe</span>
                </button>
                <div className="px-4 py-2 text-xs uppercase tracking-wide text-slate-500">
                  Vendedores
                </div>
                {availableUsers.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => {
                      setSelectedUserId(u.id);
                      setIsUserMenuOpen(false);
                    }}
                    className={`flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-white hover:bg-slate-800 ${selectedUserId === u.id ? "bg-slate-800/70" : ""}`}
                  >
                    <img src={userIconUrl} alt="" className="h-5 w-5" style={userIconStyle} />
                    <span className="truncate">{u.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6 flex gap-2 border-b border-slate-700">
        <button
          onClick={() => setActiveTab("profile")}
          className={`border-b-2 px-4 py-2 font-medium transition-colors ${
            activeTab === "profile"
              ? "border-emerald-400 text-emerald-400"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          <div className="flex items-center gap-2">
            <Star size={16} />
            Meu Perfil
          </div>
        </button>
        <button
          onClick={() => setActiveTab("rankings")}
          className={`border-b-2 px-4 py-2 font-medium transition-colors ${
            activeTab === "rankings"
              ? "border-emerald-400 text-emerald-400"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          <div className="flex items-center gap-2">
            <TrendingUp size={16} />
            Rankings
          </div>
        </button>
        <button
          onClick={() => setActiveTab("badges")}
          className={`border-b-2 px-4 py-2 font-medium transition-colors ${
            activeTab === "badges"
              ? "border-emerald-400 text-emerald-400"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          <div className="flex items-center gap-2">
            <Award size={16} />
            Badges
          </div>
        </button>
      </div>

      {/* Visão Geral da Equipe (apenas para gerente/admin quando selecionado "team") */}
      {isManagerOrAdmin && selectedUserId === "team" && activeTab === "profile" && teamStats && (
        <div className="space-y-6">
          <div className="rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 p-6 text-white">
            <div className="flex items-center gap-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                <UsersIcon size={40} />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Visão Geral da Equipe</h2>
                <p className="text-white/80">Desempenho coletivo de {availableUsers.length} vendedores</p>
              </div>
            </div>
          </div>

          {/* Cards de estatísticas da equipe */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Total de pontos da equipe */}
            <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
              <div className="mb-2 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-500/20">
                  <Zap className="text-yellow-400" size={20} />
                </div>
                <div>
                  <p className="text-sm text-slate-400">Pontos Totais</p>
                  <p className="text-3xl font-bold text-white">{Math.round(teamStats.totalPoints)}</p>
                </div>
              </div>
            </div>

            {/* Média de pontos */}
            <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
              <div className="mb-2 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/20">
                  <TrendingUp className="text-blue-400" size={20} />
                </div>
                <div>
                  <p className="text-sm text-slate-400">Média por Vendedor</p>
                  <p className="text-3xl font-bold text-white">{Math.round(teamStats.averagePoints)}</p>
                </div>
              </div>
            </div>

            {/* Top performer */}
            <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
              <div className="mb-2 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/20">
                  <Crown className="text-emerald-400" size={20} />
                </div>
                <div>
                  <p className="text-sm text-slate-400">Top Performer</p>
                  <p className="truncate text-lg font-bold text-white">{teamStats.topPerformer || "-"}</p>
                </div>
              </div>
            </div>

            {/* Total de badges */}
            <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
              <div className="mb-2 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/20">
                  <Award className="text-purple-400" size={20} />
                </div>
                <div>
                  <p className="text-sm text-slate-400">Badges Conquistados</p>
                  <p className="text-3xl font-bold text-white">{teamStats.totalBadges}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Mensagem informativa */}
          <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-4">
            <p className="text-sm text-blue-400">
              💡 <strong>Dica:</strong> Selecione um vendedor específico no menu acima para ver detalhes individuais de desempenho, badges e ranking.
            </p>
          </div>
        </div>
      )}

      {/* Tab: Meu Perfil */}
      {activeTab === "profile" && summary && (
        <div className="space-y-6">
          {/* Header do perfil */}
          <div className={`rounded-xl p-6 text-white ${
            isManagerOrAdmin && selectedUserId !== "team"
              ? "bg-gradient-to-r from-blue-600 to-indigo-600"
              : "bg-gradient-to-r from-emerald-600 to-cyan-600"
          }`}>
            <div className="flex items-center gap-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/20 text-2xl font-bold backdrop-blur-sm">
                {getInitials(summary.user_name)}
              </div>
              <div>
                <h2 className="text-2xl font-bold">{summary.user_name}</h2>
                {isManagerOrAdmin && selectedUserId !== "team" && (
                  <div className="mt-2">
                    <span className="rounded-full bg-white/20 px-3 py-1 text-sm">
                      Visualizando vendedor
                    </span>
                  </div>
                )}
                <p className="text-white/80">
                  {isManagerOrAdmin && selectedUserId !== "team"
                    ? "Desempenho individual do vendedor"
                    : "Continue conquistando pontos e badges!"}
                </p>
              </div>
            </div>
          </div>

          {/* Cards de estatísticas */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Total de pontos */}
            <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
              <div className="mb-2 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-500/20">
                  <Zap className="text-yellow-400" size={20} />
                </div>
                <div>
                  <p className="text-sm text-slate-400">Total de Pontos</p>
                  <p className="text-3xl font-bold text-white">{summary.total_points}</p>
                </div>
              </div>
            </div>

            {/* Pontos esta semana */}
            <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
              <div className="mb-2 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/20">
                  <Target className="text-blue-400" size={20} />
                </div>
                <div>
                  <p className="text-sm text-slate-400">Esta Semana</p>
                  <p className="text-3xl font-bold text-white">{summary.current_week_points}</p>
                </div>
              </div>
            </div>

            {/* Pontos este mês */}
            <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
              <div className="mb-2 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/20">
                  <TrendingUp className="text-emerald-400" size={20} />
                </div>
                <div>
                  <p className="text-sm text-slate-400">Este Mês</p>
                  <p className="text-3xl font-bold text-white">{summary.current_month_points}</p>
                </div>
              </div>
            </div>

            {/* Badges conquistados */}
            <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
              <div className="mb-2 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/20">
                  <Award className="text-purple-400" size={20} />
                </div>
                <div>
                  <p className="text-sm text-slate-400">Badges</p>
                  <p className="text-3xl font-bold text-white">{myBadges.length}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Posição nos rankings */}
          <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
            <h3 className="mb-4 text-lg font-semibold text-white">Posição nos Rankings</h3>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {[
                { label: "Semanal", rank: summary.weekly_rank },
                { label: "Mensal", rank: summary.monthly_rank },
                { label: "Trimestral", rank: summary.quarterly_rank },
                { label: "Anual", rank: summary.annual_rank },
              ].map((item) => (
                <div key={item.label} className="text-center">
                  <p className="mb-1 text-sm text-slate-400">{item.label}</p>
                  <p className="text-2xl font-bold text-white">
                    {item.rank ? `${item.rank}º` : "-"}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Badges recentes */}
          {myBadges.length > 0 && (
            <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
              <h3 className="mb-4 text-lg font-semibold text-white">Badges Conquistados Recentemente</h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {myBadges.slice(0, 3).map((userBadge) => {
                  const badge = allBadges.find((b) => b.id === userBadge.badge_id);
                  return (
                    <div key={userBadge.id} className="flex items-center gap-3 rounded-lg bg-slate-700/30 p-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-500/20">
                        <Award className="text-yellow-400" size={24} />
                      </div>
                      <div>
                        <p className="font-medium text-white">{badge?.name || "Badge"}</p>
                        <p className="text-xs text-slate-400">
                          {new Date(userBadge.awarded_at).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Rankings */}
      {activeTab === "rankings" && (
        <div className="space-y-6">
          {/* Filtro de período */}
          <div className="flex justify-center gap-2 sm:justify-start">
            {(["weekly", "monthly", "quarterly", "annual"] as const).map((period) => (
              <button
                key={period}
                onClick={() => setRankingPeriod(period)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors md:px-4 md:py-2 md:text-base ${
                  rankingPeriod === period
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
              >
                {formatPeriod(period)}
              </button>
            ))}
          </div>

          {/* Lista de rankings */}
          {rankings.length === 0 ? (
            <div className="rounded-xl border border-slate-700 bg-slate-800/50 py-12 text-center">
              <Trophy className="mx-auto mb-4 text-slate-600" size={48} />
              <p className="text-slate-400">Nenhum ranking disponível para este período</p>
              <p className="mt-2 text-sm text-slate-500">
                Os rankings são calculados automaticamente com base nos pontos conquistados
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-800/30">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700 bg-slate-800/50">
                      <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase text-slate-300 sm:px-6 sm:py-3 sm:text-xs">
                        Posição
                      </th>
                      <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase text-slate-300 sm:px-6 sm:py-3 sm:text-xs">
                        Usuário
                      </th>
                      <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase text-slate-300 sm:px-6 sm:py-3 sm:text-xs">
                        Pontos
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {rankings.map((ranking) => {
                      const medal = getRankMedal(ranking.rank_position);
                      const isCurrentUser = ranking.user_id === user?.id;

                      return (
                        <tr
                          key={ranking.id}
                          className={`transition-colors ${
                            isCurrentUser ? "bg-emerald-500/10" : "hover:bg-slate-700/30"
                          }`}
                        >
                          <td className="px-3 py-2 sm:px-6 sm:py-4">
                            <div className="flex items-center gap-2">
                              {medal ? (
                                <div className={`${medal.bg} ${medal.color} rounded-lg p-1.5 sm:p-2`}>
                                  {medal.icon}
                                </div>
                              ) : (
                                <span className="w-8 text-center text-lg font-bold text-slate-400 sm:w-10 sm:text-2xl">
                                  {ranking.rank_position}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2 sm:px-6 sm:py-4">
                            <div className="flex items-center gap-2 sm:gap-3">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 text-xs font-semibold text-white sm:h-10 sm:w-10 sm:text-sm">
                                {getInitials(ranking.user_name)}
                              </div>
                              <div>
                                <p className="flex items-center gap-2 text-sm font-medium text-white sm:text-base">
                                  {ranking.user_name}
                                  {isCurrentUser && (
                                    <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-400">
                                      Você
                                    </span>
                                  )}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-2 text-right sm:px-6 sm:py-4">
                            <span className="text-lg font-bold text-white sm:text-xl">{ranking.total_points}</span>
                            <span className="ml-1 text-slate-400">pts</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Badges */}
      {activeTab === "badges" && (
        <div className="space-y-6">
          <p className="text-slate-400">
            {myBadges.length} de {allBadges.length} badges conquistados
          </p>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {allBadges.map((badge) => {
              const userBadge = myBadges.find((ub) => ub.badge_id === badge.id);
              const isEarned = !!userBadge;

              return (
                <div
                  key={badge.id}
                  className={`rounded-xl border p-6 transition-all ${
                    isEarned
                      ? "border-yellow-500/30 bg-yellow-500/10"
                      : "border-slate-700 bg-slate-800/30 opacity-60"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`flex h-16 w-16 items-center justify-center rounded-full ${
                        isEarned ? "bg-yellow-500/20" : "bg-slate-700/30"
                      }`}
                    >
                      <Award
                        className={isEarned ? "text-yellow-400" : "text-slate-600"}
                        size={32}
                      />
                    </div>
                    <div className="flex-1">
                      <h3 className={`mb-1 font-semibold ${isEarned ? "text-white" : "text-slate-500"}`}>
                        {badge.name}
                      </h3>
                      <p className={`mb-2 text-sm ${isEarned ? "text-slate-300" : "text-slate-600"}`}>
                        {badge.description}
                      </p>
                      {isEarned && userBadge && (
                        <p className="flex items-center gap-1 text-xs text-emerald-400">
                          <Trophy size={12} />
                          Conquistado em {new Date(userBadge.awarded_at).toLocaleDateString("pt-BR")}
                        </p>
                      )}
                      {!isEarned && badge.criteria_type === "automatic" && (
                        <p className="text-xs text-slate-500">
                          Critério: {badge.criteria.field} {badge.criteria.operator} {badge.criteria.value}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default Gamification;
