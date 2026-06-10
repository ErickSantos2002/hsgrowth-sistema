/**
 * Sanitização anti-XSS de conteúdo de anotações, baseada em DOMParser + allowlist
 * (não regex). Anotações só contêm texto + imagens coladas (data:image base64),
 * então mantemos apenas tags de formatação simples e <img> com src data:image.
 * Qualquer outra tag vira texto puro; atributos não permitidos são removidos.
 */
const ALLOWED_TAGS = new Set(["BR", "DIV", "P", "SPAN", "B", "I", "U", "EM", "STRONG", "IMG"]);
const DATA_IMAGE_RE = /^data:image\/(png|jpe?g|gif|webp);base64,/i;

export const sanitizeNoteHTML = (html: string): string => {
  const doc = new DOMParser().parseFromString(html || "", "text/html");

  const walk = (node: Node) => {
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType === Node.COMMENT_NODE) {
        child.remove();
        continue;
      }
      if (child.nodeType !== Node.ELEMENT_NODE) continue;

      const el = child as Element;
      const tag = el.tagName;

      // Tag não permitida: substitui pelo texto (descarta a tag, preserva conteúdo)
      if (!ALLOWED_TAGS.has(tag)) {
        el.replaceWith(document.createTextNode(el.textContent || ""));
        continue;
      }

      // Remove todos os atributos exceto src/alt válidos em <img>
      for (const attr of Array.from(el.attributes)) {
        const name = attr.name.toLowerCase();
        const keep =
          tag === "IMG" &&
          ((name === "src" && DATA_IMAGE_RE.test(attr.value)) || name === "alt");
        if (!keep) el.removeAttribute(attr.name);
      }
      // <img> sem src válido é removido
      if (tag === "IMG" && !el.getAttribute("src")) {
        el.remove();
        continue;
      }

      walk(el);
    }
  };

  walk(doc.body);
  return doc.body.innerHTML;
};
