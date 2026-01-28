import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import { Building2, ExternalLink, Search, X, Trash2 } from "lucide-react";
import ExpandableSection from "./ExpandableSection";
import ActionButton from "./ActionButton";
import { Card } from "../../types";
import { Client } from "../../services/clientService";
import clientService from "../../services/clientService";
import cardService from "../../services/cardService";

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

  // Carrega dados do cliente quando o card é carregado
  useEffect(() => {
    loadClientData();
  }, [card]);


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
   * Carrega todos os clientes (PF e PJ) quando abre o modal (uma única vez)
   */
  const handleOpenModal = async () => {
    setShowModal(true);

    // Só carrega se ainda não carregou
    if (allClients.length === 0) {
      try {
        setIsLoadingClients(true);
        const response = await clientService.list({ page_size: 100, is_active: true });

        // Filtra clientes com documento (CPF ou CNPJ)
        const clientsWithDocument = response.clients.filter((client) => {
          if (!client.document) return false;
          const cleanDoc = client.document.replace(/\D/g, "");
          // CPF tem 11 dígitos, CNPJ tem 14 dígitos
          return cleanDoc.length === 11 || cleanDoc.length === 14;
        });

        setAllClients(clientsWithDocument);
      } catch (error) {
        console.error("Erro ao carregar clientes:", error);
        alert("Erro ao carregar lista de clientes");
      } finally {
        setIsLoadingClients(false);
      }
    }
  };

  /**
   * Filtra clientes localmente com base no termo de busca
   */
  const filteredClients = allClients.filter((c) => {
    if (!searchTerm.trim()) return true;

    const search = searchTerm.toLowerCase().trim();
    const cleanSearch = searchTerm.replace(/\D/g, "");

    // Busca em nome da empresa
    const matchesCompanyName = c.company_name
      ? c.company_name.toLowerCase().includes(search)
      : false;

    // Busca em nome do contato
    const matchesName = c.name
      ? c.name.toLowerCase().includes(search)
      : false;

    // Busca em CPF/CNPJ (apenas números)
    const matchesDocument = c.document && cleanSearch.length > 0
      ? c.document.replace(/\D/g, "").includes(cleanSearch)
      : false;

    return matchesCompanyName || matchesName || matchesDocument;
  });

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
      alert("Erro ao vincular cliente. Verifique o console para mais detalhes.");
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
      alert("Erro ao desvincular cliente");
    }
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
          defaultExpanded={true}
          icon={<Building2 size={18} />}
        >
          <div className="space-y-3">
            <p className="text-sm text-slate-400 text-center py-2">
              Nenhum cliente vinculado a este negócio
            </p>

            {/* Botão para abrir modal */}
            <button
              onClick={handleOpenModal}
              className="w-full px-4 py-3 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/50 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              <ExternalLink size={16} />
              Vincular cliente
            </button>
          </div>
        </ExpandableSection>

        {/* Modal de busca (renderizado no body via Portal) */}
        {showModal && ReactDOM.createPortal(
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={handleCloseModal}
          >
            <div
              className="bg-slate-800 border border-slate-700 rounded-lg w-full max-w-lg max-h-[600px] flex flex-col shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 border-b border-slate-700 flex items-center justify-between">
                <h3 className="font-semibold text-white">Vincular Cliente</h3>
                <button
                  onClick={handleCloseModal}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Campo de busca dentro do modal */}
              <div className="p-4 border-b border-slate-700">
                <div className="relative">
                  <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar por nome, CPF ou CNPJ..."
                    className="w-full pl-10 pr-10 py-3 bg-slate-900/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    autoFocus
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      <X size={18} />
                    </button>
                  )}
                </div>
              </div>

              {/* Resultados */}
              <div className="flex-1 overflow-y-auto p-4">
                {isLoadingClients ? (
                  <div className="p-8 text-center text-sm text-slate-400">
                    Carregando clientes...
                  </div>
                ) : filteredClients.length === 0 ? (
                  <div className="p-8 text-center text-sm text-slate-400">
                    {searchTerm
                      ? "Nenhum cliente encontrado com esse critério"
                      : allClients.length === 0
                      ? "Nenhum cliente cadastrado"
                      : "Digite para buscar"}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredClients.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => handleLinkClient(c.id)}
                        className="w-full p-3 bg-slate-900/50 hover:bg-slate-700/50 border border-slate-700 rounded-lg text-left transition-colors"
                      >
                        <p className="font-medium text-white">{c.company_name || c.name}</p>
                        {c.document && (
                          <p className="text-xs text-slate-400 mt-1">
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
      </>
    );
  }

  // Se há cliente vinculado - exibir apenas read-only
  return (
    <ExpandableSection
      title="Cliente (Organização)"
      defaultExpanded={true}
      icon={<Building2 size={18} />}
    >
      {loading ? (
        <div className="text-center py-4">
          <p className="text-sm text-slate-400">Carregando...</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Nome da Empresa */}
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-sm font-medium text-slate-300">
              <Building2 size={14} className="text-slate-400" />
              <span>Nome da empresa</span>
            </div>
            <div className="px-3 py-2 bg-slate-900/30 border border-slate-700 rounded-lg">
              <p className="text-white">{client?.company_name || client?.name || "Não informado"}</p>
            </div>
          </div>

          {/* CPF/CNPJ */}
          {client?.document && (
            <div className="space-y-1">
              <div className="text-sm font-medium text-slate-300">
                {client.document.replace(/\D/g, "").length === 11 ? "CPF" : "CNPJ"}
              </div>
              <div className="px-3 py-2 bg-slate-900/30 border border-slate-700 rounded-lg">
                <p className="text-white">{formatDocument(client.document)}</p>
              </div>
            </div>
          )}

          {/* Endereço */}
          {client?.address && (
            <div className="space-y-1">
              <div className="text-sm font-medium text-slate-300">Endereço</div>
              <div className="px-3 py-2 bg-slate-900/30 border border-slate-700 rounded-lg">
                <p className="text-white text-sm">{client.address}</p>
                {(client.city || client.state) && (
                  <p className="text-slate-400 text-sm mt-1">
                    {client.city}{client.city && client.state && " - "}{client.state}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Contato */}
          {(client?.phone || client?.email) && (
            <div className="space-y-1">
              <div className="text-sm font-medium text-slate-300">Contato</div>
              <div className="px-3 py-2 bg-slate-900/30 border border-slate-700 rounded-lg space-y-1">
                {client?.phone && (
                  <p className="text-white text-sm">{formatPhone(client.phone)}</p>
                )}
                {client?.email && (
                  <p className="text-blue-400 text-sm">{client.email}</p>
                )}
              </div>
            </div>
          )}

          {/* Website */}
          {client?.website && (
            <div className="space-y-1">
              <div className="text-sm font-medium text-slate-300">Website</div>
              <div className="px-3 py-2 bg-slate-900/30 border border-slate-700 rounded-lg">
                <a
                  href={client.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 text-sm hover:underline"
                >
                  {client.website}
                </a>
              </div>
            </div>
          )}

          {/* Ações */}
          <div className="pt-3 border-t border-slate-700/50 space-y-2">
            <ActionButton
              icon={<ExternalLink size={16} />}
              label="Ver página completa do cliente"
              onClick={() => alert(`Navegar para /clients/${client?.id} - será implementado`)}
              variant="primary"
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
  );
};

export default ClientSection;
