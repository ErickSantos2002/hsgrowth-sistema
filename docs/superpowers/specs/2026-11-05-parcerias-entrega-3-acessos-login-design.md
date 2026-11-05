# Parcerias — Entrega 3: acessos e login (parceiro, equipe do parceiro e Financeiro)

**Data:** 05/11/2026 · **Versão sugerida:** 1.11.16 · **Migration:** sim · **Ambiente:** só homo
**Plano de implementação:** `docs/superpowers/plans/2026-11-05-parcerias-entrega-3-acessos-login.md`
**Quem implementa:** Erick · **Desenho aprovado por:** Welton (05/11/2026)

## 1. Objetivo

Dar login próprio a quem é de fora da H&S no Programa de Parceiros e acabar com a
senha "digitada por um e repassada por fora" como único caminho:

- **Financeiro** (H&S) — já existe; passa a poder ser convidado por e-mail.
- **Parceiro / dono** (`partner`) — já existe; ganha convite por e-mail e cadastra os
  logins da própria equipe.
- **Vendedor do parceiro** (`partner_member`) — **novo**; vê só as oportunidades dele.

E, para o CRM todo: convite por e-mail, troca de senha obrigatória no primeiro login,
"Esqueci minha senha" e troca de senha em Configurações funcionando.

## 2. O que já existe (não refazer)

| Peça | Onde |
|---|---|
| Roles `partner` e `finance` | migration `1b2c3d4e5f6a` |
| `users.partner_id` (liga o login ao parceiro) | `backend/app/models/user.py` |
| Tranca geral: `partner`/`finance` só acessam Parcerias, auth, `/users/me*` e notificações | `backend/app/api/deps.py` (`PERFIS_TRANCADOS`, `get_current_active_user`) |
| Filtro "cada parceiro só vê o seu" (no backend) | `backend/app/services/parcerias/acesso.py` |
| "Acessos ao CRM" no card do parceiro (gestão cria login `partner` com senha) | `services/parcerias/parceiros.py` (`criar_acesso`), `pages/parcerias/ParceiroDetalhe.tsx` |
| Equipe do parceiro (`partner_team_members`), já com `user_id` reservado | `backend/app/models/partner.py` |
| Responsável da oportunidade: `seller_member_id` → membro da equipe | `models/partner_opportunity.py`, `services/parcerias/oportunidades.py` |
| Financeiro criado na tela de Usuários | `pages/Users.tsx`, `POST /api/v1/users` |
| Reset de senha pelo admin (senha temporária) | `PUT /api/v1/admin/users/{id}/reset-password` |
| `POST /auth/forgot-password` e `/auth/reset-password` (servidor) | `endpoints/auth.py` — **não envia e-mail e não tem tela** |

**O vínculo login ↔ parceiro já existe** (`users.partner_id`): toda oportunidade criada
por um login de parceiro nasce com o `partner_id` dele (canal "Parceiros").

## 3. O que está quebrado hoje (entra nesta entrega)

1. Nenhum e-mail de convite/senha é enviado (SMTP do `EmailService` nunca é chamado;
   o Graph só envia pela conta Microsoft do próprio usuário).
2. "Esqueci minha senha": sem e-mail e sem tela.
3. Troca de senha em Configurações: o front chama `/users/{id}/change-password` (não
   existe) com `old_password`; o certo é `POST /users/me/change-password` com
   `current_password`. Não há campo de senha em Configurações.
4. Parceiro e Financeiro não conseguem salvar o próprio perfil (front usa `PUT /users/{id}`,
   que a tranca bloqueia).
5. Login compara e-mail com diferença de maiúsculas (`Fulano@` ≠ `fulano@`).
6. Erros do login Microsoft (`/login?error=user_not_found`) não aparecem na tela.
7. `POST /api/v1/admin/users` cria usuário `partner` sem `partner_id` (não passa por
   `_recusar_login_de_parceiro`).

## 4. Perfis

| Perfil | Quem cria | Vê | Pode |
|---|---|---|---|
| `finance` | Admin (Usuários) | Os 2 boards de Parcerias, tudo, só leitura | Validar elegibilidade, confirmar/negar ganho |
| `partner` (dono) | Admin/gerente (card do parceiro → Acessos ao CRM) | O próprio card de Aquisição; **todas** as oportunidades do parceiro; Equipe; logins da equipe; Consulta de CNPJ | Tudo que já pode hoje + dar/tirar acesso da equipe + trocar o vendedor de uma oportunidade |
| `partner_member` (**novo**, "Vendedor do parceiro") | O dono do parceiro (Equipe → Dar acesso) ou admin/gerente | **Só as oportunidades em que é o vendedor** (`seller_member_id` = o membro dele); Consulta de CNPJ (20/dia por login) | Criar oportunidade (nasce com ele como vendedor), editar/mover as dele. **Não** vê o card de Aquisição, a Equipe nem os Acessos; **não** troca o vendedor |

Regras:
- `partner_member` é **trancado** como `partner` e `finance` (mesma lista liberada).
- O `partner_member` tem `users.partner_id` = o parceiro **e** `partner_team_members.user_id`
  = o login dele (um login por membro).
- Desativar o membro na Equipe **desativa o login**; reativar reativa. As oportunidades
  dele ficam no parceiro; o dono (ou a gestão) troca o vendedor.
- Membro sem login continua possível (como hoje): o dono cadastra e escolhe como
  vendedor da oportunidade.
- Card de outro vendedor responde **404** para o `partner_member` (mesmo padrão de hoje).

## 5. Criação do acesso (mesmo formulário nas 3 telas)

Telas: **Acessos ao CRM** (card do parceiro; gestão → dono), **Equipe → Dar acesso**
(dono ou gestão → vendedor) e **Usuários → Novo usuário** (admin → H&S e Financeiro).

Quem cria escolhe o modo:

**a) Enviar convite (padrão)**
- Cria o usuário com uma senha aleatória que ninguém conhece (não dá para entrar sem
  aceitar o convite) e um token de **convite** válido por **7 dias**, de uso único.
- Envia o e-mail "Convite" com o link `{FRONTEND_URL}/definir-senha?token=...`.
- A lista mostra **"Convite pendente — expira em dd/mm"** com **Reenviar** (gera token
  novo, invalida o anterior, envia de novo) e **Copiar link** (gera token novo, devolve o
  link para a tela copiar; não envia e-mail).
- Se o e-mail falhar, o usuário e o convite continuam criados; a tela avisa
  "Não conseguimos enviar o e-mail. Use Copiar link." (a API devolve `email_enviado: false`).

**b) Definir senha inicial**
- Quem cria digita a senha (mínimo 8). O usuário nasce com `must_change_password = true`.
- No primeiro login a pessoa vai direto para a tela **Trocar senha**; o backend recusa
  qualquer outra rota até a troca.

Status de um acesso na lista: **Ativo** · **Convite pendente** (há convite válido e
nunca entrou) · **Convite expirado** · **Desativado**.

## 6. Senha no dia a dia (CRM todo)

- **Definir senha** (`/definir-senha?token=`): serve ao convite e à redefinição. Mostra
  "Olá, {nome}" e pede nova senha + confirmação (mínimo 8). Token inválido/expirado/usado
  → mensagem e link para "Esqueci minha senha".
- **Esqueci minha senha** (link na tela de login → `/esqueci-senha`): pede o e-mail; o
  backend cria um token de **redefinição** válido por **1 hora** e envia o e-mail. A
  resposta é sempre a mesma, exista o e-mail ou não. Usuário inativo/excluído não recebe.
- **Trocar senha obrigatória** (`/trocar-senha`): senha atual + nova + confirmação.
- **Configurações → Perfil**: seção "Alterar senha" (usa `POST /users/me/change-password`);
  salvar o perfil passa a usar `PUT /users/me` (liberado para os trancados).
- Trocar/definir senha marca `password_changed_at`, zera `must_change_password` e
  invalida os tokens pendentes do usuário.
- **Reset pelo admin** (senha temporária, já existe) passa a marcar `must_change_password = true`.
- **Login Microsoft**: sem mudança de regra. Só passam a aparecer na tela de login os
  erros `user_not_found`, `user_inactive` e `microsoft_auth_failed`.

## 7. E-mail

- Um único ponto de envio: `backend/app/services/envio_email.py` →
  `enviar_email(para, assunto, html, texto=None) -> bool`. **A implementação do envio é do
  Erick** (plataforma de disparo dele, ou o SMTP Office 365 já configurado em
  `settings.SMTP_*`). Sem provedor configurado: só registra no log e devolve `False`.
- Dois modelos (`backend/app/services/emails_de_acesso.py`): **Convite** (quem convidou,
  nome, link, validade, "se não esperava este e-mail, ignore") e **Redefinir senha**.
  HTML simples, com a cara do `EmailService._get_base_template`.
- Remetente e configuração do provedor por variáveis de ambiente (definidas pelo Erick).

## 8. Banco (migration `7b8c9d0e1f2a`, down `6a7b8c9d0e1f`)

- `users.must_change_password` (bool, não nulo, padrão `false`).
- Tabela `user_access_tokens`: `id`, `user_id` (FK users, CASCADE), `kind`
  (`convite` | `redefinir`), `token_hash` (sha256 do token, único), `expires_at`,
  `used_at`, `created_by_id` (FK users, SET NULL), `created_at`. O token em claro só
  existe no link; o banco guarda o hash.
- Role `partner_member` ("Vendedor do parceiro", `is_system_role = true`).
- `users.reset_token` / `reset_token_expires_at` deixam de ser usados (não apagar agora).

## 9. API (resumo)

| Rota | Quem | O quê |
|---|---|---|
| `GET /auth/token/{token}` | público | `{kind, nome, email, valido}` para a tela Definir senha |
| `POST /auth/definir-senha` | público | `{token, nova_senha}` → define a senha, usa o token |
| `POST /auth/forgot-password` | público | passa a criar token `redefinir` e enviar e-mail |
| `POST /auth/reset-password` | público | mantida por compatibilidade, chama a mesma lógica de `definir-senha` |
| `POST /auth/login` | público | e-mail sem diferença de maiúsculas; resposta inclui `must_change_password` |
| `GET /users/me` | logado | inclui `must_change_password` e `partner_id` |
| `PUT /users/me` | logado | nome, telefone, avatar, assinatura (o próprio usuário) |
| `POST /users` | admin | aceita `modo: "convite" | "senha"` |
| `POST /users/{id}/convite` | admin | `{enviar: bool}` → reenvia ou devolve link |
| `POST /parcerias/parceiros/{id}/acessos` | gestão | `{name, email, modo, password?}` |
| `POST /parcerias/parceiros/{id}/acessos/{user_id}/convite` | gestão | reenviar / copiar link |
| `POST /parcerias/parceiros/{id}/equipe/{membro_id}/acesso` | dono ou gestão | dá login `partner_member` ao membro |
| `POST /parcerias/parceiros/{id}/equipe/{membro_id}/acesso/convite` | dono ou gestão | reenviar / copiar link |

Respostas de criação/convite: `{acesso: {...status...}, link: str | null, email_enviado: bool}`
(`link` só volta quando a tela pediu "Copiar link").

## 10. Fora do escopo

- Login Microsoft para quem é de fora da H&S.
- Auto-cadastro (alguém se registrar sem convite).
- Dashboard, alertas e comissões (Entregas 4, 5, 6).
- Apagar `users.reset_token`/`reset_token_expires_at` (fica para uma limpeza futura).

## 11. Critérios de aceite (testar no homo)

1. Gestão cria o dono do parceiro por convite → e-mail chega → link cria a senha → entra
   e cai em Parcerias.
2. Gestão cria o dono com senha inicial → 1º login obriga a trocar → depois usa normal.
3. Dono cadastra vendedor na Equipe → Dar acesso (convite e senha) → vendedor entra, vê
   só as oportunidades dele, cria uma (nasce com ele como vendedor), usa a Consulta de CNPJ.
4. Vendedor não abre o card de Aquisição (404), não vê a Equipe nem oportunidade de outro
   vendedor (404) e não troca o vendedor (422).
5. Dono troca o vendedor de uma oportunidade; o vendedor antigo deixa de vê-la.
6. Desativar o membro desativa o login (403 "Usuário inativo" no próximo request).
7. Copiar link funciona sem e-mail; link usado/expirado mostra a mensagem certa.
8. Esqueci minha senha envia e-mail e redefine; e-mail inexistente dá a mesma resposta.
9. Admin cria Financeiro por convite pela tela de Usuários.
10. Trocar senha em Configurações funciona para todos os perfis; parceiro salva o perfil.
11. Login com e-mail em maiúsculas funciona.
