import React from "react";
import { Smartphone } from "lucide-react";
import ExpandableSection from "../cardDetails/ExpandableSection";
import { ServiceBusinessInfo } from "../../services/serviceBoardService";

/**
 * Aparelhos informados pelo sistema de origem (GestorHS) — exibição de fallback.
 *
 * O lugar normal desses dados é a seção "Equipamento", dentro do próprio item do
 * catálogo (`ServiceCardProduct.aparelhos`), onde a integração os coloca desde
 * julho/2026. Esta seção só aparece quando o card **ainda não tem** nenhum item
 * vinculado — ou seja, quando algo impediu a conversão automática.
 *
 * Mostrar as duas ao mesmo tempo seria a mesma informação duas vezes na tela, com
 * o agravante de que só uma delas é editável.
 */
interface ServiceDevicesSectionProps {
  businessInfo?: ServiceBusinessInfo | null;
  /** Itens de catálogo do card. `null` = ainda carregando; 1+ esconde esta seção. */
  productCount?: number | null;
}

const ServiceDevicesSection: React.FC<ServiceDevicesSectionProps> = ({
  businessInfo,
  productCount = null,
}) => {
  const devices = businessInfo?.equipamentos ?? [];

  // Card criado por um humano não tem `equipamentos` — não renderiza seção fantasma.
  // `null` = a contagem ainda não chegou; espera, para a seção não piscar na tela.
  // Card já convertido mostra os aparelhos dentro do equipamento, não aqui.
  if (devices.length === 0 || productCount === null || productCount > 0) return null;

  return (
    <ExpandableSection
      title="Aparelhos (não convertidos)"
      defaultExpanded={false}
      icon={<Smartphone size={18} />}
      badge={devices.length}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase text-slate-400">
              <th className="py-2 pr-4 font-medium">Série</th>
              <th className="py-2 pr-4 font-medium">Modelo</th>
              <th className="py-2 pr-4 font-medium">Módulo álcool</th>
              <th className="py-2 font-medium">Próx. calibração</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200/50 dark:divide-slate-700/50">
            {devices.map((d, i) => (
              <tr key={`${d.serial_number ?? "sem-serie"}-${i}`}>
                <td className="py-2 pr-4 font-mono text-xs text-slate-900 dark:text-white">
                  {d.serial_number || "—"}
                </td>
                <td className="py-2 pr-4 text-slate-900 dark:text-white">{d.model || "—"}</td>
                <td className="py-2 pr-4 text-slate-900 dark:text-white">{d.alcohol_module || "—"}</td>
                <td className="py-2 text-slate-900 dark:text-white">{d.next_recalibration_date || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ExpandableSection>
  );
};

export default ServiceDevicesSection;
