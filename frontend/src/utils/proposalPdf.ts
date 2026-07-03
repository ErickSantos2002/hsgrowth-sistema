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

/** Abre o PDF de uma versão arquivada da proposta numa nova aba. */
export async function viewVersionPdf(proposalId: number, versionId: number): Promise<void> {
  try {
    const blob = await proposalService.getVersionPdf(proposalId, versionId, false);
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch {
    showError("Erro ao gerar o PDF da versão");
  }
}

/** Baixa o PDF de uma versão arquivada da proposta. */
export async function downloadVersionPdf(
  proposalId: number,
  versionId: number,
  label?: string,
): Promise<void> {
  try {
    const blob = await proposalService.getVersionPdf(proposalId, versionId, true);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `proposta-${label ?? `${proposalId}-v${versionId}`}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  } catch {
    showError("Erro ao baixar o PDF da versão");
  }
}
