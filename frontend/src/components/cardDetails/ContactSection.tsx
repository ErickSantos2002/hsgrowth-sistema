import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import { User, ExternalLink, Search, X, Trash2, Mail, Phone, Briefcase, Linkedin, Plus } from "lucide-react";
import ExpandableSection from "./ExpandableSection";
import ActionButton from "./ActionButton";
import { Card } from "../../types";
import { Person } from "../../services/personService";
import personService from "../../services/personService";
import PersonModal from "../persons/PersonModal";
import { showError } from "../../utils/toast";

interface ContactSectionProps {
  card: Card;
  onUpdate: () => void;
}

/**
 * Seção "Informação de Contato (Pessoa)" - Dados da pessoa de contato
 * Terceira seção da coluna esquerda, expandida por padrão
 */
const ContactSection: React.FC<ContactSectionProps> = ({ card, onUpdate }) => {
  const [person, setPerson] = useState<Person | null>(null);
  const [loading, setLoading] = useState(false);
  const [isLoadingPersons, setIsLoadingPersons] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [allPersons, setAllPersons] = useState<Person[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // Carrega dados da pessoa quando o card é carregado
  useEffect(() => {
    loadPersonData();
  }, [card]);

  // Busca pessoas no backend quando o usuário digita (com debounce)
  useEffect(() => {
    // Não busca se não houver termo de busca ou se o modal não estiver aberto
    if (!searchTerm.trim() || !showModal) {
      setAllPersons([]);
      return;
    }

    // Debounce: aguarda 500ms após parar de digitar para fazer a busca
    const timeoutId = setTimeout(async () => {
      try {
        setIsLoadingPersons(true);
        const response = await personService.list({
          page_size: 100,
          is_active: true,
          search: searchTerm.trim()
        });
        setAllPersons(response.persons);
      } catch (error) {
        console.error("Erro ao buscar pessoas:", error);
      } finally {
        setIsLoadingPersons(false);
      }
    }, 500);

    // Cleanup: cancela o timeout se o usuário continuar digitando
    return () => clearTimeout(timeoutId);
  }, [searchTerm, showModal]);

  /**
   * Carrega os dados da pessoa associada ao card
   */
  const loadPersonData = async () => {
    if (card.person_id) {
      try {
        setLoading(true);
        const personData = await personService.getById(card.person_id);
        setPerson(personData);
      } catch (error) {
        console.error("Erro ao carregar pessoa:", error);
      } finally {
        setLoading(false);
      }
    } else {
      setPerson(null);
    }
  };

  /**
   * Abre o modal de busca (não carrega pessoas automaticamente)
   */
  const handleOpenModal = () => {
    setShowModal(true);
    setSearchTerm("");
    setAllPersons([]);
  };


  /**
   * Vincula uma pessoa ao card
   */
  const handleLinkPerson = async (personId: number) => {
    try {
      setLoading(true);
      await personService.linkToCard(card.id, personId);

      // Carrega os dados da pessoa recém-vinculada
      const personData = await personService.getById(personId);
      setPerson(personData);

      setSearchTerm("");
      setShowModal(false);
      onUpdate(); // Atualiza o card no pai
    } catch (error) {
      console.error("Erro ao vincular pessoa:", error);
      showError("Erro ao vincular pessoa");
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
   * Remove vínculo da pessoa
   */
  const handleUnlinkPerson = async () => {
    if (!confirm("Desvincular esta pessoa do negócio?")) return;

    try {
      await personService.unlinkFromCard(card.id);
      onUpdate();
    } catch (error) {
      console.error("Erro ao desvincular pessoa:", error);
      showError("Erro ao desvincular pessoa");
    }
  };

  /**
   * Callback quando uma nova pessoa é criada
   * Automaticamente vincula a pessoa ao card
   */
  const handlePersonCreated = async () => {
    setShowCreateModal(false);

    // Aguarda um momento para o backend processar
    await new Promise(resolve => setTimeout(resolve, 500));

    try {
      // Busca a pessoa recém-criada (última criada)
      const response = await personService.list({ page_size: 1, is_active: true });

      if (response.persons.length > 0) {
        const newPerson = response.persons[0];

        // Vincula automaticamente ao card
        await personService.linkToCard(card.id, newPerson.id);

        onUpdate();
      }
    } catch (error) {
      console.error("Erro ao vincular pessoa recém-criada:", error);
      showError("Pessoa criada, mas houve erro ao vincular. Vincule manualmente");
    }
  };

  /**
   * Callback quando a pessoa é editada
   * Recarrega os dados da pessoa e atualiza o card
   */
  const handlePersonEdited = async () => {
    setShowEditModal(false);
    // Recarrega os dados da pessoa e do card
    await loadPersonData();
    onUpdate();
  };

  /**
   * Formata telefone brasileiro
   */
  const formatPhone = (phone: string | undefined | null) => {
    if (!phone) return "Não informado";
    const cleaned = phone.replace(/\D/g, "");

    // Celular: (00) 00000-0000
    if (cleaned.length === 11) {
      return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
    }
    // Fixo: (00) 0000-0000
    if (cleaned.length === 10) {
      return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
    }
    return phone;
  };

  // Se não há pessoa vinculada
  if (!person && !loading) {
    return (
      <>
        <ExpandableSection
          title="Informação de Contato (Pessoa)"
          defaultExpanded={false}
          icon={<User size={18} />}
        >
          <div className="space-y-3">
            <p className="py-2 text-center text-sm text-slate-400 dark:text-slate-400">
              Nenhuma pessoa vinculada a este negócio
            </p>

            {/* Botões de Vincular e Cadastrar */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleOpenModal}
                className="flex items-center justify-center gap-2 rounded-lg border border-blue-500/50 bg-blue-500/20 px-4 py-3 font-medium text-slate-900 dark:text-blue-400 transition-colors hover:bg-blue-500/30"
              >
                <ExternalLink size={16} />
                Vincular
              </button>

              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center justify-center gap-2 rounded-lg border border-green-500/50 bg-green-500/20 px-4 py-3 font-medium text-slate-900 dark:text-green-400 transition-colors hover:bg-green-500/30"
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
                <h3 className="font-semibold text-slate-900 dark:text-white">Vincular Pessoa</h3>
                <button
                  onClick={handleCloseModal}
                  className="text-slate-400 dark:text-slate-400 transition-colors hover:text-slate-900 dark:hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Campo de busca dentro do modal */}
              <div className="border-b border-gray-200 dark:border-slate-700 p-4">
                <div className="relative">
                  <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar por nome, email, telefone ou cargo..."
                    className="w-full rounded-lg border border-gray-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 py-3 pl-10 pr-10 text-slate-900 dark:text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                    autoFocus
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    >
                      <X size={18} />
                    </button>
                  )}
                </div>
              </div>

              {/* Resultados */}
              <div className="flex-1 overflow-y-auto p-4">
                {isLoadingPersons ? (
                  <div className="p-8 text-center text-sm text-slate-400 dark:text-slate-400">
                    Buscando pessoas...
                  </div>
                ) : !searchTerm.trim() ? (
                  <div className="p-8 text-center text-sm text-slate-400 dark:text-slate-400">
                    Digite o nome, email, telefone ou cargo para buscar
                  </div>
                ) : allPersons.length === 0 ? (
                  <div className="p-8 text-center text-sm text-slate-400 dark:text-slate-400">
                    Nenhuma pessoa encontrada com esse critério
                  </div>
                ) : (
                  <div className="space-y-2">
                    {allPersons.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => handleLinkPerson(p.id)}
                        className="w-full rounded-lg border border-gray-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 p-3 text-left transition-colors hover:bg-gray-200/50 dark:hover:bg-slate-700/50"
                      >
                        <p className="font-medium text-slate-900 dark:text-white">{p.name}</p>
                        {p.position && (
                          <p className="mt-1 text-xs text-slate-400 dark:text-slate-400">{p.position}</p>
                        )}
                        {(p.email_commercial || p.email) && (
                          <p className="mt-1 text-xs text-blue-400">
                            {p.email_commercial || p.email}
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

        {/* Modal de criar pessoa */}
        {showCreateModal && (
          <PersonModal
            isOpen={showCreateModal}
            onClose={() => setShowCreateModal(false)}
            onSave={handlePersonCreated}
            person={null}
          />
        )}
      </>
    );
  }

  // Se há pessoa vinculada - exibir read-only
  return (
    <>
      <ExpandableSection
        title="Informação de Contato (Pessoa)"
        defaultExpanded={false}
        icon={<User size={18} />}
      >
      {loading ? (
        <div className="py-4 text-center">
          <p className="text-sm text-slate-400 dark:text-slate-400">Carregando...</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Nome completo */}
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-sm font-medium text-slate-600 dark:text-slate-300">
              <User size={14} className="text-slate-400 dark:text-slate-400" />
              <span>Nome completo</span>
            </div>
            <div className="rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50/30 dark:bg-slate-900/30 px-3 py-2">
              <p className="text-slate-900 dark:text-white">{person?.name || "Não informado"}</p>
            </div>
          </div>

          {/* Cargo/Posição */}
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-sm font-medium text-slate-600 dark:text-slate-300">
              <Briefcase size={14} className="text-slate-400 dark:text-slate-400" />
              <span>Cargo/Posição</span>
            </div>
            <div className="rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50/30 dark:bg-slate-900/30 px-3 py-2">
              <p className={person?.position ? "text-slate-900 dark:text-white" : "italic text-slate-400 dark:text-slate-500"}>
                {person?.position || "Não informado"}
              </p>
            </div>
          </div>

          {/* E-mails */}
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-sm font-medium text-slate-600 dark:text-slate-300">
              <Mail size={14} className="text-slate-400 dark:text-slate-400" />
              <span>E-mails</span>
            </div>
            <div className="space-y-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50/30 dark:bg-slate-900/30 px-3 py-2">
              <div>
                <p className="text-xs text-slate-400 dark:text-slate-400">Principal</p>
                <p className={person?.email ? "text-sm text-blue-400" : "text-sm italic text-slate-400 dark:text-slate-500"}>
                  {person?.email || "Não informado"}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400 dark:text-slate-400">Comercial</p>
                <p className={person?.email_commercial ? "text-sm text-blue-400" : "text-sm italic text-slate-400 dark:text-slate-500"}>
                  {person?.email_commercial || "Não informado"}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400 dark:text-slate-400">Pessoal</p>
                <p className={person?.email_personal ? "text-sm text-blue-400" : "text-sm italic text-slate-400 dark:text-slate-500"}>
                  {person?.email_personal || "Não informado"}
                </p>
              </div>
            </div>
          </div>

          {/* Telefones */}
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-sm font-medium text-slate-600 dark:text-slate-300">
              <Phone size={14} className="text-slate-400 dark:text-slate-400" />
              <span>Telefones</span>
            </div>
            <div className="space-y-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50/30 dark:bg-slate-900/30 px-3 py-2">
              <div>
                <p className="text-xs text-slate-400 dark:text-slate-400">Principal</p>
                <p className={person?.phone ? "text-sm text-slate-900 dark:text-white" : "text-sm italic text-slate-400 dark:text-slate-500"}>
                  {formatPhone(person?.phone)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400 dark:text-slate-400">WhatsApp</p>
                <p className={person?.phone_whatsapp ? "text-sm text-slate-900 dark:text-white" : "text-sm italic text-slate-400 dark:text-slate-500"}>
                  {formatPhone(person?.phone_whatsapp)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400 dark:text-slate-400">Comercial</p>
                <p className={person?.phone_commercial ? "text-sm text-slate-900 dark:text-white" : "text-sm italic text-slate-400 dark:text-slate-500"}>
                  {formatPhone(person?.phone_commercial)}
                </p>
              </div>
            </div>
          </div>

          {/* Redes Sociais */}
          <div className="space-y-1">
            <div className="text-sm font-medium text-slate-600 dark:text-slate-300">Redes Sociais</div>
            <div className="space-y-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50/30 dark:bg-slate-900/30 px-3 py-2">
              <div>
                <p className="text-xs text-slate-400 dark:text-slate-400">LinkedIn</p>
                {person?.linkedin ? (
                  <a
                    href={person.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-sm text-blue-400 hover:underline"
                  >
                    <Linkedin size={14} />
                    Ver perfil
                  </a>
                ) : (
                  <p className="text-sm italic text-slate-400 dark:text-slate-500">Não informado</p>
                )}
              </div>
              <div>
                <p className="text-xs text-slate-400 dark:text-slate-400">Instagram</p>
                <p className={person?.instagram ? "text-sm text-slate-900 dark:text-white" : "text-sm italic text-slate-400 dark:text-slate-500"}>
                  {person?.instagram || "Não informado"}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400 dark:text-slate-400">Facebook</p>
                {person?.facebook ? (
                  <a
                    href={person.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-400 hover:underline"
                  >
                    Ver perfil
                  </a>
                ) : (
                  <p className="text-sm italic text-slate-400 dark:text-slate-500">Não informado</p>
                )}
              </div>
            </div>
          </div>

          {/* Ações */}
          <div className="space-y-2 border-t border-gray-200/50 dark:border-slate-700/50 pt-3">
            <ActionButton
              icon={<ExternalLink size={16} />}
              label="Modificar cadastro da pessoa"
              onClick={() => setShowEditModal(true)}
              variant="warning"
              className="w-full"
            />

            <ActionButton
              icon={<Trash2 size={16} />}
              label="Desvincular pessoa"
              onClick={handleUnlinkPerson}
              variant="danger"
              className="w-full"
            />
          </div>
        </div>
      )}
      </ExpandableSection>

      {/* Modal de editar pessoa */}
      {showEditModal && person && (
        <PersonModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSave={handlePersonEdited}
          person={person}
        />
      )}
    </>
  );
};

export default ContactSection;
