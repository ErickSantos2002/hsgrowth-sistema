import { useCallback, useEffect, useState } from "react";
import parceriasService, { mensagemDeErro, type AudienceTermos, type Termos } from "../../services/parceriasService";
import { useConfirm } from "../../contexts/ConfirmContext";
import { showError, showSuccess } from "../../utils/toast";

const ABAS: { audience: AudienceTermos; rotulo: string }[] = [
  { audience: "empresa", rotulo: "Empresa parceira" },
  { audience: "hunter", rotulo: "Hunter" },
];

// Publicação dos termos do Programa (admin/gerente). Cada nova versão exige novo aceite.
export default function TermosAdmin() {
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
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Termos do Programa de Parceiros</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Cada publicação cria uma nova versão; quem ainda não aceitou ela é barrado até aceitar.
        </p>
      </div>

      <div className="flex gap-2 border-b border-gray-200 dark:border-slate-700/50">
        {ABAS.map((a) => (
          <button
            key={a.audience}
            type="button"
            onClick={() => setAudience(a.audience)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${
              audience === a.audience
                ? "border-blue-500 text-blue-600 dark:text-blue-400"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400"
            }`}
          >
            {a.rotulo}
          </button>
        ))}
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          {vigente
            ? `Versão vigente: ${vigente.version} (publicada em ${new Date(vigente.published_at).toLocaleDateString("pt-BR")})`
            : carregando ? "Carregando..." : "Ainda não há termos publicados para este tipo."}
        </h2>
        {vigente && (
          <div className="max-h-72 overflow-y-auto whitespace-pre-wrap rounded-lg border border-gray-300 bg-gray-50 p-4 text-sm text-slate-700 dark:border-slate-700/50 dark:bg-slate-800/50 dark:text-slate-300">
            {vigente.text}
          </div>
        )}
      </section>

      <section className="space-y-2">
        <label htmlFor="novo-texto" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          Nova versão
        </label>
        <textarea
          id="novo-texto"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          rows={12}
          disabled={salvando}
          placeholder="Cole aqui o texto completo dos novos termos (mínimo 20 caracteres)."
          className="w-full rounded-lg border border-gray-300 bg-white p-3 text-sm text-slate-900 focus:border-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:border-slate-700/50 dark:bg-slate-800/50 dark:text-white"
        />
        <button
          type="button"
          onClick={publicar}
          disabled={salvando || texto.trim().length < 20}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {salvando ? "Publicando..." : "Publicar nova versão"}
        </button>
      </section>
    </div>
  );
}
