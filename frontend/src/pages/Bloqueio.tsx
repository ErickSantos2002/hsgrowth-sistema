import React from 'react';
import { Helmet } from 'react-helmet';

const Bloqueio: React.FC = () => {
  return (
    <div className="flex h-full flex-col items-center justify-center bg-gray-50 p-6 text-center transition-colors dark:bg-surface-base">
      <Helmet>
        <title>Acesso negado | DataCoreHS</title>
      </Helmet>

      <h1
        className="
        animate-blinkLight dark:animate-blinkDark mb-4 
        text-4xl font-bold
      "
      >
        Acesso negado
      </h1>

      <p className="max-w-md text-lg text-gray-700 dark:text-gray-300">
        Você não tem permissão para acessar esta página.
      </p>
    </div>
  );
};

export default Bloqueio;
