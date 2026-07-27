import api from "./api";

export type StreamScope = "sales" | "service";

const path = (scope: StreamScope, boardId: number) =>
  scope === "sales"
    ? `/api/v1/boards/${boardId}/stream-ticket`
    : `/api/v1/service-boards/${boardId}/stream-ticket`;

export async function getStreamTicket(scope: StreamScope, boardId: number): Promise<string> {
  const res = await api.post(path(scope, boardId), {});
  return res.data.ticket as string;
}

export function streamUrl(scope: StreamScope, boardId: number, ticket: string): string {
  const base = import.meta.env.VITE_API_URL || "http://localhost:8000";
  const seg = scope === "sales" ? "boards" : "service-boards";
  return `${base}/api/v1/${seg}/${boardId}/stream?ticket=${encodeURIComponent(ticket)}`;
}
