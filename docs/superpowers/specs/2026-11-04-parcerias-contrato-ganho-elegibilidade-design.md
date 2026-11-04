# Parcerias — contrato do parceiro, ganho confirmado e elegibilidade livre (v1.11.11)

Aprovado pelo usuário em 04/11/2026. Base: `Documentação/Programa Indicação Parcerias v2 [Health and Safety].docx`
(seções 2.1 e 3.1) e as decisões abaixo, que mudam o que o documento pede.

## 1. Contrato do parceiro (board Aquisição)

O documento pede "contrato assinado" para sair de Formalização.

- Aba nova **"Contrato"** no detalhe do parceiro, ao lado de "Oportunidades":
  - campo **Data do contrato** com Salvar;
  - **Anexar contrato** (mesmo limite de 10MB dos anexos), baixar e trocar.
- O arquivo é uma `PartnerActivity` de categoria `arquivo` e `activity_type = "contract"`. Ele aparece no histórico como os outros anexos.
- `partners.contract_activity_id` aponta para o anexo, sem FK pelo mesmo motivo de `activation_opportunity_id`. Excluir o anexo zera o campo.
- Trocar o contrato aponta para o anexo novo; o antigo continua no histórico.
- `partners.contract_date` (Date) guarda a data.
- **Trava:** para sair de **Formalização** (ir a Onboarding ou além), o parceiro precisa de data do contrato e contrato anexado. A mensagem é "Anexe o contrato e preencha a data do contrato antes de ir para Onboarding.".
- **Quem mexe:** quem pode editar o card (gestão, o vendedor responsável e o parceiro). O Financeiro só vê.

## 2. Ganho marcado pelo parceiro, confirmado pela H&S (board Pipeline)

- A equipe do parceiro continua marcando Ganho e Perdido. As exigências de hoje continuam: venda ou locação para Ganho, motivo para Perdido.
- **Confirmação do ganho:**
  - colunas `partner_opportunities.won_confirmed_at` (DateTime) e `won_confirmed_by_id` (FK users, SET NULL);
  - ao entrar em Ganho, as duas ficam vazias, e o card mostra o selo "Ganho a confirmar";
  - ao sair de Ganho (reabertura pela gestão), as duas são zeradas.
- **Rota nova:** `PUT /parcerias/oportunidades/{id}/ganho` com `{acao: "confirmar" | "negar", motivo?}`.
  - **Quem pode:** admin, gerente e Financeiro (`VALIDAM_ELEGIBILIDADE`). Os demais recebem 403.
  - **Quando:** só com a oportunidade em Ganho; senão, 422.
  - **Confirmar:** grava quem e quando. O histórico recebe "Ganho confirmado".
  - **Negar:** o motivo é obrigatório (senão, 422).
    - O card volta para **Aguardando Pedido** e `won_at` é zerado.
    - O histórico recebe "Ganho negado: <motivo>".
    - A evidência de ativação já gravada não é desfeita.
- **Perdido** não precisa de confirmação.
- **Resposta da oportunidade:** ganha `won_confirmed_at` e `won_confirmed_by_name`.

## 3. Elegibilidade sem travar Novo Lead

- **A trava some:** sai "A elegibilidade precisa estar Validada para sair de Novo Lead".
- **Validar e Rejeitar** a elegibilidade valem em **qualquer etapa**, inclusive depois do Ganho. A trava "só em Novo Lead" sai.
- O resto não muda:
  - nota obrigatória para rejeitar;
  - a evidência "oportunidade_validada" para a ativação;
  - a oportunidade rejeitada deixa de proteger o CNPJ;
  - o CNPJ não muda depois de validado para quem não é gestão.
- **Rejeitada:** o card fica na etapa em que está, com o selo de rejeitada que já existe. A gestão decide se encerra.

## Comissão (Entrega 6, futura)

Só conta oportunidade com **ganho confirmado e elegibilidade validada**.

## Tela

- **ParceiroDetalhe:** a aba extra "Contrato" usa o componente `ContratoDoParceiro`, no visual das abas de Serviço.
- **ModalTrava / faltasParaMover:** espelham as travas novas (sai a da elegibilidade, entra a do contrato).
- **OportunidadeDetalhe, quadro "Elegibilidade":**
  - os botões Validar/Rejeitar aparecem em qualquer etapa enquanto a elegibilidade estiver "em análise";
  - com o card em Ganho, aparece o bloco "Confirmação do ganho" com:
    - o status;
    - para admin, gerente e Financeiro, os botões Confirmar e Negar (este com motivo).
- **OportunidadesKanban:** no card em Ganho, o selo "Ganho a confirmar" (amarelo) ou "Ganho confirmado" (verde).

## Banco

Migration `5f6a7b8c9d0e` (down `4e5f6a7b8c9d`):
- `partners.contract_date`;
- `partners.contract_activity_id`;
- `partner_opportunities.won_confirmed_at`;
- `partner_opportunities.won_confirmed_by_id`.

Roda só no homo.

## Testes

- Trava do contrato: falta data, falta anexo, e o caso com os dois.
- Excluir o anexo do contrato zera o campo.
- Oportunidade anda de Novo Lead até Ganho sem elegibilidade.
- A elegibilidade é validada depois do Ganho.
- Confirmar e negar o ganho:
  - quem pode;
  - a etapa errada dá 422;
  - negar sem motivo dá 422;
  - negar volta o card para Aguardando Pedido;
  - reabrir zera a confirmação.
