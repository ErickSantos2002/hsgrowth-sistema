import { useEffect, useState } from "react";
import { HelpCircle } from "lucide-react";
import { BaseModal } from "../common";
import parceriasService, { type RegrasCnpj } from "../../services/parceriasService";

/**
 * As regras da Consulta de CNPJ em linguagem simples. Os números vêm da configuração
 * (Configurações → Consulta de CNPJ, tabela cnpj_rules_config); 0 dias = regra desligada.
 * A raiz de 8 dígitos para as outras unidades é fixa (services/parcerias/semaforo.py).
 */
export const REGRAS_PADRAO: RegrasCnpj = {
  protection_days: 10, recent_purchase_days: 30, recent_loss_days: 90,
  daily_query_limit: 20, block_between_sellers: true,
};

// Uma leitura por carregamento da página; erro (ou sem rede) fica no padrão.
let carregando: Promise<RegrasCnpj> | null = null;
function carregarRegras(): Promise<RegrasCnpj> {
  carregando ??= parceriasService.lerRegrasCnpj().catch(() => {
    carregando = null;
    return REGRAS_PADRAO;
  });
  return carregando;
}

/** Esquece a leitura guardada (depois de salvar a configuração). */
export function recarregarRegrasCnpj() {
  carregando = null;
}

/** As regras configuradas (o padrão enquanto carrega). */
export function useRegrasCnpj(): RegrasCnpj {
  const [regras, setRegras] = useState<RegrasCnpj>(REGRAS_PADRAO);
  useEffect(() => {
    let vivo = true;
    carregarRegras().then((r) => vivo && setRegras(r));
    return () => { vivo = false; };
  }, []);
  return regras;
}

const dias = (n: number) => (n === 1 ? "1 dia" : `${n} dias`);

function Regra({ cor, titulo, children }: { cor: string; titulo: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className={`mt-1 inline-block h-3 w-3 flex-shrink-0 rounded-full ${cor}`} />
      <div className="space-y-1">
        <p className="font-semibold text-slate-900 dark:text-white">{titulo}</p>
        <div className="space-y-1 text-sm text-slate-600 dark:text-slate-300">{children}</div>
      </div>
    </div>
  );
}

export function RegrasSemaforo({ regras }: { regras: RegrasCnpj }) {
  const p = regras.protection_days;
  const c = regras.recent_purchase_days;
  const l = regras.recent_loss_days;
  return (
    <div className="space-y-5">
      <p className="text-sm text-slate-600 dark:text-slate-300">
        A consulta procura o CNPJ nos <strong>cards de Vendas</strong> da H&amp;S e nas <strong>oportunidades de todos os
        parceiros</strong>. Cards de Serviços não contam. Também olha as outras unidades da mesma empresa (mesma raiz:
        os 8 primeiros números do CNPJ).
      </p>

      <Regra cor="bg-emerald-500" titulo="Livre">
        <p>Nenhum card ou oportunidade com este CNPJ nem com outra unidade da empresa. Pode cadastrar.</p>
      </Regra>

      <Regra cor="bg-red-500" titulo="Bloqueado (o mesmo CNPJ)">
        {p > 0 ? (
          <p>
            <strong>Em negociação:</strong> existe um card ou oportunidade aberto com atividade agendada (futura ou vencida há até {dias(p)}), ou com algum
            movimento (card criado, atividade, nota ou mudança de etapa) nos <strong>últimos {dias(p)}</strong>. Card aberto e parado há
            mais de {dias(p)}, sem nada agendado, <strong>não bloqueia</strong>.
          </p>
        ) : (
          <p><strong>Em negociação:</strong> regra desligada; card ou oportunidade aberto não bloqueia.</p>
        )}
        {c > 0 ? (
          <p><strong>Compra recente:</strong> a empresa comprou há menos de <strong>{dias(c)}</strong>. Libera na data indicada.</p>
        ) : (
          <p><strong>Compra recente:</strong> regra desligada.</p>
        )}
        {l > 0 ? (
          <p><strong>Perdida há pouco:</strong> a negociação foi perdida há menos de <strong>{dias(l)}</strong>. Libera na data indicada.</p>
        ) : (
          <p><strong>Perdida há pouco:</strong> regra desligada.</p>
        )}
        <p>Só admin e gerente cadastram com o CNPJ em vermelho, e precisam escrever a justificativa.</p>
      </Regra>

      <Regra cor="bg-amber-500" titulo="Para análise (outra unidade)">
        <p>
          O CNPJ consultado está livre, mas <strong>outra unidade/filial</strong> da mesma empresa está em uma das
          situações acima. O cadastro entra normalmente e a H&amp;S analisa a elegibilidade.
        </p>
      </Regra>

      {regras.block_between_sellers && (
        <Regra cor="bg-blue-500" titulo="Em Vendas, entre vendedores">
          <p>
            O vendedor também não cria card de Vendas com um CNPJ que <strong>outro vendedor</strong> está trabalhando
            (as mesmas regras do vermelho). O card do próprio vendedor e os leads automáticos não contam. Admin e
            gerente liberam com justificativa, que fica no histórico do card.
          </p>
        </Regra>
      )}

      <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-slate-500 dark:border-slate-700/50 dark:bg-slate-800/50 dark:text-slate-400">
        Parceiros e hunters podem fazer até {regras.daily_query_limit} consultas por dia, por login (volta a liberar à meia-noite). Contam as
        consultas desta página e as do botão Consultar no cadastro da oportunidade.
      </div>
    </div>
  );
}

/** Botão "?" (ou com texto) que abre as regras numa janela. */
export function BotaoRegrasSemaforo({ comTexto = false }: { comTexto?: boolean }) {
  const [aberto, setAberto] = useState(false);
  const regras = useRegrasCnpj();
  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        title="Como funciona a consulta"
        className={comTexto
          ? "flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-gray-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          : "rounded-full p-0.5 text-current opacity-70 transition-opacity hover:opacity-100"}
      >
        <HelpCircle size={comTexto ? 16 : 15} />
        {comTexto && "Como funciona"}
      </button>
      <BaseModal isOpen={aberto} onClose={() => setAberto(false)} title="Como funciona a consulta de CNPJ" size="lg" closeOnOverlayClick>
        <RegrasSemaforo regras={regras} />
      </BaseModal>
    </>
  );
}
