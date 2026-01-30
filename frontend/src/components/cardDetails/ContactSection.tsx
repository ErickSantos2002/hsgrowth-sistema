import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import { User, ExternalLink, Search, X, Trash2, Mail, Phone, Briefcase, Linkedin, MessageCircle } from "lucide-react";
import ExpandableSection from "./ExpandableSection";
import ActionButton from "./ActionButton";
import { Card } from "../../types";
import { Person } from "../../services/personService";
import personService from "../../services/personService";

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

  // Carrega dados da pessoa quando o card é carregado
  useEffect(() => {
    loadPersonData();
  }, [card]);

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
   * Carrega todas as pessoas quando abre o modal
   */
  const handleOpenModal = async () => {
    setShowModal(true);

    // Só carrega se ainda não carregou
    if (allPersons.length === 0) {
      try {
        setIsLoadingPersons(true);
        const response = await personService.list({ page_size: 100, is_active: true });
        setAllPersons(response.persons);
      } catch (error) {
        console.error("Erro ao carregar pessoas:", error);
        alert("Erro ao carregar lista de pessoas");
      } finally {
        setIsLoadingPersons(false);
      }
    }
  };

  /**
   * Filtra pessoas localmente com base no termo de busca
   */
  const filteredPersons = allPersons.filter((p) => {
    if (!searchTerm.trim()) return true;

    const search = searchTerm.toLowerCase().trim();

    // Busca em nome
    const matchesName = p.name
      ? p.name.toLowerCase().includes(search)
      : false;

    // Busca em cargo
    const matchesPosition = p.position
      ? p.position.toLowerCase().includes(search)
      : false;

    // Busca em emails
    const matchesEmail =
      (p.email && p.email.toLowerCase().includes(search)) ||
      (p.email_commercial && p.email_commercial.toLowerCase().includes(search)) ||
      (p.email_personal && p.email_personal.toLowerCase().includes(search));

    // Busca em telefones
    const cleanSearch = searchTerm.replace(/\D/g, "");
    const matchesPhone = cleanSearch.length > 0 && (
      (p.phone && p.phone.replace(/\D/g, "").includes(cleanSearch)) ||
      (p.phone_commercial && p.phone_commercial.replace(/\D/g, "").includes(cleanSearch)) ||
      (p.phone_whatsapp && p.phone_whatsapp.replace(/\D/g, "").includes(cleanSearch))
    );

    return matchesName || matchesPosition || matchesEmail || matchesPhone;
  });

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
      alert("Erro ao vincular pessoa. Verifique o console para mais detalhes.");
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
      alert("Erro ao desvincular pessoa");
    }
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
            <p className="text-sm text-slate-400 text-center py-2">
              Nenhuma pessoa vinculada a este negócio
            </p>

            {/* Botão para abrir modal */}
            <button
              onClick={handleOpenModal}
              className="w-full px-4 py-3 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/50 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              <ExternalLink size={16} />
              Vincular pessoa
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
                <h3 className="font-semibold text-white">Vincular Pessoa</h3>
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
                    placeholder="Buscar por nome, email, telefone ou cargo..."
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
                {isLoadingPersons ? (
                  <div className="p-8 text-center text-sm text-slate-400">
                    Carregando pessoas...
                  </div>
                ) : filteredPersons.length === 0 ? (
                  <div className="p-8 text-center text-sm text-slate-400">
                    {searchTerm
                      ? "Nenhuma pessoa encontrada com esse critério"
                      : allPersons.length === 0
                      ? "Nenhuma pessoa cadastrada"
                      : "Digite para buscar"}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredPersons.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => handleLinkPerson(p.id)}
                        className="w-full p-3 bg-slate-900/50 hover:bg-slate-700/50 border border-slate-700 rounded-lg text-left transition-colors"
                      >
                        <p className="font-medium text-white">{p.name}</p>
                        {p.position && (
                          <p className="text-xs text-slate-400 mt-1">{p.position}</p>
                        )}
                        {(p.email_commercial || p.email) && (
                          <p className="text-xs text-blue-400 mt-1">
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
      </>
    );
  }

  // Se há pessoa vinculada - exibir read-only
  return (
    <ExpandableSection
      title="Informação de Contato (Pessoa)"
      defaultExpanded={false}
      icon={<User size={18} />}
    >
      {loading ? (
        <div className="text-center py-4">
          <p className="text-sm text-slate-400">Carregando...</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Nome completo */}
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-sm font-medium text-slate-300">
              <User size={14} className="text-slate-400" />
              <span>Nome completo</span>
            </div>
            <div className="px-3 py-2 bg-slate-900/30 border border-slate-700 rounded-lg">
              <p className="text-white">{person?.name || "Não informado"}</p>
            </div>
          </div>

          {/* Cargo/Posição */}
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-sm font-medium text-slate-300">
              <Briefcase size={14} className="text-slate-400" />
              <span>Cargo/Posição</span>
            </div>
            <div className="px-3 py-2 bg-slate-900/30 border border-slate-700 rounded-lg">
              <p className={person?.position ? "text-white" : "text-slate-500 italic"}>
                {person?.position || "Não informado"}
              </p>
            </div>
          </div>

          {/* E-mails */}
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-sm font-medium text-slate-300">
              <Mail size={14} className="text-slate-400" />
              <span>E-mails</span>
            </div>
            <div className="px-3 py-2 bg-slate-900/30 border border-slate-700 rounded-lg space-y-2">
              <div>
                <p className="text-xs text-slate-400">Comercial</p>
                <p className={person?.email_commercial ? "text-blue-400 text-sm" : "text-slate-500 italic text-sm"}>
                  {person?.email_commercial || "Não informado"}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Pessoal</p>
                <p className={person?.email_personal ? "text-blue-400 text-sm" : "text-slate-500 italic text-sm"}>
                  {person?.email_personal || "Não informado"}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Alternativo</p>
                <p className={person?.email_alternative ? "text-blue-400 text-sm" : "text-slate-500 italic text-sm"}>
                  {person?.email_alternative || "Não informado"}
                </p>
              </div>
            </div>
          </div>

          {/* Telefones */}
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-sm font-medium text-slate-300">
              <Phone size={14} className="text-slate-400" />
              <span>Telefones</span>
            </div>
            <div className="px-3 py-2 bg-slate-900/30 border border-slate-700 rounded-lg space-y-2">
              <div>
                <p className="text-xs text-slate-400">WhatsApp</p>
                <p className={person?.phone_whatsapp ? "text-white text-sm" : "text-slate-500 italic text-sm"}>
                  {formatPhone(person?.phone_whatsapp)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Comercial</p>
                <p className={person?.phone_commercial ? "text-white text-sm" : "text-slate-500 italic text-sm"}>
                  {formatPhone(person?.phone_commercial)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Alternativo</p>
                <p className={person?.phone_alternative ? "text-white text-sm" : "text-slate-500 italic text-sm"}>
                  {formatPhone(person?.phone_alternative)}
                </p>
              </div>
            </div>
          </div>

          {/* Redes Sociais */}
          <div className="space-y-1">
            <div className="text-sm font-medium text-slate-300">Redes Sociais</div>
            <div className="px-3 py-2 bg-slate-900/30 border border-slate-700 rounded-lg space-y-2">
              <div>
                <p className="text-xs text-slate-400">LinkedIn</p>
                {person?.linkedin ? (
                  <a
                    href={person.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 text-sm hover:underline flex items-center gap-1"
                  >
                    <Linkedin size={14} />
                    Ver perfil
                  </a>
                ) : (
                  <p className="text-slate-500 italic text-sm">Não informado</p>
                )}
              </div>
              <div>
                <p className="text-xs text-slate-400">Instagram</p>
                <p className={person?.instagram ? "text-white text-sm" : "text-slate-500 italic text-sm"}>
                  {person?.instagram || "Não informado"}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Facebook</p>
                {person?.facebook ? (
                  <a
                    href={person.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 text-sm hover:underline"
                  >
                    Ver perfil
                  </a>
                ) : (
                  <p className="text-slate-500 italic text-sm">Não informado</p>
                )}
              </div>
            </div>
          </div>

          {/* Ações */}
          <div className="pt-3 border-t border-slate-700/50 space-y-2">
            <ActionButton
              icon={<ExternalLink size={16} />}
              label="Ver página completa da pessoa"
              onClick={() => alert(`Navegar para /persons/${person?.id} - será implementado`)}
              variant="primary"
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
  );
};

export default ContactSection;
