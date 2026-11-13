import { useState } from "react";
import { HelpCircle } from "lucide-react";
import { BaseModal } from "../common";

/**
 * As regras da Consulta de CNPJ em linguagem simples, iguais às do backend
 * (services/parcerias/semaforo.py: 10 dias de proteção, 30 de compra recente, 90 de perda recente,
 * raiz de 8 dígitos para as outras unidades). Mudou lá, muda aqui.
 */
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

export function RegrasSemaforo() {
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
        <p>
          <strong>Em negociação:</strong> existe um card ou oportunidade aberto com atividade agendada (futura ou vencida há até 10 dias), ou com algum
          movimento (card criado, atividade, nota ou mudança de etapa) nos <strong>últimos 10 dias</strong>. Card aberto e parado há
          mais de 10 dias, sem nada agendado, <strong>não bloqueia</strong>.
        </p>
        <p><strong>Compra recente:</strong> a empresa comprou há menos de <strong>30 dias</strong>. Libera na data indicada.</p>
        <p><strong>Perdida há pouco:</strong> a negociação foi perdida há menos de <strong>90 dias</strong>. Libera na data indicada.</p>
        <p>Só admin e gerente cadastram com o CNPJ em vermelho, e precisam escrever a justificativa.</p>
      </Regra>

      <Regra cor="bg-amber-500" titulo="Para análise (outra unidade)">
        <p>
          O CNPJ consultado está livre, mas <strong>outra unidade/filial</strong> da mesma empresa está em uma das
          situações acima. O cadastro entra normalmente e a H&amp;S analisa a elegibilidade.
        </p>
      </Regra>

      <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-slate-500 dark:border-slate-700/50 dark:bg-slate-800/50 dark:text-slate-400">
        Parceiros e hunters podem fazer até 20 consultas por dia, por login (volta a liberar à meia-noite). Contam as
        consultas desta página e as do botão Consultar no cadastro da oportunidade.
      </div>
    </div>
  );
}

/** Botão "?" (ou com texto) que abre as regras numa janela. */
export function BotaoRegrasSemaforo({ comTexto = false }: { comTexto?: boolean }) {
  const [aberto, setAberto] = useState(false);
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
        <RegrasSemaforo />
      </BaseModal>
    </>
  );
}
