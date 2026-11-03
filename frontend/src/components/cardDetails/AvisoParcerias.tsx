import { useEffect, useState } from "react";
import { Handshake } from "lucide-react";
import parceriasService from "../../services/parceriasService";

/** Faixa amarela no card de Vendas quando um parceiro está trabalhando o CNPJ do cliente. */
export default function AvisoParcerias({ cardId, clientId }: { cardId: number; clientId?: number | null }) {
  const [avisos, setAvisos] = useState<{ parceiro: string; desde: string }[]>([]);

  useEffect(() => {
    if (!clientId) {
      setAvisos([]);
      return;
    }
    parceriasService.avisoParceriasDoCard(cardId).then(setAvisos).catch(() => setAvisos([]));
  }, [cardId, clientId]);

  if (!avisos.length) return null;
  return (
    <div className="flex-shrink-0 border-b border-amber-500/40 bg-amber-500/10 px-6 py-2 text-sm text-amber-700 dark:text-amber-300">
      {avisos.map((a) => (
        <div key={`${a.parceiro}-${a.desde}`} className="flex items-center gap-2">
          <Handshake size={16} />
          <span>
            CNPJ registrado pelo parceiro <strong>{a.parceiro}</strong> em{" "}
            {new Date(`${a.desde}Z`).toLocaleDateString("pt-BR")} (Programa de Parceiros).
          </span>
        </div>
      ))}
    </div>
  );
}
