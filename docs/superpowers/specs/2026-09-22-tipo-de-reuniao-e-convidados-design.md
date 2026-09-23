# Tipo de reunião e convidados do convite — Design

Duas melhorias levantadas em 22/09/2026, depois da apresentação da reunião por
vídeo ao gestor e à consultoria.

---

## 1. Os dois problemas

**A régua avalia tudo.** Hoje toda reunião do CRM que foi gravada recebe a
avaliação pela matriz. Só que a matriz foi feita para a reunião de
apresentação — diagnóstico, demonstração, fechamento. Uma reunião de dúvidas
ou uma conversa técnica recebe nota baixa por não ter feito o que ninguém
esperava que ela fizesse, e essa nota entra na média do vendedor.

A consultora propôs resolver pelo título: padronizar o nome da reunião e
avaliar só as de apresentação.

**O convite não chega a todos.** Os vendedores relataram que, ao criar a
reunião, o convite não ia para todos os participantes. Eles querem escolher
quem recebe, como no modal de enviar e-mail.

Duas causas, e as duas precisam de tratamento:

1. Ninguém escolhe os destinatários: o sistema monta a lista sozinho (vendedor
   do negócio + os três e-mails do contato vinculado).
2. A trava `DAILY_DEV_MODE`, quando ligada, **remove do convite todos os
   endereços de fora da empresa** e registra isso apenas no log do servidor. O
   vendedor acha que enviou. O padrão dessa variável no código é ligada.

---

## 2. Decisões

| Questão | Decisão |
|---|---|
| Quais reuniões são avaliadas sozinhas | Só **Apresentação Phoebus** |
| E as demais | O botão "Avaliar pelo roteiro" continua em qualquer reunião com transcrição |
| Quando roda | **Assim que a transcrição chega** — sozinha no CRM, junto do "Analisar Reunião" no Teams |
| Como o tipo vive no sistema | **Campo próprio** na reunião; o título é montado a partir dele |
| Reunião fora dos quatro tipos | Opção **"Outra"**, com título livre, nunca avaliada sozinha |
| Nome da empresa no título | Razão social do cliente; faltando, o nome do negócio |
| Convidados | Lista visível, com marcados por padrão, podendo desmarcar e acrescentar |
| E-mail digitado à mão | Vale para aquela reunião; **não** altera o cadastro do contato |
| Mínimo de destinatários | **Pelo menos um** para criar a reunião |

---

## 3. Parte 1 — tipo da reunião

### Os cinco tipos

| Tipo | Título montado | Avalia sozinha |
|---|---|---|
| Apresentação Phoebus | `Apresentação Phoebus - <empresa>` | **sim** |
| Dúvidas Phoebus | `Dúvidas Phoebus - <empresa>` | não |
| Apresentação | `Apresentação - <empresa>` | não |
| Dúvidas | `Dúvidas - <empresa>` | não |
| Outra | o que o vendedor escrever | não |

`<empresa>` é a razão social do cliente vinculado (`clients.company_name`).
Sem cliente vinculado ou sem razão social, usa o título do negócio — que na
prática já é o nome da empresa ("RS TRANSPORTES E LOGISTICA LTDA").

**O título é montado no servidor**, não na tela. A tela mostra a prévia; quem
decide o texto final é o backend. Se fosse montado no navegador, bastaria uma
chamada pela API para o padrão furar — e o padrão é justamente o que a
consultora pediu.

### Na tela

No formulário de Nova Reunião, **Tipo de reunião** é o primeiro campo.

- Nos quatro tipos fixos, o campo de título desaparece e no lugar fica a
  **prévia** do título que será criado, em texto acinzentado. O vendedor vê o
  que o cliente vai receber e não tem como digitar errado.
- Em "Outra", o campo de título volta, obrigatório, como hoje.

Ao **editar** a reunião, o tipo pode ser trocado e o título é remontado. Em
"Outra", o título continua livre.

### O que muda na avaliação

A regra passa a ser uma só, para os dois fluxos:

```
chegou transcrição  +  tipo "Apresentação Phoebus"  →  avalia
```

- **No CRM**, a transcrição chega sozinha depois da reunião gravada, então a
  avaliação sai sozinha também.
- **No Teams**, a transcrição chega quando o vendedor clica em "Analisar
  Reunião" — e a avaliação sai junto, no mesmo clique. Antes eram dois.

O clique continua sendo do vendedor porque a transcrição do Teams pertence a
quem organizou a reunião: sem o acesso dele, não existe texto para avaliar.

Uma regra só é o que dá para explicar ao time em uma frase — *reunião de
Apresentação Phoebus é avaliada assim que a transcrição chega*. Duas regras,
uma por tecnologia, ninguém decora.

Reunião sem tipo — todas as que já existem — **não** é avaliada sozinha.
Ninguém escolheu tipo quando elas foram criadas, e assumir um seria inventar
dado.

A **análise** (o resumo em 14 campos) continua automática em todas as
gravadas: ela serve para qualquer conversa e não é a régua da consultoria.

O botão continua valendo para tudo que tenha transcrição, inclusive Teams e
reuniões de dúvidas — quem quiser o retorno, pede.

### Na página de Reuniões

A coluna **Tipo**, que hoje diz CRM ou Teams, passa a se chamar **Onde**. A
nova coluna **Tipo** mostra o assunto da reunião (Apresentação Phoebus,
Dúvidas…). O filtro por tipo entra no painel de filtros.

É o recorte que a consultora vai querer: abrir a lista e ver só as
apresentações.

---

## 4. Parte 2 — quem recebe o convite

### A lista

Seção **"Quem recebe o convite"** no formulário, com o que o sistema conhece:

| Endereço | Vem marcado |
|---|---|
| Vendedor do negócio | sim |
| E-mail principal do contato | sim |
| E-mail comercial do contato | não |
| E-mail pessoal do contato | não |
| E-mail da empresa (cadastro do cliente) | não |

Endereços repetidos aparecem uma vez só. Abaixo da lista, **"Adicionar
e-mail"**, igual ao modal de enviar e-mail.

**Pelo menos um destinatário** é obrigatório para criar a reunião. Contato sem
nenhum e-mail cadastrado? A lista mostra só o vendedor, e quem quiser convidar
o cliente acrescenta o endereço ali.

A validação confere **apenas o formato**. Endereço válido mas errado vai para
o lugar errado — o sistema não tem como saber, e fingir que sabe seria pior.

### O que fica registrado

Os endereços convidados ficam guardados na reunião. Meses depois, dá para
abrir o card e saber para quem o convite foi. Sem isso, a única resposta
possível seria "para quem estava no cadastro naquele dia", que ninguém sabe
reconstruir.

O e-mail digitado à mão **não** entra no cadastro do contato: erro de
digitação ficaria na ficha do cliente para sempre.

### O aviso da trava

Quando `DAILY_DEV_MODE` remover endereços externos, a tela passa a dizer:

> O convite não foi enviado para 2 endereços externos (modo de desenvolvimento
> ligado).

Hoje isso só aparece no log do servidor, e foi assim que o problema passou
meses sem ninguém entender. A trava continua existindo — ela evita disparar
convite a cliente real em homologação —, mas deixa de ser silenciosa.

**Fora do código:** conferir `DAILY_DEV_MODE=false` no EasyPanel de produção.
Se estiver ligada, metade do problema relatado se resolve aí.

---

## 5. Dados

Duas colunas novas em `card_tasks`, as duas nulas para as reuniões que já
existem:

| Coluna | Para quê |
|---|---|
| `meeting_kind` | O tipo escolhido (`apresentacao_phoebus`, `duvidas_phoebus`, `apresentacao`, `duvidas`, `outra`) |
| `invited_emails` | Os endereços que receberam o convite, como JSON |

Os rótulos e a regra de "qual tipo é avaliado" ficam num módulo do código, ao
lado da régua da consultoria — mudar isso é mudança de versão, não
configuração de tela.

---

## 6. Endpoints

Sem rotas novas. Mudam as que já existem:

| Rota | O que muda |
|---|---|
| `POST /card-tasks` | Aceita `meeting_kind` e `invited_emails`; monta o título quando o tipo não é "Outra" |
| `PUT /card-tasks/{id}` | Mesma coisa, na edição |
| `POST /card-tasks/{id}/daily-room` | Convida quem está em `invited_emails` |
| `POST /card-tasks/{id}/teams-meeting` | Idem |
| `POST /card-tasks/{id}/fetch-transcript` | Depois de trazer a transcrição do Teams, avalia quando o tipo for Apresentação Phoebus |
| `GET /reunioes` | Devolve o tipo em cada item e aceita o filtro por tipo |

Chamada sem `invited_emails` — API, integração antiga — mantém o
comportamento de hoje (vendedor + contato). Compatibilidade sem exceção
escrita em lugar nenhum.

---

## 7. Riscos

| Risco | Tratamento |
|---|---|
| Vendedor escolher "Outra" para tudo e furar o padrão | A prévia do título mostra o ganho na hora; e o gestor vê a distribuição por tipo na página de Reuniões |
| Reuniões antigas sem tipo sumirem do filtro | O filtro tem a opção "sem tipo", como o de SDR tem "sem SDR" |
| Razão social diferente do nome usado na conversa | A prévia deixa ver antes de criar; se estiver ruim, o caminho é corrigir o cadastro do cliente, que serve para todo o resto |
| Convite deixar de sair para alguém que recebia antes | Os que vinham por padrão continuam marcados por padrão |

---

## 8. Esforço

| Parte | Estimativa |
|---|---|
| Colunas, migration e o módulo dos tipos | 0,5 dia |
| Título montado no servidor, criação e edição | 0,5 dia |
| Avaliação automática restrita ao tipo | 0,3 dia |
| Convidados: backend e o aviso da trava | 0,5 dia |
| Formulário: tipo, prévia e lista de convidados | 1 dia |
| Página de Reuniões: coluna e filtro | 0,3 dia |
| Testes e homologação | 0,5 dia |
| **Total** | **≈ 3,5 dias** |

---

## 9. Fora de escopo

- Tela para o gestor cadastrar tipos de reunião (são quatro, mudam uma vez por ano)
- Régua diferente por tipo de reunião — a matriz da consultoria é uma só
- Renomear reuniões antigas para o novo padrão
- Salvar no cadastro do contato os e-mails digitados à mão
- Trazer a transcrição do Teams sem o clique de quem organizou — é limitação do Microsoft Graph, não escolha nossa
