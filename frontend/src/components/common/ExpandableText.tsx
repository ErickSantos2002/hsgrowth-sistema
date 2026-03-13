import React, { useState, useRef, useEffect } from "react";

interface ExpandableTextProps {
  content?: string;
  htmlContent?: string;
  maxLines?: number;
  className?: string;
}

/**
 * Componente que exibe um texto ou HTML e adiciona um botão "Ver mais/Ver menos"
 * caso o conteúdo ultrapasse o número configurado de linhas.
 */
const ExpandableText: React.FC<ExpandableTextProps> = ({
  content,
  htmlContent,
  maxLines = 5,
  className = "",
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Checa se o conteúdo real é maior do que o tamanho do container (height)
    const element = contentRef.current;
    if (element) {
      // Se a altura real do conteúdo for maior que a visível (scrollHeight > clientHeight)
      // é porque o line-clamp limitou o tamanho.
      const isOverflowingValue = element.scrollHeight > element.clientHeight;
      setIsOverflowing(isOverflowingValue);
    }
  }, [content, htmlContent, maxLines, className]);

  return (
    <div className="flex flex-col items-start w-full">
      <div
        ref={contentRef}
        className={`w-full overflow-hidden transition-all duration-300 relative ${!isExpanded ? "max-h-[120px]" : ""} ${className}`}
        style={(!isExpanded && isOverflowing) ? {
          // Gradiente inferior para indicar que há mais texto/imagem cortado
          maskImage: "linear-gradient(to bottom, black 60%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(to bottom, black 60%, transparent 100%)"
        } : {}}
      >
        {htmlContent ? (
          <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
        ) : (
          <p className="whitespace-pre-wrap">{content}</p>
        )}
      </div>

      {(isOverflowing || isExpanded) && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
          className="mt-2 text-xs font-semibold text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 transition-colors bg-blue-500/10 dark:bg-blue-500/20 px-2 py-1 rounded"
        >
          {isExpanded ? "Ver menos" : "Ver mais"}
        </button>
      )}
    </div>
  );
};

export default ExpandableText;
