import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';

// Lazy loading de páginas para melhor performance
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const NotFound = lazy(() => import('./pages/NotFound'));

import ProtectedRoute from './components/ProtectedRoute';

// Loading Fallback Component
const PageLoader: React.FC = () => (
  <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
    <div className="text-center">
      <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto"></div>
      <p className="mt-4 text-slate-300">Carregando...</p>
    </div>
  </div>
);

const AppRoutes: React.FC = () => (
  <Suspense fallback={<PageLoader />}>
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
        <Route path="/boards" element={<Dashboard />} />
        <Route path="/cards" element={<Dashboard />} />
        <Route path="/clients" element={<Dashboard />} />
        <Route path="/gamification" element={<Dashboard />} />
        <Route path="/transfers" element={<Dashboard />} />
        <Route path="/reports" element={<Dashboard />} />
        <Route path="/automations" element={<Dashboard />} />
        <Route path="/notifications" element={<Dashboard />} />
        <Route path="/settings" element={<Dashboard />} />
        <Route path="/users" element={<Dashboard />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  </Suspense>
);

export default AppRoutes;
