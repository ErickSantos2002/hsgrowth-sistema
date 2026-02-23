import { User } from "lucide-react";
import avatarService from "../../services/avatarService";

/**
 * Extrai as iniciais do nome do usuário
 */
const getInitials = (name: string): string => {
  if (!name) return "?";
  const parts = name.trim().split(" ");
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";

interface UserAvatarProps {
  userId?: number;
  userName?: string;
  avatarUrl?: string | null;
  size?: AvatarSize;
  className?: string;
  showOnlineIndicator?: boolean;
  isOnline?: boolean;
}

/**
 * Componente reutilizável para exibir avatar de usuário com suporte a modo claro e escuro
 *
 * Funcionalidades:
 * - Exibe foto do usuário se disponível
 * - Fallback para iniciais do nome com gradiente
 * - Tamanhos configuráveis (xs, sm, md, lg, xl)
 * - Indicador de status online opcional
 * - Tratamento de erro automático (volta para iniciais se imagem falhar)
 */
const UserAvatar = ({
  userId,
  userName = "?",
  avatarUrl,
  size = "md",
  className = "",
  showOnlineIndicator = false,
  isOnline = false,
}: UserAvatarProps) => {
  // Configurações de tamanho
  const sizeClasses = {
    xs: "h-6 w-6 text-xs",
    sm: "h-8 w-8 text-sm",
    md: "h-10 w-10 text-base",
    lg: "h-12 w-12 text-lg",
    xl: "h-16 w-16 text-xl",
  };

  const indicatorSizes = {
    xs: "h-1.5 w-1.5 border",
    sm: "h-2 w-2 border",
    md: "h-2.5 w-2.5 border-2",
    lg: "h-3 w-3 border-2",
    xl: "h-4 w-4 border-2",
  };

  const sizeClass = sizeClasses[size];
  const indicatorClass = indicatorSizes[size];

  // Gera URL do avatar se tiver userId e avatarUrl
  const avatarSrc = avatarUrl && userId ? avatarService.getAvatarUrl(userId) : null;

  return (
    <div className={`relative inline-block ${className}`}>
      {avatarSrc ? (
        <img
          src={avatarSrc}
          alt={userName}
          title={userName}
          className={`${sizeClass} rounded-full border-2 border-gray-200 object-cover dark:border-slate-700`}
          onError={(e) => {
            // Fallback para iniciais se a imagem não carregar
            const target = e.currentTarget;
            const parent = target.parentElement;
            if (parent) {
              target.style.display = "none";
              const fallback = document.createElement("div");
              fallback.className = `${sizeClass} flex items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 font-bold text-white border-2 border-gray-200`;
              fallback.textContent = getInitials(userName);
              fallback.title = userName;
              parent.appendChild(fallback);
            }
          }}
        />
      ) : (
        <div
          className={`${sizeClass} flex items-center justify-center rounded-full border-2 border-gray-200 bg-gradient-to-br from-blue-500 to-cyan-500 font-bold text-white dark:border-slate-700`}
          title={userName}
        >
          {getInitials(userName)}
        </div>
      )}

      {/* Indicador de status online */}
      {showOnlineIndicator && (
        <span
          className={`absolute bottom-0 right-0 ${indicatorClass} rounded-full border-white dark:border-slate-800 ${
            isOnline ? "bg-green-500" : "bg-slate-400"
          }`}
          title={isOnline ? "Online" : "Offline"}
        />
      )}
    </div>
  );
};

export default UserAvatar;
