import { useEffect, useState } from "react";
import { BaseModal, Button, FormField, Input, SelectMenu, Textarea } from "../common";
import { showError } from "../../utils/toast";
import { DEAL_TYPES, RELATIONSHIP_TYPES, SECTORS } from "../../constants/blueprintOptions";
import parceriasService, {
  Membro, Oportunidade, OportunidadeForm, Parceiro, mensagemDeErro,
} from "../../services/parceriasService";
import { errosDoForm, propsDeTexto } from "./campos";

interface Props {
  isOpen: boolean;
  /** Parceiros que o usuário enxerga: o parceiro vê só o dele (um). */
  parceiros: Parceiro[];
  /** Admin/gerente escolhem o parceiro; o parceiro cria sempre no próprio canal. */
  escolheParceiro: boolean;
  onClose: () => void;
  onCriada: (op: Oportunidade) => void;
}

const opcoes = (lista: string[]) => lista.map((v) => ({ value: v, label: v }));

const VAZIO: OportunidadeForm = {
  title: "", deal_type: "", sector: "", relationship_type: "", context: "", cnpj: "", company_name: "",
  company_city: "", company_state: "", contact_name: "", contact_role: "", contact_phone: "", contact_email: "",
};

export default function NovaOportunidadeModal({ isOpen, parceiros, escolheParceiro, onClose, onCriada }: Props) {
  const [form, setForm] = useState<OportunidadeForm>(VAZIO);
  const [equipe, setEquipe] = useState<Membro[]>([]);
  const [salvando, setSalvando] = useState(false);

  const partnerId = escolheParceiro ? form.partner_id : parceiros[0]?.id;

  useEffect(() => {
    if (isOpen) setForm(VAZIO);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !partnerId) {
      setEquipe([]);
      return;
    }
    parceriasService.listarEquipe(partnerId).then((m) => setEquipe(m.filter((x) => x.is_active))).catch(() => setEquipe([]));
  }, [isOpen, partnerId]);

  const texto = (nome: keyof OportunidadeForm & string) => propsDeTexto(form, setForm, nome);
  const erros = errosDoForm(form);

  const obrigatorios = [form.title, form.deal_type, form.sector, form.relationship_type, form.context, form.cnpj, form.company_name];
  const pronto = obrigatorios.every((v) => (v ?? "").toString().trim() !== "") && (!escolheParceiro || !!form.partner_id)
    && Object.keys(erros).length === 0;

  const salvar = async () => {
    setSalvando(true);
    try {
      const dados = Object.fromEntries(
        Object.entries(form).map(([k, v]) => [k, typeof v === "string" && v.trim() === "" ? null : v])
      ) as OportunidadeForm;
      onCriada(await parceriasService.criarOportunidade(dados));
    } catch (e) {
      showError(mensagemDeErro(e, "Erro ao cadastrar a oportunidade."));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Nova oportunidade"
      subtitle="Entra em Novo Lead com a elegibilidade Em análise."
      size="xl"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={salvar} loading={salvando} disabled={!pronto}>Cadastrar</Button>
        </div>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {escolheParceiro && (
          <FormField label="Parceiro" required>
            <SelectMenu
              value={form.partner_id ? String(form.partner_id) : ""}
              placeholder="Escolha o parceiro"
              options={parceiros.map((p) => ({ value: String(p.id), label: p.name }))}
              onChange={(v) => setForm({ ...form, partner_id: Number(v), seller_member_id: null })}
            />
          </FormField>
        )}
        <FormField label="Vendedor responsável">
          <SelectMenu
            value={form.seller_member_id ? String(form.seller_member_id) : ""}
            placeholder={equipe.length ? "Escolha" : "Cadastre a equipe no card do parceiro"}
            disabled={!equipe.length}
            options={equipe.map((m) => ({ value: String(m.id), label: m.name }))}
            onChange={(v) => setForm({ ...form, seller_member_id: Number(v) })}
          />
        </FormField>
        <FormField label="Título do card" required className="sm:col-span-2"><Input {...texto("title")} /></FormField>
        <FormField label="Tipo de negócio" required>
          <SelectMenu value={form.deal_type ?? ""} placeholder="Escolha" options={opcoes(DEAL_TYPES)} onChange={(v) => setForm({ ...form, deal_type: v })} />
        </FormField>
        <FormField label="Tipo de relacionamento" required>
          <SelectMenu value={form.relationship_type ?? ""} placeholder="Escolha" options={opcoes(RELATIONSHIP_TYPES)} onChange={(v) => setForm({ ...form, relationship_type: v })} />
        </FormField>
        <FormField label="Setor da empresa" required className="sm:col-span-2">
          <SelectMenu value={form.sector ?? ""} placeholder="Escolha" options={opcoes(SECTORS)} onChange={(v) => setForm({ ...form, sector: v })} />
        </FormField>
        <FormField label="CNPJ" required error={erros.cnpj}><Input {...texto("cnpj")} placeholder="00.000.000/0000-00" /></FormField>
        <FormField label="Razão social / nome" required><Input {...texto("company_name")} /></FormField>
        <FormField label="Cidade"><Input {...texto("company_city")} /></FormField>
        <FormField label="UF" error={erros.company_state}><Input {...texto("company_state")} placeholder="SP" /></FormField>
        <FormField label="Contexto da indicação e necessidade" required className="sm:col-span-2"
          hint={`${(form.context ?? "").length}/2000`}>
          <Textarea {...texto("context")} rows={3} />
        </FormField>
        <FormField label="Contato"><Input {...texto("contact_name")} /></FormField>
        <FormField label="Cargo"><Input {...texto("contact_role")} /></FormField>
        <FormField label="Telefone" error={erros.contact_phone}><Input {...texto("contact_phone")} placeholder="(00) 00000-0000" /></FormField>
        <FormField label="E-mail" error={erros.contact_email}><Input type="email" {...texto("contact_email")} placeholder="nome@empresa.com.br" /></FormField>
      </div>
    </BaseModal>
  );
}
