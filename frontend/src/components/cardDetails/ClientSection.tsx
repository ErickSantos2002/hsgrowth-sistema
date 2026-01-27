import React, { useState, useEffect } from "react";
import { Building2, Plus, ExternalLink, History, Trash2 } from "lucide-react";
import ExpandableSection from "./ExpandableSection";
import EditableField from "./EditableField";
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
 * Seção "Cliente (Organização)" - Informações da empresa vinculada ao card
 * Segunda seção da coluna esquerda, expandida por padrão
 */
const ClientSection: React.FC<ClientSectionProps> = ({ card, onUpdate }) => {
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(false);
  const [isCreatingClient, setIsCreatingClient] = useState(false);
  const [showClientSelector, setShowClientSelector] = useState(false);
  const [availableClients, setAvailableClients] = useState<Client[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  // Carrega dados do cliente quando o card é carregado
  useEffect(() => {
    loadClientData();
  }, [card]);

  /**
   * Carrega os dados do cliente associado ao card
   */
  const loadClientData = async () => {
    // TODO: Backend precisa retornar client_id no Card e relacionamento com Client
    // Por enquanto, vamos simular com contact_info
    if (card.contact_info?.client_id) {
      try {
        setLoading(true);
        const clientData = await clientService.getById(card.contact_info.client_id);
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
   * Atualiza campo do cliente
   */
  const handleUpdateField = async (field: string, value: string) => {
    if (!client) return;

    try {
      await clientService.update(client.id, { [field]: value });
      await loadClientData();
    } catch (error) {
      console.error(`Erro ao atualizar ${field}:`, error);
      alert(`Erro ao atualizar ${field}`);
    }
  };

  /**
   * Vincula um cliente existente ao card
   */
  const handleLinkClient = async (clientId: number) => {
    try {
      // TODO: Backend precisa aceitar client_id no Card
      // Por enquanto, salvamos no contact_info
      await cardService.update(card.id, {
        contact_info: {
          ...card.contact_info,
          client_id: clientId,
        },
      });
      setShowClientSelector(false);
      onUpdate();
    } catch (error) {
      console.error("Erro ao vincular cliente:", error);
      alert("Erro ao vincular cliente");
    }
  };

  /**
   * Remove vínculo do cliente
   */
  const handleUnlinkClient = async () => {
    if (!confirm("Desvincular este cliente do negócio?")) return;

    try {
      const newContactInfo = { ...card.contact_info };
      delete newContactInfo.client_id;

      await cardService.update(card.id, {
        contact_info: newContactInfo,
      });
      onUpdate();
    } catch (error) {
      console.error("Erro ao desvincular cliente:", error);
      alert("Erro ao desvincular cliente");
    }
  };

  /**
   * Carrega lista de clientes para seleção
   */
  const handleOpenClientSelector = async () => {
    try {
      const response = await clientService.list({ page_size: 50, is_active: true });
      setAvailableClients(response.clients);
      setShowClientSelector(true);
    } catch (error) {
      console.error("Erro ao carregar clientes:", error);
      alert("Erro ao carregar lista de clientes");
    }
  };

  /**
   * Formata CNPJ
   */
  const formatCNPJ = (cnpj: string | undefined) => {
    if (!cnpj) return "";
    // Remove caracteres não numéricos
    const cleaned = cnpj.replace(/\D/g, "");
    // Formata: 00.000.000/0000-00
    return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  };

  /**
   * Filtra clientes com base no termo de busca
   */
  const filteredClients = availableClients.filter((c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.document?.includes(searchTerm)
  );

  // Se não há cliente vinculado
  if (!client && !loading) {
    return (
      <ExpandableSection
        title="Cliente (Organização)"
        defaultExpanded={true}
        icon={<Building2 size={18} />}
      >
        <div className="space-y-3">
          <p className="text-sm text-slate-400 text-center py-4">
            Nenhum cliente vinculado a este negócio
          </p>

          <div className="flex gap-2">
            <button
              onClick={handleOpenClientSelector}
              className="flex-1 px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/50 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              <ExternalLink size={16} />
              Vincular cliente existente
            </button>

            <button
              onClick={() => setIsCreatingClient(true)}
              className="flex-1 px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/50 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              <Plus size={16} />
              Criar novo cliente
            </button>
          </div>

          {/* Modal de seleção de cliente */}
          {showClientSelector && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
                <h3 className="text-xl font-semibold text-white mb-4">Selecionar Cliente</h3>

                {/* Campo de busca */}
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar por nome, empresa ou CNPJ..."
                  className="px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 mb-4"
                  autoFocus
                />

                {/* Lista de clientes */}
                <div className="flex-1 overflow-y-auto space-y-2">
                  {filteredClients.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-8">
                      Nenhum cliente encontrado
                    </p>
                  ) : (
                    filteredClients.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => handleLinkClient(c.id)}
                        className="w-full p-3 bg-slate-900/50 hover:bg-slate-700/50 border border-slate-700 rounded-lg text-left transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-white">{c.name}</p>
                            {c.company_name && (
                              <p className="text-sm text-slate-400">{c.company_name}</p>
                            )}
                            {c.document && (
                              <p className="text-xs text-slate-500 mt-1">
                                {formatCNPJ(c.document)}
                              </p>
                            )}
                          </div>
                          <ExternalLink size={16} className="text-slate-500" />
                        </div>
                      </button>
                    ))
                  )}
                </div>

                {/* Botão fechar */}
                <button
                  onClick={() => {
                    setShowClientSelector(false);
                    setSearchTerm("");
                  }}
                  className="mt-4 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
                >
                  Fechar
                </button>
              </div>
            </div>
          )}

          {/* TODO: Modal de criação de novo cliente */}
          {isCreatingClient && (
            <div className="p-4 bg-slate-800/30 border border-slate-700/50 rounded-lg">
              <p className="text-sm text-slate-400">
                Formulário de criação de cliente (será implementado)
              </p>
              <button
                onClick={() => setIsCreatingClient(false)}
                className="mt-2 text-sm text-blue-400 hover:text-blue-300"
              >
                Cancelar
              </button>
            </div>
          )}
        </div>
      </ExpandableSection>
    );
  }

  // Se há cliente vinculado
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
          <EditableField
            label="Nome da empresa"
            value={client?.company_name || client?.name}
            onSave={(value) => handleUpdateField("company_name", value)}
            type="text"
            placeholder="Nome da empresa"
            icon={<Building2 size={14} />}
          />

          {/* CNPJ */}
          <EditableField
            label="CNPJ"
            value={client?.document}
            onSave={(value) => handleUpdateField("document", value)}
            type="text"
            placeholder="00.000.000/0000-00"
            format={formatCNPJ}
          />

          {/* Endereço */}
          <EditableField
            label="Endereço completo"
            value={client?.address}
            onSave={(value) => handleUpdateField("address", value)}
            type="textarea"
            placeholder="Rua, Número, Complemento, Bairro"
          />

          {/* Cidade/Estado */}
          <div className="grid grid-cols-2 gap-3">
            <EditableField
              label="Cidade"
              value={client?.city}
              onSave={(value) => handleUpdateField("city", value)}
              type="text"
              placeholder="Cidade"
            />
            <EditableField
              label="Estado"
              value={client?.state}
              onSave={(value) => handleUpdateField("state", value)}
              type="text"
              placeholder="UF"
            />
          </div>

          {/* Telefone */}
          <EditableField
            label="Telefone principal"
            value={client?.phone}
            onSave={(value) => handleUpdateField("phone", value)}
            type="tel"
            placeholder="(00) 0000-0000"
          />

          {/* E-mail */}
          <EditableField
            label="E-mail corporativo"
            value={client?.email}
            onSave={(value) => handleUpdateField("email", value)}
            type="email"
            placeholder="contato@empresa.com.br"
          />

          {/* Website */}
          <EditableField
            label="Website"
            value={client?.website}
            onSave={(value) => handleUpdateField("website", value)}
            type="url"
            placeholder="https://www.empresa.com.br"
          />

          {/* Campos futuros (placeholders) */}
          <div className="pt-3 border-t border-slate-700/50 space-y-2">
            <p className="text-xs text-slate-500 italic">
              Campos adicionais (a implementar no backend):
            </p>
            <div className="text-xs text-slate-600">
              • Segmento/Setor de atuação
              <br />
              • Número de funcionários
              <br />• Faturamento anual
            </div>
          </div>

          {/* Ações */}
          <div className="pt-3 border-t border-slate-700/50 space-y-2">
            <ActionButton
              icon={<History size={16} />}
              label="Histórico de negócios"
              onClick={() => alert("Ver histórico - será implementado")}
              variant="secondary"
              className="w-full"
            />

            <ActionButton
              icon={<ExternalLink size={16} />}
              label="Página completa do cliente"
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
