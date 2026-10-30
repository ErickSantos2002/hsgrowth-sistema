import { useEffect, useState } from "react";
import { BaseModal, Button, FormField, Input, SelectMenu, Textarea } from "../common";
import type { MoverPayload } from "../../services/parceriasService";

export interface Faltas {
  motivo: boolean;
  data: boolean;
  modalidade: boolean;
}

/** O que a tela precisa pedir antes de mover uma oportunidade (board 2). */
export function faltasParaMover(
  destino: string,
  op?: { expected_close_date?: string | null; modality?: string | null }
): Faltas {
  return {
    motivo: destino === "perdido",
    data: !!op && ["negociacao", "aguardando_pedido", "ganho"].includes(destino) && !op.expected_close_date,
    modalidade: !!op && destino === "ganho" && !op.modality,
  };
}

export const temFalta = (f: Faltas) => f.motivo || f.data || f.modalidade;

interface Props {
  isOpen: boolean;
  destinoNome: string;
  faltas: Faltas;
  /** Lista de motivos (board 2). Sem lista, o motivo é texto livre (board 1). */
  motivos?: string[];
  onConfirmar: (extras: Partial<MoverPayload>) => void;
  onClose: () => void;
}

export default function ModalTrava({ isOpen, destinoNome, faltas, motivos, onConfirmar, onClose }: Props) {
  const [motivo, setMotivo] = useState("");
  const [detalhe, setDetalhe] = useState("");
  const [data, setData] = useState("");
  const [modalidade, setModalidade] = useState("");

  useEffect(() => {
    if (isOpen) {
      setMotivo("");
      setDetalhe("");
      setData("");
      setModalidade("");
    }
  }, [isOpen]);

  const pronto =
    (!faltas.motivo || motivo.trim() !== "") && (!faltas.data || data !== "") && (!faltas.modalidade || modalidade !== "");

  const confirmar = () => {
    const extras: Partial<MoverPayload> = {};
    if (faltas.motivo) {
      extras.loss_reason = motivo.trim();
      if (detalhe.trim()) extras.loss_detail = detalhe.trim();
    }
    if (faltas.data) extras.expected_close_date = data;
    if (faltas.modalidade) extras.modality = modalidade as "venda" | "locacao";
    onConfirmar(extras);
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={`Mover para ${destinoNome}`}
      size="sm"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={confirmar} disabled={!pronto}>Mover</Button>
        </div>
      }
    >
      <div className="space-y-4">
        {faltas.motivo && (
          <FormField label="Motivo da perda" required>
            {motivos ? (
              <SelectMenu
                value={motivo}
                placeholder="Escolha o motivo"
                options={motivos.map((m) => ({ value: m, label: m }))}
                onChange={setMotivo}
              />
            ) : (
              <Input value={motivo} onChange={(e) => setMotivo(e.target.value)} maxLength={255} />
            )}
          </FormField>
        )}
        {faltas.motivo && (
          <FormField label="Detalhe">
            <Textarea value={detalhe} onChange={(e) => setDetalhe(e.target.value)} rows={2} />
          </FormField>
        )}
        {faltas.data && (
          <FormField label="Data esperada de fechamento" required>
            <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
          </FormField>
        )}
        {faltas.modalidade && (
          <FormField label="É venda ou locação?" required>
            <SelectMenu
              value={modalidade}
              placeholder="Escolha"
              options={[
                { value: "venda", label: "Venda" },
                { value: "locacao", label: "Locação" },
              ]}
              onChange={setModalidade}
            />
          </FormField>
        )}
      </div>
    </BaseModal>
  );
}
