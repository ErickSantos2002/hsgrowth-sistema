import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Send, Trello } from "lucide-react";
import { BaseModal, Button, EmptyState, FormField, Input } from "../../components/common";
import { errosDoForm, mascarar, limparCnpj } from "../../components/parcerias/campos";
import { ETAPAS_AQUISICAO, corDaEtapa, formatarCnpj } from "../../constants/parcerias";
import { formatDate } from "../../utils/formatters";
import { showError, showSuccess, showWarning } from "../../utils/toast";
import parceriasService, { mensagemDeErro, type Parceiro } from "../../services/parceriasService";

const VAZIO = { name: "", cnpj: "", main_contact_name: "", main_contact_email: "", main_contact_phone: "", pix_key: "" };

function IndicarModal({ isOpen, onClose, onFeito }: { isOpen: boolean; onClose: () => void; onFeito: (email: string, enviado: boolean) => void }) {
  const [form, setForm] = useState(VAZIO);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => { if (isOpen) setForm(VAZIO); }, [isOpen]);

  const erros = errosDoForm(form);
  const valido = !!form.name.trim() && !!form.cnpj && !!form.main_contact_name.trim() && !!form.main_contact_email.trim() && Object.keys(erros).length === 0;
  const campo = (nome: keyof typeof VAZIO) => ({
    value: form[nome],
    error: !!erros[nome],
    maxLength: nome === "cnpj" ? 18 : 255,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [nome]: mascarar(nome, e.target.value) }),
  });

  const salvar = async () => {
    setSalvando(true);
    try {
      const r = await parceriasService.indicar({
        name: form.name.trim(),
        cnpj: limparCnpj(form.cnpj),
        main_contact_name: form.main_contact_name.trim(),
        main_contact_email: form.main_contact_email.trim(),
        ...(form.main_contact_phone.trim() ? { main_contact_phone: form.main_contact_phone.trim() } : {}),
        ...(form.pix_key.trim() ? { pix_key: form.pix_key.trim() } : {}),
      });
      onFeito(form.main_contact_email.trim(), r.email_enviado);
    } catch (e) {
      showError(mensagemDeErro(e, "Erro ao indicar a empresa."));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Indicar empresa"
      subtitle="O contato principal recebe um convite por e-mail para entrar no Programa."
      size="lg"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={salvar} loading={salvando} disabled={!valido}>Indicar</Button>
        </div>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Empresa" required className="sm:col-span-2"><Input {...campo("name")} /></FormField>
        <FormField label="CNPJ" required error={erros.cnpj}><Input {...campo("cnpj")} inputMode="numeric" placeholder="00.000.000/0000-00" /></FormField>
        <FormField label="Contato principal" required><Input {...campo("main_contact_name")} /></FormField>
        <FormField label="E-mail do contato" required error={erros.main_contact_email}>
          <Input type="email" {...campo("main_contact_email")} placeholder="nome@empresa.com.br" />
        </FormField>
        <FormField label="Telefone do contato" error={erros.main_contact_phone}>
          <Input {...campo("main_contact_phone")} maxLength={15} inputMode="numeric" placeholder="(00) 00000-0000" />
        </FormField>
        <FormField label="Chave PIX da empresa" className="sm:col-span-2"><Input {...campo("pix_key")} maxLength={140} /></FormField>
      </div>
    </BaseModal>
  );
}

// Empresas que o parceiro (dono) ou o hunter indicou, e a situação de cada uma.
export default function Indicacoes() {
  const [lista, setLista] = useState<Parceiro[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      setLista(await parceriasService.listarIndicacoes());
    } catch (err) {
      showError(mensagemDeErro(err, "Erro ao carregar as indicações."));
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const feito = (email: string, enviado: boolean) => {
    setModalAberto(false);
    if (enviado) showSuccess(`Convite enviado para ${email}.`);
    else showWarning("Empresa cadastrada. Não conseguimos enviar o e-mail; peça à H&S o link do convite.");
    carregar();
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold text-slate-900 dark:text-white">
            <Send size={32} /> Indicações
          </h1>
          <p className="mt-1 text-slate-500 dark:text-gray-400">As empresas que você indicou ao Programa de Parceiros.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/parcerias/oportunidades"
            className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-gray-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800/50"
          >
            <Trello size={16} /> Ver oportunidades
          </Link>
          <Button icon={<Plus size={16} />} onClick={() => setModalAberto(true)}>Indicar empresa</Button>
        </div>
      </div>

      {carregando && lista.length === 0 ? (
        <p className="text-sm text-slate-500">Carregando...</p>
      ) : lista.length === 0 ? (
        <EmptyState icon={Send} title="Nenhuma indicação ainda" description="Indique a primeira empresa para acompanhá-la aqui." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-slate-700/50">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">Empresa</th>
                <th className="px-4 py-3">CNPJ</th>
                <th className="px-4 py-3">Situação</th>
                <th className="px-4 py-3">Ativada em</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-slate-800 dark:divide-slate-700/50 dark:text-slate-200">
              {lista.map((p) => {
                const cor = corDaEtapa(p.stage);
                return (
                  <tr key={p.id}>
                    <td className="px-4 py-3 font-medium">
                      <Link to={`/parcerias/aquisicao/${p.id}`} className="hover:text-emerald-500 hover:underline">{p.name}</Link>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">{formatarCnpj(p.cnpj)}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium text-slate-900 dark:text-white" style={{ backgroundColor: `${cor}33` }}>
                        {ETAPAS_AQUISICAO.find((e) => e.codigo === p.stage)?.nome ?? p.stage}
                      </span>
                    </td>
                    <td className="px-4 py-3">{p.activated_at ? formatDate(p.activated_at) : "–"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <IndicarModal isOpen={modalAberto} onClose={() => setModalAberto(false)} onFeito={feito} />
    </div>
  );
}
