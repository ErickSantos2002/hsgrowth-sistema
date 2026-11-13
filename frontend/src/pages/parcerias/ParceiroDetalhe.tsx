import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, Ban, Building2, CheckCircle2, ClipboardCheck, FileSignature, KeyRound, ShieldCheck, Trello, UserCheck, UserX, Users, XCircle,
} from "lucide-react";
import { Button, FormField, Input, LoadingSpinner, SelectMenu } from "../../components/common";
import ExpandableSection from "../../components/cardDetails/ExpandableSection";
import AbasDoCard from "../../components/parcerias/AbasDoCard";
import ContratoDoParceiro from "../../components/parcerias/ContratoDoParceiro";
import EtapasParceria from "../../components/parcerias/EtapasParceria";
import { errosDoForm, paraTela, propsDeTexto } from "../../components/parcerias/campos";
import FormularioDeAcesso, { type DadosDoAcesso } from "../../components/acessos/FormularioDeAcesso";
import StatusDoAcesso from "../../components/acessos/StatusDoAcesso";
import AcoesDoConvite from "../../components/acessos/AcoesDoConvite";
import { useConfirm } from "../../contexts/ConfirmContext";
import { useAuth } from "../../hooks/useAuth";
import { showError, showSuccess, showWarning } from "../../utils/toast";
import { maskCPF } from "../../utils/formatters";
import userService from "../../services/userService";
import { EVIDENCIA_LABEL, PERFIS_DO_PARCEIRO, PERFIS_GESTAO, PERFIS_QUE_EDITAM, PERFIS_RESPONSAVEL_HS, QUALIFICACAO_OPCOES } from "../../constants/parcerias";
import parceriasService, {
  Acesso, Etapa, Hunter, Membro, Parceiro, ParceiroForm, mensagemDeErro,
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

/** O parceiro como fica no formulário (CNPJ e telefone com máscara, vazio como ""). */
const formDoParceiro = (p: Parceiro): ParceiroForm => ({
  name: p.name, cnpj: paraTela("cnpj", p.cnpj), main_contact_name: p.main_contact_name ?? "",
  main_contact_phone: paraTela("main_contact_phone", p.main_contact_phone), main_contact_email: p.main_contact_email ?? "",
  partner_type: p.partner_type ?? "", origin: p.origin ?? "", segment: p.segment ?? "", region: p.region ?? "",
  hs_owner_id: p.hs_owner_id ?? null, qualification_status: p.qualification_status ?? null,
  onboarding_date: p.onboarding_date ?? "", pix_key: p.pix_key ?? "", indicated_by_partner_id: p.indicated_by_partner_id ?? null,
});

export default function ParceiroDetalhe() {
  const { partnerId } = useParams();
  const id = Number(partnerId);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { confirm } = useConfirm();
  const gestao = PERFIS_GESTAO.includes(user?.role ?? "");
  // Dono do card: o parceiro (ou o vendedor dele) olhando o card da própria empresa.
  const meuCard = !!user?.partner_id && user.partner_id === id;
  // Empresa/hunter olhando o card de outra (a unidade que indicou): só leitura, sem Equipe, Acessos nem contrato.
  const externoAlheio = PERFIS_DO_PARCEIRO.includes(user?.role ?? "") && !meuCard;
  const podeEditar = PERFIS_QUE_EDITAM.includes(user?.role ?? "") && !externoAlheio;
  // Equipe e Acessos: só no card do próprio login ou da gestão (o vendedor da equipe nunca lê a equipe).
  const podeLerEquipe = !externoAlheio && user?.role !== "partner_member";
  // Login do vendedor (dar acesso, reenviar, desativar): só o dono do parceiro e a gestão.
  const podeGerirLogin = gestao || user?.role === "partner";

  const [parceiro, setParceiro] = useState<Parceiro | null>(null);
  const [form, setForm] = useState<ParceiroForm>({});
  const [etapas, setEtapas] = useState<Etapa[]>([]);
  const [etapasOp, setEtapasOp] = useState<Etapa[]>([]);
  const [equipe, setEquipe] = useState<Membro[]>([]);
  const [acessos, setAcessos] = useState<Acesso[]>([]);
  const [hunters, setHunters] = useState<Hunter[]>([]);
  const [usuariosHs, setUsuariosHs] = useState<{ value: string; label: string }[]>([]);
  const [novoMembro, setNovoMembro] = useState({ name: "", email: "", phone: "" });
  const [darAcessoA, setDarAcessoA] = useState<number | null>(null);

  const preencher = (p: Parceiro) => {
    setParceiro(p);
    setForm(formDoParceiro(p));
  };

  const carregar = useCallback(async () => {
    try {
      const [p, e] = await Promise.all([parceriasService.buscarParceiro(id), parceriasService.etapas()]);
      preencher(p);
      setEtapas(e.aquisicao);
      setEtapasOp(e.oportunidades);
      // Hunter não tem equipe; a empresa indicadora recebe 404 em /equipe e /acessos da unidade.
      if (podeLerEquipe && p.kind !== "hunter") setEquipe(await parceriasService.listarEquipe(id));
      if (gestao && p.kind !== "hunter") {
        setHunters(await parceriasService.listarHunters());
        setAcessos(await parceriasService.listarAcessos(id));
        const usuarios = await userService.listActive();
        // Sem responsável: o parceiro que não precisa de treinamento fica só com a gestão.
        setUsuariosHs([
          { value: "", label: "Nenhum" },
          ...usuarios
            .filter((u) => PERFIS_RESPONSAVEL_HS.includes(u.role))
            .map((u) => ({ value: String(u.id), label: u.name })),
        ]);
      }
    } catch (err) {
      showError(mensagemDeErro(err, "Erro ao carregar o parceiro."));
      navigate("/parcerias/aquisicao");
    }
  }, [id, gestao, podeLerEquipe, navigate]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  if (!parceiro) return <LoadingSpinner />;

  const ativado = parceiro.stage === "ativado";
  const bloqueado = parceiro.stage === "bloqueado";
  const ehHunterCard = parceiro.kind === "hunter";
  // Equipe e Acessos só existem para empresa, vistos pelo dono ou pela gestão.
  const mostraEquipe = podeLerEquipe && !ehHunterCard;
  // A chave PIX é da gestão e do dono; os outros nem a veem.
  const veChavePix = gestao || meuCard || user?.role === "finance"; // vendedor H&S não vê PIX nem CPF

  const salvar = async () => {
    // Manda só o que mudou: um dado antigo fora da regra (ex.: telefone curto,
    // de antes da validação) não pode travar o Salvar de outra seção.
    const salvo = formDoParceiro(parceiro) as Record<string, unknown>;
    try {
      const dados = Object.fromEntries(
        Object.entries(form)
          .filter(([k, v]) => v !== salvo[k])
          .map(([k, v]) => [k, typeof v === "string" && v.trim() === "" ? null : v])
      ) as ParceiroForm;
      preencher(await parceriasService.atualizarParceiro(id, dados));
      showSuccess("Parceiro salvo.");
    } catch (err) {
      showError(mensagemDeErro(err, "Erro ao salvar o parceiro."));
    }
  };

  const alternarBloqueio = async () => {
    const ok = await confirm({
      title: bloqueado ? "Desbloquear parceiro" : "Bloquear parceiro",
      message: bloqueado
        ? "O acesso do dono volta a funcionar; os vendedores só voltam se o cadastro deles estiver ativo."
        : "Os acessos desta empresa e da equipe dela serão desativados.",
      confirmText: bloqueado ? "Desbloquear" : "Bloquear",
      isDanger: !bloqueado,
    });
    if (!ok) return;
    try {
      preencher(bloqueado ? await parceriasService.desbloquear(id) : await parceriasService.bloquear(id));
      showSuccess(bloqueado ? "Parceiro desbloqueado." : "Parceiro bloqueado.");
    } catch (err) {
      showError(mensagemDeErro(err, bloqueado ? "Erro ao desbloquear o parceiro." : "Erro ao bloquear o parceiro."));
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
    if (m.is_active && m.user_id) {
      const ok = await confirm({
        title: "Desativar vendedor",
        message: "O acesso dele ao CRM também será desativado.",
        confirmText: "Desativar",
        isDanger: true,
      });
      if (!ok) return;
    }
    try {
      await parceriasService.atualizarMembro(id, m.id, { is_active: !m.is_active });
      setEquipe(await parceriasService.listarEquipe(id));
    } catch (err) {
      showError(mensagemDeErro(err, "Erro ao alterar o vendedor."));
    }
  };

  const criarAcesso = async (dados: DadosDoAcesso) => {
    try {
      const r = await parceriasService.criarAcesso(id, {
        name: dados.name ?? "", email: dados.email ?? "", modo: dados.modo, password: dados.password,
      });
      setAcessos(await parceriasService.listarAcessos(id));
      if (dados.modo === "senha") showSuccess("Acesso criado. Passe o e-mail e a senha ao parceiro; ele troca a senha no 1º login.");
      else if (r.email_enviado) showSuccess("Acesso criado. Convite enviado por e-mail.");
      else showWarning("Acesso criado, mas não conseguimos enviar o e-mail. Use Copiar link.");
    } catch (err) {
      showError(mensagemDeErro(err, "Erro ao criar o acesso."));
      throw err;
    }
  };

  const darAcessoAoMembro = async (m: Membro, dados: DadosDoAcesso) => {
    try {
      const r = await parceriasService.darAcessoAoMembro(id, m.id, { modo: dados.modo, password: dados.password });
      setDarAcessoA(null);
      setEquipe(await parceriasService.listarEquipe(id));
      if (dados.modo === "senha") showSuccess("Acesso criado. Passe a senha ao vendedor; ele troca no 1º login.");
      else if (r.email_enviado) showSuccess("Acesso criado. Convite enviado por e-mail.");
      else showWarning("Acesso criado, mas não conseguimos enviar o e-mail. Use Copiar link.");
    } catch (err) {
      showError(mensagemDeErro(err, "Erro ao dar acesso ao vendedor."));
      throw err;
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

  const erros = errosDoForm(form);
  const errosMembro = errosDoForm(novoMembro);
  const temErro = (e: Record<string, string>) => Object.keys(e).length > 0;

  const linhaLista = "flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50/30 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900/30";
  // Ações das linhas em botão de ícone compacto (mesmo formato do Reenviar/Copiar link do convite).
  const acaoIcone = "rounded-lg p-1.5 text-slate-900 transition-colors";
  const acaoVerde = `${acaoIcone} bg-emerald-600/20 hover:bg-emerald-600/30 dark:text-emerald-400`;
  const acaoVermelha = `${acaoIcone} bg-red-600/20 hover:bg-red-600/30 dark:text-red-400`;
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
          </div>
          <div className="flex flex-shrink-0 items-center gap-2">
            {bloqueado ? (
              <div className="flex items-center gap-2 rounded-lg border border-red-500/50 bg-red-500/20 px-3 py-2 text-sm font-medium text-red-500 dark:text-red-400">
                <XCircle size={16} /> Parceiro Bloqueado
              </div>
            ) : ativado ? (
              <div className="flex items-center gap-2 rounded-lg border border-emerald-500/50 bg-emerald-500/20 px-3 py-2 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 size={16} /> Parceiro Ativado
              </div>
            ) : null}
            {gestao && (
              <button
                onClick={alternarBloqueio}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-white transition-colors ${bloqueado ? "bg-blue-500 hover:bg-blue-600" : "bg-red-500 hover:bg-red-600"}`}
              >
                {bloqueado ? <ShieldCheck size={16} /> : <Ban size={16} />} {bloqueado ? "Desbloquear" : "Bloquear"}
              </button>
            )}
          </div>
        </div>
        <div className="mt-3">
          <EtapasParceria
            etapas={etapas}
            atual={parceiro.stage}
            fixas={[]}
          />
        </div>
      </div>

      {/* Conteúdo: 30/70 */}
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div className="w-full flex-shrink-0 space-y-3 overflow-y-auto border-b border-gray-200 p-4 dark:border-slate-700/50 lg:w-[30%] lg:border-b-0 lg:border-r">
          <ExpandableSection title="Programa de Parceiros" icon={<ShieldCheck size={18} />}>
            <div className="space-y-3">
              <FormField label="Tipo"><Input value={ehHunterCard ? "Hunter" : "Empresa"} disabled readOnly /></FormField>
              <FormField label={parceiro.cpf ? "CPF" : "CNPJ"}>
                <Input value={parceiro.cpf ? maskCPF(parceiro.cpf) : paraTela("cnpj", parceiro.cnpj)} disabled readOnly />
              </FormField>
              {veChavePix && (
                <FormField label="Chave PIX">
                  <Input {...propsDeTexto(form, setForm, "pix_key", !podeEditar || user?.role === "finance")} maxLength={140} placeholder="Não informada" />
                </FormField>
              )}
              {/* A empresa indicada não vê quem a indicou (o backend também não manda). */}
              {(gestao || !meuCard) && (
              <FormField label="Indicado por">
                {gestao && !ehHunterCard ? (
                  <SelectMenu
                    value={form.indicated_by_partner_id ? String(form.indicated_by_partner_id) : ""}
                    placeholder="Ninguém"
                    options={[
                      { value: "", label: "Ninguém" },
                      ...hunters
                        .filter((h) => h.stage !== "bloqueado" || h.id === parceiro.indicated_by_partner_id)
                        .map((h) => ({ value: String(h.id), label: h.name })),
                    ]}
                    onChange={(v) => setForm({ ...form, indicated_by_partner_id: v ? Number(v) : null })}
                  />
                ) : (
                  <Input value={parceiro.indicated_by_name ?? "Ninguém"} disabled readOnly />
                )}
              </FormField>
              )}
              {podeEditar && (gestao || meuCard) && <Button onClick={salvar} fullWidth>Salvar</Button>}
              <FormField label="Termos aceitos em">
                <Input
                  value={parceiro.terms_accepted_at ? new Date(parceiro.terms_accepted_at).toLocaleDateString("pt-BR") : "Pendente"}
                  disabled
                  readOnly
                />
              </FormField>
            </div>
          </ExpandableSection>

          <ExpandableSection title="Dados do parceiro" icon={<Building2 size={18} />}>
            <div className="space-y-3">
              {CAMPOS_TEXTO.map(({ nome, label }) => (
                <FormField key={nome} label={label} required={nome === "name"} error={erros[nome]}>
                  <Input {...propsDeTexto(form, setForm, nome, !podeEditar || (nome === "cnpj" && !gestao))} />
                </FormField>
              ))}
              {podeEditar && <Button onClick={salvar} fullWidth disabled={!form.name?.trim() || temErro(erros)}>Salvar</Button>}
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
                    onChange={(v) => setForm({ ...form, hs_owner_id: v ? Number(v) : null })}
                  />
                ) : (
                  <Input value={parceiro.hs_owner_name ?? "Nenhum"} disabled />
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

          {mostraEquipe && (
          <ExpandableSection title="Equipe" icon={<Users size={18} />} badge={equipe.filter((m) => m.is_active).length}>
            <div className="space-y-3">
              <div className="space-y-2">
                {equipe.map((m) => (
                  <div key={m.id}>
                    <div className={linhaLista}>
                      <span className={m.is_active ? "text-slate-900 dark:text-white" : "text-slate-400 line-through"}>
                        {m.name} {m.email && <span className="text-xs text-slate-500">· {m.email}</span>}
                      </span>
                      <span className="flex flex-wrap items-center justify-end gap-2">
                        {m.user_id && <StatusDoAcesso status={m.status_acesso} expiraEm={m.convite_expira_em} />}
                        {m.user_id && podeGerirLogin && (
                          <AcoesDoConvite
                            url={parceriasService.urlConviteMembro(id, m.id)}
                            status={m.status_acesso}
                            onFeito={async () => setEquipe(await parceriasService.listarEquipe(id))}
                          />
                        )}
                        {podeGerirLogin && !m.user_id && m.email && m.is_active && (
                          <button onClick={() => setDarAcessoA(darAcessoA === m.id ? null : m.id)} className={acaoVerde} title="Dar acesso ao CRM">
                            <KeyRound size={14} />
                          </button>
                        )}
                        {podeEditar && (!m.user_id || podeGerirLogin) && (
                          <button onClick={() => alternarMembro(m)} className={m.is_active ? acaoVermelha : acaoVerde} title={m.is_active ? "Desativar" : "Reativar"}>
                            {m.is_active ? <UserX size={14} /> : <UserCheck size={14} />}
                          </button>
                        )}
                      </span>
                    </div>
                    {darAcessoA === m.id && (
                      <div className="mt-2 rounded-lg border border-gray-200/50 p-3 dark:border-slate-700/50">
                        <FormularioDeAcesso
                          pedirNomeEmail={false}
                          rotuloBotao={`Dar acesso a ${m.name}`}
                          onEnviar={(d) => darAcessoAoMembro(m, d)}
                        />
                      </div>
                    )}
                  </div>
                ))}
                {equipe.length === 0 && <p className="py-2 text-center text-sm text-slate-400">Nenhum vendedor cadastrado</p>}
              </div>
              {podeEditar && (
                <div className="space-y-2 border-t border-gray-200/50 pt-3 dark:border-slate-700/50">
                  <FormField label="Nome" required>
                    <Input {...propsDeTexto(novoMembro, setNovoMembro, "name")} />
                  </FormField>
                  <FormField label="E-mail" error={errosMembro.email}>
                    <Input type="email" placeholder="nome@empresa.com.br" {...propsDeTexto(novoMembro, setNovoMembro, "email")} />
                  </FormField>
                  <FormField label="Telefone" error={errosMembro.phone}>
                    <Input placeholder="(00) 00000-0000" {...propsDeTexto(novoMembro, setNovoMembro, "phone")} />
                  </FormField>
                  <Button size="sm" fullWidth onClick={adicionarMembro} disabled={!novoMembro.name.trim() || temErro(errosMembro)}>
                    Adicionar vendedor
                  </Button>
                </div>
              )}
            </div>
          </ExpandableSection>
          )}

          {gestao && mostraEquipe && (
            <ExpandableSection title="Acessos ao CRM" icon={<KeyRound size={18} />} badge={acessos.filter((a) => a.is_active).length}>
              <div className="space-y-3">
                <div className="space-y-2">
                  {acessos.map((a) => (
                    <div key={a.id} className={linhaLista}>
                      <span className={a.is_active ? "text-slate-900 dark:text-white" : "text-slate-400 line-through"}>{a.email}</span>
                      <span className="flex flex-wrap items-center justify-end gap-2">
                        <StatusDoAcesso status={a.status_acesso} expiraEm={a.convite_expira_em} />
                        <AcoesDoConvite
                          url={parceriasService.urlConviteAcesso(id, a.id)}
                          status={a.status_acesso}
                          onFeito={async () => setAcessos(await parceriasService.listarAcessos(id))}
                        />
                        <button onClick={() => alternarAcesso(a)} className={a.is_active ? acaoVermelha : acaoVerde} title={a.is_active ? "Desativar" : "Reativar"}>
                          {a.is_active ? <UserX size={14} /> : <UserCheck size={14} />}
                        </button>
                      </span>
                    </div>
                  ))}
                  {acessos.length === 0 && <p className="py-2 text-center text-sm text-slate-400">Nenhum acesso criado</p>}
                </div>
                <div className="border-t border-gray-200/50 pt-3 dark:border-slate-700/50">
                  <FormularioDeAcesso pedirNomeEmail onEnviar={criarAcesso} />
                </div>
              </div>
            </ExpandableSection>
          )}
        </div>

        <AbasDoCard
          key={id}
          alvo={{ tipo: "parceiro", id }}
          versao={parceiro.updated_at}
          somenteExtras={externoAlheio}
          extras={[{
            chave: "oportunidades", rotulo: "Oportunidades", icone: <Trello size={16} />,
            conteudo: (
              // Uma faixa só com todas as etapas, na ordem do Pipeline: abertas em azul, Ganho em verde, Perdido em vermelho.
              <div className="space-y-3">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {etapasOp.reduce((s, e) => s + (parceiro.oportunidades_por_etapa[e.codigo] ?? 0), 0)} oportunidade(s) no Pipeline
                </p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-7">
                  {etapasOp.map((e) => {
                    const n = parceiro.oportunidades_por_etapa[e.codigo] ?? 0;
                    const cor = e.codigo === "ganho"
                      ? "border-t-emerald-500 dark:border-t-emerald-500 text-emerald-600 dark:text-emerald-400"
                      : e.codigo === "perdido"
                        ? "border-t-red-500 dark:border-t-red-500 text-red-600 dark:text-red-400"
                        : "border-t-blue-500 dark:border-t-blue-500 text-blue-600 dark:text-blue-400";
                    return (
                      <div
                        key={e.codigo}
                        className={`rounded-lg border border-t-4 border-gray-200 bg-white px-3 py-3 text-center dark:border-slate-700/50 dark:bg-slate-800/30 ${cor}`}
                      >
                        <p className={`text-2xl font-bold ${n > 0 ? "" : "text-slate-400 dark:text-slate-500"}`}>{n}</p>
                        <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400" title={e.nome}>{e.nome}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            ),
          }, ...(externoAlheio || ehHunterCard ? [] : [{
            chave: "contrato", rotulo: "Contrato", icone: <FileSignature size={16} />,
            conteudo: <ContratoDoParceiro parceiro={parceiro} podeEditar={podeEditar} onParceiro={preencher} />,
          }])]}
        />
      </div>
    </div>
  );
}
