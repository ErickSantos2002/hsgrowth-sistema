import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button, FormField, Input, LoadingSpinner, SelectMenu } from "../../components/common";
import AtividadesParceria from "../../components/parcerias/AtividadesParceria";
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

  const caixa = "rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-700/50 dark:bg-slate-800/40";
  const titulo = "mb-3 text-sm font-semibold text-slate-800 dark:text-slate-200";

  return (
    <div className="p-6">
      <button onClick={() => navigate("/parcerias/aquisicao")} className="mb-4 flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 dark:hover:text-white">
        <ArrowLeft size={16} /> Aquisição de Parceiros
      </button>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{parceiro.name}</h1>
          {parceiro.activation_evidence && (
            <p className="text-sm text-emerald-600">
              Critério de ativação: {EVIDENCIA_LABEL[parceiro.activation_evidence]}
              {parceiro.activated_at && ` em ${new Date(parceiro.activated_at).toLocaleDateString("pt-BR")}`}
            </p>
          )}
          {parceiro.stage === "perdido" && parceiro.loss_reason && (
            <p className="text-sm text-red-500">Perdido: {parceiro.loss_reason}</p>
          )}
        </div>
        <div className="w-56">
          <SelectMenu
            value={parceiro.stage}
            disabled={!podeEditar}
            options={etapas.map((e) => ({ value: e.codigo, label: e.nome }))}
            onChange={(destino) => (destino === "perdido" ? setPerdendo(true) : mover(destino))}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6">
          <div className={caixa}>
            <h2 className={titulo}>Dados do parceiro</h2>
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
          </div>

          <div className={caixa}>
            <h2 className={titulo}>Equipe</h2>
            <ul className="mb-3 space-y-2">
              {equipe.map((m) => (
                <li key={m.id} className="flex items-center justify-between text-sm">
                  <span className={m.is_active ? "text-slate-800 dark:text-slate-200" : "text-slate-400 line-through"}>
                    {m.name} {m.email && <span className="text-xs text-slate-500">· {m.email}</span>}
                  </span>
                  {podeEditar && (
                    <button onClick={() => alternarMembro(m)} className="text-xs text-slate-500 hover:text-emerald-600">
                      {m.is_active ? "Desativar" : "Reativar"}
                    </button>
                  )}
                </li>
              ))}
              {equipe.length === 0 && <li className="text-sm text-slate-500">Nenhum vendedor cadastrado.</li>}
            </ul>
            {podeEditar && (
              <div className="space-y-2">
                <Input placeholder="Nome" value={novoMembro.name} onChange={(e) => setNovoMembro({ ...novoMembro, name: e.target.value })} />
                <Input placeholder="E-mail" value={novoMembro.email} onChange={(e) => setNovoMembro({ ...novoMembro, email: e.target.value })} />
                <Input placeholder="Telefone" value={novoMembro.phone} onChange={(e) => setNovoMembro({ ...novoMembro, phone: e.target.value })} />
                <Button size="sm" onClick={adicionarMembro} disabled={!novoMembro.name.trim()}>Adicionar vendedor</Button>
              </div>
            )}
          </div>

          {gestao && (
            <div className={caixa}>
              <h2 className={titulo}>Acessos ao CRM</h2>
              <ul className="mb-3 space-y-2">
                {acessos.map((a) => (
                  <li key={a.id} className="flex items-center justify-between text-sm">
                    <span className={a.is_active ? "text-slate-800 dark:text-slate-200" : "text-slate-400 line-through"}>
                      {a.email}
                    </span>
                    <button onClick={() => alternarAcesso(a)} className="text-xs text-slate-500 hover:text-emerald-600">
                      {a.is_active ? "Desativar" : "Reativar"}
                    </button>
                  </li>
                ))}
                {acessos.length === 0 && <li className="text-sm text-slate-500">Nenhum acesso criado.</li>}
              </ul>
              <div className="space-y-2">
                <Input placeholder="Nome" value={novoAcesso.name} onChange={(e) => setNovoAcesso({ ...novoAcesso, name: e.target.value })} />
                <Input placeholder="E-mail" type="email" value={novoAcesso.email} onChange={(e) => setNovoAcesso({ ...novoAcesso, email: e.target.value })} />
                <Input placeholder="Senha inicial (mín. 8)" type="password" value={novoAcesso.password} onChange={(e) => setNovoAcesso({ ...novoAcesso, password: e.target.value })} />
                <Button
                  size="sm"
                  onClick={criarAcesso}
                  disabled={!novoAcesso.name.trim() || !novoAcesso.email.trim() || novoAcesso.password.length < 8}
                >
                  Criar acesso
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6 lg:col-span-2">
          <div className={caixa}>
            <h2 className={titulo}>Oportunidades do parceiro</h2>
            <div className="flex flex-wrap gap-2">
              {etapasOp.map((e) => (
                <span key={e.codigo} className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs text-slate-700 dark:bg-slate-700/50 dark:text-slate-300">
                  {e.nome}: <strong>{parceiro.oportunidades_por_etapa[e.codigo] ?? 0}</strong>
                </span>
              ))}
            </div>
          </div>
          <div className={caixa}>
            <h2 className={titulo}>Atividades e histórico</h2>
            <AtividadesParceria alvo={{ tipo: "parceiro", id }} somenteLeitura={!podeEditar} />
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
