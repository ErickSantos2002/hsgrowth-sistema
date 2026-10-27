import DOMPurify from "dompurify";

/**
 * Limpa HTML antes de mostrar na tela (anti-XSS), com a DOMPurify.
 *
 * Anotações chegam também pelo formulário público do site (integração RD
 * Station/n8n): sem limpeza, quem preenchesse o formulário com código o veria
 * rodar no navegador de quem abrisse o card — com o login dessa pessoa.
 * Tira script, eventos (onerror, onclick…), javascript: e iframes; mantém a
 * formatação e as imagens coladas (data:image).
 *
 * Também tira o atributo `style`: com ele, um texto de fora poderia cobrir a
 * tela inteira com uma página falsa de login.
 */

// Links abrem em nova guia e sem acesso à página do CRM (window.opener)
DOMPurify.addHook("afterSanitizeAttributes", (node) => {
  if (node.tagName === "A" && node.getAttribute("href")) {
    node.setAttribute("target", "_blank");
    node.setAttribute("rel", "noopener noreferrer");
  }
});

export const sanitizeHtml = (html: string | null | undefined): string =>
  DOMPurify.sanitize(html || "", { ADD_ATTR: ["target"], FORBID_ATTR: ["style"] });
