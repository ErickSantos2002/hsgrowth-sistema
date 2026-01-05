import React from 'react';
import { Helmet } from 'react-helmet';

interface EmConstrucaoProps {
  titulo: string;
}

const EmConstrucao: React.FC<EmConstrucaoProps> = ({ titulo }) => {
  return (
    <div
      className="flex flex-col items-center justify-center h-[calc(100vh-80px)] text-center px-4 
                    bg-gray-50 dark:bg-[#0f172a] transition-colors"
    >
      <Helmet>
        <title>{titulo} | DataCoreHS</title>
      </Helmet>

      <h1 className="text-4xl font-bold text-blue-600 dark:text-yellow-400 mb-4 transition-colors">
        Em construção
      </h1>

      <p className="text-lg text-gray-700 dark:text-gray-300 max-w-md transition-colors">
        Em breve teremos gráficos e análises aqui para ajudar na sua tomada de
        decisão.
      </p>
    </div>
  );
};

export default EmConstrucao;
