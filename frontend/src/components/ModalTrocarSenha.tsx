import React, { useState } from 'react';

interface ModalTrocarSenhaProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (novaSenha: string) => void;
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
    <div className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-50 transition-opacity">
      {/* 🔧 Ajuste principal: padding e espaçamento idêntico à modal dos logs */}
      <div
        className="bg-white/95 dark:bg-[#1e1e1e]/95 
                   border border-gray-200 dark:border-[#2d2d2d] 
                   rounded-xl shadow-xl p-8 sm:p-6 
                   max-w-md w-[90%] sm:w-full 
                   mx-4 sm:mx-0 transition-colors"
      >
        {/* Cabeçalho */}
        <h2 className="text-xl font-bold mb-6 text-center text-gray-900 dark:text-[#facc15] tracking-tight">
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
              className="w-full mt-1 px-3 py-2 border rounded-lg
                         bg-white dark:bg-[#181818]
                         text-gray-800 dark:text-gray-200
                         border-gray-300 dark:border-gray-600
                         focus:outline-none focus:ring-2 focus:ring-blue-500
                         transition-colors"
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
              className="w-full mt-1 px-3 py-2 border rounded-lg
                         bg-white dark:bg-[#181818]
                         text-gray-800 dark:text-gray-200
                         border-gray-300 dark:border-gray-600
                         focus:outline-none focus:ring-2 focus:ring-blue-500
                         transition-colors"
            />
          </div>
        </div>

        {/* Botões */}
        <div className="mt-8 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg font-medium
                       bg-gray-300 hover:bg-gray-400
                       dark:bg-[#2a2a2a] dark:hover:bg-[#3a3a3a]
                       text-gray-800 dark:text-gray-100
                       transition-colors"
          >
            Cancelar
          </button>

          <button
            onClick={handleConfirm}
            className="px-4 py-2 rounded-lg font-medium
                       bg-blue-600 hover:bg-blue-700
                       text-white shadow-sm
                       transition-colors"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalTrocarSenha;
