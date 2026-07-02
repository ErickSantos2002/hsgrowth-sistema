import proposalService from "../services/proposalService";
import { showError } from "./toast";

/** Abre o PDF da proposta numa nova aba (busca autenticada via blob). */
export async function viewProposalPdf(id: number): Promise<void> {
  try {
    const blob = await proposalService.getPdf(id, false);
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch {
    showError("Erro ao gerar o PDF da proposta");
  }
}

/** Baixa o PDF da proposta. */
export async function downloadProposalPdf(id: number, number?: number): Promise<void> {
  try {
    const blob = await proposalService.getPdf(id, true);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `proposta-${number ?? id}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  } catch {
    showError("Erro ao baixar o PDF da proposta");
  }
}
