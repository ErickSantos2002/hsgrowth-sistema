/**
 * ATENÇÃO: Esta página está usando DADOS MOCKADOS temporariamente
 * até que os endpoints do backend (/api/v1/reports/*) sejam implementados.
 *
 * TODO: Quando o backend estiver pronto:
 * 1. Remover os mocks das funções handleGenerate*Report
 * 2. Descomentar as chamadas para reportService
 * 3. Testar com dados reais
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  TrendingUp,
  ArrowRightLeft,
  Download,
  BarChart3,
  ChevronDown,
} from 'lucide-react';
import reportService, {
  PeriodType,
  SalesReportResponse,
  ConversionReportResponse,
  TransferReportResponse,
} from '../services/reportService';
import boardService from '../services/boardService';
import userService from '../services/userService';

type TabType = 'sales' | 'conversion' | 'transfers';

interface Board {
  id: number;
  name: string;
}

interface User {
  id: number;
  name: string;
}

const Reports: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('sales');
  const [loading, setLoading] = useState(false);

  // Listas para selects
  const [boards, setBoards] = useState<Board[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  // Filtros Tab 1 - Vendas
  const [salesPeriod, setSalesPeriod] = useState<PeriodType>('this_month');
  const [salesBoardId, setSalesBoardId] = useState<string>('');
  const [salesUserId, setSalesUserId] = useState<string>('');
  const [salesStartDate, setSalesStartDate] = useState('');
  const [salesEndDate, setSalesEndDate] = useState('');
  const [salesReport, setSalesReport] = useState<SalesReportResponse | null>(null);

  // Filtros Tab 2 - Conversão
  const [conversionBoardId, setConversionBoardId] = useState<string>('');
  const [conversionPeriod, setConversionPeriod] = useState<PeriodType>('this_month');
  const [conversionStartDate, setConversionStartDate] = useState('');
  const [conversionEndDate, setConversionEndDate] = useState('');
  const [conversionReport, setConversionReport] = useState<ConversionReportResponse | null>(null);

  // Filtros Tab 3 - Transferências
  const [transferPeriod, setTransferPeriod] = useState<PeriodType>('this_month');
  const [transferFromUserId, setTransferFromUserId] = useState<string>('');
  const [transferToUserId, setTransferToUserId] = useState<string>('');
  const [transferStartDate, setTransferStartDate] = useState('');
  const [transferEndDate, setTransferEndDate] = useState('');
  const [transferReport, setTransferReport] = useState<TransferReportResponse | null>(null);

  // Carrega boards e users ao montar
  useEffect(() => {
    loadBoardsAndUsers();
  }, []);

  const loadBoardsAndUsers = async () => {
    try {
      const [boardsResponse, usersData] = await Promise.all([
        boardService.list(),
        userService.listActive(),
      ]);
      // Extrai os boards da resposta paginada
      setBoards(boardsResponse.boards || []);
      setUsers(usersData);
    } catch (error) {
      console.error('Erro ao carregar boards/users:', error);
    }
  };

  // Handler Tab 1 - Vendas
  const handleGenerateSalesReport = async () => {
    setLoading(true);
    try {
      // TODO: Temporariamente usando dados mockados até backend estar implementado
      console.log('Usando dados mockados para visualização');

      // Simula delay da API
      await new Promise(resolve => setTimeout(resolve, 500));

      setSalesReport({
        summary: {
          total_cards_created: 145,
          total_cards_won: 78,
          total_cards_lost: 32,
          total_value_won: 487500.00,
          conversion_rate: 53.79,
        },
        details: [
          { user_name: 'João Silva', cards_created: 42, cards_won: 24, cards_lost: 8, value_won: 156000.00, conversion_rate: 57.14 },
          { user_name: 'Maria Santos', cards_created: 38, cards_won: 21, cards_lost: 7, value_won: 132500.00, conversion_rate: 55.26 },
          { user_name: 'Pedro Costa', cards_created: 35, cards_won: 18, cards_lost: 9, value_won: 98750.00, conversion_rate: 51.43 },
          { user_name: 'Ana Oliveira', cards_created: 30, cards_won: 15, cards_lost: 8, value_won: 100250.00, conversion_rate: 50.00 },
        ],
      });
    } catch (error: any) {
      console.error('Erro ao gerar relatório de vendas:', error);
      alert('Erro inesperado ao gerar relatório.');
    } finally {
      setLoading(false);
    }
  };

  // Handler Tab 2 - Conversão
  const handleGenerateConversionReport = async () => {
    setLoading(true);
    try {
      // TODO: Temporariamente usando dados mockados até backend estar implementado
      console.log('Usando dados mockados para visualização');

      // Simula delay da API
      await new Promise(resolve => setTimeout(resolve, 500));

      setConversionReport({
        summary: {
          total_cards: 145,
          total_value: 825000.00,
          overall_conversion_rate: 53.79,
        },
        stages: [
          { stage_name: 'Novos Leads', card_count: 145, total_value: 825000.00, conversion_rate: 100.00, avg_time_in_stage: 2.3 },
          { stage_name: 'Qualificação', card_count: 98, total_value: 612500.00, conversion_rate: 67.59, avg_time_in_stage: 3.5 },
          { stage_name: 'Proposta Enviada', card_count: 85, total_value: 531250.00, conversion_rate: 58.62, avg_time_in_stage: 5.2 },
          { stage_name: 'Negociação', card_count: 78, total_value: 487500.00, conversion_rate: 53.79, avg_time_in_stage: 4.7 },
          { stage_name: 'Ganho', card_count: 78, total_value: 487500.00, conversion_rate: 53.79, avg_time_in_stage: null },
          { stage_name: 'Perdido', card_count: 32, total_value: 187500.00, conversion_rate: 22.07, avg_time_in_stage: null },
        ],
      });
    } catch (error: any) {
      console.error('Erro ao gerar relatório de conversão:', error);
      alert('Erro inesperado ao gerar relatório.');
    } finally {
      setLoading(false);
    }
  };

  // Handler Tab 3 - Transferências
  const handleGenerateTransferReport = async () => {
    setLoading(true);
    try {
      // TODO: Temporariamente usando dados mockados até backend estar implementado
      console.log('Usando dados mockados para visualização');

      // Simula delay da API
      await new Promise(resolve => setTimeout(resolve, 500));

      setTransferReport({
        summary: {
          total_transfers: 24,
          total_cards_won_after_transfer: 18,
          total_value_won_after_transfer: 213750.00,
          avg_days_to_won: 12.5,
        },
        details: [
          { from_user_name: 'João Silva', to_user_name: 'Maria Santos', transfer_count: 8, cards_won_count: 6, total_value_won: 87500.00, avg_days_to_won: 11.2 },
          { from_user_name: 'Pedro Costa', to_user_name: 'João Silva', transfer_count: 6, cards_won_count: 5, total_value_won: 62500.00, avg_days_to_won: 13.8 },
          { from_user_name: 'Maria Santos', to_user_name: 'Ana Oliveira', transfer_count: 5, cards_won_count: 4, total_value_won: 42500.00, avg_days_to_won: 10.5 },
          { from_user_name: 'Ana Oliveira', to_user_name: 'Pedro Costa', transfer_count: 5, cards_won_count: 3, total_value_won: 21250.00, avg_days_to_won: 15.3 },
        ],
      });
    } catch (error: any) {
      console.error('Erro ao gerar relatório de transferências:', error);
      alert('Erro inesperado ao gerar relatório.');
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = () => {
    alert('TODO: Implementar exportação para Excel');
  };

  return (
    <div className="p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Relatórios</h1>
          <p className="text-slate-400">Análise detalhada de vendas, conversão e transferências</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b border-slate-700">
          <button
            onClick={() => setActiveTab('sales')}
            className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors ${
              activeTab === 'sales'
                ? 'text-emerald-400 border-b-2 border-emerald-400'
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            <TrendingUp size={20} />
            Vendas
          </button>
          <button
            onClick={() => setActiveTab('conversion')}
            className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors ${
              activeTab === 'conversion'
                ? 'text-emerald-400 border-b-2 border-emerald-400'
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            <BarChart3 size={20} />
            Conversão
          </button>
          <button
            onClick={() => setActiveTab('transfers')}
            className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors ${
              activeTab === 'transfers'
                ? 'text-emerald-400 border-b-2 border-emerald-400'
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            <ArrowRightLeft size={20} />
            Transferências
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'sales' && (
          <SalesTab
            period={salesPeriod}
            setPeriod={setSalesPeriod}
            boardId={salesBoardId}
            setBoardId={setSalesBoardId}
            userId={salesUserId}
            setUserId={setSalesUserId}
            startDate={salesStartDate}
            setStartDate={setSalesStartDate}
            endDate={salesEndDate}
            setEndDate={setSalesEndDate}
            boards={boards}
            users={users}
            loading={loading}
            report={salesReport}
            onGenerate={handleGenerateSalesReport}
            onExport={handleExportExcel}
          />
        )}

        {activeTab === 'conversion' && (
          <ConversionTab
            boardId={conversionBoardId}
            setBoardId={setConversionBoardId}
            period={conversionPeriod}
            setPeriod={setConversionPeriod}
            startDate={conversionStartDate}
            setStartDate={setConversionStartDate}
            endDate={conversionEndDate}
            setEndDate={setConversionEndDate}
            boards={boards}
            loading={loading}
            report={conversionReport}
            onGenerate={handleGenerateConversionReport}
            onExport={handleExportExcel}
          />
        )}

        {activeTab === 'transfers' && (
          <TransfersTab
            period={transferPeriod}
            setPeriod={setTransferPeriod}
            fromUserId={transferFromUserId}
            setFromUserId={setTransferFromUserId}
            toUserId={transferToUserId}
            setToUserId={setTransferToUserId}
            startDate={transferStartDate}
            setStartDate={setTransferStartDate}
            endDate={transferEndDate}
            setEndDate={setTransferEndDate}
            users={users}
            loading={loading}
            report={transferReport}
            onGenerate={handleGenerateTransferReport}
            onExport={handleExportExcel}
          />
        )}
    </div>
  );
};

// ==================== COMPONENTE AUXILIAR: SELECT MENU ====================
interface SelectOption {
  value: string;
  label: string;
}

interface SelectMenuProps {
  value: string;
  options: SelectOption[];
  placeholder?: string;
  onChange: (value: string) => void;
}

const SelectMenu: React.FC<SelectMenuProps> = ({ value, options, placeholder, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find((option) => option.value === value);
  const selectedLabel = selectedOption?.label || placeholder || 'Selecione';

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="w-full flex items-center justify-between gap-3 px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
      >
        <span className={`truncate ${selectedOption ? '' : 'text-slate-400'}`}>{selectedLabel}</span>
        <ChevronDown
          size={16}
          className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      {isOpen && (
        <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-lg border border-slate-700 bg-slate-900 shadow-lg">
          {options.map((option) => (
            <button
              key={option.value || option.label}
              type="button"
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className={`w-full px-4 py-2 text-left text-sm text-white hover:bg-slate-800 ${
                option.value === value ? 'bg-slate-800/70' : ''
              }`}
            >
              <span className="truncate">{option.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ==================== TAB 1: VENDAS ====================
interface SalesTabProps {
  period: PeriodType;
  setPeriod: (p: PeriodType) => void;
  boardId: string;
  setBoardId: (id: string) => void;
  userId: string;
  setUserId: (id: string) => void;
  startDate: string;
  setStartDate: (d: string) => void;
  endDate: string;
  setEndDate: (d: string) => void;
  boards: Board[];
  users: User[];
  loading: boolean;
  report: SalesReportResponse | null;
  onGenerate: () => void;
  onExport: () => void;
}

const SalesTab: React.FC<SalesTabProps> = ({
  period,
  setPeriod,
  boardId,
  setBoardId,
  userId,
  setUserId,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  boards,
  users,
  loading,
  report,
  onGenerate,
  onExport,
}) => {
  const periodOptions: SelectOption[] = [
    { value: 'today', label: 'Hoje' },
    { value: 'yesterday', label: 'Ontem' },
    { value: 'this_week', label: 'Esta Semana' },
    { value: 'last_week', label: 'Semana Passada' },
    { value: 'this_month', label: 'Este MÇ¦s' },
    { value: 'last_month', label: 'MÇ¦s Passado' },
    { value: 'this_quarter', label: 'Este Trimestre' },
    { value: 'last_quarter', label: 'Trimestre Passado' },
    { value: 'this_year', label: 'Este Ano' },
    { value: 'last_year', label: 'Ano Passado' },
    { value: 'custom', label: 'Personalizado' },
  ];
  const boardOptions: SelectOption[] = [
    { value: '', label: 'Todos os boards' },
    ...boards.map((board) => ({ value: String(board.id), label: board.name })),
  ];
  const userOptions: SelectOption[] = [
    { value: '', label: 'Todos os vendedores' },
    ...users.map((user) => ({ value: String(user.id), label: user.name })),
  ];

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Filtros</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Período</label>
            <SelectMenu
              value={period}
              options={periodOptions}
              onChange={(value) => setPeriod(value as PeriodType)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Board (Opcional)</label>
            <SelectMenu
              value={boardId}
              options={boardOptions}
              onChange={setBoardId}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Vendedor (Opcional)</label>
            <SelectMenu
              value={userId}
              options={userOptions}
              onChange={setUserId}
            />
          </div>

          {period === 'custom' && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Data Inicial</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Data Final</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </>
          )}
        </div>

        <div className="mt-4">
          <button
            onClick={onGenerate}
            disabled={loading}
            className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
          >
            {loading ? 'Gerando...' : 'Gerar Relatório'}
          </button>
        </div>
      </div>

      {/* Métricas */}
      {report && report.summary && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <MetricCard
              icon={<FileText className="text-blue-400" />}
              label="Cards Criados"
              value={report.summary.total_cards_created?.toString() || '0'}
            />
            <MetricCard
              icon={<TrendingUp className="text-emerald-400" />}
              label="Cards Ganhos"
              value={report.summary.total_cards_won?.toString() || '0'}
            />
            <MetricCard
              icon={<FileText className="text-red-400" />}
              label="Cards Perdidos"
              value={report.summary.total_cards_lost?.toString() || '0'}
            />
            <MetricCard
              icon={<TrendingUp className="text-emerald-400" />}
              label="Valor Ganho Total"
              value={reportService.formatCurrency(report.summary.total_value_won || 0)}
            />
            <MetricCard
              icon={<BarChart3 className="text-purple-400" />}
              label="Taxa de Conversão"
              value={reportService.formatPercentage(report.summary.conversion_rate || 0)}
            />
          </div>

          {/* Tabela */}
          <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white">Detalhamento</h3>
              <button
                onClick={onExport}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <Download size={16} />
                Exportar Excel
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-300">
                      Vendedor/Período
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-slate-300">
                      Cards Criados
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-slate-300">
                      Cards Ganhos
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-slate-300">
                      Cards Perdidos
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-slate-300">
                      Valor Ganho
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-slate-300">
                      Taxa
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {report.details?.map((item, index) => (
                    <tr key={index} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                      <td className="py-3 px-4 text-white">
                        {item.user_name || reportService.formatPeriod(item.period || '')}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-300">
                        {item.cards_created}
                      </td>
                      <td className="py-3 px-4 text-right text-emerald-400">
                        {item.cards_won}
                      </td>
                      <td className="py-3 px-4 text-right text-red-400">
                        {item.cards_lost}
                      </td>
                      <td className="py-3 px-4 text-right text-emerald-400">
                        {reportService.formatCurrency(item.value_won)}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-300">
                        {reportService.formatPercentage(item.conversion_rate)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Empty State */}
      {!report && !loading && (
        <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-lg p-12 text-center">
          <FileText size={48} className="text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400 text-lg">
            Selecione os filtros e clique em "Gerar Relatório" para visualizar os dados
          </p>
        </div>
      )}
    </div>
  );
};

// ==================== TAB 2: CONVERSÃO ====================
interface ConversionTabProps {
  boardId: string;
  setBoardId: (id: string) => void;
  period: PeriodType;
  setPeriod: (p: PeriodType) => void;
  startDate: string;
  setStartDate: (d: string) => void;
  endDate: string;
  setEndDate: (d: string) => void;
  boards: Board[];
  loading: boolean;
  report: ConversionReportResponse | null;
  onGenerate: () => void;
  onExport: () => void;
}

const ConversionTab: React.FC<ConversionTabProps> = ({
  boardId,
  setBoardId,
  period,
  setPeriod,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  boards,
  loading,
  report,
  onGenerate,
  onExport,
}) => {
  const periodOptions: SelectOption[] = [
    { value: 'today', label: 'Hoje' },
    { value: 'yesterday', label: 'Ontem' },
    { value: 'this_week', label: 'Esta Semana' },
    { value: 'last_week', label: 'Semana Passada' },
    { value: 'this_month', label: 'Este MÇ¦s' },
    { value: 'last_month', label: 'MÇ¦s Passado' },
    { value: 'this_quarter', label: 'Este Trimestre' },
    { value: 'last_quarter', label: 'Trimestre Passado' },
    { value: 'this_year', label: 'Este Ano' },
    { value: 'last_year', label: 'Ano Passado' },
    { value: 'custom', label: 'Personalizado' },
  ];
  const boardOptions: SelectOption[] = [
    { value: '', label: 'Selecione um board' },
    ...boards.map((board) => ({ value: String(board.id), label: board.name })),
  ];

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Filtros</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Board <span className="text-red-400">*</span>
            </label>
            <SelectMenu
              value={boardId}
              options={boardOptions}
              onChange={setBoardId}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Período</label>
            <SelectMenu
              value={period}
              options={periodOptions}
              onChange={(value) => setPeriod(value as PeriodType)}
            />
          </div>

          {period === 'custom' && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Data Inicial</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Data Final</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </>
          )}
        </div>

        <div className="mt-4">
          <button
            onClick={onGenerate}
            disabled={loading}
            className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
          >
            {loading ? 'Gerando...' : 'Gerar Relatório'}
          </button>
        </div>
      </div>

      {/* Métricas */}
      {report && report.summary && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MetricCard
              icon={<FileText className="text-blue-400" />}
              label="Total de Cards no Funil"
              value={report.summary.total_cards?.toString() || '0'}
            />
            <MetricCard
              icon={<TrendingUp className="text-emerald-400" />}
              label="Valor Total"
              value={reportService.formatCurrency(report.summary.total_value || 0)}
            />
            <MetricCard
              icon={<BarChart3 className="text-purple-400" />}
              label="Taxa de Conversão Geral"
              value={reportService.formatPercentage(report.summary.overall_conversion_rate || 0)}
            />
          </div>

          {/* Tabela */}
          <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white">Funil de Conversão</h3>
              <button
                onClick={onExport}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <Download size={16} />
                Exportar Excel
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-300">Etapa</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-slate-300">
                      Quantidade
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-slate-300">
                      Valor Total
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-slate-300">
                      Taxa de Conversão
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-slate-300">
                      Tempo Médio (dias)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {report.stages?.map((stage, index) => (
                    <tr key={index} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                      <td className="py-3 px-4 text-white">{stage.stage_name}</td>
                      <td className="py-3 px-4 text-right text-slate-300">{stage.card_count}</td>
                      <td className="py-3 px-4 text-right text-emerald-400">
                        {reportService.formatCurrency(stage.total_value)}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-300">
                        {reportService.formatPercentage(stage.conversion_rate)}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-300">
                        {stage.avg_time_in_stage?.toFixed(1) || '0.0'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Empty State */}
      {!report && !loading && (
        <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-lg p-12 text-center">
          <BarChart3 size={48} className="text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400 text-lg">
            Selecione um board e clique em "Gerar Relatório" para visualizar o funil de conversão
          </p>
        </div>
      )}
    </div>
  );
};

// ==================== TAB 3: TRANSFERÊNCIAS ====================
interface TransfersTabProps {
  period: PeriodType;
  setPeriod: (p: PeriodType) => void;
  fromUserId: string;
  setFromUserId: (id: string) => void;
  toUserId: string;
  setToUserId: (id: string) => void;
  startDate: string;
  setStartDate: (d: string) => void;
  endDate: string;
  setEndDate: (d: string) => void;
  users: User[];
  loading: boolean;
  report: TransferReportResponse | null;
  onGenerate: () => void;
  onExport: () => void;
}

const TransfersTab: React.FC<TransfersTabProps> = ({
  period,
  setPeriod,
  fromUserId,
  setFromUserId,
  toUserId,
  setToUserId,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  users,
  loading,
  report,
  onGenerate,
  onExport,
}) => {
  const periodOptions: SelectOption[] = [
    { value: 'today', label: 'Hoje' },
    { value: 'yesterday', label: 'Ontem' },
    { value: 'this_week', label: 'Esta Semana' },
    { value: 'last_week', label: 'Semana Passada' },
    { value: 'this_month', label: 'Este MÇ¦s' },
    { value: 'last_month', label: 'MÇ¦s Passado' },
    { value: 'this_quarter', label: 'Este Trimestre' },
    { value: 'last_quarter', label: 'Trimestre Passado' },
    { value: 'this_year', label: 'Este Ano' },
    { value: 'last_year', label: 'Ano Passado' },
    { value: 'custom', label: 'Personalizado' },
  ];
  const fromUserOptions: SelectOption[] = [
    { value: '', label: 'Qualquer usuÇ­rio' },
    ...users.map((user) => ({ value: String(user.id), label: user.name })),
  ];
  const toUserOptions: SelectOption[] = [
    { value: '', label: 'Qualquer usuÇ­rio' },
    ...users.map((user) => ({ value: String(user.id), label: user.name })),
  ];

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Filtros</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Período</label>
            <SelectMenu
              value={period}
              options={periodOptions}
              onChange={(value) => setPeriod(value as PeriodType)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">De (Opcional)</label>
            <SelectMenu
              value={fromUserId}
              options={fromUserOptions}
              onChange={setFromUserId}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Para (Opcional)</label>
            <SelectMenu
              value={toUserId}
              options={toUserOptions}
              onChange={setToUserId}
            />
          </div>

          {period === 'custom' && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Data Inicial</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Data Final</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </>
          )}
        </div>

        <div className="mt-4">
          <button
            onClick={onGenerate}
            disabled={loading}
            className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
          >
            {loading ? 'Gerando...' : 'Gerar Relatório'}
          </button>
        </div>
      </div>

      {/* Métricas */}
      {report && report.summary && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              icon={<ArrowRightLeft className="text-blue-400" />}
              label="Total de Transferências"
              value={report.summary.total_transfers?.toString() || '0'}
            />
            <MetricCard
              icon={<TrendingUp className="text-emerald-400" />}
              label="Cards Ganhos Após Transfer"
              value={report.summary.total_cards_won_after_transfer?.toString() || '0'}
            />
            <MetricCard
              icon={<TrendingUp className="text-emerald-400" />}
              label="Valor Total Ganho"
              value={reportService.formatCurrency(report.summary.total_value_won_after_transfer || 0)}
            />
            <MetricCard
              icon={<BarChart3 className="text-purple-400" />}
              label="Média de Dias para Ganhar"
              value={`${(report.summary.avg_days_to_won || 0).toFixed(1)} dias`}
            />
          </div>

          {/* Tabela */}
          <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white">Detalhamento de Transferências</h3>
              <button
                onClick={onExport}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <Download size={16} />
                Exportar Excel
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-300">
                      De → Para
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-slate-300">
                      Transferências
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-slate-300">
                      Cards Ganhos
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-slate-300">
                      Valor Ganho
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-slate-300">
                      Tempo Médio
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {report.details?.map((item, index) => (
                    <tr key={index} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                      <td className="py-3 px-4 text-white">
                        {item.from_user_name} → {item.to_user_name}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-300">
                        {item.transfer_count}
                      </td>
                      <td className="py-3 px-4 text-right text-emerald-400">
                        {item.cards_won_count}
                      </td>
                      <td className="py-3 px-4 text-right text-emerald-400">
                        {reportService.formatCurrency(item.total_value_won)}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-300">
                        {item.avg_days_to_won?.toFixed(1) || '0.0'} dias
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Empty State */}
      {!report && !loading && (
        <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-lg p-12 text-center">
          <ArrowRightLeft size={48} className="text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400 text-lg">
            Selecione os filtros e clique em "Gerar Relatório" para visualizar as transferências
          </p>
        </div>
      )}
    </div>
  );
};

// ==================== COMPONENTE AUXILIAR: METRIC CARD ====================
interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ icon, label, value }) => {
  return (
    <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-lg p-6">
      <div className="flex items-center gap-3 mb-2">
        {icon}
        <span className="text-sm text-slate-400">{label}</span>
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
    </div>
  );
};

export default Reports;
