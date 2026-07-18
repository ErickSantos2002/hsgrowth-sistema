import React from "react";
import { Smartphone } from "lucide-react";
import ExpandableSection from "../cardDetails/ExpandableSection";
import { ServiceBusinessInfo } from "../../services/serviceBoardService";

/**
 * Aparelhos informados pelo sistema de origem (GestorHS), somente leitura.
 *
 * Vivem em business_info.equipamentos e não no campo `aparelhos` do produto porque
 * ServiceCardProduct exige product_id, e a escolha do produto é do vendedor — os
 * catálogos dos dois sistemas não são mapeáveis automaticamente. O vendedor consulta
 * esta lista para montar o produto correspondente na seção "Produto".
 */
interface ServiceDevicesSectionProps {
  businessInfo?: ServiceBusinessInfo | null;
}

const ServiceDevicesSection: React.FC<ServiceDevicesSectionProps> = ({ businessInfo }) => {
  const devices = businessInfo?.equipamentos ?? [];

  // Card criado por um humano não tem `equipamentos` — não renderiza seção fantasma.
  if (devices.length === 0) return null;

  return (
    <ExpandableSection
      title="Aparelhos"
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
