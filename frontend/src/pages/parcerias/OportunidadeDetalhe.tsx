import { ReactNode, useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Activity, ArrowLeft, Briefcase, Building2, CheckCircle2, DollarSign, Package, RefreshCw, ShieldCheck, Trash2, XCircle,
} from "lucide-react";
import { Button, FormField, Input, LoadingSpinner, SelectMenu, Textarea } from "../../components/common";
import ExpandableSection from "../../components/cardDetails/ExpandableSection";
import AtividadesParceria from "../../components/parcerias/AtividadesParceria";
import EtapasParceria from "../../components/parcerias/EtapasParceria";
import ModalTrava, { faltasParaMover, temFalta } from "../../components/parcerias/ModalTrava";
import { useAuth } from "../../hooks/useAuth";
import { showError, showSuccess } from "../../utils/toast";
import { DEAL_TYPES, LOSS_REASONS_ACQUISITION, RELATIONSHIP_TYPES, SECTORS } from "../../constants/blueprintOptions";
import {
  ELEGIBILIDADE_COR, ELEGIBILIDADE_LABEL, PERFIS_GESTAO, formatarCnpj, formatarMoeda,
} from "../../constants/parcerias";
import parceriasService, {
  Etapa, ItemProduto, Membro, MoverPayload, Oportunidade, OportunidadeForm, ProdutoCatalogo, mensagemDeErro,
} from "../../services/parceriasService";

const opcoes = (lista: string[]) => lista.map((v) => ({ value: v, label: v }));

type Aba = "atividades" | "produtos";

export default function OportunidadeDetalhe() {
  const { opportunityId } = useParams();
  const id = Number(opportunityId);
  const navigate = useNavigate();
  const { user } = useAuth();
  const gestao = PERFIS_GESTAO.includes(user?.role ?? "");
  const podeEditar = gestao || user?.role === "partner";
  const validaElegibilidade = gestao || user?.role === "finance";

  const [op, setOp] = useState<Oportunidade | null>(null);
  const [form, setForm] = useState<OportunidadeForm>({});
  const [etapas, setEtapas] = useState<Etapa[]>([]);
  const [equipe, setEquipe] = useState<Membro[]>([]);
  const [itens, setItens] = useState<ItemProduto[]>([]);
  const [busca, setBusca] = useState("");
  const [catalogo, setCatalogo] = useState<ProdutoCatalogo[]>([]);
  const [nota, setNota] = useState("");
  const [destinoPendente, setDestinoPendente] = useState<string | null>(null);
  const [aba, setAba] = useState<Aba>("atividades");

  const preencher = (o: Oportunidade) => {
    setOp(o);
    setForm({
      seller_member_id: o.seller_member_id ?? null, title: o.title, deal_type: o.deal_type, sector: o.sector,
      relationship_type: o.relationship_type, context: o.context, cnpj: formatarCnpj(o.cnpj),
      company_name: o.company_name, company_segment: o.company_segment ?? "", company_city: o.company_city ?? "",
      company_state: o.company_state ?? "", contact_name: o.contact_name ?? "", contact_role: o.contact_role ?? "",
      contact_phone: o.contact_phone ?? "", contact_email: o.contact_email ?? "",
      expected_close_date: o.expected_close_date ?? "", modality: o.modality ?? null,
    });
  };

  const carregar = useCallback(async () => {
    try {
      const [o, e, produtos] = await Promise.all([
        parceriasService.buscarOportunidade(id),
        parceriasService.etapas(),
        parceriasService.listarProdutos(id),
      ]);
      preencher(o);
      setEtapas(e.oportunidades);
      setItens(produtos);
      setEquipe(await parceriasService.listarEquipe(o.partner_id));
    } catch (err) {
      showError(mensagemDeErro(err, "Erro ao carregar a oportunidade."));
      navigate("/parcerias/oportunidades");
    }
  }, [id, navigate]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  useEffect(() => {
    if (!podeEditar || busca.trim().length < 2) {
      setCatalogo([]);
      return;
    }
    const t = setTimeout(() => parceriasService.catalogo(busca).then(setCatalogo).catch(() => setCatalogo([])), 300);
    return () => clearTimeout(t);
  }, [busca, podeEditar]);

  if (!op) return <LoadingSpinner />;

  const ganho = op.stage === "ganho";
  const perdido = op.stage === "perdido";
  // Oportunidade ganha ou perdida só a gestão reabre.
  const podeMover = podeEditar && (gestao || (!ganho && !perdido));

  const salvar = async () => {
    try {
      const dados = Object.fromEntries(
        Object.entries(form).map(([k, v]) => [k, typeof v === "string" && v.trim() === "" ? null : v])
      ) as OportunidadeForm;
      preencher(await parceriasService.atualizarOportunidade(id, dados));
      showSuccess("Oportunidade salva.");
    } catch (err) {
      showError(mensagemDeErro(err, "Erro ao salvar a oportunidade."));
    }
  };

  const mover = async (destino: string, extras: Partial<MoverPayload> = {}) => {
    try {
      preencher(await parceriasService.moverOportunidade(id, { stage: destino, ...extras }));
    } catch (err) {
      showError(mensagemDeErro(err, "Não foi possível mover a oportunidade."));
    }
  };

  const pedirMover = (destino: string) => {
    if (temFalta(faltasParaMover(destino, op))) setDestinoPendente(destino);
    else mover(destino);
  };

  const elegibilidade = async (status: string) => {
    try {
      preencher(await parceriasService.definirElegibilidade(id, status, nota.trim() || undefined));
      setNota("");
    } catch (err) {
      showError(mensagemDeErro(err, "Erro ao registrar a elegibilidade."));
    }
  };

  const recarregarProdutos = async () => {
    setItens(await parceriasService.listarProdutos(id));
    setOp(await parceriasService.buscarOportunidade(id));
  };

  const adicionar = async (p: ProdutoCatalogo) => {
    try {
      await parceriasService.adicionarProduto(id, { product_id: p.id, quantity: 1 });
      setBusca("");
      await recarregarProdutos();
    } catch (err) {
      showError(mensagemDeErro(err, "Erro ao adicionar o produto."));
    }
  };

  const mudarQuantidade = async (item: ItemProduto, quantidade: number) => {
    if (quantidade < 1) return;
    try {
      await parceriasService.atualizarProduto(id, item.id, { quantity: quantidade });
      await recarregarProdutos();
    } catch (err) {
      showError(mensagemDeErro(err, "Erro ao alterar a quantidade."));
    }
  };

  const remover = async (item: ItemProduto) => {
    try {
      await parceriasService.removerProduto(id, item.id);
      await recarregarProdutos();
    } catch (err) {
      showError(mensagemDeErro(err, "Erro ao remover o produto."));
    }
  };

  const texto = (nome: keyof OportunidadeForm) => ({
    value: (form[nome] as string) ?? "",
    disabled: !podeEditar,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm({ ...form, [nome]: e.target.value }),
  });

  const abas: { chave: Aba; rotulo: string; icone: ReactNode; badge?: number }[] = [
    { chave: "atividades", rotulo: "Atividades", icone: <Activity size={16} /> },
    { chave: "produtos", rotulo: "Produtos", icone: <Package size={16} />, badge: itens.length },
  ];

  return (
    <div className="flex h-full flex-col bg-gray-50 dark:bg-gradient-to-br dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Cabeçalho */}
      <div className="flex-shrink-0 border-b border-gray-200 bg-white px-6 py-4 dark:border-slate-700/50 dark:bg-slate-900/50">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/parcerias/oportunidades")}
            className="rounded-lg p-2 transition-colors hover:bg-gray-100 dark:hover:bg-slate-800/50"
            title="Voltar para o board"
          >
            <ArrowLeft size={20} className="text-slate-500 dark:text-slate-400" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-2xl font-bold text-slate-900 dark:text-white">{op.title}</h1>
            <p className="truncate text-sm text-slate-500 dark:text-slate-400">
              {op.company_name} · Parceiro: {op.partner_name} · Canal: {op.acquisition_channel}
            </p>
          </div>
          <div className="flex flex-shrink-0 items-center gap-2">
            {perdido || ganho ? (
              <>
                {perdido ? (
                  <div className="flex items-center gap-2 rounded-lg border border-red-500/50 bg-red-500/20 px-3 py-2 text-sm font-medium text-red-500 dark:text-red-400">
                    <XCircle size={16} /> Negócio Perdido
                  </div>
                ) : (
                  <div className="flex items-center gap-2 rounded-lg border border-emerald-500/50 bg-emerald-500/20 px-3 py-2 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 size={16} /> Negócio Ganho
                  </div>
                )}
                {gestao && (
                  <button onClick={() => mover("novo_lead")} title="Volta para Novo Lead" className="flex items-center gap-2 rounded-lg bg-blue-500 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600">
                    <RefreshCw size={16} /> Reabrir Negócio
                  </button>
                )}
              </>
            ) : (
              podeEditar && (
                <>
                  <button onClick={() => pedirMover("perdido")} className="flex items-center gap-2 rounded-lg bg-red-500 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-red-600">
                    <XCircle size={16} /> Perdido
                  </button>
                  <button onClick={() => pedirMover("ganho")} className="flex items-center gap-2 rounded-lg bg-emerald-500 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-600">
                    <CheckCircle2 size={16} /> Ganho
                  </button>
                </>
              )
            )}
          </div>
        </div>
        <div className="mt-3">
          <EtapasParceria
            etapas={etapas}
            atual={op.stage}
            fixas={["ganho"]}
            onMover={podeMover ? pedirMover : undefined}
          />
        </div>
      </div>

      {/* Conteúdo: 30/70 */}
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div className="w-full flex-shrink-0 space-y-3 overflow-y-auto border-b border-gray-200 p-4 dark:border-slate-700/50 lg:w-[30%] lg:border-b-0 lg:border-r">
          <ExpandableSection title="Elegibilidade" defaultExpanded icon={<ShieldCheck size={18} />}>
            <div className="space-y-3">
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-sm font-medium text-slate-600 dark:text-slate-300">
                    <DollarSign size={14} className="text-emerald-400" />
                    <span>Valor do negócio</span>
                  </div>
                  <span className="text-lg font-bold text-emerald-500">{formatarMoeda(op.total_value)}</span>
                </div>
                <p className="mt-0.5 text-xs text-slate-400">Soma dos produtos da oportunidade.</p>
              </div>
              <div>
                <span className={`rounded px-2 py-1 text-xs font-medium ${ELEGIBILIDADE_COR[op.eligibility_status]}`}>
                  {ELEGIBILIDADE_LABEL[op.eligibility_status]}
                </span>
                {op.eligibility_by_name && (
                  <p className="mt-2 text-xs text-slate-500">
                    por {op.eligibility_by_name}
                    {op.eligibility_at && ` em ${new Date(op.eligibility_at).toLocaleDateString("pt-BR")}`}
                  </p>
                )}
                {op.eligibility_note && <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">{op.eligibility_note}</p>}
              </div>
              {perdido && op.loss_reason && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-300">
                  Perdida: {op.loss_reason}{op.loss_detail && ` — ${op.loss_detail}`}
                </div>
              )}
              {validaElegibilidade && op.stage === "novo_lead" && (
                <div className="space-y-2 border-t border-gray-200/50 pt-3 dark:border-slate-700/50">
                  <Textarea value={nota} onChange={(e) => setNota(e.target.value)} rows={2} placeholder="Justificativa (obrigatória para rejeitar)" />
                  <div className="grid grid-cols-2 gap-2">
                    <Button size="sm" onClick={() => elegibilidade("validada")}>Validar</Button>
                    <Button size="sm" variant="danger" onClick={() => elegibilidade("rejeitada")} disabled={!nota.trim()}>Rejeitar</Button>
                  </div>
                </div>
              )}
            </div>
          </ExpandableSection>

          <ExpandableSection title="Negócio" icon={<Briefcase size={18} />}>
            <div className="space-y-3">
              <FormField label="Título" required><Input {...texto("title")} /></FormField>
              <FormField label="Tipo de negócio" required>
                <SelectMenu value={form.deal_type ?? ""} disabled={!podeEditar} options={opcoes(DEAL_TYPES)} onChange={(v) => setForm({ ...form, deal_type: v })} />
              </FormField>
              <FormField label="Setor" required>
                <SelectMenu value={form.sector ?? ""} disabled={!podeEditar} options={opcoes(SECTORS)} onChange={(v) => setForm({ ...form, sector: v })} />
              </FormField>
              <FormField label="Tipo de relacionamento" required>
                <SelectMenu value={form.relationship_type ?? ""} disabled={!podeEditar} options={opcoes(RELATIONSHIP_TYPES)} onChange={(v) => setForm({ ...form, relationship_type: v })} />
              </FormField>
              <FormField label="Vendedor responsável">
                <SelectMenu
                  value={form.seller_member_id ? String(form.seller_member_id) : ""}
                  placeholder="Sem vendedor"
                  disabled={!podeEditar}
                  options={equipe.filter((m) => m.is_active || m.id === op.seller_member_id).map((m) => ({ value: String(m.id), label: m.name }))}
                  onChange={(v) => setForm({ ...form, seller_member_id: Number(v) })}
                />
              </FormField>
              <FormField label="Data esperada de fechamento">
                <Input type="date" {...texto("expected_close_date")} />
              </FormField>
              <FormField label="É venda ou locação?">
                <SelectMenu
                  value={form.modality ?? ""}
                  placeholder="Escolha"
                  disabled={!podeEditar}
                  options={[{ value: "venda", label: "Venda" }, { value: "locacao", label: "Locação" }]}
                  onChange={(v) => setForm({ ...form, modality: v as "venda" | "locacao" })}
                />
              </FormField>
              <FormField label="Contexto da indicação" required><Textarea {...texto("context")} rows={3} /></FormField>
              {podeEditar && <Button onClick={salvar} fullWidth>Salvar</Button>}
            </div>
          </ExpandableSection>

          <ExpandableSection title="Empresa e contato" icon={<Building2 size={18} />}>
            <div className="space-y-3">
              <FormField label="CNPJ" required><Input {...texto("cnpj")} /></FormField>
              <FormField label="Razão social / nome" required><Input {...texto("company_name")} /></FormField>
              <FormField label="Segmento"><Input {...texto("company_segment")} /></FormField>
              <FormField label="Cidade"><Input {...texto("company_city")} /></FormField>
              <FormField label="UF"><Input {...texto("company_state")} maxLength={2} /></FormField>
              <FormField label="Contato"><Input {...texto("contact_name")} /></FormField>
              <FormField label="Cargo"><Input {...texto("contact_role")} /></FormField>
              <FormField label="Telefone"><Input {...texto("contact_phone")} /></FormField>
              <FormField label="E-mail"><Input {...texto("contact_email")} /></FormField>
              {podeEditar && <Button onClick={salvar} fullWidth>Salvar</Button>}
            </div>
          </ExpandableSection>
        </div>

        <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col">
          <div className="flex flex-shrink-0 items-center gap-1 overflow-x-auto border-b border-gray-200 bg-white px-4 dark:border-slate-700/50 dark:bg-slate-900/30">
            {abas.map((a) => (
              <button
                key={a.chave}
                onClick={() => setAba(a.chave)}
                className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                  aba === a.chave
                    ? "border-blue-500 text-blue-500 dark:text-blue-400"
                    : "border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                {a.icone}
                {a.rotulo}
                {!!a.badge && <span className="rounded-full bg-blue-500/20 px-1.5 text-xs text-blue-400">{a.badge}</span>}
              </button>
            ))}
          </div>

          <div className="min-h-0 min-w-0 flex-1 overflow-y-auto p-6">
            {aba === "atividades" && (
              <AtividadesParceria alvo={{ tipo: "oportunidade", id }} somenteLeitura={!podeEditar} />
            )}
            {aba === "produtos" && (
              <div className="space-y-4">
                {podeEditar && (
                  <div className="relative">
                    <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar produto por nome ou código" />
                    {catalogo.length > 0 && (
                      <ul className="absolute z-10 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
                        {catalogo.map((p) => (
                          <li key={p.id}>
                            <button onClick={() => adicionar(p)} className="flex w-full justify-between px-3 py-2 text-left text-sm text-slate-900 hover:bg-gray-100 dark:text-white dark:hover:bg-slate-800">
                              <span>{p.name}{p.sku && <span className="text-xs text-slate-500"> · {p.sku}</span>}</span>
                              <span className="text-xs text-slate-500">{formatarMoeda(p.unit_price)}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
                <div className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-slate-700/50 dark:bg-slate-800/30">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-xs text-slate-500 dark:bg-slate-900/40 dark:text-slate-400">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium">Produto</th>
                        <th className="w-24 px-3 py-2 text-left font-medium">Qtd.</th>
                        <th className="px-3 py-2 text-right font-medium">Unitário</th>
                        <th className="px-3 py-2 text-right font-medium">Total</th>
                        <th className="w-10" />
                      </tr>
                    </thead>
                    <tbody>
                      {itens.map((item) => (
                        <tr key={item.id} className="border-t border-gray-100 dark:border-slate-700/50">
                          <td className="px-3 py-2 text-slate-900 dark:text-white">{item.product_name}</td>
                          <td className="px-3 py-2">
                            <Input
                              type="number"
                              min={1}
                              defaultValue={item.quantity}
                              disabled={!podeEditar}
                              onBlur={(e) => Number(e.target.value) !== item.quantity && mudarQuantidade(item, Number(e.target.value))}
                            />
                          </td>
                          <td className="px-3 py-2 text-right text-slate-600 dark:text-slate-400">{formatarMoeda(item.unit_price)}</td>
                          <td className="px-3 py-2 text-right font-medium text-slate-900 dark:text-white">{formatarMoeda(item.total)}</td>
                          <td className="px-3 py-2 text-right">
                            {podeEditar && (
                              <button onClick={() => remover(item)} className="text-slate-400 hover:text-red-500" title="Remover">
                                <Trash2 size={16} />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                      {itens.length === 0 && (
                        <tr><td colSpan={5} className="px-3 py-8 text-center text-slate-400">Nenhum produto na oportunidade</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <ModalTrava
        isOpen={!!destinoPendente}
        destinoNome={etapas.find((e) => e.codigo === destinoPendente)?.nome ?? ""}
        faltas={destinoPendente ? faltasParaMover(destinoPendente, op) : { motivo: false, data: false, modalidade: false }}
        motivos={LOSS_REASONS_ACQUISITION}
        onClose={() => setDestinoPendente(null)}
        onConfirmar={(extras) => {
          const destino = destinoPendente;
          setDestinoPendente(null);
          if (destino) mover(destino, extras);
        }}
      />
    </div>
  );
}
