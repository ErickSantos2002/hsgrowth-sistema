import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <span className="text-gray-500 text-lg">Carregando...</span>
      </div>
    );
  }

  // Se não está autenticado, redireciona para login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Se está autenticado, renderiza os filhos (página protegida)
  return <>{children}</>;
};

export default ProtectedRoute;
