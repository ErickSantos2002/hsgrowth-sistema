import { publicApi } from "./api";

export interface PublicMeetingInfo {
  title: string;
  scheduled_at: string | null;
  duration_minutes: number | null;
  already_started: boolean;
  already_ended: boolean;
}

export interface GuestJoinData {
  name: string;
  company?: string;
  email?: string;
}

/**
 * Chamadas da tela pública do convidado — não exigem login.
 * Usa `publicApi` (sem interceptador de sessão) para que um erro não
 * redirecione o cliente para a tela de login do CRM.
 */
const publicMeetingService = {
  async getInfo(token: string): Promise<PublicMeetingInfo> {
    const response = await publicApi.get<PublicMeetingInfo>(`/api/v1/public/meeting/${token}`);
    return response.data;
  },

  async join(token: string, data: GuestJoinData): Promise<{ token: string; room_url: string }> {
    const response = await publicApi.post(`/api/v1/public/meeting/${token}/join`, data);
    return response.data;
  },
};

export default publicMeetingService;
