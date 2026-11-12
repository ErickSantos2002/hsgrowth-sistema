import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, Plus, Send, Trello } from "lucide-react";
import { BaseModal, Button, EmptyState, FormField, Input, Pagination } from "../../components/common";
import { PageHeader } from "../../components/layout/PageHeader";
import { usePagination } from "../../hooks";
import { errosDoForm, mascarar, limparCnpj } from "../../components/parcerias/campos";
import { ETAPAS_AQUISICAO, corDaEtapa, formatarCnpj } from "../../constants/parcerias";
import { formatDate } from "../../utils/formatters";
import { showError, showSuccess, showWarning } from "../../utils/toast";
import parceriasService, { mensagemDeErro, type Parceiro } from "../../services/parceriasService";

const TH = "px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300";

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
  const navigate = useNavigate();
  const pagination = usePagination(lista, 10);

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
    <div className="p-6">
      <PageHeader
        title="Indicações"
        description="As empresas que você indicou ao Programa de Parceiros."
        icon={Send}
        actions={
          <>
            <Button variant="secondary" size="sm" icon={<Trello size={16} />} onClick={() => navigate("/parcerias/oportunidades")}>
              Ver oportunidades
            </Button>
            <Button size="sm" icon={<Plus size={16} />} onClick={() => setModalAberto(true)}>Indicar empresa</Button>
          </>
        }
      />

      {carregando && lista.length === 0 ? (
        <div className="py-12 text-center text-slate-500 dark:text-slate-400">Carregando indicações...</div>
      ) : lista.length === 0 ? (
        <EmptyState icon={Send} title="Nenhuma indicação ainda" description="Indique a primeira empresa para acompanhá-la aqui." />
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white backdrop-blur-sm dark:border-slate-700/50 dark:bg-slate-800/30">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 dark:border-slate-700 dark:bg-slate-800/50">
                  <th className={TH}>Empresa</th>
                  <th className={TH}>CNPJ</th>
                  <th className={TH}>Situação</th>
                  <th className={TH}>Ativada em</th>
                  <th className={`${TH} !text-right`}>Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-slate-700/50">
                {pagination.paginatedItems.map((p) => {
                  const cor = corDaEtapa(p.stage);
                  return (
                    <tr key={p.id} className="transition-colors hover:bg-gray-50 dark:hover:bg-slate-700/30">
                      <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">{p.name}</td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-700 dark:text-slate-300">{formatarCnpj(p.cnpj)}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex rounded-full px-2 py-1 text-xs font-medium text-slate-900 dark:text-white" style={{ backgroundColor: `${cor}33` }}>
                          {ETAPAS_AQUISICAO.find((e) => e.codigo === p.stage)?.nome ?? p.stage}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">{p.activated_at ? formatDate(p.activated_at) : "–"}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => navigate(`/parcerias/aquisicao/${p.id}`)}
                            className="rounded-lg bg-blue-600/20 p-2 text-slate-900 transition-colors hover:bg-blue-600/30 dark:text-blue-400"
                            title="Ver"
                          >
                            <Eye size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination {...pagination} itemLabel="indicações" alwaysShow />
        </div>
      )}

      <IndicarModal isOpen={modalAberto} onClose={() => setModalAberto(false)} onFeito={feito} />
    </div>
  );
}
