import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import { Building2, ExternalLink, Search, X, Trash2, Plus } from "lucide-react";
import ExpandableSection from "./ExpandableSection";
import ActionButton from "./ActionButton";
import { Card } from "../../types";
import { Client } from "../../services/clientService";
import clientService from "../../services/clientService";
import cardService from "../../services/cardService";
import ClientModal from "../clients/ClientModal";
import { showError } from "../../utils/toast";

interface ClientSectionProps {
  card: Card;
  onUpdate: () => void;
}

/**
 * Seção "Cliente (Organização)" - Informações do cliente vinculado ao card
 * Permite vincular tanto pessoas físicas (CPF) quanto jurídicas (CNPJ)
 * Segunda seção da coluna esquerda, expandida por padrão
 */
const ClientSection: React.FC<ClientSectionProps> = ({ card, onUpdate }) => {
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(false);
  const [isLoadingClients, setIsLoadingClients] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [allClients, setAllClients] = useState<Client[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // Carrega dados do cliente quando o card é carregado
  useEffect(() => {
    loadClientData();
  }, [card]);

  // Busca clientes no backend quando o usuário digita (com debounce)
  useEffect(() => {
    // Não busca se não houver termo de busca ou se o modal não estiver aberto
    if (!searchTerm.trim() || !showModal) {
      setAllClients([]);
      return;
    }

    // Debounce: aguarda 500ms após parar de digitar para fazer a busca
    const timeoutId = setTimeout(async () => {
      try {
        setIsLoadingClients(true);
        const response = await clientService.list({
          page_size: 100,
          is_active: true,
          search: searchTerm.trim()
        });

        // Filtra clientes com documento (CPF ou CNPJ)
        const clientsWithDocument = response.clients.filter((client) => {
          if (!client.document) return false;
          const cleanDoc = client.document.replace(/\D/g, "");
          // CPF tem 11 dígitos, CNPJ tem 14 dígitos
          return cleanDoc.length === 11 || cleanDoc.length === 14;
        });

        setAllClients(clientsWithDocument);
      } catch (error) {
        console.error("Erro ao buscar clientes:", error);
      } finally {
        setIsLoadingClients(false);
      }
    }, 500);

    // Cleanup: cancela o timeout se o usuário continuar digitando
    return () => clearTimeout(timeoutId);
  }, [searchTerm, showModal]);


  /**
   * Carrega os dados do cliente associado ao card
   */
  const loadClientData = async () => {
    if (card.client_id) {
      try {
        setLoading(true);
        const clientData = await clientService.getById(card.client_id);
        setClient(clientData);
      } catch (error) {
        console.error("Erro ao carregar cliente:", error);
      } finally {
        setLoading(false);
      }
    } else {
      setClient(null);
    }
  };

  /**
   * Abre o modal de busca (não carrega clientes automaticamente)
   */
  const handleOpenModal = () => {
    setShowModal(true);
    setSearchTerm("");
    setAllClients([]);
  };


  /**
   * Vincula um cliente ao card
   */
  const handleLinkClient = async (clientId: number) => {
    try {
      setLoading(true);

      await cardService.update(card.id, {
        client_id: clientId,
      });

      setSearchTerm("");
      setShowModal(false);
      onUpdate();
    } catch (error) {
      console.error("Erro ao vincular cliente:", error);
      showError("Erro ao vincular cliente");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Fecha o modal e limpa a busca
   */
  const handleCloseModal = () => {
    setShowModal(false);
    setSearchTerm("");
  };

  /**
   * Remove vínculo do cliente
   */
  const handleUnlinkClient = async () => {
    if (!confirm("Desvincular este cliente do negócio?")) return;

    try {
      await cardService.update(card.id, {
        client_id: null,
      });
      onUpdate();
    } catch (error) {
      console.error("Erro ao desvincular cliente:", error);
      showError("Erro ao desvincular cliente");
    }
  };

  /**
   * Callback quando um novo cliente é criado
   * Automaticamente vincula o cliente ao card
   */
  const handleClientCreated = async () => {
    setShowCreateModal(false);

    // Aguarda um momento para o backend processar
    await new Promise(resolve => setTimeout(resolve, 500));

    try {
      // Busca o cliente recém-criado (último criado)
      const response = await clientService.list({ page_size: 1, is_active: true });

      if (response.clients.length > 0) {
        const newClient = response.clients[0];

        // Vincula automaticamente ao card
        await cardService.update(card.id, {
          client_id: newClient.id,
        });

        onUpdate();
      }
    } catch (error) {
      console.error("Erro ao vincular cliente recém-criado:", error);
      showError("Cliente criado, mas houve erro ao vincular. Vincule manualmente");
    }
  };

  /**
   * Callback quando o cliente é editado
   * Recarrega os dados do cliente e atualiza o card
   */
  const handleClientEdited = async () => {
    setShowEditModal(false);
    // Recarrega os dados do cliente e do card
    await loadClientData();
    onUpdate();
  };

  /**
   * Formata CPF ou CNPJ
   */
  const formatDocument = (document: string | undefined) => {
    if (!document) return "";
    const cleaned = document.replace(/\D/g, "");

    // CPF: 000.000.000-00 (11 dígitos)
    if (cleaned.length === 11) {
      return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
    }

    // CNPJ: 00.000.000/0000-00 (14 dígitos)
    if (cleaned.length === 14) {
      return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
    }

    // Retorna sem formatação se não for CPF nem CNPJ
    return document;
  };

  /**
   * Formata telefone
   */
  const formatPhone = (phone: string | null | undefined) => {
    if (!phone) return "Não informado";
    return phone;
  };

  // Se não há cliente vinculado
  if (!client && !loading) {
    return (
      <>
        <ExpandableSection
          title="Cliente (Organização)"
          defaultExpanded={false}
          icon={<Building2 size={18} />}
        >
          <div className="space-y-3">
            <p className="py-2 text-center text-sm text-slate-400 dark:text-slate-500 dark:text-slate-400">
              Nenhum cliente vinculado a este negócio
            </p>

            {/* Botões de Vincular e Cadastrar */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleOpenModal}
                className="flex items-center justify-center gap-2 rounded-lg border border-blue-500/50 bg-blue-500/20 px-4 py-3 font-medium text-blue-400 transition-colors hover:bg-blue-500/30"
              >
                <ExternalLink size={16} />
                Vincular
              </button>

              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center justify-center gap-2 rounded-lg border border-green-500/50 bg-green-500/20 px-4 py-3 font-medium text-green-400 transition-colors hover:bg-green-500/30"
              >
                <Plus size={16} />
                Cadastrar
              </button>
            </div>
          </div>
        </ExpandableSection>

        {/* Modal de busca (renderizado no body via Portal) */}
        {showModal && ReactDOM.createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
            onClick={handleCloseModal}
          >
            <div
              className="flex max-h-[600px] w-full max-w-lg flex-col rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-100 dark:bg-slate-800 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-gray-200 dark:border-slate-700 p-4">
                <h3 className="font-semibold text-slate-900 dark:text-white">Vincular Cliente</h3>
                <button
                  onClick={handleCloseModal}
                  className="text-slate-400 dark:text-slate-500 dark:text-slate-400 transition-colors hover:text-slate-900 dark:hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Campo de busca dentro do modal */}
              <div className="border-b border-gray-200 dark:border-slate-700 p-4">
                <div className="relative">
                  <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 dark:text-slate-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar por nome, CPF ou CNPJ..."
                    className="w-full rounded-lg border border-gray-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 py-3 pl-10 pr-10 text-slate-900 dark:text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                    autoFocus
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    >
                      <X size={18} />
                    </button>
                  )}
                </div>
              </div>

              {/* Resultados */}
              <div className="flex-1 overflow-y-auto p-4">
                {isLoadingClients ? (
                  <div className="p-8 text-center text-sm text-slate-400 dark:text-slate-500 dark:text-slate-400">
                    Buscando clientes...
                  </div>
                ) : !searchTerm.trim() ? (
                  <div className="p-8 text-center text-sm text-slate-400 dark:text-slate-500 dark:text-slate-400">
                    Digite o nome, CPF ou CNPJ para buscar
                  </div>
                ) : allClients.length === 0 ? (
                  <div className="p-8 text-center text-sm text-slate-400 dark:text-slate-500 dark:text-slate-400">
                    Nenhum cliente encontrado com esse critério
                  </div>
                ) : (
                  <div className="space-y-2">
                    {allClients.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => handleLinkClient(c.id)}
                        className="w-full rounded-lg border border-gray-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 p-3 text-left transition-colors hover:bg-gray-200/50 dark:hover:bg-slate-700/50"
                      >
                        <p className="font-medium text-slate-900 dark:text-white">{c.company_name || c.name}</p>
                        {c.document && (
                          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500 dark:text-slate-400">
                            {formatDocument(c.document)}
                          </p>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* Modal de criar cliente */}
        {showCreateModal && (
          <ClientModal
            isOpen={showCreateModal}
            onClose={() => setShowCreateModal(false)}
            onSave={handleClientCreated}
            client={null}
          />
        )}
      </>
    );
  }

  // Se há cliente vinculado - exibir apenas read-only
  return (
    <>
      <ExpandableSection
        title="Cliente (Organização)"
        defaultExpanded={false}
        icon={<Building2 size={18} />}
      >
      {loading ? (
        <div className="py-4 text-center">
          <p className="text-sm text-slate-400 dark:text-slate-500 dark:text-slate-400">Carregando...</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Nome da Empresa */}
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-sm font-medium text-slate-600 dark:text-slate-300">
              <Building2 size={14} className="text-slate-400 dark:text-slate-500 dark:text-slate-400" />
              <span>Nome da empresa</span>
            </div>
            <div className="rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50/30 dark:bg-slate-900/30 px-3 py-2">
              <p className="text-slate-900 dark:text-white">{client?.company_name || client?.name || "Não informado"}</p>
            </div>
          </div>

          {/* CPF/CNPJ */}
          <div className="space-y-1">
            <div className="text-sm font-medium text-slate-600 dark:text-slate-300">
              {client?.document && client.document.replace(/\D/g, "").length === 11 ? "CPF" : "CNPJ"}
            </div>
            <div className="rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50/30 dark:bg-slate-900/30 px-3 py-2">
              <p className={client?.document ? "text-slate-900 dark:text-white" : "italic text-slate-400 dark:text-slate-500"}>
                {client?.document ? formatDocument(client.document) : "Não informado"}
              </p>
            </div>
          </div>

          {/* Endereço */}
          <div className="space-y-1">
            <div className="text-sm font-medium text-slate-600 dark:text-slate-300">Endereço</div>
            <div className="rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50/30 dark:bg-slate-900/30 px-3 py-2">
              <p className={client?.address ? "text-sm text-slate-900 dark:text-white" : "text-sm italic text-slate-400 dark:text-slate-500"}>
                {client?.address || "Não informado"}
              </p>
              {(client?.city || client?.state) && (
                <p className="mt-1 text-sm text-slate-400 dark:text-slate-500 dark:text-slate-400">
                  {client.city}{client.city && client.state && " - "}{client.state}
                </p>
              )}
            </div>
          </div>

          {/* Contato */}
          <div className="space-y-1">
            <div className="text-sm font-medium text-slate-600 dark:text-slate-300">Contato</div>
            <div className="space-y-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50/30 dark:bg-slate-900/30 px-3 py-2">
              <div>
                <p className="text-xs text-slate-400 dark:text-slate-500 dark:text-slate-400">Telefone</p>
                <p className={client?.phone ? "text-sm text-slate-900 dark:text-white" : "text-sm italic text-slate-400 dark:text-slate-500"}>
                  {formatPhone(client?.phone)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400 dark:text-slate-500 dark:text-slate-400">Email</p>
                <p className={client?.email ? "text-sm text-blue-400" : "text-sm italic text-slate-400 dark:text-slate-500"}>
                  {client?.email || "Não informado"}
                </p>
              </div>
            </div>
          </div>

          {/* Website */}
          <div className="space-y-1">
            <div className="text-sm font-medium text-slate-600 dark:text-slate-300">Website</div>
            <div className="rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50/30 dark:bg-slate-900/30 px-3 py-2">
              {client?.website ? (
                <a
                  href={client.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-400 hover:underline"
                >
                  {client.website}
                </a>
              ) : (
                <p className="text-sm italic text-slate-400 dark:text-slate-500">Não informado</p>
              )}
            </div>
          </div>

          {/* Ações */}
          <div className="space-y-2 border-t border-gray-200/50 dark:border-slate-700/50 pt-3">
            <ActionButton
              icon={<ExternalLink size={16} />}
              label="Modificar cadastro do cliente"
              onClick={() => setShowEditModal(true)}
              variant="warning"
              className="w-full"
            />

            <ActionButton
              icon={<Trash2 size={16} />}
              label="Desvincular cliente"
              onClick={handleUnlinkClient}
              variant="danger"
              className="w-full"
            />
          </div>
        </div>
      )}
      </ExpandableSection>

      {/* Modal de editar cliente */}
      {showEditModal && client && (
        <ClientModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSave={handleClientEdited}
          client={client}
        />
      )}
    </>
  );
};

export default ClientSection;
