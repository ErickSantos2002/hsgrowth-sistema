import React from "react";
import { MessageCircle, Image as ImageIcon } from "lucide-react";

interface ParsedMessage {
  author: string;
  content: string;
  time?: string;
  images?: string[];
}

interface NoteRendererProps {
  content: string;
}

/**
 * Componente que renderiza o conteúdo de uma nota
 * Detecta automaticamente se é HTML (importado) ou texto simples
 * Para HTML, faz parsing e exibe em formato organizado
 */
const NoteRenderer: React.FC<NoteRendererProps> = ({ content }) => {
  // Detecta se o conteúdo contém HTML
  const isHTML = /<[^>]+>/.test(content);

  if (!isHTML) {
    // Conteúdo texto simples - renderiza normalmente
    return <p className="whitespace-pre-wrap text-sm text-slate-300">{content}</p>;
  }

  // Conteúdo HTML - faz parsing e renderiza organizado
  const messages = parseWhatsAppHTML(content);

  if (messages.length === 0) {
    // Se não conseguiu parsear, renderiza como texto simples (fallback)
    return (
      <div className="text-sm text-slate-300">
        <div className="mb-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-400">
          ⚠️ Nota importada (HTML) - visualização limitada
        </div>
        <div
          className="prose prose-invert prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: sanitizeHTML(content) }}
        />
      </div>
    );
  }

  // Renderiza mensagens parseadas
  return (
    <div className="space-y-2">
      {/* Badge indicando que é uma nota importada */}
      <div className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-1.5 text-xs text-green-400">
        <MessageCircle size={14} />
        <span>Conversa importada ({messages.length} mensagens)</span>
      </div>

      {/* Mensagens */}
      <div className="scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-800/50 max-h-96 space-y-2 overflow-y-auto pr-2">
        {messages.map((msg, index) => (
          <WhatsAppMessage key={index} message={msg} />
        ))}
      </div>
    </div>
  );
};

/**
 * Componente que renderiza uma mensagem individual estilo WhatsApp
 */
const WhatsAppMessage: React.FC<{ message: ParsedMessage }> = ({ message }) => {
  return (
    <div className="rounded-lg border border-slate-700/50 bg-slate-800/70 p-3 transition-colors hover:bg-slate-700/40">
      {/* Header: Nome + Horário */}
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-xs font-semibold text-emerald-400">{message.author}</span>
        {message.time && (
          <span className="text-xs text-slate-500">{message.time}</span>
        )}
      </div>

      {/* Conteúdo da mensagem */}
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-300">
        {message.content}
      </p>

      {/* Imagens anexadas */}
      {message.images && message.images.length > 0 && (
        <div className="mt-2 space-y-2">
          {message.images.map((imgUrl, idx) => (
            <div key={idx} className="group relative">
              <a
                href={imgUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <img
                  src={imgUrl}
                  alt="Imagem anexada"
                  className="h-auto max-w-full rounded-lg border border-slate-700 transition-colors group-hover:border-blue-500"
                  loading="lazy"
                  onError={(e) => {
                    // Se imagem não carregar, mostra placeholder
                    const target = e.target as HTMLImageElement;
                    target.style.display = "none";
                    const placeholder = target.nextElementSibling as HTMLDivElement;
                    placeholder?.classList.remove("hidden");
                    placeholder?.classList.add("flex");
                  }}
                />
                <div className="hidden items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/50 p-3 text-xs text-slate-400">
                  <ImageIcon size={16} />
                  <span>Imagem não disponível</span>
                </div>
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * Parser de HTML de WhatsApp (importado do Pipedrive)
 * Extrai mensagens, autores, horários e imagens
 */
function parseWhatsAppHTML(html: string): ParsedMessage[] {
  const messages: ParsedMessage[] = [];

  try {
    // Criar um parser DOM temporário
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    // Encontrar todos os elementos que contêm mensagens
    // Mensagens geralmente têm o padrão: <b>Nome:</b> conteúdo
    const elements = doc.querySelectorAll("div");

    elements.forEach((element) => {
      const text = element.textContent || "";

      // Detectar padrão: "Nome: mensagem"
      const match = text.match(/^([^:]+):\s*(.+)$/);

      if (match) {
        const author = match[1].trim();
        const content = match[2].trim();

        // Extrair horário (se houver)
        const timeMatch = element.querySelector("a")?.textContent?.match(/\d{2}:\d{2}/);
        const time = timeMatch ? timeMatch[0] : undefined;

        // Extrair imagens
        const images: string[] = [];
        const imgElements = element.querySelectorAll("img");
        imgElements.forEach((img) => {
          const src = img.getAttribute("src");
          if (src && src.startsWith("http")) {
            images.push(src);
          }
        });

        // Adicionar mensagem apenas se tiver conteúdo válido
        if (author && content && content !== time) {
          messages.push({
            author,
            content,
            time,
            images: images.length > 0 ? images : undefined,
          });
        }
      }
    });

    // Remover duplicatas (às vezes o HTML tem mensagens repetidas)
    return messages.filter(
      (msg, index, self) =>
        index ===
        self.findIndex(
          (m) =>
            m.author === msg.author &&
            m.content === msg.content &&
            m.time === msg.time
        )
    );
  } catch (error) {
    console.error("Erro ao parsear HTML:", error);
    return [];
  }
}

/**
 * Sanitiza HTML para prevenir XSS
 * Remove scripts, eventos inline e tags perigosas
 */
function sanitizeHTML(html: string): string {
  // Remove scripts
  let clean = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");

  // Remove event handlers (onclick, onerror, etc)
  clean = clean.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, "");

  // Remove javascript: URIs
  clean = clean.replace(/href\s*=\s*["']javascript:[^"']*["']/gi, "");

  return clean;
}

export default NoteRenderer;
