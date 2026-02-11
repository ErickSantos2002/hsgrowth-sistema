import React, { useState } from 'react';
import { BaseModal, FormField, Input, Button } from './common';
import { showError } from '../utils/toast';

interface ModalTrocarSenhaProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (_novaSenha: string) => void;
}

/**
 * Modal para trocar senha do usuário
 * Valida se as senhas coincidem antes de confirmar
 */
const ModalTrocarSenha: React.FC<ModalTrocarSenhaProps> = ({
  isOpen,
  onClose,
  onConfirm,
}) => {
  const [novaSenha, setNovaSenha] = useState('');
  const [repitaSenha, setRepitaSenha] = useState('');
  const [errors, setErrors] = useState<{ novaSenha?: string; repitaSenha?: string }>({});

  /**
   * Valida os campos do formulário
   */
  const validate = (): boolean => {
    const newErrors: { novaSenha?: string; repitaSenha?: string } = {};

    if (!novaSenha.trim()) {
      newErrors.novaSenha = 'Nova senha é obrigatória';
    } else if (novaSenha.length < 6) {
      newErrors.novaSenha = 'Senha deve ter pelo menos 6 caracteres';
    }

    if (!repitaSenha.trim()) {
      newErrors.repitaSenha = 'Confirmação de senha é obrigatória';
    } else if (novaSenha !== repitaSenha) {
      newErrors.repitaSenha = 'As senhas não coincidem';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handler de confirmação
   */
  const handleConfirm = () => {
    if (!validate()) {
      return;
    }

    onConfirm(novaSenha);

    // Reset form
    setNovaSenha('');
    setRepitaSenha('');
    setErrors({});
    onClose();
  };

  /**
   * Handler de fechamento (reset form)
   */
  const handleClose = () => {
    setNovaSenha('');
    setRepitaSenha('');
    setErrors({});
    onClose();
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Trocar Senha"
      subtitle="Defina uma nova senha para sua conta"
      size="md"
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={handleClose}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={handleConfirm}
            disabled={!novaSenha.trim() || !repitaSenha.trim()}
          >
            Confirmar
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Nova senha */}
        <FormField label="Nova senha" required error={errors.novaSenha}>
          <Input
            type="password"
            value={novaSenha}
            onChange={(e) => setNovaSenha(e.target.value)}
            placeholder="Digite a nova senha"
            error={!!errors.novaSenha}
            autoFocus
          />
        </FormField>

        {/* Repetir senha */}
        <FormField label="Repetir nova senha" required error={errors.repitaSenha}>
          <Input
            type="password"
            value={repitaSenha}
            onChange={(e) => setRepitaSenha(e.target.value)}
            placeholder="Digite a senha novamente"
            error={!!errors.repitaSenha}
          />
        </FormField>
      </div>
    </BaseModal>
  );
};

export default ModalTrocarSenha;
