// ==================== AUTH & USER ====================

export interface User {
  id: number;
  username: string;
  email: string;
  full_name: string | null;
  role: "admin" | "manager" | "user";
  is_active: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
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
  assigned_to_id: number | null;
  title: string;
  description: string | null;
  position: number;
  value: number | null;
  due_date: string | null;
  contact_info: Record<string, any> | null;
  is_won: boolean;
  is_lost: boolean;
  won_at: string | null;
  lost_at: string | null;
  created_at: string;
  updated_at: string;

  // Campos relacionados (retornados pelo backend)
  assigned_to_name: string | null;
  list_name: string | null;
  board_id: number | null;

  // Relacionamentos opcionais (quando expandido)
  list?: List;
  assigned_to?: User;
  field_values?: CardFieldValue[];
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
}

// ==================== CUSTOM FIELDS ====================

export interface FieldDefinition {
  id: number;
  board_id: number;
  name: string;
  field_type: "text" | "number" | "date" | "select" | "multiselect" | "boolean" | "url" | "email" | "phone";
  options: string[] | null;
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

export interface CardTransfer {
  id: number;
  card_id: number;
  from_user_id: number;
  to_user_id: number;
  reason: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  updated_at: string;

  // Relacionamentos opcionais
  card?: Card;
  from_user?: User;
  to_user?: User;
  approval?: TransferApproval;
}

export interface TransferApproval {
  id: number;
  transfer_id: number;
  approved_by_id: number;
  approved_at: string;
  rejection_reason: string | null;

  // Relacionamentos opcionais
  approved_by?: User;
  transfer?: CardTransfer;
}

// ==================== NOTIFICATIONS ====================

export interface Notification {
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
  role?: "admin" | "manager" | "user";
  is_active?: boolean;
  search?: string;
}

export interface BoardFilters extends PaginationParams {
  is_deleted?: boolean;
  search?: string;
}

// ==================== FORMS ====================

export interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
  full_name?: string;
  role: "admin" | "manager" | "user";
  is_active?: boolean;
}

export interface UpdateUserRequest {
  username?: string;
  email?: string;
  full_name?: string;
  role?: "admin" | "manager" | "user";
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
}

export interface UpdateCardRequest {
  title?: string;
  description?: string;
  client_id?: number;
  assigned_to_id?: number;
  value?: number;
  currency?: string;
  due_date?: string;
  contact_info?: Record<string, any>;
}

export interface MoveCardRequest {
  target_list_id: number;
  position?: number;
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
}
