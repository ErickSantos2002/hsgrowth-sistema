import React from "react";
import { User, Mail, Phone, Briefcase, Linkedin, MessageCircle } from "lucide-react";
import ExpandableSection from "./ExpandableSection";
import EditableField from "./EditableField";
import { Card } from "../../types";
import cardService from "../../services/cardService";

interface ContactSectionProps {
  card: Card;
  onUpdate: () => void;
}

/**
 * Seção "Informação de Contato (Pessoa)" - Dados da pessoa de contato
 * Terceira seção da coluna esquerda, expandida por padrão
 */
const ContactSection: React.FC<ContactSectionProps> = ({ card, onUpdate }) => {
  /**
   * Atualiza campo de contato
   */
  const handleUpdateContactField = async (field: string, value: string) => {
    try {
      await cardService.update(card.id, {
        contact_info: {
          ...card.contact_info,
          [field]: value,
        },
      });
      onUpdate();
    } catch (error) {
      console.error(`Erro ao atualizar ${field}:`, error);
      alert(`Erro ao atualizar ${field}`);
    }
  };

  /**
   * Formata telefone brasileiro
   */
  const formatPhone = (phone: string | undefined) => {
    if (!phone) return "";
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

  return (
    <ExpandableSection
      title="Informação de Contato (Pessoa)"
      defaultExpanded={false}
      icon={<User size={18} />}
    >
      <div className="space-y-4">
        {/* Nome completo */}
        <EditableField
          label="Nome completo"
          value={card.contact_info?.name}
          onSave={(value) => handleUpdateContactField("name", value)}
          type="text"
          placeholder="Nome da pessoa"
          icon={<User size={14} />}
        />

        {/* Cargo/Posição */}
        <EditableField
          label="Cargo/Posição"
          value={card.contact_info?.position}
          onSave={(value) => handleUpdateContactField("position", value)}
          type="text"
          placeholder="Ex: Gerente de Compras"
          icon={<Briefcase size={14} />}
        />

        {/* Divisor: E-mails */}
        <div className="pt-3 border-t border-slate-700/50">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
            E-mails
          </h4>

          <div className="space-y-3">
            <EditableField
              label="E-mail comercial"
              value={card.contact_info?.email_commercial || card.contact_info?.email}
              onSave={(value) => handleUpdateContactField("email_commercial", value)}
              type="email"
              placeholder="email@empresa.com"
              icon={<Mail size={14} />}
            />

            <EditableField
              label="E-mail pessoal"
              value={card.contact_info?.email_personal}
              onSave={(value) => handleUpdateContactField("email_personal", value)}
              type="email"
              placeholder="email@pessoal.com"
              icon={<Mail size={14} />}
            />

            <EditableField
              label="E-mail alternativo"
              value={card.contact_info?.email_alternative}
              onSave={(value) => handleUpdateContactField("email_alternative", value)}
              type="email"
              placeholder="outro@email.com"
              icon={<Mail size={14} />}
            />
          </div>
        </div>

        {/* Divisor: Telefones */}
        <div className="pt-3 border-t border-slate-700/50">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
            Telefones
          </h4>

          <div className="space-y-3">
            <EditableField
              label="Telefone comercial"
              value={card.contact_info?.phone_commercial || card.contact_info?.phone}
              onSave={(value) => handleUpdateContactField("phone_commercial", value)}
              type="tel"
              placeholder="(00) 0000-0000"
              icon={<Phone size={14} />}
              format={formatPhone}
            />

            <EditableField
              label="Celular/WhatsApp"
              value={card.contact_info?.phone_whatsapp}
              onSave={(value) => handleUpdateContactField("phone_whatsapp", value)}
              type="tel"
              placeholder="(00) 00000-0000"
              icon={<MessageCircle size={14} />}
              format={formatPhone}
            />

            <EditableField
              label="Telefone alternativo"
              value={card.contact_info?.phone_alternative}
              onSave={(value) => handleUpdateContactField("phone_alternative", value)}
              type="tel"
              placeholder="(00) 00000-0000"
              icon={<Phone size={14} />}
              format={formatPhone}
            />
          </div>
        </div>

        {/* Divisor: Redes Sociais */}
        <div className="pt-3 border-t border-slate-700/50">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
            Redes Sociais
          </h4>

          <div className="space-y-3">
            <EditableField
              label="LinkedIn"
              value={card.contact_info?.linkedin}
              onSave={(value) => handleUpdateContactField("linkedin", value)}
              type="url"
              placeholder="https://linkedin.com/in/perfil"
              icon={<Linkedin size={14} />}
            />

            <EditableField
              label="Instagram"
              value={card.contact_info?.instagram}
              onSave={(value) => handleUpdateContactField("instagram", value)}
              type="text"
              placeholder="@usuario"
            />

            <EditableField
              label="Facebook"
              value={card.contact_info?.facebook}
              onSave={(value) => handleUpdateContactField("facebook", value)}
              type="url"
              placeholder="https://facebook.com/perfil"
            />
          </div>
        </div>
      </div>
    </ExpandableSection>
  );
};

export default ContactSection;
