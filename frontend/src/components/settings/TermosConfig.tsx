import { useCallback, useEffect, useState } from "react";
import { Building2, Send, UserSearch } from "lucide-react";
import { Button, FormField, Textarea } from "../common";
import parceriasService, { mensagemDeErro, type AudienceTermos, type Termos } from "../../services/parceriasService";
import { useConfirm } from "../../contexts/ConfirmContext";
import { showError, showSuccess } from "../../utils/toast";

const ABAS: { audience: AudienceTermos; rotulo: string; icone: typeof Building2 }[] = [
  { audience: "empresa", rotulo: "Empresa parceira", icone: Building2 },
  { audience: "hunter", rotulo: "Hunter", icone: UserSearch },
];

// Aba Termos das Configurações (admin/gerente). Cada nova versão exige novo aceite.
export default function TermosConfig() {
  const { confirm } = useConfirm();
  const [audience, setAudience] = useState<AudienceTermos>("empresa");
  const [versoes, setVersoes] = useState<Termos[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [texto, setTexto] = useState("");
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      setVersoes(await parceriasService.listarTermos(audience));
    } catch (err) {
      showError(mensagemDeErro(err, "Não foi possível carregar os termos."));
    } finally {
      setCarregando(false);
    }
  }, [audience]);

  useEffect(() => {
    setTexto("");
    carregar();
  }, [carregar]);

  const vigente = versoes.reduce<Termos | null>((a, t) => (!a || t.version > a.version ? t : a), null);

  const publicar = async () => {
    const ok = await confirm({
      title: "Publicar nova versão",
      message: "Todos os parceiros desse tipo terão de aceitar de novo.",
      confirmText: "Publicar",
    });
    if (!ok) return;
    setSalvando(true);
    try {
      await parceriasService.publicarTermos(audience, texto.trim());
      showSuccess("Nova versão dos termos publicada.");
      setTexto("");
      await carregar();
    } catch (err) {
      showError(mensagemDeErro(err, "Não foi possível publicar os termos."));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Termos do Programa de Parceiros</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Cada publicação cria uma nova versão; quem ainda não aceitou ela é barrado até aceitar.
        </p>
      </div>

      {/* Sub-abas no mesmo formato das abas de Configurações */}
      <div className="grid grid-cols-2 overflow-hidden rounded-lg border border-gray-200 dark:border-slate-700">
        {ABAS.map((a) => (
          <button
            key={a.audience}
            type="button"
            onClick={() => setAudience(a.audience)}
            className={`flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium transition-colors ${
              audience === a.audience
                ? "bg-emerald-600 text-white"
                : "text-slate-500 hover:bg-gray-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-700/50 dark:hover:text-white"
            }`}
          >
            <a.icone size={16} />
            {a.rotulo}
          </button>
        ))}
      </div>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          {vigente
            ? `Versão vigente: ${vigente.version} (publicada em ${new Date(vigente.published_at).toLocaleDateString("pt-BR")})`
            : carregando ? "Carregando..." : "Ainda não há termos publicados para este tipo."}
        </h3>
        {vigente && (
          <div className="max-h-72 overflow-y-auto whitespace-pre-wrap rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300">
            {vigente.text}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <FormField label="Nova versão" hint="Cole aqui o texto completo dos novos termos (mínimo 20 caracteres).">
          <Textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={12}
            disabled={salvando}
            className="text-sm"
          />
        </FormField>
        <div className="flex justify-end">
          <Button icon={<Send size={16} />} onClick={publicar} loading={salvando} disabled={texto.trim().length < 20}>
            Publicar nova versão
          </Button>
        </div>
      </section>
    </div>
  );
}
