import React from 'react';
import { Helmet } from 'react-helmet';

const Bloqueio: React.FC = () => {
  return (
    <div className="p-6 h-full bg-gray-50 dark:bg-[#0f172a] flex flex-col items-center justify-center text-center transition-colors">
      <Helmet>
        <title>Acesso negado | DataCoreHS</title>
      </Helmet>

      <h1
        className="
        text-4xl font-bold mb-4 
        animate-blinkLight dark:animate-blinkDark
      "
      >
        Acesso negado
      </h1>

      <p className="text-lg text-gray-700 dark:text-gray-300 max-w-md">
        Você não tem permissão para acessar esta página.
      </p>
    </div>
  );
};

export default Bloqueio;
