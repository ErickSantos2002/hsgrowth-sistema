import { useEffect, useState } from "react";
import { BaseModal, Button, FormField, Input } from "../common";
import { showError } from "../../utils/toast";
import parceriasService, { Parceiro, ParceiroForm, mensagemDeErro } from "../../services/parceriasService";
import { errosDoForm, propsDeTexto } from "./campos";

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

  const campo = (nome: keyof ParceiroForm & string) => propsDeTexto(form, setForm, nome);
  const erros = errosDoForm(form);

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
          <Button onClick={salvar} loading={salvando} disabled={!form.name?.trim() || Object.keys(erros).length > 0}>Cadastrar</Button>
        </div>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Parceiro / empresa" required className="sm:col-span-2"><Input {...campo("name")} /></FormField>
        <FormField label="CNPJ" error={erros.cnpj}><Input {...campo("cnpj")} placeholder="00.000.000/0000-00" /></FormField>
        <FormField label="Tipo de parceiro"><Input {...campo("partner_type")} /></FormField>
        <FormField label="Contato principal"><Input {...campo("main_contact_name")} /></FormField>
        <FormField label="Telefone do contato" error={erros.main_contact_phone}>
          <Input {...campo("main_contact_phone")} placeholder="(00) 00000-0000" />
        </FormField>
        <FormField label="E-mail do contato" error={erros.main_contact_email}>
          <Input type="email" {...campo("main_contact_email")} placeholder="nome@empresa.com.br" />
        </FormField>
        <FormField label="Origem do parceiro"><Input {...campo("origin")} /></FormField>
        <FormField label="Segmento"><Input {...campo("segment")} /></FormField>
        <FormField label="Região"><Input {...campo("region")} /></FormField>
      </div>
    </BaseModal>
  );
}
