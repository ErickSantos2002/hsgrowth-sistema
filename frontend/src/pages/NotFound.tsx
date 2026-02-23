import React from 'react';
import { Link } from 'react-router-dom';

const NotFound: React.FC = () => {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 dark:bg-slate-900">
      <h1 className="mb-4 text-6xl font-extrabold text-blue-600 dark:text-blue-400">404</h1>
      <p className="mb-6 text-xl text-gray-700 dark:text-gray-300">Página não encontrada.</p>
      <Link
        to="/dashboard"
        className="rounded-lg bg-blue-600 px-6 py-2 font-semibold text-white shadow transition-colors hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
      >
        Voltar ao Dashboard
      </Link>
    </div>
  );
};

export default NotFound;
