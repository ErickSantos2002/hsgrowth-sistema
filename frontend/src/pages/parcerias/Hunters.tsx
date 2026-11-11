import { useCallback, useEffect, useState } from "react";
import { Plus, UserPlus } from "lucide-react";
import { BaseModal, Button, EmptyState, FormField, Input } from "../../components/common";
import StatusDoAcesso from "../../components/acessos/StatusDoAcesso";
import AcoesDoConvite from "../../components/acessos/AcoesDoConvite";
import { erroDoCampo, mascarar } from "../../components/parcerias/campos";
import { useConfirm } from "../../contexts/ConfirmContext";
import { maskCPF, formatarDocumento, limparDocumento } from "../../utils/formatters";
import { showError, showSuccess, showWarning } from "../../utils/toast";
import parceriasService, { mensagemDeErro, type Hunter, type HunterForm } from "../../services/parceriasService";

type Tipo = "pessoa" | "empresa";

const VAZIO = { documento: "", name: "", email: "", phone: "", pix_key: "" };

function NovoHunterModal({ isOpen, onClose, onCriado }: { isOpen: boolean; onClose: () => void; onCriado: (email: string, enviado: boolean) => void }) {
  const [tipo, setTipo] = useState<Tipo>("pessoa");
  const [form, setForm] = useState(VAZIO);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (isOpen) { setTipo("pessoa"); setForm(VAZIO); }
  }, [isOpen]);

  const campoDoc = tipo === "pessoa" ? "cpf" : "cnpj";
  const erroDoc = tipo === "pessoa"
    ? (form.documento && limparDocumento(form.documento).length !== 11 ? "CPF com 11 números" : undefined)
    : erroDoCampo("cnpj", form.documento);
  const erroEmail = erroDoCampo("email", form.email);
  const erroTel = erroDoCampo("phone", form.phone);
  const valido = !!form.documento && !erroDoc && !!form.name.trim() && !!form.email.trim() && !erroEmail && !erroTel;

  const mudar = (nome: keyof typeof VAZIO, valor: string) => setForm({ ...form, [nome]: valor });

  const salvar = async () => {
    setSalvando(true);
    try {
      const dados: HunterForm = {
        name: form.name.trim(),
        email: form.email.trim(),
        [campoDoc]: limparDocumento(form.documento),
      };
      if (form.phone.trim()) dados.phone = form.phone.trim();
      if (form.pix_key.trim()) dados.pix_key = form.pix_key.trim();
      const r = await parceriasService.criarHunter(dados);
      onCriado(dados.email, r.email_enviado);
    } catch (e) {
      showError(mensagemDeErro(e, "Erro ao cadastrar o hunter."));
    } finally {
      setSalvando(false);
    }
  };

  const aba = (t: Tipo, rotulo: string) => (
    <button
      type="button"
      onClick={() => { setTipo(t); setForm({ ...form, documento: "" }); }}
      className={`rounded-lg px-4 py-1.5 text-sm font-medium ${
        tipo === t ? "bg-emerald-600 text-white" : "bg-gray-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200"
      }`}
    >
      {rotulo}
    </button>
  );

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Novo hunter"
      subtitle="O hunter recebe um convite por e-mail para criar a senha."
      size="lg"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={salvar} loading={salvando} disabled={!valido}>Cadastrar</Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex gap-2">{aba("pessoa", "Pessoa")}{aba("empresa", "Empresa")}</div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label={tipo === "pessoa" ? "CPF" : "CNPJ"} required error={erroDoc}>
            <Input
              value={form.documento}
              error={!!erroDoc}
              inputMode="numeric"
              placeholder={tipo === "pessoa" ? "000.000.000-00" : "00.000.000/0000-00"}
              onChange={(e) => mudar("documento", tipo === "pessoa" ? maskCPF(e.target.value) : mascarar("cnpj", e.target.value))}
            />
          </FormField>
          <FormField label={tipo === "pessoa" ? "Nome" : "Razão social / nome"} required>
            <Input value={form.name} maxLength={255} onChange={(e) => mudar("name", e.target.value)} />
          </FormField>
          <FormField label="E-mail" required error={erroEmail}>
            <Input type="email" value={form.email} maxLength={255} error={!!erroEmail} onChange={(e) => mudar("email", e.target.value)} placeholder="nome@exemplo.com.br" />
          </FormField>
          <FormField label="Telefone" error={erroTel}>
            <Input value={form.phone} error={!!erroTel} inputMode="numeric" onChange={(e) => mudar("phone", mascarar("phone", e.target.value))} placeholder="(00) 00000-0000" />
          </FormField>
          <FormField label="Chave PIX" className="sm:col-span-2">
            <Input value={form.pix_key} maxLength={255} onChange={(e) => mudar("pix_key", e.target.value)} />
          </FormField>
        </div>
      </div>
    </BaseModal>
  );
}

// Cadastro e gestão dos hunters (admin/gerente). Sempre por convite.
export default function Hunters() {
  const { confirm } = useConfirm();
  const [hunters, setHunters] = useState<Hunter[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      setHunters(await parceriasService.listarHunters());
    } catch (err) {
      showError(mensagemDeErro(err, "Erro ao carregar os hunters."));
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const alternarBloqueio = async (h: Hunter) => {
    const bloqueado = h.stage === "bloqueado";
    if (!bloqueado) {
      const ok = await confirm({
        title: "Bloquear hunter",
        message: "Os acessos deste hunter serão desativados. As empresas que ele indicou continuam funcionando.",
        confirmText: "Bloquear",
        isDanger: true,
      });
      if (!ok) return;
    }
    try {
      if (bloqueado) await parceriasService.desbloquear(h.id);
      else await parceriasService.bloquear(h.id);
      showSuccess(bloqueado ? "Hunter desbloqueado." : "Hunter bloqueado.");
      await carregar();
    } catch (err) {
      showError(mensagemDeErro(err, bloqueado ? "Erro ao desbloquear o hunter." : "Erro ao bloquear o hunter."));
    }
  };

  const criado = (email: string, enviado: boolean) => {
    setModalAberto(false);
    if (enviado) showSuccess(`Convite enviado para ${email}.`);
    else showWarning("Hunter cadastrado. Não conseguimos enviar o e-mail; use Copiar link para pegar o convite.");
    carregar();
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold text-slate-900 dark:text-white">
            <UserPlus size={32} /> Hunters
          </h1>
          <p className="mt-1 text-slate-500 dark:text-gray-400">
            Quem indica empresas ao Programa de Parceiros. O acesso é por convite.
          </p>
        </div>
        <Button icon={<Plus size={16} />} onClick={() => setModalAberto(true)}>Novo hunter</Button>
      </div>

      {carregando && hunters.length === 0 ? (
        <p className="text-sm text-slate-500">Carregando...</p>
      ) : hunters.length === 0 ? (
        <EmptyState icon={UserPlus} title="Nenhum hunter cadastrado" description="Cadastre o primeiro para ele começar a indicar empresas." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-slate-700/50">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">CPF / CNPJ</th>
                <th className="px-4 py-3">E-mail</th>
                <th className="px-4 py-3">Situação</th>
                <th className="px-4 py-3 text-right">Empresas indicadas</th>
                <th className="px-4 py-3">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-slate-800 dark:divide-slate-700/50 dark:text-slate-200">
              {hunters.map((h) => (
                <tr key={h.id}>
                  <td className="px-4 py-3 font-medium">{h.name}</td>
                  <td className="whitespace-nowrap px-4 py-3">{formatarDocumento(h.cpf ?? h.cnpj)}</td>
                  <td className="px-4 py-3">{h.email}</td>
                  <td className="px-4 py-3"><StatusDoAcesso status={h.status_acesso} expiraEm={h.convite_expira_em} /></td>
                  <td className="px-4 py-3 text-right">{h.empresas_indicadas}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <AcoesDoConvite url={`/api/v1/parcerias/hunters/${h.id}/convite`} status={h.status_acesso} onFeito={carregar} />
                      <button
                        type="button"
                        onClick={() => alternarBloqueio(h)}
                        className="text-xs text-slate-500 hover:text-red-500"
                      >
                        {h.stage === "bloqueado" ? "Desbloquear" : "Bloquear"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <NovoHunterModal isOpen={modalAberto} onClose={() => setModalAberto(false)} onCriado={criado} />
    </div>
  );
}
