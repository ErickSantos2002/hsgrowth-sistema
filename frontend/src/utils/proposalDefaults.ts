// Conteúdo padrão de novas propostas (módulo Serviço / Propostas).

// Escapa valores dinâmicos antes de interpolar no HTML do template (evita XSS/injeção;
// modelo/aparelhos vêm de dados digitados pelo laboratório).
const esc = (s: string): string =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export const DEFAULT_NOTES =
  "Caso, durante o processo de calibração, seja identificado que o aparelho necessita de manutenção, a presente proposta será atualizada para incluir os serviços adicionais necessários, bem como os respectivos valores.";

/**
 * Template do campo "Outros itens ou serviços" (HTML para o react-quill).
 * `modelo` e `aparelhos` são dinâmicos — preenchidos com os dados do card
 * quando a proposta é criada de dentro dele; ficam em branco na proposta avulsa.
 */
export function buildDefaultOtherItems(modelo = "", aparelhos = ""): string {
  return `<p><strong>Serviços de Calibração e Manutenção</strong></p>
<p><strong>Modelo:</strong> ${esc(modelo)}<br><strong>Aparelhos:</strong> ${esc(aparelhos)}</p>
<p><strong>Serviço Realizado:</strong></p>
<ul><li>Calibração</li></ul>
<p><strong>Valor Unitário da Calibração:</strong></p>
<ul><li>R$ 395,00</li></ul>
<p><strong>Método de Envio:</strong></p>
<ul><li>SEDEX</li></ul>
<p><strong>Frete para entrega fixo:</strong></p>
<p>Região Norte: R$ 200,00<br>Região Nordeste: R$ 150,00<br>Região Sul: R$ 250,00<br>Região Sudeste: R$ 200,00<br>Região Centro-Oeste: R$ 200,00</p>
<p><strong>Prazo de Entrega</strong></p>
<p>Norte: 15 a 22 dias úteis<br>Nordeste: 7 a 15 dias úteis<br>Sul: 7 dias úteis<br>Centro-Oeste: 7 a 15 dias úteis<br>Sudeste: 7 dias úteis</p>
<p><strong>Códigos de Serviço – CNAEs Relacionados:</strong></p>
<p>33.12-102 – Manutenção e reparação de aparelhos e instrumentos de medida, teste e controle</p>
<p>14.01 – Lubrificação, limpeza, lubrificação, revisão, carga e recarga, conserto, restauração, blindagem, manutenção e conservação de máquinas, veículos, aparelhos, equipamentos, motores, elevadores ou de qualquer objeto (exceto peças e partes empregadas, que ficam sujeitas ao ICMS)</p>
<p><strong>Endereço para o envio dos Aparelhos:</strong><br>Rua Viscondessa do Livramento, nº 54<br>Bairro: Derby<br>CEP: 52010-065<br>Recife – PE</p>
<p><strong>Contato – Setor de Calibração</strong><br>Telefone: (81) 3052-3350</p>`;
}
