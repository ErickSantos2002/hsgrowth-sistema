import { useState } from "react";
import { Plus, X } from "lucide-react";

import { ConvidadoSugerido } from "../../services/cardTaskService";

const FORMATO_DE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface Props {
  sugeridos: ConvidadoSugerido[];
  marcados: string[];
  onChange: (marcados: string[]) => void;
}

/**
 * Quem recebe o convite da reunião.
 *
 * Antes a lista era montada em silêncio e ninguém via quem ia receber — os
 * vendedores relataram convite que não chegava ao cliente. Agora os endereços
 * conhecidos aparecem, o vendedor marca quem quiser e acrescenta o que faltar.
 *
 * A validação confere só o formato: endereço válido mas errado vai para o
 * lugar errado, e o sistema não tem como saber.
 */
const ConvidadosDaReuniao: React.FC<Props> = ({ sugeridos, marcados, onChange }) => {
  const [novo, setNovo] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  const avulsos = marcados.filter(
    (email) => !sugeridos.some((s) => s.email.toLowerCase() === email.toLowerCase())
  );

  const alternar = (email: string) => {
    onChange(
      marcados.includes(email)
        ? marcados.filter((e) => e !== email)
        : [...marcados, email]
    );
  };

  const acrescentar = () => {
    const email = novo.trim();
    if (!email) return;

    if (!FORMATO_DE_EMAIL.test(email)) {
      setErro("E-mail inválido");
      return;
    }
    if (marcados.some((e) => e.toLowerCase() === email.toLowerCase())) {
      setErro("Esse e-mail já está na lista");
      return;
    }

    onChange([...marcados, email]);
    setNovo("");
    setErro(null);
  };

  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-slate-400">
        Quem recebe o convite <span className="text-red-400">*</span>
      </label>

      <div className="space-y-1.5">
        {sugeridos.map((convidado) => (
          <label
            key={convidado.email}
            className="flex cursor-pointer items-center gap-2 text-sm text-slate-300"
          >
            <input
              type="checkbox"
              checked={marcados.includes(convidado.email)}
              onChange={() => alternar(convidado.email)}
              className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-purple-500"
            />
            <span className="truncate">{convidado.email}</span>
            <span className="flex-shrink-0 text-[11px] text-slate-500">
              {convidado.rotulo}
            </span>
          </label>
        ))}

        {avulsos.map((email) => (
          <div key={email} className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked
              onChange={() => alternar(email)}
              className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-purple-500"
            />
            <span className="truncate">{email}</span>
            <button
              type="button"
              onClick={() => alternar(email)}
              className="text-slate-500 transition-colors hover:text-slate-300"
              title="Remover"
            >
              <X size={12} />
            </button>
          </div>
        ))}
      </div>

      <div className="mt-2 flex gap-2">
        <input
          type="email"
          value={novo}
          onChange={(e) => {
            setNovo(e.target.value);
            setErro(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              acrescentar();
            }
          }}
          placeholder="Adicionar e-mail"
          className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
        />
        <button
          type="button"
          onClick={acrescentar}
          title="Adicionar destinatário"
          className="flex items-center gap-1 rounded-lg border border-slate-700 px-3 text-sm text-slate-300 transition-colors hover:bg-slate-800"
        >
          <Plus size={14} />
        </button>
      </div>

      {erro && <p className="mt-1 text-[11px] text-red-400">{erro}</p>}

      {marcados.length === 0 && (
        <p className="mt-1 text-[11px] text-amber-400">
          Marque pelo menos um destinatário.
        </p>
      )}
    </div>
  );
};

export default ConvidadosDaReuniao;
