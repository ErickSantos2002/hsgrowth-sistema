import React, { useState } from 'react';

interface ModalTrocarSenhaProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (_novaSenha: string) => void;
}

const ModalTrocarSenha: React.FC<ModalTrocarSenhaProps> = ({
  isOpen,
  onClose,
  onConfirm,
}) => {
  const [novaSenha, setNovaSenha] = useState('');
  const [repitaSenha, setRepitaSenha] = useState('');

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (novaSenha !== repitaSenha) {
      alert('As senhas não coincidem!');
      return;
    }
    onConfirm(novaSenha);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity">
      {/* 🔧 Ajuste principal: padding e espaçamento idêntico à modal dos logs */}
      <div
        className="mx-4 w-[90%] 
                   max-w-md rounded-xl border 
                   border-gray-200 bg-white/95 p-8 shadow-xl 
                   transition-colors sm:mx-0 sm:w-full 
                   sm:p-6 dark:border-[#2d2d2d] dark:bg-[#1e1e1e]/95"
      >
        {/* Cabeçalho */}
        <h2 className="mb-6 text-center text-xl font-bold tracking-tight text-gray-900 dark:text-[#facc15]">
          Trocar Senha
        </h2>

        {/* Campos */}
        <div className="flex flex-col gap-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Nova senha:
            </label>
            <input
              type="password"
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 bg-white
                         px-3 py-2
                         text-gray-800 transition-colors
                         focus:outline-none focus:ring-2
                         focus:ring-blue-500 dark:border-gray-600 dark:bg-[#181818]
                         dark:text-gray-200"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Repita nova senha:
            </label>
            <input
              type="password"
              value={repitaSenha}
              onChange={(e) => setRepitaSenha(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 bg-white
                         px-3 py-2
                         text-gray-800 transition-colors
                         focus:outline-none focus:ring-2
                         focus:ring-blue-500 dark:border-gray-600 dark:bg-[#181818]
                         dark:text-gray-200"
            />
          </div>
        </div>

        {/* Botões */}
        <div className="mt-8 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-lg bg-gray-300 px-4 py-2
                       font-medium text-gray-800
                       transition-colors hover:bg-gray-400
                       dark:bg-[#2a2a2a] dark:text-gray-100
                       dark:hover:bg-[#3a3a3a]"
          >
            Cancelar
          </button>

          <button
            onClick={handleConfirm}
            className="rounded-lg bg-blue-600 px-4 py-2
                       font-medium text-white
                       shadow-sm transition-colors
                       hover:bg-blue-700"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalTrocarSenha;
