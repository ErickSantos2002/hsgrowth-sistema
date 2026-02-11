/**
 * Funções utilitárias para formatação e máscaras de dados
 *
 * Centraliza todas as funções de formatação para evitar duplicação
 * e garantir consistência em todo o sistema.
 */

/**
 * Aplica máscara de telefone brasileiro
 * Formatos: (00) 0000-0000 ou (00) 00000-0000
 */
export const maskPhone = (value: string): string => {
  const numbers = value.replace(/\D/g, "");

  // Celular: (00) 00000-0000
  if (numbers.length <= 10) {
    return numbers
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }

  // Fixo: (00) 0000-0000
  return numbers
    .replace(/(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2")
    .replace(/(-\d{4})\d+?$/, "$1");
};

/**
 * Aplica máscara de CPF
 * Formato: 000.000.000-00
 */
export const maskCPF = (value: string): string => {
  return value
    .replace(/\D/g, "")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})/, "$1-$2")
    .replace(/(-\d{2})\d+?$/, "$1");
};

/**
 * Aplica máscara de CNPJ
 * Formato: 00.000.000/0000-00
 */
export const maskCNPJ = (value: string): string => {
  return value
    .replace(/\D/g, "")
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2")
    .replace(/(-\d{2})\d+?$/, "$1");
};

/**
 * Aplica máscara de documento (CPF ou CNPJ)
 * Auto-detecta o tipo baseado no comprimento
 */
export const maskDocument = (value: string): string => {
  const numbers = value.replace(/\D/g, "");
  return numbers.length <= 11 ? maskCPF(value) : maskCNPJ(value);
};

/**
 * Aplica máscara de CEP
 * Formato: 00000-000
 */
export const maskCEP = (value: string): string => {
  return value
    .replace(/\D/g, "")
    .replace(/(\d{5})(\d)/, "$1-$2")
    .replace(/(-\d{3})\d+?$/, "$1");
};

/**
 * Aplica máscara de CNAE
 * Formato: 0000-0/00
 */
export const maskCNAE = (value: string): string => {
  return value
    .replace(/\D/g, "")
    .replace(/(\d{4})(\d)/, "$1-$2")
    .replace(/(\d{1})(\d{1,2})/, "$1/$2")
    .replace(/(\d{2})\d+?$/, "$1");
};

/**
 * Formata data para padrão brasileiro
 * @param date - String de data ISO ou objeto Date
 * @returns Data formatada como DD/MM/YYYY
 */
export const formatDate = (date: string | Date): string => {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return dateObj.toLocaleDateString("pt-BR");
};

/**
 * Formata data e hora para padrão brasileiro
 * @param date - String de data ISO ou objeto Date
 * @returns Data e hora formatadas como DD/MM/YYYY HH:MM
 */
export const formatDateTime = (date: string | Date): string => {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return dateObj.toLocaleString("pt-BR");
};

/**
 * Formata número como moeda brasileira
 * @param value - Valor numérico
 * @returns Valor formatado como R$ 0.000,00
 */
export const formatCurrency = (value: number): string => {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
};

/**
 * Remove toda a formatação de uma string, mantendo apenas números
 * @param value - String formatada
 * @returns String contendo apenas números
 */
export const unmask = (value: string): string => {
  return value.replace(/\D/g, "");
};
