import React from 'react';
import { Link } from 'react-router-dom';

const NotFound: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <h1 className="text-6xl font-extrabold text-blue-600 mb-4">404</h1>
      <p className="text-xl text-gray-700 mb-6">Página não encontrada.</p>
      <Link
        to="/dashboard"
        className="px-6 py-2 rounded-lg bg-blue-600 text-white font-semibold shadow hover:bg-blue-700 transition-colors"
      >
        Voltar ao Dashboard
      </Link>
    </div>
  );
};

export default NotFound;
