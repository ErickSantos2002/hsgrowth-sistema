import { ReactNode, useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Activity, ArrowLeft, Building2, CheckCircle2, ClipboardCheck, KeyRound, RefreshCw, Trello, Users, XCircle,
} from "lucide-react";
import { Button, FormField, Input, LoadingSpinner, SelectMenu } from "../../components/common";
import ExpandableSection from "../../components/cardDetails/ExpandableSection";
import AtividadesParceria from "../../components/parcerias/AtividadesParceria";
import EtapasParceria from "../../components/parcerias/EtapasParceria";
import ModalTrava from "../../components/parcerias/ModalTrava";
import { useAuth } from "../../hooks/useAuth";
import { showError, showSuccess } from "../../utils/toast";
import userService from "../../services/userService";
import { EVIDENCIA_LABEL, PERFIS_GESTAO, QUALIFICACAO_OPCOES } from "../../constants/parcerias";
import parceriasService, {
  Acesso, Etapa, Membro, MoverPayload, Parceiro, ParceiroForm, mensagemDeErro,
} from "../../services/parceriasService";

const CAMPOS_TEXTO: { nome: keyof ParceiroForm; label: string }[] = [
  { nome: "name", label: "Parceiro / empresa" },
  { nome: "cnpj", label: "CNPJ" },
  { nome: "main_contact_name", label: "Contato principal" },
  { nome: "main_contact_phone", label: "Telefone do contato" },
  { nome: "main_contact_email", label: "E-mail do contato" },
  { nome: "partner_type", label: "Tipo de parceiro" },
  { nome: "origin", label: "Origem do parceiro" },
  { nome: "segment", label: "Segmento" },
  { nome: "region", label: "Região" },
];

type Aba = "atividades" | "oportunidades";

export default function ParceiroDetalhe() {
  const { partnerId } = useParams();
  const id = Number(partnerId);
  const navigate = useNavigate();
  const { user } = useAuth();
  const gestao = PERFIS_GESTAO.includes(user?.role ?? "");
  const podeEditar = gestao || user?.role === "partner";

  const [parceiro, setParceiro] = useState<Parceiro | null>(null);
  const [form, setForm] = useState<ParceiroForm>({});
  const [etapas, setEtapas] = useState<Etapa[]>([]);
  const [etapasOp, setEtapasOp] = useState<Etapa[]>([]);
  const [equipe, setEquipe] = useState<Membro[]>([]);
  const [acessos, setAcessos] = useState<Acesso[]>([]);
  const [usuariosHs, setUsuariosHs] = useState<{ value: string; label: string }[]>([]);
  const [novoMembro, setNovoMembro] = useState({ name: "", email: "", phone: "" });
  const [novoAcesso, setNovoAcesso] = useState({ name: "", email: "", password: "" });
  const [perdendo, setPerdendo] = useState(false);
  const [aba, setAba] = useState<Aba>("atividades");

  const preencher = (p: Parceiro) => {
    setParceiro(p);
    setForm({
      name: p.name, cnpj: p.cnpj ?? "", main_contact_name: p.main_contact_name ?? "",
      main_contact_phone: p.main_contact_phone ?? "", main_contact_email: p.main_contact_email ?? "",
      partner_type: p.partner_type ?? "", origin: p.origin ?? "", segment: p.segment ?? "", region: p.region ?? "",
      hs_owner_id: p.hs_owner_id ?? null, qualification_status: p.qualification_status ?? null,
      onboarding_date: p.onboarding_date ?? "",
    });
  };

  const carregar = useCallback(async () => {
    try {
      const [p, e, eq] = await Promise.all([
        parceriasService.buscarParceiro(id),
        parceriasService.etapas(),
        parceriasService.listarEquipe(id),
      ]);
      preencher(p);
      setEtapas(e.aquisicao);
      setEtapasOp(e.oportunidades);
      setEquipe(eq);
      if (gestao) {
        setAcessos(await parceriasService.listarAcessos(id));
        const usuarios = await userService.listActive();
        setUsuariosHs(
          usuarios.filter((u) => u.role !== "partner").map((u) => ({ value: String(u.id), label: u.name }))
        );
      }
    } catch (err) {
      showError(mensagemDeErro(err, "Erro ao carregar o parceiro."));
      navigate("/parcerias/aquisicao");
    }
  }, [id, gestao, navigate]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  if (!parceiro) return <LoadingSpinner />;

  const perdido = parceiro.stage === "perdido";
  const ativado = parceiro.stage === "ativado";
  // De Ativado e de Perdido só a gestão tira o parceiro.
  const podeMover = podeEditar && (gestao || (!perdido && !ativado));

  const salvar = async () => {
    try {
      const dados = Object.fromEntries(
        Object.entries(form).map(([k, v]) => [k, typeof v === "string" && v.trim() === "" ? null : v])
      ) as ParceiroForm;
      preencher(await parceriasService.atualizarParceiro(id, dados));
      showSuccess("Parceiro salvo.");
    } catch (err) {
      showError(mensagemDeErro(err, "Erro ao salvar o parceiro."));
    }
  };

  const mover = async (destino: string, extras: Partial<MoverPayload> = {}) => {
    try {
      preencher(await parceriasService.moverParceiro(id, { stage: destino, ...extras }));
    } catch (err) {
      showError(mensagemDeErro(err, "Não foi possível mover o parceiro."));
    }
  };

  const adicionarMembro = async () => {
    try {
      await parceriasService.criarMembro(id, {
        name: novoMembro.name.trim(),
        email: novoMembro.email.trim() || undefined,
        phone: novoMembro.phone.trim() || undefined,
      });
      setNovoMembro({ name: "", email: "", phone: "" });
      setEquipe(await parceriasService.listarEquipe(id));
    } catch (err) {
      showError(mensagemDeErro(err, "Erro ao cadastrar o vendedor."));
    }
  };

  const alternarMembro = async (m: Membro) => {
    try {
      await parceriasService.atualizarMembro(id, m.id, { is_active: !m.is_active });
      setEquipe(await parceriasService.listarEquipe(id));
    } catch (err) {
      showError(mensagemDeErro(err, "Erro ao alterar o vendedor."));
    }
  };

  const criarAcesso = async () => {
    try {
      await parceriasService.criarAcesso(id, novoAcesso);
      setNovoAcesso({ name: "", email: "", password: "" });
      setAcessos(await parceriasService.listarAcessos(id));
      showSuccess("Acesso criado. Passe o e-mail e a senha ao parceiro.");
    } catch (err) {
      showError(mensagemDeErro(err, "Erro ao criar o acesso."));
    }
  };

  const alternarAcesso = async (a: Acesso) => {
    try {
      await parceriasService.alterarAcesso(id, a.id, !a.is_active);
      setAcessos(await parceriasService.listarAcessos(id));
    } catch (err) {
      showError(mensagemDeErro(err, "Erro ao alterar o acesso."));
    }
  };

  const linhaLista = "flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50/30 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900/30";
  const abas: { chave: Aba; rotulo: string; icone: ReactNode }[] = [
    { chave: "atividades", rotulo: "Atividades", icone: <Activity size={16} /> },
    { chave: "oportunidades", rotulo: "Oportunidades", icone: <Trello size={16} /> },
  ];

  return (
    <div className="flex h-full flex-col bg-gray-50 dark:bg-gradient-to-br dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Cabeçalho */}
      <div className="flex-shrink-0 border-b border-gray-200 bg-white px-6 py-4 dark:border-slate-700/50 dark:bg-slate-900/50">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/parcerias/aquisicao")}
            className="rounded-lg p-2 transition-colors hover:bg-gray-100 dark:hover:bg-slate-800/50"
            title="Voltar para o board"
          >
            <ArrowLeft size={20} className="text-slate-500 dark:text-slate-400" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-2xl font-bold text-slate-900 dark:text-white">{parceiro.name}</h1>
            {parceiro.activation_evidence && (
              <p className="text-sm text-emerald-600 dark:text-emerald-400">
                Critério de ativação: {EVIDENCIA_LABEL[parceiro.activation_evidence]}
                {parceiro.activated_at && ` em ${new Date(parceiro.activated_at).toLocaleDateString("pt-BR")}`}
              </p>
            )}
            {perdido && parceiro.loss_reason && (
              <p className="text-sm text-red-500">Motivo: {parceiro.loss_reason}{parceiro.loss_detail && ` — ${parceiro.loss_detail}`}</p>
            )}
          </div>
          <div className="flex flex-shrink-0 items-center gap-2">
            {perdido ? (
              <>
                <div className="flex items-center gap-2 rounded-lg border border-red-500/50 bg-red-500/20 px-3 py-2 text-sm font-medium text-red-500 dark:text-red-400">
                  <XCircle size={16} /> Parceiro Perdido
                </div>
                {gestao && (
                  <button onClick={() => mover("potencial")} title="Volta para Potencial Parceiro" className="flex items-center gap-2 rounded-lg bg-blue-500 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600">
                    <RefreshCw size={16} /> Reabrir
                  </button>
                )}
              </>
            ) : ativado ? (
              <div className="flex items-center gap-2 rounded-lg border border-emerald-500/50 bg-emerald-500/20 px-3 py-2 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 size={16} /> Parceiro Ativado
              </div>
            ) : (
              gestao && (
                <button onClick={() => setPerdendo(true)} className="flex items-center gap-2 rounded-lg bg-red-500 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-red-600">
                  <XCircle size={16} /> Perdido
                </button>
              )
            )}
          </div>
        </div>
        <div className="mt-3">
          <EtapasParceria
            etapas={etapas}
            atual={parceiro.stage}
            fixas={["ativado"]}
            onMover={podeMover ? (destino) => mover(destino) : undefined}
          />
        </div>
      </div>

      {/* Conteúdo: 30/70 */}
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div className="w-full flex-shrink-0 space-y-3 overflow-y-auto border-b border-gray-200 p-4 dark:border-slate-700/50 lg:w-[30%] lg:border-b-0 lg:border-r">
          <ExpandableSection title="Dados do parceiro" defaultExpanded icon={<Building2 size={18} />}>
            <div className="space-y-3">
              {CAMPOS_TEXTO.map(({ nome, label }) => (
                <FormField key={nome} label={label} required={nome === "name"}>
                  <Input
                    value={(form[nome] as string) ?? ""}
                    disabled={!podeEditar}
                    onChange={(e) => setForm({ ...form, [nome]: e.target.value })}
                  />
                </FormField>
              ))}
              {podeEditar && <Button onClick={salvar} fullWidth>Salvar</Button>}
            </div>
          </ExpandableSection>

          <ExpandableSection title="Qualificação" icon={<ClipboardCheck size={18} />}>
            <div className="space-y-3">
              <FormField label="Responsável H&S">
                {gestao ? (
                  <SelectMenu
                    value={form.hs_owner_id ? String(form.hs_owner_id) : ""}
                    placeholder="Escolha"
                    options={usuariosHs}
                    onChange={(v) => setForm({ ...form, hs_owner_id: Number(v) })}
                  />
                ) : (
                  <Input value={parceiro.hs_owner_name ?? ""} disabled />
                )}
              </FormField>
              <FormField label="Status de qualificação">
                <SelectMenu
                  value={form.qualification_status ?? ""}
                  placeholder="Escolha"
                  disabled={!podeEditar}
                  options={QUALIFICACAO_OPCOES}
                  onChange={(v) => setForm({ ...form, qualification_status: v })}
                />
              </FormField>
              <FormField label="Data de onboarding">
                <Input
                  type="date"
                  value={form.onboarding_date ?? ""}
                  disabled={!podeEditar}
                  onChange={(e) => setForm({ ...form, onboarding_date: e.target.value })}
                />
              </FormField>
              {podeEditar && <Button onClick={salvar} fullWidth>Salvar</Button>}
            </div>
          </ExpandableSection>

          <ExpandableSection title="Equipe" icon={<Users size={18} />} badge={equipe.filter((m) => m.is_active).length}>
            <div className="space-y-3">
              <div className="space-y-2">
                {equipe.map((m) => (
                  <div key={m.id} className={linhaLista}>
                    <span className={m.is_active ? "text-slate-900 dark:text-white" : "text-slate-400 line-through"}>
                      {m.name} {m.email && <span className="text-xs text-slate-500">· {m.email}</span>}
                    </span>
                    {podeEditar && (
                      <button onClick={() => alternarMembro(m)} className="text-xs text-slate-500 hover:text-emerald-500">
                        {m.is_active ? "Desativar" : "Reativar"}
                      </button>
                    )}
                  </div>
                ))}
                {equipe.length === 0 && <p className="py-2 text-center text-sm text-slate-400">Nenhum vendedor cadastrado</p>}
              </div>
              {podeEditar && (
                <div className="space-y-2 border-t border-gray-200/50 pt-3 dark:border-slate-700/50">
                  <Input placeholder="Nome" value={novoMembro.name} onChange={(e) => setNovoMembro({ ...novoMembro, name: e.target.value })} />
                  <Input placeholder="E-mail" value={novoMembro.email} onChange={(e) => setNovoMembro({ ...novoMembro, email: e.target.value })} />
                  <Input placeholder="Telefone" value={novoMembro.phone} onChange={(e) => setNovoMembro({ ...novoMembro, phone: e.target.value })} />
                  <Button size="sm" fullWidth onClick={adicionarMembro} disabled={!novoMembro.name.trim()}>Adicionar vendedor</Button>
                </div>
              )}
            </div>
          </ExpandableSection>

          {gestao && (
            <ExpandableSection title="Acessos ao CRM" icon={<KeyRound size={18} />} badge={acessos.filter((a) => a.is_active).length}>
              <div className="space-y-3">
                <div className="space-y-2">
                  {acessos.map((a) => (
                    <div key={a.id} className={linhaLista}>
                      <span className={a.is_active ? "text-slate-900 dark:text-white" : "text-slate-400 line-through"}>{a.email}</span>
                      <button onClick={() => alternarAcesso(a)} className="text-xs text-slate-500 hover:text-emerald-500">
                        {a.is_active ? "Desativar" : "Reativar"}
                      </button>
                    </div>
                  ))}
                  {acessos.length === 0 && <p className="py-2 text-center text-sm text-slate-400">Nenhum acesso criado</p>}
                </div>
                <div className="space-y-2 border-t border-gray-200/50 pt-3 dark:border-slate-700/50">
                  <Input placeholder="Nome" value={novoAcesso.name} onChange={(e) => setNovoAcesso({ ...novoAcesso, name: e.target.value })} />
                  <Input placeholder="E-mail" type="email" value={novoAcesso.email} onChange={(e) => setNovoAcesso({ ...novoAcesso, email: e.target.value })} />
                  <Input placeholder="Senha inicial (mín. 8)" type="password" value={novoAcesso.password} onChange={(e) => setNovoAcesso({ ...novoAcesso, password: e.target.value })} />
                  <Button
                    size="sm"
                    fullWidth
                    onClick={criarAcesso}
                    disabled={!novoAcesso.name.trim() || !novoAcesso.email.trim() || novoAcesso.password.length < 8}
                  >
                    Criar acesso
                  </Button>
                </div>
              </div>
            </ExpandableSection>
          )}
        </div>

        <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col">
          <div className="flex flex-shrink-0 items-center gap-1 overflow-x-auto border-b border-gray-200 bg-white px-4 dark:border-slate-700/50 dark:bg-slate-900/30">
            {abas.map((a) => (
              <button
                key={a.chave}
                onClick={() => setAba(a.chave)}
                className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                  aba === a.chave
                    ? "border-violet-500 text-violet-500 dark:text-violet-400"
                    : "border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                {a.icone}
                {a.rotulo}
              </button>
            ))}
          </div>

          <div className="min-h-0 min-w-0 flex-1 overflow-y-auto p-6">
            {aba === "atividades" && (
              <AtividadesParceria alvo={{ tipo: "parceiro", id }} somenteLeitura={!podeEditar} />
            )}
            {aba === "oportunidades" && (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {etapasOp.map((e) => (
                  <div key={e.codigo} className="rounded-lg border border-gray-200 bg-white px-4 py-3 dark:border-slate-700/50 dark:bg-slate-800/30">
                    <p className="text-xs text-slate-500 dark:text-slate-400">{e.nome}</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{parceiro.oportunidades_por_etapa[e.codigo] ?? 0}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <ModalTrava
        isOpen={perdendo}
        destinoNome="Perdido"
        faltas={{ motivo: true, data: false, modalidade: false }}
        onClose={() => setPerdendo(false)}
        onConfirmar={(extras) => {
          setPerdendo(false);
          mover("perdido", extras);
        }}
      />
    </div>
  );
}
