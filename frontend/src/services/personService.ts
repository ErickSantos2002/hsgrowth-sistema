/**
 * Person Service - Serviço para gerenciamento de pessoas/contatos
 * Responsável por todas as operações relacionadas a pessoas
 */
import api from "./api";

export interface Person {
  id: number;
  name: string;
  first_name?: string;
  last_name?: string;

  // Emails
  email?: string;
  email_commercial?: string;
  email_personal?: string;
  email_alternative?: string;

  // Telefones
  phone?: string;
  phone_commercial?: string;
  phone_whatsapp?: string;
  phone_alternative?: string;

  // Profissional
  position?: string;

  // Redes sociais
  linkedin?: string;
  instagram?: string;
  facebook?: string;

  // Relacionamentos
  organization_id?: number;
  owner_id?: number;

  // Controle
  is_active: boolean;
  pipedrive_id?: number;

  created_at: string;
  updated_at: string;
}

export interface PersonListResponse {
  persons: Person[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface CreatePersonRequest {
  name: string;
  first_name?: string;
  last_name?: string;

  // Emails
  email?: string;
  email_commercial?: string;
  email_personal?: string;
  email_alternative?: string;

  // Telefones
  phone?: string;
  phone_commercial?: string;
  phone_whatsapp?: string;
  phone_alternative?: string;

  // Profissional
  position?: string;
  organization_id?: number;
  owner_id?: number;

  // Redes sociais
  linkedin?: string;
  instagram?: string;
  facebook?: string;

  // Controle
  is_active?: boolean;
  pipedrive_id?: number;
}

export interface UpdatePersonRequest {
  name?: string;
  first_name?: string;
  last_name?: string;

  // Emails
  email?: string;
  email_commercial?: string;
  email_personal?: string;
  email_alternative?: string;

  // Telefones
  phone?: string;
  phone_commercial?: string;
  phone_whatsapp?: string;
  phone_alternative?: string;

  // Profissional
  position?: string;
  organization_id?: number;
  owner_id?: number;

  // Redes sociais
  linkedin?: string;
  instagram?: string;
  facebook?: string;

  // Controle
  is_active?: boolean;
  pipedrive_id?: number;
}

/**
 * Lista todas as pessoas com filtros e paginação
 */
const list = async (params?: {
  page?: number;
  page_size?: number;
  search?: string;
  is_active?: boolean;
  organization_id?: number;
  owner_id?: number;
}): Promise<PersonListResponse> => {
  const response = await api.get("/api/v1/persons", { params });
  return response.data;
};

/**
 * Busca uma pessoa por ID
 */
const getById = async (id: number): Promise<Person> => {
  const response = await api.get(`/api/v1/persons/${id}`);
  return response.data;
};

/**
 * Busca todas as pessoas de uma organização
 */
const getByOrganization = async (organizationId: number): Promise<Person[]> => {
  const response = await api.get(`/api/v1/persons/organization/${organizationId}`);
  return response.data;
};

/**
 * Cria uma nova pessoa
 */
const create = async (data: CreatePersonRequest): Promise<Person> => {
  const response = await api.post("/api/v1/persons", data);
  return response.data;
};

/**
 * Atualiza uma pessoa existente
 */
const update = async (id: number, data: UpdatePersonRequest): Promise<Person> => {
  const response = await api.put(`/api/v1/persons/${id}`, data);
  return response.data;
};

/**
 * Deleta uma pessoa
 */
const remove = async (id: number): Promise<void> => {
  await api.delete(`/api/v1/persons/${id}`);
};

/**
 * Altera o status ativo/inativo de uma pessoa
 */
const setActiveStatus = async (id: number, isActive: boolean): Promise<Person> => {
  const response = await api.patch(`/api/v1/persons/${id}/status`, null, {
    params: { is_active: isActive },
  });
  return response.data;
};

/**
 * Vincula uma pessoa a um card
 */
const linkToCard = async (cardId: number, personId: number): Promise<void> => {
  await api.post(`/api/v1/cards/${cardId}/person`, null, {
    params: { person_id: personId },
  });
};

/**
 * Desvincula uma pessoa de um card
 */
const unlinkFromCard = async (cardId: number): Promise<void> => {
  await api.delete(`/api/v1/cards/${cardId}/person`);
};

const personService = {
  list,
  getById,
  getByOrganization,
  create,
  update,
  delete: remove,
  setActiveStatus,
  linkToCard,
  unlinkFromCard,
};

export default personService;
