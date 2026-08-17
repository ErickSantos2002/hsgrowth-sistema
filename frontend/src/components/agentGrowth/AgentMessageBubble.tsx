import { useState } from "react";
import { Copy, Check } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Link } from "react-router-dom";
import { AgentMessage } from "../../types";

interface AgentMessageBubbleProps {
  message: AgentMessage;
}

/**
 * Bubble de mensagem do chat do Agent Growth.
 * - Mensagens do usuário: alinhadas à direita com fundo azul (chip selecionado)
 * - Mensagens do agente: alinhadas à esquerda com texto formatado
 * - Botão "Copiar" aparece quando is_copyable=true (respostas do agente com textos longos)
 */
export default function AgentMessageBubble({ message }: AgentMessageBubbleProps) {
  const [copied, setCopied] = useState(false);

  const isUser = message.role === "user";

  /**
   * Copia o conteúdo da mensagem para a área de transferência.
   * Exibe feedback visual por 2 segundos após copiar.
   */
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback silencioso se clipboard não estiver disponível
    }
  };

  if (isUser) {
    return (
      <div className="flex justify-end mb-2">
        <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-blue-600 px-3 py-2 text-sm text-white shadow-sm">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start mb-2 gap-1">
      <div className="agent-message-bubble max-w-[92%] rounded-2xl rounded-tl-sm bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 px-3 py-2.5 text-sm text-slate-800 dark:text-slate-100 shadow-sm leading-relaxed">
        <ReactMarkdown
          components={{
            // Negrito
            strong: ({ children }) => (
              <strong className="font-semibold">{children}</strong>
            ),
            // Itálico
            em: ({ children }) => <em className="italic">{children}</em>,
            // Links — internos (cards) navegam via react-router, sem reload
            a: ({ href, children }) => {
              const url = href || "";
              if (url.startsWith("/")) {
                return (
                  <Link to={url} className="text-blue-500 hover:underline dark:text-blue-400">
                    {children}
                  </Link>
                );
              }
              return (
                <a href={url} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline dark:text-blue-400">
                  {children}
                </a>
              );
            },
            // Lista não ordenada
            ul: ({ children }) => (
              <ul className="my-1 ml-3 list-disc space-y-0.5">{children}</ul>
            ),
            // Lista ordenada
            ol: ({ children }) => (
              <ol className="my-1 ml-3 list-decimal space-y-0.5">{children}</ol>
            ),
            li: ({ children }) => <li className="leading-snug">{children}</li>,
            // Parágrafos com espaçamento entre si
            p: ({ children }) => <p className="mb-1.5 last:mb-0">{children}</p>,
            // Cabeçalhos menores (o LLM às vezes usa ## ou ###)
            h3: ({ children }) => (
              <h3 className="mt-2 mb-1 font-semibold text-slate-900 dark:text-white">
                {children}
              </h3>
            ),
            h4: ({ children }) => (
              <h4 className="mt-1.5 mb-0.5 font-semibold">{children}</h4>
            ),
          }}
        >
          {message.content}
        </ReactMarkdown>
      </div>

      {/* Botão de cópia — exibido apenas para respostas marcadas como copiáveis */}
      {message.is_copyable && (
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors ml-1"
          title="Copiar resposta"
        >
          {copied ? (
            <>
              <Check size={12} />
              Copiado
            </>
          ) : (
            <>
              <Copy size={12} />
              Copiar
            </>
          )}
        </button>
      )}
    </div>
  );
}
