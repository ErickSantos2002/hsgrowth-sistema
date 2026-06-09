import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import ProtectedRoute from './components/ProtectedRoute';
import { useAuth } from './hooks/useAuth';

// Importação direta (sem lazy loading) para navegação instantânea
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Boards from './pages/Boards';
import KanbanBoard from './pages/KanbanBoard';
import ServiceBoards from './pages/ServiceBoards';
import ServiceKanban from './pages/ServiceKanban';
import ServiceCardDetails from './pages/ServiceCardDetails';
import CardDetails from './pages/CardDetails';
import Clients from './pages/Clients';
import Persons from './pages/Persons';
import Products from './pages/Products';
import Gamification from './pages/Gamification';
import Transfers from './pages/Transfers';
import Reports from './pages/Reports';
import Automations from './pages/Automations';
import AutomationEditor from './pages/AutomationEditor';
import Notifications from './pages/Notifications';
import Settings from './pages/Settings';
import Users from './pages/Users';
import BadgesAdmin from './pages/BadgesAdmin';
import Calendar from './pages/Calendar';
import Activities from './pages/Activities';
import CallEvaluationsPage from './pages/CallEvaluationsPage';
import NotFound from './pages/NotFound';
import AuthCallback from './pages/AuthCallback';

/**
 * Componente que protege rotas não permitidas para o role 'viewer'.
 * Se o usuário for viewer e tentar acessar uma rota não autorizada,
 * redireciona para /boards (página principal do viewer).
 */
const ViewerGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    if (user?.role === 'viewer') {
        return <Navigate to="/boards" replace />;
    }
    return <>{children}</>;
};

const AppRoutes: React.FC = () => (
  <Routes>
    <Route path="/login" element={<Login />} />
    <Route path="/auth/callback" element={<AuthCallback />} />

    {/* Editor de automações (fullscreen, sem MainLayout) - bloqueado para viewer */}
    <Route
      path="/automations/new"
      element={
        <ProtectedRoute>
          <ViewerGuard>
            <AutomationEditor />
          </ViewerGuard>
        </ProtectedRoute>
      }
    />
    <Route
      path="/automations/:id/edit"
      element={
        <ProtectedRoute>
          <ViewerGuard>
            <AutomationEditor />
          </ViewerGuard>
        </ProtectedRoute>
      }
    />

    {/* Rotas protegidas com MainLayout */}
    <Route
      element={
        <ProtectedRoute>
          <MainLayout />
        </ProtectedRoute>
      }
    >
      <Route path="/" element={<Dashboard />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/boards" element={<Boards category="vendas" />} />
      <Route path="/boards/:boardId" element={<KanbanBoard />} />
      <Route path="/servicos" element={<ServiceBoards />} />
      <Route path="/servicos/:boardId" element={<ServiceKanban />} />
      <Route path="/servicos/:boardId/cards/:cardId" element={<ServiceCardDetails />} />
      <Route path="/cards/:cardId" element={<CardDetails />} />
      <Route path="/activities" element={<Activities />} />
      <Route path="/clients" element={<Clients />} />
      <Route path="/persons" element={<Persons />} />
      <Route path="/products" element={<Products />} />
      {/* Rotas bloqueadas para viewer - redirecionam para /boards */}
      <Route path="/gamification" element={<ViewerGuard><Gamification /></ViewerGuard>} />
      <Route path="/transfers" element={<ViewerGuard><Transfers /></ViewerGuard>} />
      <Route path="/reports" element={<ViewerGuard><Reports /></ViewerGuard>} />
      <Route path="/automations" element={<ViewerGuard><Automations /></ViewerGuard>} />
      <Route path="/notifications" element={<ViewerGuard><Notifications /></ViewerGuard>} />
      <Route path="/settings" element={<ViewerGuard><Settings /></ViewerGuard>} />
      <Route path="/users" element={<ViewerGuard><Users /></ViewerGuard>} />
      <Route path="/admin/badges" element={<ViewerGuard><BadgesAdmin /></ViewerGuard>} />
      <Route path="/calendar" element={<ViewerGuard><Calendar /></ViewerGuard>} />
      <Route path="/ligacoes" element={<ViewerGuard><CallEvaluationsPage /></ViewerGuard>} />
    </Route>

    <Route path="*" element={<NotFound />} />
  </Routes>
);

export default AppRoutes;
