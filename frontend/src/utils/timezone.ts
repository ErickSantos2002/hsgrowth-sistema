/**
 * Utilitários para conversão de timezone
 * Brasil: UTC-3 (BRT - Brasília Time)
 */

const BRAZIL_TIMEZONE_OFFSET = -3; // UTC-3

/**
 * Converte uma data/hora local do Brasil para UTC (formato ISO string para backend)
 *
 * Exemplo: "2026-01-27T14:00" (Brasil) → "2026-01-27T17:00:00Z" (UTC)
 *
 * @param localDateStr - String de data no formato "YYYY-MM-DD" ou "YYYY-MM-DDTHH:mm"
 * @param localTimeStr - String de horário no formato "HH:mm" (opcional)
 * @returns String ISO em UTC para enviar ao backend
 */
export function convertBrazilToUTC(localDateStr: string, localTimeStr?: string): string {
  let dateTimeStr = localDateStr;

  // Se não tem horário na string e foi passado separadamente, concatena
  if (!localDateStr.includes('T') && localTimeStr) {
    dateTimeStr = `${localDateStr}T${localTimeStr}`;
  }

  // Se não tem horário, usa meio-dia
  if (!dateTimeStr.includes('T')) {
    dateTimeStr = `${dateTimeStr}T12:00`;
  }

  // Cria um objeto Date interpretando como horário local do Brasil
  // Precisamos ajustar manualmente porque o Date() do JS usa o timezone do sistema
  const [datePart, timePart] = dateTimeStr.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hours, minutes] = timePart.split(':').map(Number);

  // Cria a data em UTC e subtrai o offset do Brasil para compensar
  const date = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0));

  // Ajusta para UTC: se são 14:00 no Brasil (UTC-3), no UTC são 17:00
  date.setUTCHours(date.getUTCHours() - BRAZIL_TIMEZONE_OFFSET);

  return date.toISOString();
}

/**
 * Converte uma data UTC do backend para o horário do Brasil
 *
 * Exemplo: "2026-01-27T17:00:00Z" (UTC) → Date representando 14:00 no Brasil
 *
 * @param utcDateStr - String ISO em UTC vinda do backend
 * @returns Objeto Date ajustado para o horário do Brasil
 */
export function convertUTCToBrazil(utcDateStr: string): Date {
  const utcDate = new Date(utcDateStr);

  // Ajusta para horário do Brasil: UTC-3
  const brazilDate = new Date(utcDate.getTime() + (BRAZIL_TIMEZONE_OFFSET * 60 * 60 * 1000));

  return brazilDate;
}

/**
 * Formata uma data UTC do backend para exibição no formato brasileiro
 *
 * @param utcDateStr - String ISO em UTC vinda do backend
 * @param options - Opções de formatação (default: data curta "DD MMM")
 * @returns String formatada no horário do Brasil
 */
export function formatBrazilDate(
  utcDateStr: string,
  options: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short" }
): string {
  const brazilDate = convertUTCToBrazil(utcDateStr);
  return brazilDate.toLocaleDateString("pt-BR", options);
}

/**
 * Formata uma data UTC do backend para exibição com data e hora no Brasil
 *
 * @param utcDateStr - String ISO em UTC vinda do backend
 * @returns String formatada "DD/MM/YYYY HH:mm"
 */
export function formatBrazilDateTime(utcDateStr: string): string {
  const brazilDate = convertUTCToBrazil(utcDateStr);
  return brazilDate.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Extrai a data no formato YYYY-MM-DD de uma string UTC para usar em input[type="date"]
 *
 * @param utcDateStr - String ISO em UTC vinda do backend
 * @returns String no formato "YYYY-MM-DD" no horário do Brasil
 */
export function extractBrazilDateForInput(utcDateStr: string): string {
  const brazilDate = convertUTCToBrazil(utcDateStr);
  const year = brazilDate.getFullYear();
  const month = String(brazilDate.getMonth() + 1).padStart(2, '0');
  const day = String(brazilDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Extrai o horário no formato HH:mm de uma string UTC para usar em input[type="time"]
 *
 * @param utcDateStr - String ISO em UTC vinda do backend
 * @returns String no formato "HH:mm" no horário do Brasil
 */
export function extractBrazilTimeForInput(utcDateStr: string): string {
  const brazilDate = convertUTCToBrazil(utcDateStr);
  const hours = String(brazilDate.getHours()).padStart(2, '0');
  const minutes = String(brazilDate.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Verifica se uma data UTC está atrasada em relação ao horário atual do Brasil
 *
 * @param utcDateStr - String ISO em UTC vinda do backend
 * @returns true se a data já passou, false caso contrário
 */
export function isOverdueBrazil(utcDateStr: string): boolean {
  const brazilDate = convertUTCToBrazil(utcDateStr);
  const now = new Date();
  return brazilDate < now;
}

/**
 * Obtém o status de uma atividade baseado na data de vencimento
 * Considera o horário do Brasil
 *
 * @param utcDateStr - String ISO em UTC vinda do backend
 * @returns "overdue" | "today" | "tomorrow" | "future"
 */
export function getActivityStatusBrazil(utcDateStr: string): "overdue" | "today" | "tomorrow" | "future" {
  const brazilDate = convertUTCToBrazil(utcDateStr);
  const now = new Date();

  // Zera as horas para comparar apenas as datas
  const activityDay = new Date(brazilDate);
  activityDay.setHours(0, 0, 0, 0);

  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  const diffTime = activityDay.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return "overdue";
  if (diffDays === 0) return "today";
  if (diffDays === 1) return "tomorrow";
  return "future";
}
