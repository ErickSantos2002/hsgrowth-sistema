// ==================== AUTH & USER ====================

export interface User {
  id: number;
  email: string;
  username: string | null;
  name: string; // Nome completo do usuário
  full_name: string; // Alias para name (compatibilidade)
  avatar_url: string | null;
  phone: string | null;
  role_id: number;
  role: "admin" | "manager" | "salesperson" | "sdr"; // Role do usuário
  role_name: string; // Nome formatado da role (Administrador, Gerente, Vendedor, SDR)
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

// ==================== BOARDS & LISTS ====================

export interface Board {
  id: number;
  name: string;
  description: string | null;
  color: string;
  icon: string;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  lists_count?: number;
  cards_count?: number;
}

export interface BoardListResponse {
  boards: Board[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface List {
  id: number;
  board_id: number;
  name: string;
  position: number;
  color: string | null;
  is_done_stage: boolean;
  is_lost_stage: boolean;
  created_at: string;
  updated_at: string;
}

// ==================== CARDS ====================

export interface Card {
  id: number;
  list_id: number;
  client_id: number | null;
  assigned_to_id: number | null;
  person_id: number | null; // ID da pessoa de contato (usado em ContactSection)
  title: string;
  description: string | null;
  position: number;
  value: number | null;
  due_date: string | null;
  contact_info: Record<string, any> | null;
  payment_info: {
    payment_method?: string;
    installments?: number;
    notes?: string;
  } | null;
  is_won: boolean; // true se ganho
  is_lost: boolean; // true se perdido (backend converte -1 para true)
  won_at: string | null;
  lost_at: string | null;
  created_at: string;
  updated_at: string;

  // Campos do blueprint da consultora
  sdr_id?: number | null;
  prospection_entry_date?: string | null;
  acquisition_entry_date?: string | null;
  expansion_entry_date?: string | null;
  deal_type?: string | null;
  acquisition_channel?: string | null;
  acquisition_channel_detail?: string | null;
  utm_params?: string | null;
  loss_reason?: string | null;
  has_implementation?: boolean | null;
  has_personnel?: boolean | null;

  // Campos relacionados (retornados pelo backend)
  assigned_to_name: string | null;
  assigned_to_avatar_url: string | null;
  sdr_name: string | null;
  sdr_avatar_url: string | null;
  pending_tasks_count: number | null;
  pending_tasks_status: string | null;
  list_name: string | null;
  board_id: number | null;
  board_name: string | null; // Nome do board (usado em CardDetails)
  client_name: string | null;
  sdr_name?: string | null;

  // Relacionamentos opcionais (quando expandido)
  list?: List;
  assigned_to?: User;
  client?: Client;
  sdr?: User;
  field_values?: CardFieldValue[];
  pending_tasks?: any[];
  notes?: any[];
  recent_activities?: any[];
  products?: any[];
  custom_field_values?: any[];
}

export interface CardListResponse {
  cards: Card[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface Client {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  company_name: string | null;
  document: string | null; // CPF ou CNPJ
  address: string | null;
  city: string | null;
  state: string | null;
  country: string;
  website: string | null;
  notes: string | null;
  source: string | null;
  is_active: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;

  // Campos do blueprint da consultora
  cnae?: string | null;
  linkedin_url?: string | null;
  relationship_type?: string | null;
  commercial_activity?: string | null;
  sector?: string | null;
  employee_count?: string | null;
  annual_revenue?: string | null;
}

export interface Person {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  position: string | null;
  client_id: number | null;
  notes: string | null;
  is_active: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;

  // Campos adicionais de contato
  email_commercial: string | null;
  email_personal: string | null;
  email_alternative: string | null;
  phone_commercial: string | null;
  phone_whatsapp: string | null;
  phone_alternative: string | null;
  linkedin_url: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  area: string | null; // Área/Departamento (blueprint da consultora)

  // Relacionamento opcional
  client?: Client;
  client_name?: string | null;
}

// ==================== CUSTOM FIELDS ====================

export interface FieldDefinition {
  id: number;
  board_id: number;
  name: string;
  field_type: "text" | "textarea" | "number" | "date" | "datetime" | "select" | "multiselect" | "boolean" | "url" | "email" | "phone";
  options?: string[] | null | any; // Opcional - usado para select/multiselect
  is_required: boolean;
  position: number;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface CardFieldValue {
  id: number;
  card_id: number;
  field_definition_id: number;
  value: any;
  created_at: string;
  updated_at: string;

  // Relacionamento opcional
  field_definition?: FieldDefinition;
}

// ==================== ACTIVITY & AUDIT ====================

// Tipos de atividades/tarefas
export type ActivityType =
  | "call"        // Ligação
  | "meeting"     // Reunião
  | "task"        // Tarefa
  | "follow_up"   // Acompanhamento/Retorno
  | "other";      // Outro

export interface Activity {
  id: number;
  card_id: number;
  user_id: number;
  action_type: string;
  description: string;
  metadata: Record<string, any> | null;
  created_at: string;

  // Relacionamentos opcionais
  user?: User;
  card?: Card;
}

export interface AuditLog {
  id: number;
  user_id: number | null;
  entity_type: string;
  entity_id: number;
  action: string;
  old_values: Record<string, any> | null;
  new_values: Record<string, any> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;

  // Relacionamento opcional
  user?: User;
}

// ==================== GAMIFICATION ====================

export interface GamificationPoint {
  id: number;
  user_id: number;
  points: number;
  reason: string;
  card_id: number | null;
  created_at: string;

  // Relacionamentos opcionais
  user?: User;
  card?: Card;
}

export interface GamificationBadge {
  id: number;
  name: string;
  description: string;
  image_url: string | null;
  criteria: Record<string, any>;
  is_system_badge: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserBadge {
  id: number;
  user_id: number;
  badge_id: number;
  earned_at: string;

  // Relacionamentos opcionais
  user?: User;
  badge?: GamificationBadge;
}

export interface GamificationRanking {
  id: number;
  user_id: number;
  period_type: "weekly" | "monthly" | "quarterly" | "yearly";
  period_start: string;
  period_end: string;
  total_points: number;
  rank_position: number;
  created_at: string;
  updated_at: string;

  // Relacionamento opcional
  user?: User;
}

export interface GamificationSummary {
  total_points: number;
  current_level: number;
  points_to_next_level: number;
  badges_earned: number;
  recent_badges: UserBadge[];
  recent_points: GamificationPoint[];
  ranking: {
    weekly?: GamificationRanking;
    monthly?: GamificationRanking;
    quarterly?: GamificationRanking;
    yearly?: GamificationRanking;
  };
}

// ==================== AUTOMATIONS ====================

export interface Automation {
  id: number;
  board_id: number;
  name: string;
  description: string | null;
  automation_type: "trigger" | "scheduled";
  trigger_event: string | null;
  trigger_conditions: Record<string, any> | null;
  schedule_type: string | null;
  schedule_config: Record<string, any> | null;
  actions: Record<string, any>[];
  is_active: boolean;
  last_run_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AutomationExecution {
  id: number;
  automation_id: number;
  executed_at: string;
  success: boolean;
  error_message: string | null;
  execution_time_ms: number;

  // Relacionamento opcional
  automation?: Automation;
}

// ==================== TRANSFERS ====================

// Enums para Transfer
export type TransferReason =
  | "reassignment"
  | "workload_balance"
  | "expertise"
  | "vacation"
  | "other";

export type TransferStatus =
  | "completed"
  | "pending_approval"
  | "rejected";

export type ApprovalStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "expired";

// Interface principal de Transfer
export interface CardTransfer {
  id: number;
  card_id: number;
  from_user_id: number;
  to_user_id: number;
  reason: TransferReason;
  notes: string | null;
  status: TransferStatus;
  requires_approval: boolean;
  created_at: string;
  updated_at: string;

  // Campos calculados/relacionados
  from_user_name?: string;
  to_user_name?: string;
  card_title?: string;

  // Relacionamentos opcionais
  card?: Card;
  from_user?: User;
  to_user?: User;
  approval?: TransferApproval;
}

// Interface de Aprovação de Transfer
export interface TransferApproval {
  id: number;
  transfer_id: number;
  approver_id: number | null;
  status: ApprovalStatus;
  decision_notes: string | null;
  decided_at: string | null;
  expires_at: string;
  created_at: string;
  updated_at: string;

  // Campos relacionados
  approver_name?: string;

  // Relacionamentos opcionais
  approver?: User;
  transfer?: CardTransfer;
}

// Request: Criar transfer simples
export interface CardTransferCreate {
  card_id: number;
  to_user_id: number;
  reason: TransferReason;
  notes?: string;
}

// Request: Criar transfer em lote (batch)
export interface BatchTransferCreate {
  card_ids: number[]; // Máximo 50 cards
  to_user_id: number;
  reason: TransferReason;
  notes?: string;
}

// Response: Transfer criado
export interface CardTransferResponse {
  transfer: CardTransfer;
  message: string;
}

// Response: Batch transfer criado
export interface BatchTransferResponse {
  transfers: CardTransfer[];
  total_transferred: number;
  message: string;
}

// Request: Decisão de aprovação
export interface TransferApprovalDecision {
  decision: "approve" | "reject";
  notes?: string;
}

// Response: Aprovação decidida
export interface TransferApprovalResponse {
  approval: TransferApproval;
  transfer: CardTransfer;
  message: string;
}

// Response: Lista de transfers
export interface CardTransferListResponse {
  transfers: CardTransfer[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// Response: Lista de aprovações pendentes
export interface TransferApprovalListResponse {
  approvals: TransferApproval[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// Estatísticas de Transfers
export interface TransferStatistics {
  total_transfers: number;
  pending_approvals: number;
  completed_today: number;
  completed_this_week: number;
  completed_this_month: number;
  by_reason: Record<string, number>;
  top_receivers: Array<{
    user_id: number;
    user_name: string;
    count: number;
  }>;
  top_senders: Array<{
    user_id: number;
    user_name: string;
    count: number;
  }>;
}

// ==================== NOTIFICATIONS ====================

export interface NotificationLegacy {
  id: number;
  user_id: number;
  notification_type: string;
  title: string;
  message: string;
  entity_type: string | null;
  entity_id: number | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export interface NotificationStats {
  total: number;
  unread: number;
}

// ==================== REPORTS ====================

export interface DashboardKPIs {
  // Cards
  total_cards: number;
  new_cards_today: number;
  new_cards_this_week: number;
  new_cards_this_month: number;

  // Cards ganhos/perdidos
  won_cards_today: number;
  won_cards_this_week: number;
  won_cards_this_month: number;
  lost_cards_today: number;
  lost_cards_this_week: number;
  lost_cards_this_month: number;

  // Cards vencidos
  overdue_cards: number;
  due_today: number;
  due_this_week: number;

  // Valores monetários
  total_value: number;
  won_value_this_month: number;
  pipeline_value: number;

  // Taxas
  conversion_rate_this_month: number;

  // Tempo médio
  avg_time_to_win_days: number | null;

  // Top vendedores
  top_sellers_this_month: Array<{
    name: string;
    cards_won: number;
    total_value: number;
  }>;

  // Dados para gráficos
  cards_by_stage: Array<{
    stage_name: string;
    card_count: number;
    total_value: number;
  }>;

  sales_evolution: Array<{
    period: string;
    won_count: number;
    won_value: number;
    lost_count: number;
  }>;
}

export interface SalesReport {
  period_start: string;
  period_end: string;
  total_deals: number;
  won_deals: number;
  lost_deals: number;
  total_value: number;
  won_value: number;
  lost_value: number;
  conversion_rate: number;
  average_deal_size: number;
  deals_by_user: Array<{
    user: User;
    total_deals: number;
    won_deals: number;
    won_value: number;
  }>;
  deals_by_month: Array<{
    month: string;
    total_deals: number;
    won_deals: number;
    won_value: number;
  }>;
}

export interface ConversionReport {
  stages: Array<{
    stage_name: string;
    cards_count: number;
    conversion_rate: number;
    average_time_in_stage: number;
  }>;
  overall_conversion_rate: number;
  average_sales_cycle: number;
}

// ==================== API RESPONSES ====================

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface ApiError {
  detail: string;
  status_code?: number;
}

export interface SuccessResponse {
  message: string;
  data?: any;
}

// ==================== FILTERS & PARAMS ====================

export interface PaginationParams {
  page?: number;
  size?: number;
  page_size?: number;
  all?: boolean;       // Retorna TODOS sem paginação
  minimal?: boolean;   // Retorna apenas campos essenciais
}

export interface CardFilters extends PaginationParams {
  board_id?: number;
  list_id?: number;
  assigned_to_id?: number;
  client_id?: number;
  is_won?: number;
  due_date_start?: string;
  due_date_end?: string;
  search?: string;
}

export interface UserFilters extends PaginationParams {
  role?: "admin" | "manager" | "salesperson" | "sdr";
  is_active?: boolean;
  search?: string;
}

export interface BoardFilters extends PaginationParams {
  is_deleted?: boolean;
  search?: string;
}

// ==================== FORMS ====================

export interface CreateUserRequest {
  email: string;
  password: string;
  name: string; // Nome completo (obrigatório)
  username?: string;
  phone?: string;
  role_id: number; // 1=admin, 2=manager, 3=salesperson
  is_active?: boolean;
}

export interface UpdateUserRequest {
  email?: string;
  name?: string; // Nome completo
  username?: string;
  phone?: string;
  role_id?: number; // 1=admin, 2=manager, 3=salesperson
  is_active?: boolean;
}

export interface ChangePasswordRequest {
  old_password: string;
  new_password: string;
}

export interface CreateBoardRequest {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
}

export interface UpdateBoardRequest {
  name?: string;
  description?: string;
  color?: string;
  icon?: string;
  is_deleted?: boolean;
}

export interface CreateListRequest {
  board_id: number;
  name: string;
  position?: number;
  color?: string;
}

export interface UpdateListRequest {
  name?: string;
  position?: number;
  color?: string;
}

export interface CreateCardRequest {
  list_id: number;
  title: string;
  description?: string;
  client_id?: number;
  assigned_to_id?: number;
  value?: number;
  currency?: string;
  due_date?: string;
  contact_info?: Record<string, any>;

  // Campos do blueprint da consultora
  sdr_id?: number;
  deal_type?: string;
  acquisition_channel?: string;
  acquisition_channel_detail?: string;
  utm_params?: string;
  loss_reason?: string;
  has_implementation?: boolean;
  has_personnel?: boolean;
}

export interface UpdateCardRequest {
  title?: string;
  description?: string | null; // Aceita null
  client_id?: number | null;
  assigned_to_id?: number | null;
  person_id?: number | null;
  value?: number | null;
  currency?: string;
  due_date?: string | null;
  contact_info?: Record<string, any> | null;
  payment_info?: {
    payment_method: string;
    installments: number;
    notes?: string;
  } | null;

  // Campos de status
  is_won?: boolean;
  is_lost?: boolean;

  // Campos do blueprint da consultora
  sdr_id?: number | null;
  deal_type?: string | null;
  acquisition_channel?: string | null;
  acquisition_channel_detail?: string | null;
  utm_params?: string | null;
  loss_reason?: string | null;
  has_implementation?: boolean | null;
  has_personnel?: boolean | null;
}

export interface MoveCardRequest {
  target_list_id: number;
  position?: number;
}

export interface CardFormData {
  title: string;
  description?: string | null;
  client_id?: number | null;
  assigned_to_id?: number | null;
  person_id?: number | null;
  value?: number | null;
  due_date?: string | null;
  contact_info?: Record<string, any> | null;

  // Campos do blueprint
  sdr_id?: number | null;
  deal_type?: string | null;
  acquisition_channel?: string | null;
  acquisition_channel_detail?: string | null;
  loss_reason?: string | null;
  has_implementation?: boolean | null;
  has_personnel?: boolean | null;
}

export interface CreateClientRequest {
  name: string;
  email?: string;
  phone?: string;
  company_name?: string;
  document?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  website?: string;
  notes?: string;
  source?: string;

  // Campos do blueprint da consultora
  cnae?: string;
  linkedin_url?: string;
  relationship_type?: string;
  commercial_activity?: string;
  sector?: string;
  employee_count?: string;
  annual_revenue?: string;
}

export interface UpdateClientRequest {
  name?: string;
  email?: string;
  phone?: string;
  company_name?: string;
  document?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  website?: string;
  notes?: string;
  is_active?: boolean;

  // Campos do blueprint da consultora
  cnae?: string;
  linkedin_url?: string;
  relationship_type?: string;
  commercial_activity?: string;
  sector?: string;
  employee_count?: string;
  annual_revenue?: string;
}

// ==================== NOTIFICATIONS ====================

export type NotificationType =
  | "card_assigned"           // Card atribuído a você
  | "card_updated"            // Card atualizado
  | "card_won"                // Card ganho
  | "card_lost"               // Card perdido
  | "transfer_received"       // Transferência recebida
  | "transfer_approved"       // Transferência aprovada
  | "transfer_rejected"       // Transferência rejeitada
  | "badge_earned"            // Badge conquistado
  | "level_up"                // Subiu de nível
  | "automation_failed"       // Automação falhou
  | "system"                  // Notificação do sistema
  | "other";                  // Outros tipos

export interface Notification {
  id: number;
  user_id: number;
  type: NotificationType;
  title: string;
  message: string;
  link?: string | null;        // Link para o item relacionado
  is_read: boolean;
  created_at: string;
  read_at?: string | null;
  // Dados adicionais opcionais
  metadata?: {
    card_id?: number;
    board_id?: number;
    transfer_id?: number;
    badge_id?: number;
    from_user_name?: string;
    to_user_name?: string;
    [key: string]: any;
  };
}

export interface NotificationListResponse {
  notifications: Notification[];
  total: number;
  unread_count: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface MarkAsReadRequest {
  notification_ids: number[];
}

export interface CreateNotificationRequest {
  user_id: number;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  metadata?: Record<string, any>;
}
