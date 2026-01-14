import React, { useState, useEffect } from "react";
import { X, DollarSign, Calendar, User, Mail, Phone, Building } from "lucide-react";
import { Card, List } from "../../types";

interface CardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CardFormData) => void;
  card?: Card | null;
  lists: List[];
  currentListId: number;
  title: string;
}

export interface CardFormData {
  list_id: number;
  title: string;
  description?: string;
  value?: number;
  due_date?: string;
  contact_info?: {
    name?: string;
    email?: string;
    phone?: string;
    company?: string;
  };
}

const CardModal: React.FC<CardModalProps> = ({
  isOpen,
  onClose,
  onSave,
  card,
  lists,
  currentListId,
  title,
}) => {
  const [formData, setFormData] = useState<CardFormData>({
    list_id: currentListId,
    title: "",
    description: "",
    value: undefined,
    due_date: "",
    contact_info: {
      name: "",
      email: "",
      phone: "",
      company: "",
    },
  });

  useEffect(() => {
    if (card) {
      setFormData({
        list_id: card.list_id,
        title: card.title,
        description: card.description || "",
        value: card.value || undefined,
        due_date: card.due_date || "",
        contact_info: {
          name: card.contact_info?.name || "",
          email: card.contact_info?.email || "",
          phone: card.contact_info?.phone || "",
          company: card.contact_info?.company || "",
        },
      });
    } else {
      setFormData({
        list_id: currentListId,
        title: "",
        description: "",
        value: undefined,
        due_date: "",
        contact_info: {
          name: "",
          email: "",
          phone: "",
          company: "",
        },
      });
    }
  }, [card, currentListId, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    // Limpar campos vazios de contact_info
    const cleanedContactInfo = Object.fromEntries(
      Object.entries(formData.contact_info || {}).filter(([_, v]) => v)
    );

    onSave({
      ...formData,
      title: formData.title.trim(),
      contact_info: Object.keys(cleanedContactInfo).length > 0 ? cleanedContactInfo : undefined,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 m-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 sticky top-0 bg-gray-800 pb-4 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">{title}</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Lista */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Lista
            </label>
            <select
              value={formData.list_id}
              onChange={(e) =>
                setFormData({ ...formData, list_id: Number(e.target.value) })
              }
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {lists.map((list) => (
                <option key={list.id} value={list.id}>
                  {list.name}
                </option>
              ))}
            </select>
          </div>

          {/* Título */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Título *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              placeholder="Ex: Proposta - Empresa XYZ"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Descrição
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Detalhes sobre a oportunidade..."
              rows={4}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Valor e Data em linha */}
          <div className="grid grid-cols-2 gap-4">
            {/* Valor */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <DollarSign size={16} className="inline mr-1" />
                Valor (R$)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.value || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    value: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
                placeholder="0,00"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Data de vencimento */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <Calendar size={16} className="inline mr-1" />
                Vencimento
              </label>
              <input
                type="date"
                value={formData.due_date}
                onChange={(e) =>
                  setFormData({ ...formData, due_date: e.target.value })
                }
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Informações de Contato */}
          <div className="border-t border-gray-700 pt-6">
            <h3 className="text-sm font-medium text-gray-300 mb-4">
              Informações de Contato
            </h3>

            <div className="space-y-4">
              {/* Nome do contato */}
              <div>
                <label className="block text-xs text-gray-400 mb-1">
                  <User size={14} className="inline mr-1" />
                  Nome
                </label>
                <input
                  type="text"
                  value={formData.contact_info?.name || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      contact_info: {
                        ...formData.contact_info,
                        name: e.target.value,
                      },
                    })
                  }
                  placeholder="Nome do contato"
                  className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Email */}
                <div>
                  <label className="block text-xs text-gray-400 mb-1">
                    <Mail size={14} className="inline mr-1" />
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.contact_info?.email || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        contact_info: {
                          ...formData.contact_info,
                          email: e.target.value,
                        },
                      })
                    }
                    placeholder="email@exemplo.com"
                    className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Telefone */}
                <div>
                  <label className="block text-xs text-gray-400 mb-1">
                    <Phone size={14} className="inline mr-1" />
                    Telefone
                  </label>
                  <input
                    type="tel"
                    value={formData.contact_info?.phone || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        contact_info: {
                          ...formData.contact_info,
                          phone: e.target.value,
                        },
                      })
                    }
                    placeholder="(11) 98765-4321"
                    className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Empresa */}
              <div>
                <label className="block text-xs text-gray-400 mb-1">
                  <Building size={14} className="inline mr-1" />
                  Empresa
                </label>
                <input
                  type="text"
                  value={formData.contact_info?.company || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      contact_info: {
                        ...formData.contact_info,
                        company: e.target.value,
                      },
                    })
                  }
                  placeholder="Nome da empresa"
                  className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Botões */}
          <div className="flex gap-3 pt-4 sticky bottom-0 bg-gray-800 border-t border-gray-700 -mx-6 px-6 pb-0">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!formData.title.trim()}
              className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {card ? "Salvar" : "Criar Card"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CardModal;
