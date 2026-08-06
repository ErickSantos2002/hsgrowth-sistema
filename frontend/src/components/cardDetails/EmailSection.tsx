import React, { useState, useEffect, useRef } from "react";
import { Mail, Plus, Send, Loader2, X, ChevronDown, FileText, Paperclip, File } from "lucide-react";
import { BaseModal, Button, FormField, Input, Textarea, Alert } from "../common";
import cardService from "../../services/cardService";
import cardTaskService, { CardTask } from "../../services/cardTaskService";
import emailTemplateService, { EmailTemplate } from "../../services/emailTemplateService";
import { showSuccess, showError } from "../../utils/toast";
import { useAuth } from "../../context/AuthContext";

interface EmailSectionProps {
  cardId: number;
  personId: number | null;
  onUpdate: () => void;
  onCountChange?: (count: number) => void;
  /** Quando informado, abre o modal automaticamente e vincula o envio a essa task (cadência) */
  pendingTaskId?: number;
  onModalClose?: () => void;
}

interface AttachmentItem {
  name: string;
  content_type: string;
  data_base64: string;
  size: number; // bytes, só para exibição
}

// Dados do card para resolução de variáveis — carregados sob demanda
interface CardVars {
  titulo_card: string;
  valor_card: string;
  empresa: string;
  nome_contato: string;
}

const formatRelativeTime = (dateStr: string) => {
  const date = new Date(dateStr + (dateStr.endsWith("Z") ? "" : "Z"));
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return "Agora mesmo";
  if (diffMins < 60) return `${diffMins} min atrás`;
  if (diffHours < 24) return `${diffHours}h atrás`;
  if (diffDays === 1) return "Ontem";
  if (diffDays < 7) return `${diffDays} dias atrás`;
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
};

const resolveVars = (text: string, vars: Partial<CardVars> & { nome_vendedor?: string }): string =>
  text
    .replace(/\{\{nome_contato\}\}/g, vars.nome_contato || "")
    .replace(/\{\{empresa\}\}/g, vars.empresa || "")
    .replace(/\{\{nome_vendedor\}\}/g, vars.nome_vendedor || "")
    .replace(/\{\{titulo_card\}\}/g, vars.titulo_card || "")
    .replace(/\{\{valor_card\}\}/g, vars.valor_card || "");

const MAX_ATTACHMENT_BYTES = 24 * 1024 * 1024; // 24 MB por arquivo

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const EmailSection: React.FC<EmailSectionProps> = ({ cardId, personId, onUpdate, onCountChange, pendingTaskId, onModalClose }) => {
  const { user } = useAuth();
  const [emails, setEmails] = useState<CardTask[]>([]);
  const [loadingEmails, setLoadingEmails] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  // Modal de envio
  const [showModal, setShowModal] = useState(false);
  const [to, setTo] = useState<string[]>([""]);
  const [loadingTo, setLoadingTo] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const sendingRef = useRef(false);

  // Anexos
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Templates
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [showTemplateDropdown, setShowTemplateDropdown] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  const loadEmails = async () => {
    try {
      setLoadingEmails(true);
      const result = await cardTaskService.list({
        card_id: cardId,
        task_type: "email",
        is_completed: true,
        page_size: 100,
      });
      setEmails(result.tasks);
      onCountChange?.(result.tasks.length);
    } catch {
      // silencioso
    } finally {
      setLoadingEmails(false);
    }
  };

  useEffect(() => {
    loadEmails();
  }, [cardId]);

  // Abre o modal automaticamente quando vem do Foco com uma task pendente
  useEffect(() => {
    if (pendingTaskId) {
      handleOpenModal();
    }
  }, [pendingTaskId]);

  const loadTemplates = async () => {
    if (templates.length > 0) return;
    setLoadingTemplates(true);
    try {
      const data = await emailTemplateService.list();
      setTemplates(data);
    } catch {
      // silencioso
    } finally {
      setLoadingTemplates(false);
    }
  };

  // Monta variáveis do card para resolver no template
  const buildCardVars = async (): Promise<Partial<CardVars>> => {
    const vars: Partial<CardVars> = {};
    try {
      const { default: cardServiceFull } = await import("../../services/cardService");
      const card = await cardServiceFull.getById(cardId);
      vars.titulo_card = card.title || "";
      vars.valor_card = card.value
        ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(card.value)
        : "";
      vars.empresa = card.client_name || card.client?.name || "";
    } catch {
      // ignora se não conseguir carregar
    }
    if (personId) {
      try {
        const { default: personService } = await import("../../services/personService");
        const p = await personService.getById(personId);
        vars.nome_contato = p.name || "";
      } catch {
        // ignora
      }
    }
    return vars;
  };

  // Pré-preenche destinatários ao abrir o modal
  const handleOpenModal = () => {
    setSubject("");
    setBody("");
    setAttachments([]);
    setTo([""]);
    setShowModal(true);
    loadTemplates();

    // Busca os e-mails da pessoa em background após abrir o modal
    if (personId) {
      setLoadingTo(true);
      import("../../services/personService").then(({ default: personService }) =>
        personService.getById(personId)
      ).then((p) => {
        const emailList = [p.email, p.email_commercial, p.email_personal].filter(Boolean) as string[];
        setTo(emailList.length > 0 ? emailList : [""]);
      }).catch(() => {
        setTo([""]);
      }).finally(() => {
        setLoadingTo(false);
      });
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      if (file.size > MAX_ATTACHMENT_BYTES) {
        showError(`"${file.name}" excede o limite de 24 MB.`);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(",")[1];
        setAttachments(prev => [...prev, {
          name: file.name,
          content_type: file.type || "application/octet-stream",
          data_base64: base64,
          size: file.size,
        }]);
      };
      reader.readAsDataURL(file);
    });
    // Limpa o input para permitir selecionar o mesmo arquivo novamente
    e.target.value = "";
  };

  const applyTemplate = async (tpl: EmailTemplate) => {
    setShowTemplateDropdown(false);
    const cardVars = await buildCardVars();
    const vars = { ...cardVars, nome_vendedor: user?.name || "" };
    setSubject(resolveVars(tpl.subject, vars));
    setBody(resolveVars(tpl.body, vars));
  };

  const handleSend = async () => {
    if (sendingRef.current) return;
    const validTo = to.filter((e) => e.trim());
    if (!validTo.length) { showError("Informe ao menos um destinatário."); return; }
    if (!subject.trim()) { showError("Informe o assunto."); return; }
    if (!body.trim()) { showError("Informe o corpo do e-mail."); return; }

    sendingRef.current = true;
    setSending(true);
    try {
      await cardService.sendEmail(
        cardId,
        validTo,
        subject,
        body.replace(/\n/g, "<br>"),
        attachments.length > 0 ? attachments.map(({ name, content_type, data_base64 }) => ({ name, content_type, data_base64 })) : undefined,
        pendingTaskId,
      );
      showSuccess("E-mail enviado e registrado!");
      setShowModal(false);
      onModalClose?.();
      await loadEmails();
      onUpdate();
    } catch (err: any) {
      showError(err?.response?.data?.detail || "Erro ao enviar e-mail.");
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Botão principal */}
      <button
        onClick={handleOpenModal}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-blue-500/40 bg-blue-500/15 px-4 py-3 text-blue-300 transition-colors hover:bg-blue-500/25 hover:text-blue-200"
      >
        <Plus size={18} />
        <span>Enviar E-mail</span>
      </button>

      {/* Lista de e-mails enviados */}
      {loadingEmails ? (
        <div className="flex items-center justify-center py-8 text-slate-400">
          <Loader2 size={20} className="animate-spin" />
        </div>
      ) : emails.length === 0 ? (
        <div className="rounded-lg border border-gray-200/50 dark:border-slate-700/50 bg-gray-100/30 dark:bg-slate-800/30 p-8 text-center">
          <Mail size={32} className="mx-auto mb-2 text-slate-600" />
          <p className="text-sm text-slate-400">Nenhum e-mail enviado ainda</p>
          <p className="mt-1 text-xs text-slate-500">
            E-mails enviados pelo CRM aparecerão aqui
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {emails.map((email) => (
            <div
              key={email.id}
              className="rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-100/50 dark:bg-slate-800/50 p-4 transition-colors hover:bg-slate-700/30"
            >
              <div className="mb-2 flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 text-xs font-medium text-white">
                    {(email.assigned_to_name || "?").substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">
                      {email.assigned_to_name || "Usuário"}
                    </p>
                    <p className="text-xs text-slate-400">
                      {email.completed_at ? formatRelativeTime(email.completed_at) : formatRelativeTime(email.created_at)}
                    </p>
                  </div>
                </div>
                <span className="flex items-center gap-1 rounded-full border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-400">
                  <Mail size={10} />
                  E-mail
                </span>
              </div>

              {/* Assunto */}
              <p className="mb-1 text-sm font-medium text-slate-900 dark:text-white">
                {email.title}
              </p>

              {/* Para */}
              {email.contact_name && (
                <p className="mb-1 text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-medium text-slate-600 dark:text-slate-300">Para:</span> {email.contact_name}
                </p>
              )}

              {/* Corpo do e-mail */}
              {email.description && (() => {
                const isExpanded = expandedIds.has(email.id);
                const isLong = email.description.length > 200;
                return (
                  <div>
                    <p className={`text-sm text-slate-400 whitespace-pre-wrap ${!isExpanded && isLong ? "line-clamp-2" : ""}`}>
                      {email.description}
                    </p>
                    {isLong && (
                      <button
                        onClick={() => setExpandedIds(prev => {
                          const next = new Set(prev);
                          isExpanded ? next.delete(email.id) : next.add(email.id);
                          return next;
                        })}
                        className="mt-1 text-xs text-blue-400 hover:text-blue-300"
                      >
                        {isExpanded ? "Ver menos" : "Ver mais"}
                      </button>
                    )}
                  </div>
                );
              })()}

              {/* Anexos */}
              {email.notes && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {email.notes.split(", ").map((name, i) => (
                    <span key={i} className="flex items-center gap-1 rounded border border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 text-xs text-slate-600 dark:text-slate-300">
                      <Paperclip size={10} />
                      {name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <BaseModal
        isOpen={showModal}
        onClose={() => { if (!sending) { setShowModal(false); onModalClose?.(); } }}
        title="Enviar E-mail"
        subtitle="Enviado via Microsoft 365"
        size="lg"
        footer={
          <div className="flex items-center justify-end gap-3">
            <Button variant="secondary" onClick={() => { setShowModal(false); onModalClose?.(); }} disabled={sending}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleSend} disabled={sending || loadingTo}>
              {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              {sending ? "Enviando..." : "Enviar"}
            </Button>
          </div>
        }
      >
        <div className="space-y-5">
          {/* Aviso SSO */}
          <Alert type="info">
            Enviado da sua caixa Microsoft 365. Requer login via <strong>Entrar com Microsoft</strong>.
          </Alert>

          {/* Seletor de template */}
          <FormField label="Template" hint="Opcional — preenche assunto e mensagem automaticamente">
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowTemplateDropdown(v => !v)}
                className="flex w-full items-center justify-between rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-slate-500 transition-colors hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400 dark:hover:bg-slate-700"
              >
                <span className="flex items-center gap-2">
                  <FileText size={14} />
                  Usar template
                </span>
                <ChevronDown size={14} className={`transition-transform ${showTemplateDropdown ? "rotate-180" : ""}`} />
              </button>

              {showTemplateDropdown && (
                <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-52 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
                  {loadingTemplates ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 size={16} className="animate-spin text-slate-400" />
                    </div>
                  ) : templates.length === 0 ? (
                    <p className="px-4 py-3 text-sm text-slate-400">Nenhum template cadastrado.</p>
                  ) : (
                    templates.map(tpl => (
                      <button
                        key={tpl.id}
                        type="button"
                        onClick={() => applyTemplate(tpl)}
                        className="w-full px-4 py-2.5 text-left transition-colors hover:bg-gray-100 dark:hover:bg-slate-800"
                      >
                        <p className="text-sm font-medium text-slate-900 dark:text-white">{tpl.name}</p>
                        <p className="truncate text-xs text-slate-400">{tpl.subject}</p>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </FormField>

          {/* Destinatários */}
          <FormField label="Para" required>
            <div className="space-y-2">
              {loadingTo ? (
                <div className="flex items-center gap-2 rounded-lg border border-gray-200 dark:border-slate-700 px-3 py-2 text-sm text-slate-400 dark:text-slate-500">
                  <Loader2 size={14} className="animate-spin" />
                  Buscando e-mails do contato...
                </div>
              ) : (
                <>
                  {to.map((addr, idx) => (
                    <div key={idx} className="flex gap-2">
                      <Input
                        type="email"
                        value={addr}
                        onChange={(e) => {
                          const updated = [...to];
                          updated[idx] = e.target.value;
                          setTo(updated);
                        }}
                        placeholder="email@exemplo.com"
                        className="flex-1"
                      />
                      {to.length > 1 && (
                        <button
                          onClick={() => setTo(to.filter((_, i) => i !== idx))}
                          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-500/10 hover:text-red-400"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={() => setTo([...to, ""])}
                    className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
                  >
                    <Plus size={14} /> Adicionar destinatário
                  </button>
                </>
              )}
            </div>
          </FormField>

          {/* Assunto */}
          <FormField label="Assunto" required>
            <Input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Assunto do e-mail"
            />
          </FormField>

          {/* Mensagem */}
          <FormField label="Mensagem" required>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Escreva sua mensagem..."
              rows={6}
            />
          </FormField>

          {/* Anexos */}
          <FormField label="Anexos" hint="Máximo 24 MB por arquivo">
            <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileSelect} />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm text-slate-500 transition-colors hover:bg-gray-100 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              <Paperclip size={15} />
              Selecionar arquivo
            </button>
            {attachments.length > 0 && (
              <div className="mt-2 space-y-1">
                {attachments.map((att, idx) => (
                  <div key={idx} className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 dark:border-slate-700 dark:bg-slate-800">
                    <div className="flex min-w-0 items-center gap-2">
                      <File size={14} className="shrink-0 text-slate-400" />
                      <span className="truncate text-xs text-slate-700 dark:text-slate-300">{att.name}</span>
                      <span className="shrink-0 text-xs text-slate-400">({formatBytes(att.size)})</span>
                    </div>
                    <button
                      onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))}
                      className="ml-2 shrink-0 rounded p-1 text-slate-400 transition-colors hover:bg-red-500/10 hover:text-red-400"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </FormField>

          {/* Preview da assinatura */}
          {user?.email_signature && (
            <div className="overflow-hidden rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/50">
              <p className="mb-2 text-xs text-slate-400">Assinatura (adicionada automaticamente)</p>
              <div
                className="max-w-full text-sm text-slate-900 [&_img]:max-w-full [&_table]:max-w-full [&_td]:max-w-full"
                style={{ overflowX: "hidden" }}
                dangerouslySetInnerHTML={{ __html: user.email_signature }}
              />
            </div>
          )}
        </div>
      </BaseModal>
    </div>
  );
};

export default EmailSection;
