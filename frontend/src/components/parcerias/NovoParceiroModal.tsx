import { useEffect, useState } from "react";
import { BaseModal, Button, FormField, Input, SelectMenu } from "../common";
import { showError, showSuccess, showWarning } from "../../utils/toast";
import parceriasService, { Hunter, HunterForm, Parceiro, ParceiroForm, mensagemDeErro } from "../../services/parceriasService";
import type { ModoAcesso } from "../../services/acessosService";
import FormularioDeAcesso from "../acessos/FormularioDeAcesso";
import { maskCPF, limparDocumento } from "../../utils/formatters";
import { emailValido, erroDoCampo, errosDoForm, mascarar, propsDeTexto } from "./campos";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** Empresa criada: abre o card dela. */
  onCriado: (parceiro: Parceiro) => void;
  /** Hunter criado (card + login na mesma hora): o board recarrega. */
  onHunterCriado: () => void;
}

const VAZIO: ParceiroForm = {
  name: "", cnpj: "", main_contact_name: "", main_contact_phone: "", main_contact_email: "",
  partner_type: "", origin: "", segment: "", region: "", pix_key: "", indicated_by_partner_id: null,
};

const HUNTER_VAZIO = { name: "", documento: "", email: "", phone: "", pix_key: "" };

type Tipo = "empresa" | "hunter";

/** Abas no mesmo formato da modal de Usuários (Pessoa/Empresa do hunter). */
function Abas<T extends string>({ valor, opcoes, onMudar }: { valor: T; opcoes: [T, string][]; onMudar: (v: T) => void }) {
  return (
    <div className="grid grid-cols-2 overflow-hidden rounded-lg border border-gray-200 dark:border-slate-700">
      {opcoes.map(([v, rotulo]) => (
        <button
          key={v}
          type="button"
          onClick={() => onMudar(v)}
          className={`px-3 py-2.5 text-sm font-medium transition-colors ${
            valor === v
              ? "bg-emerald-600 text-white"
              : "text-slate-500 hover:bg-gray-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-700/50 dark:hover:text-white"
          }`}
        >
          {rotulo}
        </button>
      ))}
    </div>
  );
}

export default function NovoParceiroModal({ isOpen, onClose, onCriado, onHunterCriado }: Props) {
  const [tipo, setTipo] = useState<Tipo>("empresa");
  const [form, setForm] = useState<ParceiroForm>(VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [hunters, setHunters] = useState<Hunter[]>([]);

  // Hunter: pessoa (CPF) ou empresa (CNPJ); o login é criado junto, por convite ou senha inicial.
  const [h, setH] = useState(HUNTER_VAZIO);
  const [tipoHunter, setTipoHunter] = useState<"pessoa" | "empresa">("pessoa");
  const [acesso, setAcesso] = useState<{ modo: ModoAcesso; password: string }>({ modo: "convite", password: "" });

  useEffect(() => {
    if (!isOpen) return;
    setTipo("empresa");
    setForm(VAZIO);
    setH(HUNTER_VAZIO);
    setTipoHunter("pessoa");
    setAcesso({ modo: "convite", password: "" });
    parceriasService.listarHunters().then(setHunters).catch(() => setHunters([]));
  }, [isOpen]);

  const campo = (nome: keyof ParceiroForm & string) => propsDeTexto(form, setForm, nome);
  const erros = errosDoForm(form);

  // Conferências do hunter, iguais às da modal de Usuários.
  const erroDocumento = !h.documento.trim()
    ? undefined
    : tipoHunter === "pessoa"
      ? limparDocumento(h.documento).length !== 11 ? "CPF com 11 números" : undefined
      : erroDoCampo("cnpj", h.documento);
  const erroEmail = h.email.trim() && !emailValido(h.email) ? "E-mail inválido" : undefined;
  const erroTelefone = erroDoCampo("phone", h.phone);
  const hunterValido =
    h.name.trim() !== "" && h.documento.trim() !== "" && h.email.trim() !== "" &&
    !erroDocumento && !erroEmail && !erroTelefone &&
    (acesso.modo === "convite" || acesso.password.length >= 8);

  const salvarEmpresa = async () => {
    // Campo vazio vai como null para não gravar texto em branco.
    const dados = Object.fromEntries(
      Object.entries(form).map(([k, v]) => [k, typeof v === "string" && v.trim() === "" ? null : v])
    ) as ParceiroForm;
    onCriado(await parceriasService.criarParceiro(dados));
  };

  const salvarHunter = async () => {
    const dados: HunterForm = {
      name: h.name.trim(),
      email: h.email.trim(),
      [tipoHunter === "pessoa" ? "cpf" : "cnpj"]: limparDocumento(h.documento),
      modo: acesso.modo,
      password: acesso.modo === "senha" ? acesso.password : undefined,
    };
    if (h.phone.trim()) dados.phone = h.phone.trim();
    if (h.pix_key.trim()) dados.pix_key = h.pix_key.trim();
    const r = await parceriasService.criarHunter(dados);
    if (acesso.modo === "convite" && !r.email_enviado) {
      showWarning("Hunter criado, mas não conseguimos enviar o e-mail. Use Copiar link em Usuários.");
    } else {
      showSuccess(acesso.modo === "convite" ? "Hunter criado. Convite enviado por e-mail." : "Hunter criado com sucesso!");
    }
    onHunterCriado();
  };

  const salvar = async () => {
    setSalvando(true);
    try {
      await (tipo === "empresa" ? salvarEmpresa() : salvarHunter());
    } catch (e) {
      showError(mensagemDeErro(e, tipo === "empresa" ? "Erro ao cadastrar o parceiro." : "Erro ao cadastrar o hunter."));
    } finally {
      setSalvando(false);
    }
  };

  const podeSalvar = tipo === "empresa"
    ? !!form.name?.trim() && Object.keys(erros).length === 0
    : hunterValido;

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Novo parceiro"
      size="lg"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={salvar} loading={salvando} disabled={!podeSalvar}>Cadastrar</Button>
        </div>
      }
    >
      <div className="space-y-4">
        <Abas<Tipo>
          valor={tipo}
          opcoes={[["empresa", "Empresa parceira"], ["hunter", "Hunter"]]}
          // O formulário de acesso volta ao padrão (convite) ao reaparecer: o estado acompanha.
          onMudar={(v) => { setTipo(v); setAcesso({ modo: "convite", password: "" }); }}
        />

        {tipo === "empresa" ? (
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
            <FormField label="Chave PIX"><Input {...campo("pix_key")} maxLength={140} /></FormField>
            <FormField label="Indicado por" hint="Opcional. Hunters não bloqueados.">
              <SelectMenu
                value={form.indicated_by_partner_id ? String(form.indicated_by_partner_id) : ""}
                placeholder="Ninguém"
                options={[
                  { value: "", label: "Ninguém" },
                  ...hunters.filter((x) => x.stage !== "bloqueado").map((x) => ({ value: String(x.id), label: x.name })),
                ]}
                onChange={(v) => setForm({ ...form, indicated_by_partner_id: v ? Number(v) : null })}
              />
            </FormField>
            <p className="text-xs text-slate-500 sm:col-span-2 dark:text-slate-400">
              O card entra em Potencial. O login do dono da empresa é criado depois, no card, em Acessos ao CRM.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <Abas<"pessoa" | "empresa">
              valor={tipoHunter}
              opcoes={[["pessoa", "Pessoa (CPF)"], ["empresa", "Empresa (CNPJ)"]]}
              onMudar={(v) => { setTipoHunter(v); setH({ ...h, documento: "" }); }}
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="Nome" required className="sm:col-span-2">
                <Input value={h.name} maxLength={255} onChange={(e) => setH({ ...h, name: e.target.value })} />
              </FormField>
              <FormField label={tipoHunter === "pessoa" ? "CPF" : "CNPJ"} required error={erroDocumento}>
                <Input
                  value={h.documento}
                  inputMode="numeric"
                  error={!!erroDocumento}
                  placeholder={tipoHunter === "pessoa" ? "000.000.000-00" : "00.000.000/0000-00"}
                  onChange={(e) => setH({
                    ...h,
                    documento: tipoHunter === "pessoa" ? maskCPF(e.target.value) : mascarar("cnpj", e.target.value),
                  })}
                />
              </FormField>
              <FormField label="Telefone" error={erroTelefone}>
                <Input
                  value={h.phone}
                  inputMode="numeric"
                  error={!!erroTelefone}
                  placeholder="(00) 00000-0000"
                  onChange={(e) => setH({ ...h, phone: mascarar("phone", e.target.value) })}
                />
              </FormField>
              <FormField label="E-mail de login" required error={erroEmail}>
                <Input
                  type="email"
                  value={h.email}
                  maxLength={255}
                  error={!!erroEmail}
                  placeholder="nome@email.com"
                  onChange={(e) => setH({ ...h, email: e.target.value })}
                />
              </FormField>
              <FormField label="Chave PIX">
                <Input value={h.pix_key} maxLength={140} onChange={(e) => setH({ ...h, pix_key: e.target.value })} />
              </FormField>
            </div>
            <div className="border-t border-gray-200/50 pt-3 dark:border-slate-700/50">
              <p className="mb-2 text-sm font-medium text-slate-900 dark:text-white">Acesso ao CRM</p>
              <FormularioDeAcesso pedirNomeEmail={false} semBotao onEnviar={() => undefined} onMudar={setAcesso} />
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                O card do hunter entra em Convidado e o login dele já é criado agora.
              </p>
            </div>
          </div>
        )}
      </div>
    </BaseModal>
  );
}
