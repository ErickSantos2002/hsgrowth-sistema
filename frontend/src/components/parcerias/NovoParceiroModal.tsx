import { useEffect, useState } from "react";
import { BaseModal, Button, FormField, Input } from "../common";
import { showError } from "../../utils/toast";
import parceriasService, { Parceiro, ParceiroForm, mensagemDeErro } from "../../services/parceriasService";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCriado: (parceiro: Parceiro) => void;
}

const VAZIO: ParceiroForm = {
  name: "", cnpj: "", main_contact_name: "", main_contact_phone: "", main_contact_email: "",
  partner_type: "", origin: "", segment: "", region: "",
};

export default function NovoParceiroModal({ isOpen, onClose, onCriado }: Props) {
  const [form, setForm] = useState<ParceiroForm>(VAZIO);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (isOpen) setForm(VAZIO);
  }, [isOpen]);

  const campo = (nome: keyof ParceiroForm) => ({
    value: (form[nome] as string) ?? "",
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [nome]: e.target.value }),
  });

  const salvar = async () => {
    setSalvando(true);
    try {
      // Campo vazio vai como null para não gravar texto em branco.
      const dados = Object.fromEntries(
        Object.entries(form).map(([k, v]) => [k, typeof v === "string" && v.trim() === "" ? null : v])
      ) as ParceiroForm;
      onCriado(await parceriasService.criarParceiro(dados));
    } catch (e) {
      showError(mensagemDeErro(e, "Erro ao cadastrar o parceiro."));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Novo parceiro"
      size="lg"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={salvar} loading={salvando} disabled={!form.name?.trim()}>Cadastrar</Button>
        </div>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Parceiro / empresa" required className="sm:col-span-2"><Input {...campo("name")} /></FormField>
        <FormField label="CNPJ"><Input {...campo("cnpj")} /></FormField>
        <FormField label="Tipo de parceiro"><Input {...campo("partner_type")} /></FormField>
        <FormField label="Contato principal"><Input {...campo("main_contact_name")} /></FormField>
        <FormField label="Telefone do contato"><Input {...campo("main_contact_phone")} /></FormField>
        <FormField label="E-mail do contato"><Input type="email" {...campo("main_contact_email")} /></FormField>
        <FormField label="Origem do parceiro"><Input {...campo("origin")} /></FormField>
        <FormField label="Segmento"><Input {...campo("segment")} /></FormField>
        <FormField label="Região"><Input {...campo("region")} /></FormField>
      </div>
    </BaseModal>
  );
}
