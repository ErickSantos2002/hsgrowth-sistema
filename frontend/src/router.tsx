import React from 'react';
import { Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import ProtectedRoute from './components/ProtectedRoute';

// Importação direta (sem lazy loading) para navegação instantânea
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Boards from './pages/Boards';
import Cards from './pages/Cards';
import Clients from './pages/Clients';
import Gamification from './pages/Gamification';
import Transfers from './pages/Transfers';
import Reports from './pages/Reports';
import Automations from './pages/Automations';
import Notifications from './pages/Notifications';
import Settings from './pages/Settings';
import Users from './pages/Users';
import NotFound from './pages/NotFound';

const AppRoutes: React.FC = () => (
  <Routes>
    <Route path="/login" element={<Login />} />

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
      <Route path="/boards" element={<Boards />} />
      <Route path="/cards" element={<Cards />} />
      <Route path="/clients" element={<Clients />} />
      <Route path="/gamification" element={<Gamification />} />
      <Route path="/transfers" element={<Transfers />} />
      <Route path="/reports" element={<Reports />} />
      <Route path="/automations" element={<Automations />} />
      <Route path="/notifications" element={<Notifications />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/users" element={<Users />} />
    </Route>

    <Route path="*" element={<NotFound />} />
  </Routes>
);

export default AppRoutes;
