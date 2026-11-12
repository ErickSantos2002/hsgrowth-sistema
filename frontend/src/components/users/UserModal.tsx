import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Upload, X, User as UserIcon } from "lucide-react";
import BaseModal from "../common/BaseModal";
import { FormField, Input, Button } from "../common";
import userService from "../../services/userService";
import avatarService from "../../services/avatarService";
import { User, CreateUserRequest, UpdateUserRequest } from "../../types";
import FormularioDeAcesso from "../acessos/FormularioDeAcesso";
import type { ModoAcesso } from "../../services/acessosService";
import parceriasService, { mensagemDeErro, type Hunter, type HunterForm, type Parceiro } from "../../services/parceriasService";
import { erroDoCampo, mascarar } from "../parcerias/campos";
import { maskCPF, limparDocumento } from "../../utils/formatters";
import { useConfirm } from "../../contexts/ConfirmContext";
import { showSuccess, showError, showWarning } from "../../utils/toast";

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  user?: User | null;
}

const UserModal: React.FC<UserModalProps> = ({ isOpen, onClose, onSave, user }) => {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [modo, setModo] = useState<ModoAcesso>("convite");
  const [password, setPassword] = useState("");
  const [roleId, setRoleId] = useState(3);
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  // Erros por campo — exibidos inline em vez de toast
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Estados do avatar
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isEditing = !!user;

  const { confirm } = useConfirm();

  // Os ids de Financeiro, Parceiro e Hunter dependem do banco; vêm da API.
  const [perfis, setPerfis] = useState<{ id: number; name: string }[]>([]);
  const idDoPerfil = (nome: string) => perfis.find((p) => p.name === nome)?.id ?? null;
  const idFinanceiro = idDoPerfil("finance");
  const idParceiro = idDoPerfil("partner");
  const idHunter = idDoPerfil("hunter");

  // Hunter: ficha no Programa de Parceiros (CPF ou CNPJ e PIX).
  const [tipoHunter, setTipoHunter] = useState<"pessoa" | "empresa">("pessoa");
  const [documento, setDocumento] = useState("");
  const [pixKey, setPixKey] = useState("");
  // Parceiro: o login fica preso a uma empresa do board de Aquisição.
  const [empresas, setEmpresas] = useState<Parceiro[]>([]);
  const [empresaId, setEmpresaId] = useState("");
  // Edição de hunter: a ficha dele, para bloquear/desbloquear.
  const [fichaHunter, setFichaHunter] = useState<Hunter | null>(null);
  const [bloqueando, setBloqueando] = useState(false);

  const criandoHunter = !isEditing && idHunter !== null && roleId === idHunter;
  const criandoParceiro = !isEditing && idParceiro !== null && roleId === idParceiro;
  const criandoExterno = criandoHunter || criandoParceiro;

  useEffect(() => {
    if (!isOpen) return;
    userService
      .listarPerfis()
      .then(setPerfis)
      .catch(() => setPerfis([]));
  }, [isOpen]);

  useEffect(() => {
    if (!criandoParceiro) return;
    parceriasService
      .listarParceiros()
      .then((lista) => setEmpresas(lista.filter((p) => p.kind !== "hunter" && p.stage !== "bloqueado")))
      .catch(() => setEmpresas([]));
  }, [criandoParceiro]);

  const carregarFichaHunter = async () => {
    if (!user?.partner_id) return;
    try {
      const hunters = await parceriasService.listarHunters();
      setFichaHunter(hunters.find((h) => h.id === user.partner_id) ?? null);
    } catch {
      setFichaHunter(null);
    }
  };

  useEffect(() => {
    setFichaHunter(null);
    if (isOpen && isEditing && user?.role === "hunter") carregarFichaHunter();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, isEditing, user?.id, user?.role]);

  const alternarBloqueioHunter = async () => {
    if (!fichaHunter) return;
    const bloqueado = fichaHunter.stage === "bloqueado";
    if (!bloqueado) {
      const ok = await confirm({
        title: "Bloquear hunter",
        message: "Os acessos deste hunter serão desativados. As empresas que ele indicou continuam funcionando.",
        confirmText: "Bloquear",
        isDanger: true,
      });
      if (!ok) return;
    }
    setBloqueando(true);
    try {
      if (bloqueado) await parceriasService.desbloquear(fichaHunter.id);
      else await parceriasService.bloquear(fichaHunter.id);
      showSuccess(bloqueado ? "Hunter desbloqueado." : "Hunter bloqueado.");
      await carregarFichaHunter();
      onSave();
    } catch (err) {
      showError(mensagemDeErro(err, bloqueado ? "Erro ao desbloquear o hunter." : "Erro ao bloquear o hunter."));
    } finally {
      setBloqueando(false);
    }
  };

  useEffect(() => {
    if (isEditing && user) {
      setEmail(user.email);
      setName(user.name);
      setUsername(user.username || "");
      setPhone(user.phone || "");
      setRoleId(user.role_id);
      setIsActive(user.is_active);
    } else {
      resetForm();
    }
  }, [user, isEditing]);

  const resetForm = () => {
    setEmail("");
    setName("");
    setUsername("");
    setPhone("");
    setModo("convite");
    setPassword("");
    setRoleId(3);
    setIsActive(true);
    setAvatarFile(null);
    setAvatarPreview(null);
    setErrors({});
    setTipoHunter("pessoa");
    setDocumento("");
    setPixKey("");
    setEmpresaId("");
  };

  const limparErro = (campo: string) =>
    setErrors((p) => { const n = { ...p }; delete n[campo]; return n; });

  /**
   * Manipula seleção de arquivo de avatar
   */
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar arquivo
    const validation = avatarService.validateAvatar(file);
    if (!validation.valid) {
      showWarning(validation.error || "Arquivo inválido");
      return;
    }

    // Criar preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    setAvatarFile(file);
  };

  /**
   * Remove avatar selecionado
   */
  const handleRemoveAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  /**
   * Faz upload do avatar (apenas para usuários editados)
   */
  const handleUploadAvatar = async () => {
    if (!avatarFile || !isEditing || !user) return;

    try {
      setUploadingAvatar(true);
      await avatarService.uploadAvatar(avatarFile);
      showSuccess("Avatar atualizado com sucesso!");
      setAvatarFile(null);
      setAvatarPreview(null);
      onSave(); // Recarrega lista de usuários
    } catch (error: any) {
      console.error("Erro ao fazer upload de avatar:", error);
      showError(error.response?.data?.detail || "Erro ao fazer upload do avatar");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const validateForm = (): boolean => {
    const next: Record<string, string> = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email.trim()) {
      next.email = "Email é obrigatório";
    } else if (!emailRegex.test(email)) {
      next.email = "Email inválido";
    }

    if (!name.trim()) {
      next.name = "Nome é obrigatório";
    }

    if (!isEditing && modo === "senha") {
      if (password.length < 8) next.password = "Senha deve ter pelo menos 8 caracteres";
    }

    if (criandoHunter) {
      if (!documento.trim()) {
        next.documento = tipoHunter === "pessoa" ? "CPF é obrigatório" : "CNPJ é obrigatório";
      } else if (tipoHunter === "pessoa" && limparDocumento(documento).length !== 11) {
        next.documento = "CPF com 11 números";
      } else if (tipoHunter === "empresa") {
        const erro = erroDoCampo("cnpj", documento);
        if (erro) next.documento = erro;
      }
      const erroTel = erroDoCampo("phone", phone);
      if (erroTel) next.phone = erroTel;
    }

    if (criandoParceiro && !empresaId) {
      next.empresa = "Escolha a empresa parceira";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setSaving(true);

      if (isEditing && user) {
        const data: UpdateUserRequest = {
          email: email.trim(),
          name: name.trim(),
          username: username.trim() || undefined,
          phone: phone.trim() || undefined,
          role_id: roleId,
          is_active: isActive,
        };

        await userService.update(user.id, data);
        showSuccess("Usuário atualizado com sucesso!");
      } else if (criandoHunter) {
        const dados: HunterForm = {
          name: name.trim(),
          email: email.trim(),
          [tipoHunter === "pessoa" ? "cpf" : "cnpj"]: limparDocumento(documento),
          modo,
          password: modo === "senha" ? password : undefined,
        };
        if (phone.trim()) dados.phone = phone.trim();
        if (pixKey.trim()) dados.pix_key = pixKey.trim();
        const r = await parceriasService.criarHunter(dados);
        avisarCriado(r.email_enviado, "Hunter");
      } else if (criandoParceiro) {
        const r = await parceriasService.criarAcesso(Number(empresaId), {
          name: name.trim(),
          email: email.trim(),
          modo,
          password: modo === "senha" ? password : undefined,
        });
        avisarCriado(r.email_enviado, "Parceiro");
      } else {
        const data: CreateUserRequest = {
          email: email.trim(),
          modo,
          password: modo === "senha" ? password : undefined,
          name: name.trim(),
          username: username.trim() || undefined,
          phone: phone.trim() || undefined,
          role_id: roleId,
          is_active: isActive,
        };

        const criado = await userService.create(data);
        if (modo === "convite" && criado.email_enviado === false) {
          showWarning("Usuário criado, mas não conseguimos enviar o e-mail. Use Copiar link na lista.");
        } else {
          showSuccess(modo === "convite" ? "Usuário criado. Convite enviado por e-mail." : "Usuário criado com sucesso!");
        }
      }

      resetForm();
      onSave();
    } catch (error: any) {
      console.error("Erro ao salvar usuário:", error);
      showError(mensagemDeErro(error, "Erro ao salvar usuário"));
    } finally {
      setSaving(false);
    }
  };

  const avisarCriado = (emailEnviado: boolean | undefined, perfil: string) => {
    if (modo === "convite" && !emailEnviado) {
      showWarning(`${perfil} criado, mas não conseguimos enviar o e-mail. Use Copiar link na lista.`);
    } else {
      showSuccess(modo === "convite" ? `${perfil} criado. Convite enviado por e-mail.` : `${perfil} criado com sucesso!`);
    }
  };

  const handleClose = () => {
    if (!saving) {
      resetForm();
      onClose();
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={handleClose}
      title={isEditing ? "Editar Usuário" : "Novo Usuário"}
      subtitle={isEditing ? "Atualize os dados do usuário" : "Preencha os dados do novo usuário"}
      size="2xl"
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={handleClose} disabled={saving}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleSubmit} loading={saving}>
            {isEditing ? "Atualizar" : "Criar"}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Seção de Avatar (apenas para edição) */}
        {isEditing && user && (
          <div>
            <h3 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">Foto de Perfil</h3>
            <div className="flex items-center gap-6">
              {/* Preview do Avatar */}
              <div className="relative">
                {avatarPreview || user.avatar_url ? (
                  <div className="relative h-24 w-24 overflow-hidden rounded-full border-2 border-gray-300 dark:border-slate-700">
                    <img
                      src={avatarPreview || avatarService.getAvatarUrl(user.id)}
                      alt={user.name}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        // Fallback se a imagem não carregar
                        e.currentTarget.style.display = 'none';
                        const parent = e.currentTarget.parentElement;
                        if (parent) {
                          parent.innerHTML = `
                            <div class="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-500 to-cyan-500">
                              <span class="text-2xl font-semibold text-white">${user.name.substring(0, 2).toUpperCase()}</span>
                            </div>
                          `;
                        }
                      }}
                    />
                    {avatarPreview && (
                      <button
                        type="button"
                        onClick={handleRemoveAvatar}
                        className="absolute -right-2 -top-2 rounded-full bg-red-500 p-1 text-white transition-colors hover:bg-red-600"
                        title="Remover foto"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-cyan-500">
                    <UserIcon size={40} className="text-white" />
                  </div>
                )}
              </div>

              {/* Botões de Ação */}
              <div className="flex flex-col gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-slate-900 transition-colors hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700"
                  disabled={saving || uploadingAvatar}
                >
                  <Upload size={16} />
                  Selecionar Foto
                </button>
                {avatarFile && (
                  <button
                    type="button"
                    onClick={handleUploadAvatar}
                    className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white transition-colors hover:bg-emerald-700"
                    disabled={saving || uploadingAvatar}
                  >
                    {uploadingAvatar ? "Enviando..." : "Salvar Foto"}
                  </button>
                )}
                <p className="text-xs text-slate-400">
                  JPG, PNG, GIF ou WEBP. Máximo 5MB.
                </p>
              </div>
            </div>
          </div>
        )}

        <div>
          <h3 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">Permissões</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField
              label={
                <span>
                  Função <span className="text-red-400">*</span>
                </span>
              }
              className={criandoExterno ? "md:col-span-2" : undefined}
            >
              <SelectMenu
                value={String(roleId)}
                options={[
                  { value: "1", label: "Administrador" },
                  { value: "2", label: "Gerente" },
                  { value: "3", label: "Vendedor" },
                  { value: "4", label: "SDR" },
                  { value: "5", label: "Visualizador" },
                  { value: "6", label: "Serviço" },
                  ...(idFinanceiro ? [{ value: String(idFinanceiro), label: "Financeiro" }] : []),
                  // Parceiro e Hunter: na criação quando o perfil existe; na edição só no próprio usuário.
                  ...(!isEditing && idParceiro ? [{ value: String(idParceiro), label: "Parceiro" }] : []),
                  ...(!isEditing && idHunter ? [{ value: String(idHunter), label: "Hunter" }] : []),
                  ...(user?.role === "partner" ? [{ value: String(user.role_id), label: "Parceiro" }] : []),
                  ...(user?.role === "hunter" ? [{ value: String(user.role_id), label: "Hunter" }] : []),
                ]}
                onChange={(value) => { setRoleId(Number(value)); setErrors({}); }}
              />
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {roleId === 1 && "Acesso total ao sistema"}
                {roleId === 2 && "Gerencia equipes e relatórios"}
                {roleId === 3 && "Gerencia apenas seus próprios cards"}
                {roleId === 4 && "Gerencia prospecção e qualificação de leads"}
                {roleId === 5 && "Acesso somente leitura a boards, clientes, pessoas e produtos"}
                {roleId === 6 && "Acesso ao módulo de serviços (boards, atividades, clientes, pessoas e produtos)"}
                {idFinanceiro !== null && roleId === idFinanceiro && "Acompanha Parcerias e valida a elegibilidade das oportunidades"}
                {idParceiro !== null && roleId === idParceiro && "Dono da empresa parceira: acesso só à seção Parcerias"}
                {idHunter !== null && roleId === idHunter && "Indica empresas ao Programa de Parceiros: acesso só à seção Parcerias"}
              </p>
            </FormField>

            {!criandoExterno && (
              <FormField label="Status">
                <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3 transition-colors hover:bg-gray-100 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 bg-white text-emerald-600 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-700"
                    disabled={saving}
                  />
                  <span className="text-slate-900 dark:text-white">Usuário Ativo</span>
                </label>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Usuários inativos não podem fazer login
                </p>
              </FormField>
            )}

            {isEditing && user?.role === "hunter" && fichaHunter && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3 md:col-span-2 dark:border-slate-700 dark:bg-slate-800">
                <div className="text-sm">
                  <p className="font-medium text-slate-900 dark:text-white">
                    Ficha do hunter {fichaHunter.stage === "bloqueado" ? "bloqueada" : "liberada"}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {fichaHunter.empresas_indicadas} empresa{fichaHunter.empresas_indicadas !== 1 ? "s" : ""} indicada
                    {fichaHunter.empresas_indicadas !== 1 ? "s" : ""}. Bloquear desativa os acessos; as indicadas continuam funcionando.
                  </p>
                </div>
                <Button
                  variant={fichaHunter.stage === "bloqueado" ? "secondary" : "danger"}
                  onClick={alternarBloqueioHunter}
                  loading={bloqueando}
                  disabled={saving}
                >
                  {fichaHunter.stage === "bloqueado" ? "Desbloquear" : "Bloquear"}
                </Button>
              </div>
            )}
          </div>
        </div>

        {criandoParceiro && (
          <div>
            <h3 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">Empresa parceira</h3>
            <FormField
              label={
                <span>
                  Empresa <span className="text-red-400">*</span>
                </span>
              }
              error={errors.empresa}
              hint="Empresas do board de Aquisição, menos as bloqueadas. Empresa nova nasce no board."
            >
              <SelectMenu
                value={empresaId}
                placeholder={empresas.length ? "Escolha a empresa" : "Nenhuma empresa disponível"}
                options={empresas.map((p) => ({ value: String(p.id), label: p.name }))}
                onChange={(v) => { setEmpresaId(v); limparErro("empresa"); }}
              />
            </FormField>
          </div>
        )}

        {criandoHunter && (
          <div>
            <h3 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">Dados do hunter</h3>
            {/* Pessoa/Empresa no mesmo formato das abas de Configurações */}
            <div className="mb-4 grid grid-cols-2 overflow-hidden rounded-lg border border-gray-200 dark:border-slate-700">
              {(["pessoa", "empresa"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => { setTipoHunter(t); setDocumento(""); limparErro("documento"); }}
                  className={`px-3 py-2.5 text-sm font-medium transition-colors ${
                    tipoHunter === t
                      ? "bg-emerald-600 text-white"
                      : "text-slate-500 hover:bg-gray-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-700/50 dark:hover:text-white"
                  }`}
                >
                  {t === "pessoa" ? "Pessoa" : "Empresa"}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField
                label={
                  <span>
                    {tipoHunter === "pessoa" ? "CPF" : "CNPJ"} <span className="text-red-400">*</span>
                  </span>
                }
                error={errors.documento}
              >
                <Input
                  value={documento}
                  inputMode="numeric"
                  placeholder={tipoHunter === "pessoa" ? "000.000.000-00" : "00.000.000/0000-00"}
                  onChange={(e) => {
                    setDocumento(tipoHunter === "pessoa" ? maskCPF(e.target.value) : mascarar("cnpj", e.target.value));
                    limparErro("documento");
                  }}
                  disabled={saving}
                  error={!!errors.documento}
                />
              </FormField>
              <FormField label="Chave PIX">
                <Input value={pixKey} maxLength={140} onChange={(e) => setPixKey(e.target.value)} disabled={saving} />
              </FormField>
            </div>
          </div>
        )}

        <div>
          <h3 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">Dados de Acesso</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField
              label={
                <span>
                  Email <span className="text-red-400">*</span>
                </span>
              }
              className="md:col-span-2"
              error={errors.email}
            >
              <Input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); limparErro("email"); }}
                placeholder="usuario@exemplo.com"
                required
                disabled={saving}
                error={!!errors.email}
              />
            </FormField>

            {!isEditing && (
              <div className="md:col-span-2">
                <FormularioDeAcesso
                  pedirNomeEmail={false}
                  semBotao
                  onEnviar={() => undefined}
                  onMudar={(d) => { setModo(d.modo); setPassword(d.password); limparErro("password"); }}
                />
                {errors.password && <p className="mt-1 text-xs text-red-400">{errors.password}</p>}
              </div>
            )}
          </div>
        </div>

        <div>
          <h3 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">Dados Pessoais</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField
              label={
                <span>
                  {criandoHunter && tipoHunter === "empresa" ? "Razão social / nome" : "Nome Completo"} <span className="text-red-400">*</span>
                </span>
              }
              className="md:col-span-2"
              error={errors.name}
            >
              <Input
                type="text"
                value={name}
                maxLength={255}
                onChange={(e) => { setName(e.target.value); limparErro("name"); }}
                placeholder="João Silva"
                required
                disabled={saving}
                error={!!errors.name}
              />
            </FormField>

            {!criandoExterno && (
              <FormField label="Username">
                <Input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="joaosilva"
                  disabled={saving}
                />
              </FormField>
            )}

            {!criandoParceiro && (
              <FormField label="Telefone" error={errors.phone}>
                <Input
                  type="tel"
                  value={phone}
                  onChange={(e) => {
                    setPhone(criandoHunter ? mascarar("phone", e.target.value) : e.target.value);
                    limparErro("phone");
                  }}
                  placeholder="(11) 98765-4321"
                  disabled={saving}
                  error={!!errors.phone}
                />
              </FormField>
            )}
          </div>
        </div>

        {isEditing && (
          <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-4">
            <p className="text-sm text-blue-400">
              <strong>Nota:</strong> Para alterar a senha, o usuário deve fazer isso através
              da página de configurações após fazer login.
            </p>
          </div>
        )}
      </form>
    </BaseModal>
  );
};

export default UserModal;

// ==================== COMPONENTE AUXILIAR: SELECT MENU ====================
interface SelectOption {
  value: string;
  label: string;
}

interface SelectMenuProps {
  value: string;
  options: SelectOption[];
  placeholder?: string;
  onChange: (value: string) => void;
}

const SelectMenu: React.FC<SelectMenuProps> = ({ value, options, placeholder, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [posicao, setPosicao] = useState<React.CSSProperties>({});
  const botaoRef = useRef<HTMLButtonElement | null>(null);
  const listaRef = useRef<HTMLDivElement | null>(null);

  // A lista abre num portal, por cima da modal: não aumenta nem rola o corpo dela.
  const abrir = () => {
    const r = botaoRef.current?.getBoundingClientRect();
    if (!r) return;
    const altura = 240; // max-h-60
    const abaixo = window.innerHeight - r.bottom;
    const paraCima = abaixo < altura + 8 && r.top > abaixo;
    setPosicao({
      left: r.left,
      width: r.width,
      ...(paraCima ? { bottom: window.innerHeight - r.top + 4 } : { top: r.bottom + 4 }),
    });
    setIsOpen(true);
  };

  useEffect(() => {
    if (!isOpen) return;
    const foraDoMenu = (alvo: EventTarget | null) =>
      !botaoRef.current?.contains(alvo as Node) && !listaRef.current?.contains(alvo as Node);
    const clique = (e: MouseEvent) => { if (foraDoMenu(e.target)) setIsOpen(false); };
    // Rolar a modal ou a página tiraria a lista do lugar: fecha.
    const rolagem = (e: Event) => { if (foraDoMenu(e.target)) setIsOpen(false); };
    const fechar = () => setIsOpen(false);
    const tecla = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); setIsOpen(false); } };
    document.addEventListener("mousedown", clique);
    document.addEventListener("scroll", rolagem, true);
    document.addEventListener("keydown", tecla, true);
    window.addEventListener("resize", fechar);
    return () => {
      document.removeEventListener("mousedown", clique);
      document.removeEventListener("scroll", rolagem, true);
      document.removeEventListener("keydown", tecla, true);
      window.removeEventListener("resize", fechar);
    };
  }, [isOpen]);

  const selectedOption = options.find((option) => option.value === value);
  const selectedLabel = selectedOption?.label || placeholder || "Selecione";

  return (
    <div className="relative">
      <button
        ref={botaoRef}
        type="button"
        onClick={() => (isOpen ? setIsOpen(false) : abrir())}
        className="flex w-full items-center justify-between gap-3 rounded-lg border border-gray-300 bg-white px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className={`truncate ${selectedOption ? "" : "text-slate-500 dark:text-slate-400"}`}>
          {selectedLabel}
        </span>
        <ChevronDown
          size={16}
          className={`text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>
      {isOpen &&
        createPortal(
          <div
            ref={listaRef}
            role="listbox"
            style={posicao}
            className="fixed z-[3100] max-h-60 overflow-y-auto overflow-x-hidden rounded-lg border border-gray-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900"
          >
            {options.length === 0 ? (
              <div className="px-4 py-3 text-sm text-slate-400">Nenhuma opção disponível</div>
            ) : (
              options.map((option) => (
                <button
                  key={option.value || option.label}
                  type="button"
                  role="option"
                  aria-selected={option.value === value}
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={`w-full px-4 py-2 text-left text-sm text-slate-900 hover:bg-gray-100 dark:text-white dark:hover:bg-slate-800 ${
                    option.value === value ? "bg-gray-100 dark:bg-slate-800/70" : ""
                  }`}
                >
                  <span className="block truncate">{option.label}</span>
                </button>
              ))
            )}
          </div>,
          document.body
        )}
    </div>
  );
};
