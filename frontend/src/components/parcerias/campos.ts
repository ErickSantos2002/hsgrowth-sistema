import type { ChangeEvent } from "react";
import { limparDocumento, maskCNPJ, maskPhone } from "../../utils/formatters";

/**
 * Regras dos campos de texto de Parcerias, iguais às do backend
 * (app/schemas/parcerias.py): tamanho máximo, máscara e conferência.
 */

const TELEFONE = ["main_contact_phone", "contact_phone", "phone"];
const EMAIL = ["main_contact_email", "contact_email", "email"];

// Tamanho com a máscara: CNPJ 00.000.000/0000-00 e telefone (00) 00000-0000.
const LIMITE: Record<string, number> = {
  name: 255, cnpj: 18, main_contact_name: 255, main_contact_phone: 15, main_contact_email: 255,
  partner_type: 100, origin: 100, segment: 255, region: 255,
  title: 500, context: 2000, company_name: 255, company_segment: 255, company_city: 255, company_state: 2,
  contact_name: 255, contact_role: 255, contact_phone: 15, contact_email: 255,
  email: 255, phone: 15, password: 128,
};

/**
 * O que escrever em cada campo (placeholder). "name", "email" e "phone" mudam de
 * sentido de tela para tela (empresa, parceiro, vendedor): cada tela põe o seu.
 */
const DICA: Record<string, string> = {
  cnpj: "00.000.000/0000-00",
  company_name: "Razão social que consta no CNPJ",
  company_segment: "Ex.: Transporte de cargas",
  company_city: "Ex.: Recife",
  company_state: "Ex.: PE",
  contact_name: "Nome da pessoa com quem você fala na empresa",
  contact_role: "Ex.: Gerente de SST, Compras",
  contact_phone: "(00) 00000-0000",
  contact_email: "nome@empresa.com.br",
  main_contact_name: "Nome do responsável pela empresa",
  main_contact_phone: "(00) 00000-0000",
  main_contact_email: "nome@empresa.com.br",
  partner_type: "Ex.: Revenda, consultoria de SST",
  origin: "Ex.: Indicação, evento, LinkedIn",
  segment: "Ex.: Segurança do trabalho",
  region: "Ex.: Nordeste, Grande SP",
};

/**
 * Empresa e contato da oportunidade vão para o cadastro geral (Clientes e Pessoas):
 * obrigatórios, como no backend (OportunidadeCreate). O cargo é opcional.
 */
export const OBRIGATORIOS_EMPRESA_CONTATO = [
  "company_name", "company_city", "company_state", "contact_name", "contact_phone", "contact_email",
] as const;

/** Campos obrigatórios que estão vazios. */
export function faltando(form: object, campos: readonly string[]): string[] {
  const f = form as Record<string, unknown>;
  return campos.filter((c) => String(f[c] ?? "").trim() === "");
}

/**
 * CNPJ sem máscara e em maiúsculas. Desde jul/2026 a Receita emite CNPJ com
 * letras nas 12 primeiras posições (os 2 verificadores seguem números).
 */
export const limparCnpj = limparDocumento;

const PESOS_1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
const PESOS_2 = [6, ...PESOS_1];
// Cada caractere vale o código ASCII menos 48: números ficam iguais, "A" vale 17.
const digito = (base: string, pesos: number[]) => {
  const resto = pesos.reduce((soma, p, i) => soma + (base.charCodeAt(i) - 48) * p, 0) % 11;
  return resto < 2 ? 0 : 11 - resto;
};

export function cnpjValido(valor: string): boolean {
  const d = limparCnpj(valor);
  if (!/^[0-9A-Z]{12}\d{2}$/.test(d) || /^(.)\1+$/.test(d)) return false;
  return Number(d[12]) === digito(d, PESOS_1) && Number(d[13]) === digito(d, PESOS_2);
}

export const emailValido = (valor: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(valor.trim());

/** Aplica a máscara do campo e corta no tamanho máximo. */
export function mascarar(nome: string, valor: string): string {
  let v = valor;
  if (nome === "cnpj") v = maskCNPJ(v);
  else if (TELEFONE.includes(nome)) v = maskPhone(v);
  else if (nome === "company_state") v = v.replace(/[^a-zA-Z]/g, "").toUpperCase();
  const limite = LIMITE[nome];
  return limite ? v.slice(0, limite) : v;
}

/** Mensagem de erro do campo preenchido (vazio não é erro aqui; obrigatório é conferido no botão). */
export function erroDoCampo(nome: string, valor: unknown): string | undefined {
  const v = typeof valor === "string" ? valor.trim() : "";
  if (!v) return undefined;
  if (nome === "cnpj" && !cnpjValido(v)) return "CNPJ inválido";
  if (TELEFONE.includes(nome) && ![10, 11].includes(v.replace(/\D/g, "").length)) return "Telefone com DDD: 10 ou 11 números";
  if (EMAIL.includes(nome) && !emailValido(v)) return "E-mail inválido";
  if (nome === "company_state" && v.length !== 2) return "UF com 2 letras";
  return undefined;
}

/** Erros de todos os campos do formulário (só os que têm erro). */
export function errosDoForm(form: object): Record<string, string> {
  const erros: Record<string, string> = {};
  Object.entries(form).forEach(([nome, valor]) => {
    const erro = erroDoCampo(nome, valor);
    if (erro) erros[nome] = erro;
  });
  return erros;
}

/** Valor do backend pronto para a tela (CNPJ e telefone com máscara). */
export const paraTela = (nome: string, valor?: string | null) => (valor ? mascarar(nome, valor) : "");

/**
 * Props de um Input/Textarea de texto: valor, máscara, limite e borda de erro.
 * `setForm` recebe o form inteiro, como os useState das telas.
 */
export function propsDeTexto<F extends object>(form: F, setForm: (f: F) => void, nome: keyof F & string, desabilitado = false) {
  return {
    value: ((form as Record<string, unknown>)[nome] as string) ?? "",
    maxLength: LIMITE[nome],
    // Só quando há dica: a tela que põe o próprio placeholder não é sobrescrita.
    ...(DICA[nome] && !desabilitado ? { placeholder: DICA[nome] } : {}),
    disabled: desabilitado,
    error: !!erroDoCampo(nome, (form as Record<string, unknown>)[nome]),
    inputMode: TELEFONE.includes(nome) || nome === "cnpj" ? ("numeric" as const) : undefined,
    onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm({ ...form, [nome]: mascarar(nome, e.target.value) }),
  };
}
