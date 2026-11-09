import { useState } from "react";
import { Button, FormField, Input } from "../common";
import type { ModoAcesso } from "../../services/acessosService";

export interface DadosDoAcesso { name?: string; email?: string; modo: ModoAcesso; password?: string }

interface Props {
  /** false na Equipe: nome e e-mail vêm do membro. */
  pedirNomeEmail: boolean;
  onEnviar: (dados: DadosDoAcesso) => Promise<void> | void;
  rotuloBotao?: string;
  /** Só a escolha de modo + senha (sem nome/e-mail nem botão): o pai controla o envio. */
  semBotao?: boolean;
  onMudar?: (dados: { modo: ModoAcesso; password: string }) => void;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Escolha entre convite por e-mail e senha inicial; usado em Usuários, Acessos ao CRM e Equipe. */
export default function FormularioDeAcesso({ pedirNomeEmail, onEnviar, rotuloBotao = "Criar acesso", semBotao, onMudar }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [modo, setModo] = useState<ModoAcesso>("convite");
  const [password, setPassword] = useState("");
  const [enviando, setEnviando] = useState(false);

  const emailInvalido = email.trim() !== "" && !EMAIL.test(email.trim());
  const valido =
    (!pedirNomeEmail || (name.trim() !== "" && EMAIL.test(email.trim()))) &&
    (modo === "convite" || password.length >= 8);

  const mudarModo = (m: ModoAcesso) => { setModo(m); onMudar?.({ modo: m, password }); };
  const mudarSenha = (p: string) => { setPassword(p); onMudar?.({ modo, password: p }); };

  const enviar = async () => {
    setEnviando(true);
    try {
      await onEnviar({
        ...(pedirNomeEmail ? { name: name.trim(), email: email.trim() } : {}),
        modo,
        password: modo === "senha" ? password : undefined,
      });
      setName(""); setEmail(""); setPassword(""); setModo("convite");
    } catch {
      // quem chama já mostrou o erro; mantém o formulário preenchido
    } finally {
      setEnviando(false);
    }
  };

  const opcao = (valor: ModoAcesso, rotulo: string) => (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-900 dark:text-white">
      <input type="radio" checked={modo === valor} onChange={() => mudarModo(valor)} className="text-emerald-600 focus:ring-emerald-500" />
      {rotulo}
    </label>
  );

  return (
    <div className="space-y-2">
      {pedirNomeEmail && (
        <>
          <FormField label="Nome" required>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </FormField>
          <FormField label="E-mail de login" required error={emailInvalido ? "E-mail inválido" : undefined}>
            <Input type="email" placeholder="nome@empresa.com.br" value={email} onChange={(e) => setEmail(e.target.value)} />
          </FormField>
        </>
      )}
      <div className="space-y-1">
        {opcao("convite", "Enviar convite por e-mail")}
        {opcao("senha", "Definir senha inicial")}
      </div>
      {modo === "senha" && (
        <FormField label="Senha inicial" required hint="Mínimo de 8 caracteres. A pessoa troca a senha no 1º login.">
          <Input type="password" autoComplete="new-password" value={password} onChange={(e) => mudarSenha(e.target.value)} />
        </FormField>
      )}
      {!semBotao && (
        <Button size="sm" fullWidth onClick={enviar} disabled={!valido || enviando}>{rotuloBotao}</Button>
      )}
    </div>
  );
}
