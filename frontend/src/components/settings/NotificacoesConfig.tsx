/**
 * Configurações > Notificações.
 *
 * Até 14/10/2026 esta aba era de enfeite: os botões ficavam em estado local e
 * "salvar" era um console.log. Agora cada botão salva ao clicar, e só aparece o
 * que existe e faz sentido para o perfil.
 */
import { useEffect, useState } from "react";
import { Lock } from "lucide-react";
import userService from "../../services/userService";
import serviceBoardService from "../../services/serviceBoardService";
import { useAuth } from "../../hooks/useAuth";
import { showError, showSuccess } from "../../utils/toast";
import { NotificationSettings, NotificationSettingsUpdate } from "../../types";

type Chave = "task_assigned" | "card_product_changed" | "reuniao_pronta" | "resumo_manha" | "reuniao_15min" | "popup_navegador";

const CARTAO = "flex items-center justify-between rounded-lg bg-gray-100 p-4 dark:bg-slate-700/50";
const TITULO = "mb-3 text-lg font-medium text-slate-900 dark:text-white";

function Linha({ titulo, descricao, children }: { titulo: string; descricao: string; children: React.ReactNode }) {
  return (
    <div className={CARTAO}>
      <div className="pr-4">
        <p className="font-medium text-slate-900 dark:text-white">{titulo}</p>
        <p className="text-sm text-slate-500 dark:text-slate-400">{descricao}</p>
      </div>
      {children}
    </div>
  );
}

function Interruptor({ ligado, onChange }: { ligado: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={ligado}
      onClick={() => onChange(!ligado)}
      className={`relative h-6 w-11 flex-shrink-0 rounded-full transition-colors ${ligado ? "bg-emerald-500" : "bg-gray-300 dark:bg-slate-600"}`}
    >
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${ligado ? "translate-x-5" : "translate-x-0.5"}`} />
    </button>
  );
}

const NotificacoesConfig: React.FC = () => {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<NotificationSettings | null>(null);
  const [boards, setBoards] = useState<{ id: number; name: string }[]>([]);

  const papel = user?.role;
  const vendas = papel === "salesperson" || papel === "sdr" || papel === "admin" || papel === "manager";
  const servico = papel === "service" || papel === "admin" || papel === "manager";

  useEffect(() => {
    userService.getNotificationSettings().then(setPrefs).catch(() => showError("Não foi possível carregar suas preferências"));
    if (servico) {
      serviceBoardService.list({ page_size: 50 }).then((r) => setBoards(r.boards)).catch(() => {});
    }
  }, [servico]);

  const salvar = async (mudanca: NotificationSettingsUpdate) => {
    try {
      setPrefs(await userService.updateNotificationSettings(mudanca));
      showSuccess("Preferência salva");
    } catch {
      showError("Não foi possível salvar");
    }
  };

  const alternar = async (chave: Chave, valor: boolean) => {
    if (chave === "popup_navegador" && valor && "Notification" in window && Notification.permission === "default") {
      const permissao = await Notification.requestPermission();
      if (permissao === "denied") showError("O navegador bloqueou os pop-ups. Libere nas configurações do navegador.");
    }
    salvar({ [chave]: valor });
  };

  const alternarBoard = (id: number, marcado: boolean) => {
    const atuais = new Set(prefs?.quadros_servico ?? []);
    if (marcado) atuais.add(id);
    else atuais.delete(id);
    salvar({ quadros_servico: Array.from(atuais).sort((a, b) => a - b) });
  };

  if (!prefs) {
    return <p className="text-sm text-slate-500">Carregando preferências...</p>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Notificações</h2>

      {vendas && (
        <section>
          <h3 className={TITULO}>Sempre ativos</h3>
          <div className="space-y-3">
            {[
              ["Novo lead do site", "Quando um lead chega pelo site e é distribuído para você"],
              ["Card atribuído a mim", "Quando outra pessoa, ou a distribuição automática, coloca você no card"],
            ].map(([titulo, descricao]) => (
              <Linha key={titulo} titulo={titulo} descricao={descricao}>
                <Lock size={18} className="text-slate-400" />
              </Linha>
            ))}
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Estes não podem ser desligados: ignorados, deixam o cliente esperando.
            </p>
          </div>
        </section>
      )}

      {vendas && (
        <section>
          <h3 className={TITULO}>Vendas</h3>
          <div className="space-y-3">
            <Linha titulo="Tarefa criada para mim" descricao="Quando outra pessoa cria ou passa uma tarefa para você">
              <Interruptor ligado={prefs.task_assigned} onChange={(v) => alternar("task_assigned", v)} />
            </Linha>
            <Linha titulo="Produto no meu card" descricao="Quando outra pessoa adiciona ou remove produto de um card seu">
              <Interruptor ligado={prefs.card_product_changed} onChange={(v) => alternar("card_product_changed", v)} />
            </Linha>
            <Linha titulo="Gravação e análise da reunião" descricao="Quando a gravação ou a análise de uma reunião sua fica pronta">
              <Interruptor ligado={prefs.reuniao_pronta} onChange={(v) => alternar("reuniao_pronta", v)} />
            </Linha>
          </div>
        </section>
      )}

      <section>
        <h3 className={TITULO}>Lembretes</h3>
        <div className="space-y-3">
          <Linha titulo="Resumo da manhã" descricao="Às 8h, de segunda a sexta: o que você tem para hoje e o que está atrasado">
            <Interruptor ligado={prefs.resumo_manha} onChange={(v) => alternar("resumo_manha", v)} />
          </Linha>
          {vendas && (
            <Linha titulo="Reunião em 15 minutos" descricao="Aviso 15 minutos antes de cada reunião sua">
              <Interruptor ligado={prefs.reuniao_15min} onChange={(v) => alternar("reuniao_15min", v)} />
            </Linha>
          )}
        </div>
      </section>

      {servico && boards.length > 0 && (
        <section>
          <h3 className={TITULO}>Serviço — avisar card novo em</h3>
          <div className="space-y-3">
            {boards.map((b) => (
              <Linha key={b.id} titulo={b.name} descricao="Cards que chegam do GestorHS ou criados por outra pessoa">
                <Interruptor
                  ligado={prefs.quadros_servico.includes(b.id)}
                  onChange={(v) => alternarBoard(b.id, v)}
                />
              </Linha>
            ))}
          </div>
        </section>
      )}

      <section>
        <h3 className={TITULO}>Canal</h3>
        <Linha titulo="Pop-up do navegador" descricao="Além do sino, mostra um aviso do navegador quando chega algo novo">
          <Interruptor ligado={prefs.popup_navegador} onChange={(v) => alternar("popup_navegador", v)} />
        </Linha>
      </section>
    </div>
  );
};

export default NotificacoesConfig;
