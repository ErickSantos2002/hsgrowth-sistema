import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, Search, ShieldAlert, ShieldCheck, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button, FormField, Input, Pagination, SelectMenu } from "../../components/common";
import KpiCard from "../../components/dashboard/KpiCard";
import ResultadoSemaforo from "../../components/parcerias/ResultadoSemaforo";
import { cnpjValido, limparCnpj, mascarar } from "../../components/parcerias/campos";
import { MOTIVO_SEMAFORO, PERFIS_GESTAO, SEMAFORO_COR, SEMAFORO_LABEL } from "../../constants/parcerias";
import { useAuth } from "../../hooks/useAuth";
import parceriasService, {
  ConsultaCnpj as Consulta, ConsultaHistoricoItem, FiltroHistorico, Parceiro, ResumoConsultas, mensagemDeErro,
} from "../../services/parceriasService";
import userService from "../../services/userService";
import { showError } from "../../utils/toast";

const POR_PAGINA = 10;

/** "Livre" sozinho; nas outras cores, a cor e o motivo ("Bloqueado · Em negociação"). */
const rotuloDoResultado = (resultado: string, motivo: string) =>
  motivo === "livre" ? SEMAFORO_LABEL[resultado] : `${SEMAFORO_LABEL[resultado]} · ${MOTIVO_SEMAFORO[motivo]}`;

export default function ConsultaCnpj() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const gestao = PERFIS_GESTAO.includes(user?.role ?? "");

  const [cnpj, setCnpj] = useState("");
  const [consultando, setConsultando] = useState(false);
  const [resultado, setResultado] = useState<Consulta | null>(null);
  const [resumo, setResumo] = useState<ResumoConsultas | null>(null);

  const [filtro, setFiltro] = useState<FiltroHistorico>({ pagina: 1 });
  const [historico, setHistorico] = useState<{ total: number; itens: ConsultaHistoricoItem[] }>({ total: 0, itens: [] });
  const [pessoas, setPessoas] = useState<{ value: string; label: string }[]>([]);
  const [parceiros, setParceiros] = useState<Parceiro[]>([]);

  const carregarResumo = useCallback(() => {
    parceriasService.resumoConsultas().then(setResumo).catch(() => setResumo(null));
  }, []);

  const carregarHistorico = useCallback(async () => {
    if (!gestao) return;
    try {
      setHistorico(await parceriasService.historicoConsultas(filtro));
    } catch (err) {
      showError(mensagemDeErro(err, "Erro ao carregar o histórico."));
    }
  }, [gestao, filtro]);

  useEffect(() => {
    carregarResumo();
  }, [carregarResumo]);

  useEffect(() => {
    carregarHistorico();
  }, [carregarHistorico]);

  useEffect(() => {
    if (!gestao) return;
    userService.listActive()
      .then((us) => setPessoas(us.map((u) => ({ value: String(u.id), label: u.name }))))
      .catch(() => setPessoas([]));
    parceriasService.listarParceiros().then(setParceiros).catch(() => setParceiros([]));
  }, [gestao]);

  const consultar = async () => {
    setConsultando(true);
    try {
      setResultado(await parceriasService.consultarCnpj(cnpj));
      carregarResumo();
      carregarHistorico();
    } catch (err) {
      setResultado(null);
      showError(mensagemDeErro(err, "Erro ao consultar o CNPJ."));
    } finally {
      setConsultando(false);
    }
  };

  const invalido = limparCnpj(cnpj).length === 14 && !cnpjValido(cnpj);
  const pronto = cnpjValido(cnpj);
  const mudarFiltro = (parcial: FiltroHistorico) => setFiltro({ ...filtro, ...parcial, pagina: 1 });

  const pagina = filtro.pagina ?? 1;
  const paginas = Math.max(1, Math.ceil(historico.total / POR_PAGINA));
  const irPara = (p: number) => setFiltro({ ...filtro, pagina: Math.min(Math.max(p, 1), paginas) });

  const total30 = resumo?.ultimos_30_dias ?? 0;
  const deQuem = gestao ? "de todo o time e dos parceiros" : "suas";

  return (
    <div className="flex h-full flex-col bg-gray-50 dark:bg-gradient-to-br dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="flex-shrink-0 border-b border-gray-200 bg-white px-6 py-4 dark:border-slate-700/50 dark:bg-slate-900/95">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="rounded-lg p-2 transition-colors hover:bg-gray-100 dark:hover:bg-slate-800/50" title="Voltar">
            <ArrowLeft size={20} className="text-slate-500 dark:text-slate-400" />
          </button>
          <ShieldCheck size={28} className="text-blue-500" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Consulta de CNPJ</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Antes de trabalhar uma empresa, veja se ela já está com a H&amp;S ou com outro parceiro.
            </p>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            icon={<Search size={20} />}
            iconBg="bg-blue-500/20 text-blue-600 dark:text-blue-400"
            label="Consultas hoje"
            value={resumo?.hoje ?? null}
            sub={resumo?.limite != null ? `de ${resumo.limite} permitidas por dia` : gestao ? "todas as pessoas" : "suas consultas"}
            highlight="blue"
            info={resumo?.limite != null
              ? "O parceiro pode fazer até 20 consultas por dia. Volta a liberar à meia-noite."
              : "Consultas feitas hoje na página e no cadastro da oportunidade."}
          />
          <KpiCard
            icon={<TrendingUp size={20} />}
            iconBg="bg-purple-500/20 text-purple-600 dark:text-purple-400"
            label="Últimos 30 dias"
            value={resumo ? total30 : null}
            sub={`consultas ${deQuem}`}
            info="Total de consultas nos últimos 30 dias."
          />
          <KpiCard
            icon={<CheckCircle2 size={20} />}
            iconBg="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
            label="Livres"
            value={resumo && total30 ? (resumo.verdes / total30) * 100 : resumo ? 0 : null}
            format="percent"
            sub={`${resumo?.verdes ?? 0} de ${total30} nos últimos 30 dias`}
            highlight="green"
            info="Consultas que deram verde: a empresa não estava com a H&S nem com outro parceiro."
          />
          <KpiCard
            icon={<ShieldAlert size={20} />}
            iconBg="bg-red-500/20 text-red-600 dark:text-red-400"
            label="Bloqueadas"
            value={resumo?.vermelhos ?? null}
            sub={`${resumo?.amarelos ?? 0} para análise (outra unidade)`}
            highlight="red"
            info="Consultas que deram vermelho nos últimos 30 dias: em negociação, compra recente ou perdida há pouco. O amarelo (outra unidade) aparece embaixo."
          />
        </div>

        {/* Consulta e histórico no mesmo card */}
        <div className="rounded-xl border border-gray-200 bg-white dark:border-slate-700/50 dark:bg-slate-800/50">
          <div className="max-w-2xl space-y-4 p-5">
            <div className="flex items-end gap-2">
              <FormField label="CNPJ" error={invalido ? "CNPJ inválido" : undefined} className="flex-1">
                <Input
                  value={cnpj}
                  placeholder="00.000.000/0000-00"
                  maxLength={18}
                  inputMode="numeric"
                  onChange={(e) => setCnpj(mascarar("cnpj", e.target.value))}
                  onKeyDown={(e) => e.key === "Enter" && pronto && consultar()}
                />
              </FormField>
              <Button onClick={consultar} loading={consultando} disabled={!pronto}>
                <Search size={16} className="mr-1" /> Consultar
              </Button>
            </div>
            {resultado && <ResultadoSemaforo consulta={resultado} />}
          </div>

          {gestao && (
            <div className="border-t border-gray-200 dark:border-slate-700/50">
              <div className="space-y-3 p-5">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Histórico de consultas</h2>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <SelectMenu
                    value={filtro.user_id ? String(filtro.user_id) : ""}
                    options={[{ value: "", label: "Todas as pessoas" }, ...pessoas]}
                    onChange={(v) => mudarFiltro({ user_id: v ? Number(v) : undefined })}
                  />
                  <SelectMenu
                    value={filtro.partner_id ? String(filtro.partner_id) : ""}
                    options={[{ value: "", label: "Todos os parceiros" }, ...parceiros.map((p) => ({ value: String(p.id), label: p.name }))]}
                    onChange={(v) => mudarFiltro({ partner_id: v ? Number(v) : undefined })}
                  />
                  <Input type="date" value={filtro.desde ?? ""} title="Desde" onChange={(e) => mudarFiltro({ desde: e.target.value || undefined })} />
                  <Input type="date" value={filtro.ate ?? ""} title="Até" onChange={(e) => mudarFiltro({ ate: e.target.value || undefined })} />
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-gray-200 text-xs uppercase text-slate-500 dark:border-slate-700/50 dark:text-slate-400">
                      <tr>
                        <th className="py-2 pr-3">Quando</th>
                        <th className="py-2 pr-3">Pessoa</th>
                        <th className="py-2 pr-3">Parceiro</th>
                        <th className="py-2 pr-3">CNPJ</th>
                        <th className="py-2">Resultado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
                      {historico.itens.map((c) => (
                        <tr key={c.id} className="text-slate-700 dark:text-slate-200">
                          <td className="whitespace-nowrap py-2 pr-3">{new Date(`${c.created_at}Z`).toLocaleString("pt-BR")}</td>
                          <td className="py-2 pr-3">{c.user_name ?? "—"}</td>
                          <td className="py-2 pr-3">{c.partner_name ?? "H&S"}</td>
                          <td className="whitespace-nowrap py-2 pr-3">{mascarar("cnpj", c.cnpj)}</td>
                          <td className="py-2">
                            <span className={`rounded border px-2 py-0.5 text-xs font-medium ${SEMAFORO_COR[c.resultado]}`}>
                              {rotuloDoResultado(c.resultado, c.motivo)}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {historico.itens.length === 0 && (
                        <tr><td colSpan={5} className="py-6 text-center text-slate-400">Nenhuma consulta no período</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              <Pagination
                currentPage={pagina}
                totalPages={paginas}
                totalItems={historico.total}
                startIndex={(pagina - 1) * POR_PAGINA}
                endIndex={Math.min(pagina * POR_PAGINA, historico.total)}
                hasNextPage={pagina < paginas}
                hasPrevPage={pagina > 1}
                goToPage={irPara}
                goToNextPage={() => irPara(pagina + 1)}
                goToPrevPage={() => irPara(pagina - 1)}
                itemLabel="consultas"
                alwaysShow
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
