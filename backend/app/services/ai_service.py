"""
Serviço de integração com a API da OpenAI.
Responsável por toda a lógica de comunicação com o LLM e montagem de prompts.
"""
from typing import Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException

from openai import AsyncOpenAI, APIConnectionError, AuthenticationError, RateLimitError

from app.core.config import settings
from app.models.card import Card
from app.models.card_note import CardNote
from app.models.card_task import CardTask
from app.models.activity import Activity
from app.models.list import List
from app.schemas.ai import TextGenerateType, AgentActionId, AgentPageContext


class AIService:
    """
    Serviço responsável pela integração com a OpenAI.
    Centraliza a lógica de montagem de prompts e chamadas à API.
    """

    # Limite de notas incluídas no contexto para não estourar tokens
    MAX_NOTES_IN_CONTEXT = 15

    def __init__(self, db: Session):
        self.db = db
        # Cria o cliente assíncrono da OpenAI com a chave configurada no .env
        self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        self.model = settings.OPENAI_MODEL

    # -------------------------------------------------------------------------
    # Métodos públicos (chamados pelos endpoints)
    # -------------------------------------------------------------------------

    async def check_connection(self) -> dict:
        """
        Verifica se a conexão com a OpenAI está funcionando.
        Faz uma chamada mínima (1 token) para confirmar que a API key é válida.
        """
        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": "ok"}],
                max_tokens=1
            )
            return {
                "status": "ok",
                "model": self.model,
                "message": "Conexão com OpenAI funcionando corretamente."
            }
        except AuthenticationError:
            return {
                "status": "error",
                "model": self.model,
                "message": "API key inválida ou não configurada. Verifique a variável OPENAI_API_KEY no .env."
            }
        except APIConnectionError:
            return {
                "status": "error",
                "model": self.model,
                "message": "Não foi possível conectar à API da OpenAI. Verifique a conexão com a internet."
            }
        except Exception as e:
            return {
                "status": "error",
                "model": self.model,
                "message": f"Erro inesperado: {str(e)}"
            }

    async def summarize_card(self, card_id: int) -> dict:
        """
        Gera um resumo narrativo de um card com base em suas notas e dados.

        Monta o contexto com as informações do card (título, cliente, responsável,
        status, valor e as últimas notas) e envia ao LLM para gerar um parágrafo
        de resumo executivo útil para o vendedor.
        """
        # Busca o card no banco de dados com seus relacionamentos
        card = self._get_card_or_404(card_id)

        # Monta o bloco de contexto com os dados estruturados do card
        context = self._build_card_context(card)

        # Prompt de sistema: define o papel e comportamento esperado do LLM
        system_prompt = (
            "Você é um assistente especializado em CRM e vendas B2B. "
            "Seu papel é analisar os dados de um negócio (card) e gerar um resumo "
            "claro e objetivo para o vendedor responsável. "
            "O resumo deve ter no máximo 4 frases, escrito em português brasileiro, "
            "destacando: situação atual, última interação relevante, ponto de atenção "
            "e sugestão de próximo passo."
        )

        # Prompt do usuário: fornece os dados reais do card
        user_prompt = (
            f"Com base nos dados abaixo, gere um resumo executivo deste negócio:\n\n"
            f"{context}"
        )

        # Chama a API da OpenAI com os prompts montados
        response = await self._call_openai(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            max_tokens=400
        )

        return {
            "card_id": card.id,
            "card_title": card.title,
            "summary": response["content"],
            "model_used": response["model"],
            "tokens_used": response["tokens_used"]
        }

    async def generate_text(
        self,
        generate_type: TextGenerateType,
        card_id: Optional[int],
        client_name: Optional[str],
        person_name: Optional[str],
        extra_context: Optional[str]
    ) -> dict:
        """
        Gera um texto (e-mail, follow-up, etc.) baseado no tipo solicitado e contexto fornecido.

        Se card_id for informado, busca os dados do card para enriquecer o contexto
        automaticamente. Caso contrário, usa apenas os dados fornecidos diretamente.
        """
        # Monta o contexto: dados do card (se fornecido) + dados manuais
        context_parts = []

        if card_id:
            card = self._get_card_or_404(card_id)
            context_parts.append(self._build_card_context(card))
            # Usa os nomes do card caso não tenham sido fornecidos manualmente
            if not client_name and card.client:
                client_name = card.client.name
            if not person_name and card.person:
                person_name = card.person.name

        if client_name:
            context_parts.append(f"Empresa/Cliente: {client_name}")
        if person_name:
            context_parts.append(f"Contato: {person_name}")
        if extra_context:
            context_parts.append(f"Instruções adicionais: {extra_context}")

        context = "\n".join(context_parts) if context_parts else "Nenhum contexto fornecido."

        # Define o prompt de sistema conforme o tipo de geração solicitado
        system_prompt = self._get_system_prompt_for_type(generate_type)

        user_prompt = (
            f"Gere o texto solicitado com base no seguinte contexto:\n\n{context}"
        )

        response = await self._call_openai(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            max_tokens=800
        )

        return {
            "generated_text": response["content"],
            "generate_type": generate_type.value,
            "model_used": response["model"],
            "tokens_used": response["tokens_used"]
        }

    # -------------------------------------------------------------------------
    # Métodos privados (helpers internos)
    # -------------------------------------------------------------------------

    async def _call_openai(
        self,
        system_prompt: str,
        user_prompt: str,
        max_tokens: int = 500,
        temperature: float = 0.7
    ) -> dict:
        """
        Método central para todas as chamadas à API da OpenAI.
        Trata os erros mais comuns e retorna o conteúdo e metadados da resposta.
        """
        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                max_tokens=max_tokens,
                temperature=temperature
            )

            return {
                "content": response.choices[0].message.content.strip(),
                "model": response.model,
                "tokens_used": response.usage.total_tokens
            }

        except AuthenticationError:
            raise HTTPException(
                status_code=500,
                detail="API key da OpenAI inválida ou não configurada. Configure OPENAI_API_KEY no .env."
            )
        except RateLimitError:
            raise HTTPException(
                status_code=429,
                detail="Limite de requisições da OpenAI atingido. Aguarde alguns segundos e tente novamente."
            )
        except APIConnectionError:
            raise HTTPException(
                status_code=503,
                detail="Não foi possível conectar à API da OpenAI. Verifique a conexão com a internet."
            )
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Erro ao chamar a API da OpenAI: {str(e)}"
            )

    def _get_card_or_404(self, card_id: int) -> Card:
        """Busca o card pelo ID e lança 404 se não encontrado"""
        card = (
            self.db.query(Card)
            .filter(Card.id == card_id, Card.deleted_at.is_(None))
            .first()
        )
        if not card:
            raise HTTPException(status_code=404, detail=f"Card {card_id} não encontrado.")
        return card

    def _build_card_context(self, card: Card) -> str:
        """
        Monta uma string de contexto estruturada com os dados do card.
        Inclui informações básicas e as últimas notas para enriquecer o prompt.
        """
        lines = []

        # Informações básicas do card
        lines.append(f"Título do negócio: {card.title}")

        if card.description:
            lines.append(f"Descrição: {card.description}")

        if card.client:
            lines.append(f"Empresa/Cliente: {card.client.name}")

        if card.person:
            lines.append(f"Contato principal: {card.person.name}")

        if card.assigned_to:
            lines.append(f"Vendedor responsável: {card.assigned_to.name}")

        if card.list:
            lines.append(f"Etapa atual no funil: {card.list.name}")

        # Status do card
        status_map = {0: "Em aberto", 1: "Ganho", -1: "Perdido"}
        lines.append(f"Status: {status_map.get(card.is_won, 'Desconhecido')}")

        if card.value:
            lines.append(f"Valor do negócio: R$ {float(card.value):,.2f}")

        if card.due_date:
            lines.append(f"Prazo: {card.due_date.strftime('%d/%m/%Y')}")

        if card.loss_reason:
            lines.append(f"Motivo da perda: {card.loss_reason}")

        # Últimas notas do card (limita para não estourar contexto)
        notes = (
            self.db.query(CardNote)
            .filter(CardNote.card_id == card.id)
            .order_by(CardNote.created_at.desc())
            .limit(self.MAX_NOTES_IN_CONTEXT)
            .all()
        )

        if notes:
            lines.append(f"\nÚltimas {len(notes)} anotações:")
            for note in reversed(notes):  # Exibe em ordem cronológica
                date_str = note.created_at.strftime("%d/%m/%Y")
                author = note.user.name if note.user else "Desconhecido"
                lines.append(f"- [{date_str}] {author}: {note.content}")

        return "\n".join(lines)

    def _get_system_prompt_for_type(self, generate_type: TextGenerateType) -> str:
        """
        Retorna o prompt de sistema adequado para cada tipo de geração de texto.
        Define o tom, formato e objetivo esperado do LLM para cada caso.
        """
        prompts = {
            TextGenerateType.EMAIL_FOLLOWUP: (
                "Você é um assistente de vendas B2B especializado em comunicação comercial. "
                "Escreva um e-mail de follow-up em português brasileiro com tom profissional mas cordial. "
                "O e-mail deve ser breve (máximo 3 parágrafos), ter assunto definido na primeira linha "
                "no formato 'Assunto: ...' e terminar com uma chamada para ação clara."
            ),
            TextGenerateType.EMAIL_PROPOSAL: (
                "Você é um assistente de vendas B2B especializado em propostas comerciais. "
                "Escreva um e-mail de encaminhamento de proposta em português brasileiro com tom profissional. "
                "O e-mail deve destacar os benefícios principais, ter assunto definido na primeira linha "
                "no formato 'Assunto: ...' e conter uma chamada para ação objetiva."
            ),
            TextGenerateType.EMAIL_CUSTOM: (
                "Você é um assistente de vendas B2B especializado em comunicação comercial. "
                "Escreva um e-mail em português brasileiro seguindo as instruções fornecidas no contexto. "
                "Mantenha tom profissional, defina o assunto na primeira linha no formato 'Assunto: ...' "
                "e adapte o conteúdo ao objetivo descrito."
            ),
            TextGenerateType.CARD_SUMMARY: (
                "Você é um assistente especializado em CRM e vendas B2B. "
                "Gere um resumo executivo do negócio em português brasileiro com no máximo 4 frases, "
                "destacando: situação atual, última interação relevante, ponto de atenção "
                "e sugestão de próximo passo."
            ),
        }

        # Fallback para tipo não mapeado (não deve acontecer, mas por segurança)
        return prompts.get(generate_type, prompts[TextGenerateType.EMAIL_CUSTOM])

    # -------------------------------------------------------------------------
    # Métodos públicos do Agent Growth
    # -------------------------------------------------------------------------

    async def agent_chat(
        self,
        action_id: AgentActionId,
        card_id: Optional[int],
        page_context: AgentPageContext,
        extra_params: Optional[dict],
        user_id: int,
        user_role: str = "salesperson",
        user_name: str = "",
    ) -> dict:
        """
        Orquestra a chamada ao prompt correto com base na ação selecionada pelo usuário.
        Retorna a resposta do LLM e sugestões de próximas ações (chips).

        O histórico da conversa NÃO é reenviado ao LLM — cada chamada é independente.
        Isso reduz custo de tokens e simplifica a implementação.

        O comportamento muda conforme o role:
        - admin/manager: visão ampla da equipe (todos os cards do board)
        - salesperson/sdr: visão individual (apenas seus próprios cards)
        """
        # Roles com visão gerencial (enxergam toda a equipe no pipeline)
        is_manager = user_role in ("admin", "manager")

        # Mapeamento de action_id → método de prompt
        board_id = (extra_params or {}).get("board_id")

        if action_id == AgentActionId.SUMMARIZE_CARD:
            card = self._get_card_or_404(card_id)
            system_p, user_p = self._prompt_summarize_card(card)
            max_tokens = 400
        elif action_id == AgentActionId.EMAIL_FOLLOWUP:
            card = self._get_card_or_404(card_id)
            system_p, user_p = self._prompt_email_followup(card)
            max_tokens = 700
        elif action_id == AgentActionId.EMAIL_PROPOSAL:
            card = self._get_card_or_404(card_id)
            system_p, user_p = self._prompt_email_proposal(card)
            max_tokens = 700
        elif action_id == AgentActionId.SUGGEST_NEXT_STEPS:
            card = self._get_card_or_404(card_id)
            system_p, user_p = self._prompt_suggest_next_steps(card)
            max_tokens = 500
        elif action_id == AgentActionId.OBJECTION_HANDLING:
            card = self._get_card_or_404(card_id)
            system_p, user_p = self._prompt_objection_handling(card)
            max_tokens = 600
        elif action_id == AgentActionId.ANALYZE_PIPELINE:
            # Sem board_id não há dados reais para analisar — resposta imediata sem chamar LLM
            if not board_id:
                return {
                    "message": "Para analisar o pipeline, abra um board específico e use esta opção de lá. Preciso dos dados reais do board para fazer uma análise útil.",
                    "suggestions": ["productivity_tips", "cold_call_tips"],
                    "tokens_used": 0,
                }
            system_p, user_p = await self._prompt_analyze_pipeline(
                board_id, is_manager=is_manager, user_id=user_id, user_name=user_name
            )
            max_tokens = 600
        elif action_id == AgentActionId.QUICK_WIN_TODAY:
            # Sem board_id não há dados reais — resposta imediata sem chamar LLM
            if not board_id:
                return {
                    "message": "Para identificar o quick win de hoje, abra um board específico e use esta opção de lá. Preciso ver os negócios reais do board para indicar qual tem maior chance de fechar.",
                    "suggestions": ["productivity_tips", "cold_call_tips"],
                    "tokens_used": 0,
                }
            system_p, user_p = await self._prompt_quick_win_today(
                board_id, is_manager=is_manager, user_id=user_id, user_name=user_name
            )
            max_tokens = 500
        elif action_id == AgentActionId.COLD_CALL_TIPS:
            system_p, user_p = self._prompt_cold_call_tips()
            max_tokens = 600
        elif action_id == AgentActionId.MY_DAY_TASKS:
            system_p, user_p = await self._prompt_my_day_tasks(user_id=user_id, user_name=user_name)
            max_tokens = 600
        elif action_id == AgentActionId.HOW_WAS_MY_DAY:
            system_p, user_p = await self._prompt_how_was_my_day(user_id=user_id, user_name=user_name)
            max_tokens = 600
        else:  # PRODUCTIVITY_TIPS
            system_p, user_p = self._prompt_productivity_tips()
            max_tokens = 500

        response = await self._call_openai(
            system_prompt=system_p,
            user_prompt=user_p,
            max_tokens=max_tokens
        )

        # Mapeamento de suggestions por action_id (chips exibidos após a resposta).
        # Ações de rotina diária sempre sugerem ações contextuais para o próximo passo.
        # Ações contextuais sempre oferecem voltar para a rotina diária.
        suggestions_map = {
            # Rotina diária → sugere ações contextuais úteis
            AgentActionId.MY_DAY_TASKS: ["how_was_my_day", "quick_win_today", "productivity_tips"],
            AgentActionId.HOW_WAS_MY_DAY: ["my_day_tasks", "productivity_tips", "cold_call_tips"],
            # Ações de card → sequência natural de trabalho no negócio
            AgentActionId.SUMMARIZE_CARD: ["suggest_next_steps", "email_followup", "objection_handling"],
            AgentActionId.SUGGEST_NEXT_STEPS: ["email_followup", "objection_handling", "summarize_card"],
            AgentActionId.EMAIL_FOLLOWUP: ["email_proposal", "objection_handling", "my_day_tasks"],
            AgentActionId.EMAIL_PROPOSAL: ["email_followup", "objection_handling", "my_day_tasks"],
            AgentActionId.OBJECTION_HANDLING: ["email_followup", "suggest_next_steps", "my_day_tasks"],
            # Ações de board → visão macro
            AgentActionId.ANALYZE_PIPELINE: ["quick_win_today", "my_day_tasks", "how_was_my_day"],
            AgentActionId.QUICK_WIN_TODAY: ["analyze_pipeline", "my_day_tasks", "how_was_my_day"],
            # Ações de dicas → encaminha de volta para rotina
            AgentActionId.COLD_CALL_TIPS: ["my_day_tasks", "how_was_my_day", "productivity_tips"],
            AgentActionId.PRODUCTIVITY_TIPS: ["my_day_tasks", "how_was_my_day", "cold_call_tips"],
        }

        return {
            "message": response["content"],
            "suggestions": suggestions_map.get(action_id, []),
            "tokens_used": response["tokens_used"],
        }

    # -------------------------------------------------------------------------
    # Prompts privados do Agent Growth
    # -------------------------------------------------------------------------

    def _prompt_summarize_card(self, card: Card) -> tuple[str, str]:
        """Resumo executivo do card para o vendedor retomar contexto rapidamente."""
        context = self._build_card_context(card)
        system = (
            "Você é um assistente especializado em CRM e vendas B2B. "
            "Analise os dados do negócio e gere um resumo executivo em português brasileiro. "
            "Use no máximo 4 frases, destacando: situação atual, última interação relevante, "
            "ponto de atenção e sugestão de próximo passo."
        )
        user = f"Gere um resumo executivo deste negócio:\n\n{context}"
        return system, user

    def _prompt_email_followup(self, card: Card) -> tuple[str, str]:
        """E-mail de follow-up personalizado com base nos dados do card."""
        context = self._build_card_context(card)
        system = (
            "Você é um assistente de vendas B2B especializado em comunicação comercial. "
            "Escreva um e-mail de follow-up em português brasileiro com tom profissional mas cordial. "
            "O e-mail deve ser breve (máximo 3 parágrafos), ter assunto na primeira linha "
            "no formato 'Assunto: ...' e terminar com uma chamada para ação clara."
        )
        user = f"Gere um e-mail de follow-up com base neste contexto:\n\n{context}"
        return system, user

    def _prompt_email_proposal(self, card: Card) -> tuple[str, str]:
        """E-mail de encaminhamento de proposta comercial."""
        context = self._build_card_context(card)
        system = (
            "Você é um assistente de vendas B2B especializado em propostas comerciais. "
            "Escreva um e-mail de encaminhamento de proposta em português brasileiro com tom profissional. "
            "O e-mail deve destacar os benefícios principais, ter assunto na primeira linha "
            "no formato 'Assunto: ...' e conter uma chamada para ação objetiva."
        )
        user = f"Gere um e-mail de proposta com base neste contexto:\n\n{context}"
        return system, user

    def _prompt_suggest_next_steps(self, card: Card) -> tuple[str, str]:
        """Sugere 3 a 5 ações concretas e priorizadas para avançar o negócio."""
        context = self._build_card_context(card)
        system = (
            "Você é um coach de vendas B2B experiente. "
            "Analise o estágio atual do negócio e sugira de 3 a 5 próximas ações concretas e priorizadas "
            "para avançar a negociação. Seja específico e prático. "
            "Responda em português brasileiro com lista numerada."
        )
        user = f"Quais são os próximos passos mais importantes para avançar este negócio?\n\n{context}"
        return system, user

    def _prompt_objection_handling(self, card: Card) -> tuple[str, str]:
        """Lista objeções prováveis e scripts de resposta baseados no contexto do card."""
        context = self._build_card_context(card)
        system = (
            "Você é um especialista em vendas consultivas B2B. "
            "Com base no contexto do negócio, identifique as 3 objeções mais prováveis do cliente "
            "e forneça um script de resposta objetivo para cada uma. "
            "Responda em português brasileiro no formato: Objeção → Resposta sugerida."
        )
        user = f"Quais objeções este cliente provavelmente levantará e como respondê-las?\n\n{context}"
        return system, user

    def _prompt_cold_call_tips(self) -> tuple[str, str]:
        """Roteiro prático de cold call para vendas B2B."""
        system = (
            "Você é um especialista em prospecção e cold call para vendas B2B. "
            "Forneça dicas práticas e um roteiro objetivo para uma ligação de prospecção eficaz. "
            "Foque em abordagem, quebra de gelo, qualificação rápida e geração de interesse. "
            "Responda em português brasileiro de forma direta e acionável."
        )
        user = "Dê dicas práticas e um roteiro para fazer cold calls eficazes em vendas B2B."
        return system, user

    def _prompt_productivity_tips(self) -> tuple[str, str]:
        """Dicas de produtividade para vendedores B2B."""
        system = (
            "Você é um coach de produtividade para times de vendas B2B. "
            "Forneça 5 dicas práticas e específicas para vendedores aumentarem sua produtividade "
            "e fecharem mais negócios. Foque em hábitos, gestão de tempo e priorização. "
            "Responda em português brasileiro com lista numerada e objetiva."
        )
        user = "Quais são as melhores dicas de produtividade para vendedores B2B?"
        return system, user

    async def _prompt_analyze_pipeline(
        self,
        board_id: Optional[int],
        is_manager: bool = False,
        user_id: int = 0,
        user_name: str = "",
    ) -> tuple[str, str]:
        """
        Analisa os cards do board e identifica gargalos no pipeline.

        - Admin/Gerente: vê todos os cards do board, com distribuição por vendedor
        - Vendedor/SDR: vê apenas os próprios cards
        """
        if board_id:
            # Monta a query base — admin/gerente vê tudo, vendedor vê só os seus
            query = (
                self.db.query(Card)
                .join(List, Card.list_id == List.id)
                .filter(
                    List.board_id == board_id,
                    Card.is_won == 0,
                    Card.deleted_at.is_(None)
                )
            )

            if not is_manager:
                # Vendedor/SDR: filtra apenas os cards atribuídos a ele
                query = query.filter(Card.assigned_to_id == user_id)

            cards = query.all()

            if cards:
                # Agrupa por etapa para mostrar distribuição
                stage_counts: dict[str, int] = {}
                total_value = 0.0
                for card in cards:
                    stage = card.list.name if card.list else "Desconhecida"
                    stage_counts[stage] = stage_counts.get(stage, 0) + 1
                    if card.value:
                        total_value += float(card.value)

                scope = "do board inteiro" if is_manager else f"de {user_name or 'você'}"
                pipeline_summary = f"Pipeline {scope}:\n"
                pipeline_summary += f"Total de cards abertos: {len(cards)}\n"
                pipeline_summary += f"Valor total em aberto: R$ {total_value:,.2f}\n"
                pipeline_summary += "Distribuição por etapa:\n"
                for stage, count in stage_counts.items():
                    pipeline_summary += f"  - {stage}: {count} card(s)\n"

                # Admin/Gerente: adiciona distribuição por vendedor para visão da equipe
                if is_manager:
                    seller_counts: dict[str, int] = {}
                    for card in cards:
                        seller = card.assigned_to.name if card.assigned_to else "Sem responsável"
                        seller_counts[seller] = seller_counts.get(seller, 0) + 1
                    pipeline_summary += "Distribuição por vendedor:\n"
                    for seller, count in sorted(seller_counts.items(), key=lambda x: -x[1]):
                        pipeline_summary += f"  - {seller}: {count} card(s)\n"

                context = pipeline_summary
            else:
                scope = "nenhum card aberto" if is_manager else f"nenhum card atribuído a {user_name or 'você'}"
                context = f"Nenhum card aberto encontrado ({scope}) neste board."
        else:
            context = "Nenhum board específico selecionado. Forneça análise genérica de boas práticas de pipeline."

        # Perspectiva do prompt varia conforme o role
        if is_manager:
            system = (
                "Você é um analista de vendas especializado em gestão de times comerciais B2B. "
                "Analise a distribuição do pipeline da equipe, identifique: "
                "1) Onde estão os principais gargalos, 2) Etapas com acúmulo excessivo, "
                "3) Vendedores com sobrecarga ou inatividade, "
                "4) Recomendações práticas para o gestor destravar o pipeline. "
                "Responda em português brasileiro de forma objetiva e gerencial."
            )
        else:
            system = (
                "Você é um coach de vendas B2B especializado em produtividade individual. "
                "Analise a distribuição dos negócios do vendedor no funil e identifique: "
                "1) Em quais etapas estão acumulando mais negócios, "
                "2) O que pode estar travando o avanço, "
                "3) Ações práticas para o vendedor destravar sua carteira. "
                "Responda em português brasileiro de forma objetiva e acionável."
            )
        user = f"Analise este pipeline e identifique os gargalos:\n\n{context}"
        return system, user

    async def _prompt_quick_win_today(
        self,
        board_id: Optional[int],
        is_manager: bool = False,
        user_id: int = 0,
        user_name: str = "",
    ) -> tuple[str, str]:
        """
        Identifica o card com maior probabilidade de fechar hoje.

        - Admin/Gerente: avalia o board inteiro, pode indicar card de qualquer vendedor
        - Vendedor/SDR: avalia apenas os próprios cards
        """
        if board_id:
            from sqlalchemy import asc, desc, nullslast

            # Monta query base — filtro de role aplicado ANTES do limit
            # (limit() após filter() em SQLAlchemy envolve a query em subquery,
            # o que quebraria a filtragem por assigned_to_id)
            query = (
                self.db.query(Card)
                .join(List, Card.list_id == List.id)
                .filter(
                    List.board_id == board_id,
                    Card.is_won == 0,
                    Card.deleted_at.is_(None)
                )
            )

            if not is_manager:
                # Vendedor/SDR vê apenas os próprios cards
                query = query.filter(Card.assigned_to_id == user_id)

            cards = (
                query
                .order_by(nullslast(asc(Card.due_date)), nullslast(desc(Card.value)))
                .limit(10)
                .all()
            )

            if cards:
                candidates = []
                for card in cards[:3]:
                    line = f"- {card.title}"
                    if card.list:
                        line += f" (etapa: {card.list.name})"
                    if is_manager and card.assigned_to:
                        line += f" | responsável: {card.assigned_to.name}"
                    if card.value:
                        line += f" | valor: R$ {float(card.value):,.2f}"
                    if card.due_date:
                        line += f" | prazo: {card.due_date.strftime('%d/%m/%Y')}"
                    candidates.append(line)

                context = "Candidatos a quick win:\n" + "\n".join(candidates)
            else:
                scope = "no board" if is_manager else f"na carteira de {user_name or 'você'}"
                context = f"Nenhum card aberto encontrado {scope}."
        else:
            context = "Nenhum board específico. Forneça orientação genérica sobre como identificar quick wins."

        if is_manager:
            system = (
                "Você é um gestor comercial B2B focado em resultados da equipe. "
                "Com base nos negócios apresentados, identifique qual tem maior chance de fechar hoje, "
                "qual vendedor deve ser priorizado e sugira ações concretas para garantir o fechamento. "
                "Responda em português brasileiro de forma direta e orientada para gestão."
            )
        else:
            system = (
                "Você é um coach de vendas B2B focado em resultados de curto prazo. "
                "Com base nos seus negócios, identifique qual tem maior chance de fechar hoje "
                "e sugira 2 a 3 ações específicas que você pode fazer agora para garantir o fechamento. "
                "Responda em português brasileiro de forma direta e motivadora."
            )
        user = f"Qual negócio tem maior chance de fechar hoje e o que fazer para garantir?\n\n{context}"
        return system, user

    async def _prompt_my_day_tasks(self, user_id: int, user_name: str) -> tuple[str, str]:
        """
        Lista as atividades agendadas para hoje e as atrasadas do usuário.
        Ajuda o vendedor a priorizar o que fazer primeiro no dia.
        """
        from datetime import datetime, timedelta

        now = datetime.utcnow()
        today_start = datetime(now.year, now.month, now.day, 0, 0, 0)
        today_end = datetime(now.year, now.month, now.day, 23, 59, 59)

        # Atividades agendadas para hoje (não concluídas)
        tasks_today = (
            self.db.query(CardTask)
            .filter(
                CardTask.assigned_to_id == user_id,
                CardTask.is_completed == False,
                CardTask.due_date >= today_start,
                CardTask.due_date <= today_end,
            )
            .order_by(CardTask.due_date.asc())
            .all()
        )

        # Atividades atrasadas (vencidas antes de hoje, não concluídas)
        tasks_overdue = (
            self.db.query(CardTask)
            .filter(
                CardTask.assigned_to_id == user_id,
                CardTask.is_completed == False,
                CardTask.due_date < today_start,
            )
            .order_by(CardTask.due_date.asc())
            .limit(10)
            .all()
        )

        # Mapeamento de tipos para português
        type_labels = {
            "call": "Ligação",
            "meeting": "Reunião",
            "task": "Tarefa",
            "follow_up": "Follow-up",
            "deadline": "Prazo",
            "email": "E-mail",
            "lunch": "Almoço",
            "other": "Outra",
        }
        priority_labels = {"urgent": "URGENTE", "high": "Alta", "normal": "Normal"}

        lines = [f"Agenda de {user_name or 'você'} para hoje ({now.strftime('%d/%m/%Y')}):\n"]

        if tasks_today:
            lines.append(f"Atividades de hoje ({len(tasks_today)}):")
            for t in tasks_today:
                tipo = type_labels.get(t.task_type.value if hasattr(t.task_type, 'value') else str(t.task_type), "Atividade")
                prio = priority_labels.get(t.priority.value if hasattr(t.priority, 'value') else str(t.priority), "")
                horario = t.due_date.strftime("%H:%M") if t.due_date else "sem horário"
                card_nome = t.card.title if t.card else "card desconhecido"
                linha = f"  - [{horario}] {tipo}: {t.title} (card: {card_nome})"
                if prio and prio != "Normal":
                    linha += f" ⚠ {prio}"
                if t.contact_name:
                    linha += f" | contato: {t.contact_name}"
                lines.append(linha)
        else:
            lines.append("Nenhuma atividade agendada para hoje.")

        if tasks_overdue:
            lines.append(f"\nAtividades atrasadas ({len(tasks_overdue)}):")
            for t in tasks_overdue:
                tipo = type_labels.get(t.task_type.value if hasattr(t.task_type, 'value') else str(t.task_type), "Atividade")
                dias_atraso = (now.date() - t.due_date.date()).days if t.due_date else "?"
                card_nome = t.card.title if t.card else "card desconhecido"
                lines.append(f"  - {tipo}: {t.title} (card: {card_nome}) — {dias_atraso} dia(s) de atraso")

        context = "\n".join(lines)

        system = (
            "Você é um assistente de produtividade para vendedores B2B. "
            "Analise a agenda do vendedor e ajude-o a priorizar o dia. "
            "Destaque: 1) O que é mais urgente ou importante fazer primeiro, "
            "2) Como organizar o tempo considerando os horários, "
            "3) Uma dica rápida para ser mais produtivo hoje. "
            "Se houver atividades atrasadas, mencione que precisam ser resolvidas. "
            "Seja direto, motivador e prático. Responda em português brasileiro."
        )
        user = f"O que devo priorizar para fazer hoje?\n\n{context}"
        return system, user

    async def _prompt_how_was_my_day(self, user_id: int, user_name: str) -> tuple[str, str]:
        """
        Analisa a produtividade do dia: movimentações de cards, atividades concluídas,
        notas criadas, cards ganhos/perdidos. Dá um feedback sobre o dia.
        """
        from datetime import datetime

        now = datetime.utcnow()
        today_start = datetime(now.year, now.month, now.day, 0, 0, 0)
        today_end = datetime(now.year, now.month, now.day, 23, 59, 59)

        # Atividades concluídas hoje
        tasks_completed = (
            self.db.query(CardTask)
            .filter(
                CardTask.assigned_to_id == user_id,
                CardTask.is_completed == True,
                CardTask.completed_at >= today_start,
                CardTask.completed_at <= today_end,
            )
            .all()
        )

        # Atividades ainda pendentes de hoje (não concluídas)
        tasks_pending = (
            self.db.query(CardTask)
            .filter(
                CardTask.assigned_to_id == user_id,
                CardTask.is_completed == False,
                CardTask.due_date >= today_start,
                CardTask.due_date <= today_end,
            )
            .count()
        )

        # Atividades novas criadas hoje pelo usuário
        tasks_created_today = (
            self.db.query(CardTask)
            .filter(
                CardTask.assigned_to_id == user_id,
                CardTask.created_at >= today_start,
                CardTask.created_at <= today_end,
            )
            .count()
        )

        # Eventos de timeline gerados pelo usuário hoje (movimentações, notas, etc.)
        activities_today = (
            self.db.query(Activity)
            .filter(
                Activity.user_id == user_id,
                Activity.created_at >= today_start,
                Activity.created_at <= today_end,
            )
            .all()
        )

        # Agrupa as atividades por tipo para resumo
        activity_summary: dict[str, int] = {}
        for act in activities_today:
            activity_summary[act.activity_type] = activity_summary.get(act.activity_type, 0) + 1

        # Tipos de eventos com labels amigáveis
        activity_labels = {
            "card_created": "cards criados",
            "card_moved": "cards movidos no funil",
            "card_closed": "cards fechados (ganho/perdido)",
            "card_updated": "atualizações em cards",
            "comment_added": "notas/comentários adicionados",
            "task_completed": "atividades concluídas via timeline",
            "attachment_added": "arquivos anexados",
            "assigned": "cards atribuídos",
        }

        # Monta o resumo do dia
        lines = [f"Resumo do dia de {user_name or 'você'} ({now.strftime('%d/%m/%Y')}):\n"]
        lines.append(f"Atividades concluídas: {len(tasks_completed)}")
        lines.append(f"Atividades criadas hoje: {tasks_created_today}")
        lines.append(f"Atividades pendentes de hoje: {tasks_pending}")
        lines.append(f"Total de movimentações no CRM: {len(activities_today)}")

        if activity_summary:
            lines.append("\nDetalhamento das movimentações:")
            for act_type, count in sorted(activity_summary.items(), key=lambda x: -x[1]):
                label = activity_labels.get(act_type, act_type.replace("_", " "))
                lines.append(f"  - {label}: {count}")

        if tasks_completed:
            lines.append(f"\nAtividades que você concluiu hoje:")
            for t in tasks_completed[:5]:  # Limita a 5 para não poluir o prompt
                card_nome = t.card.title if t.card else "card desconhecido"
                lines.append(f"  - {t.title} (card: {card_nome})")
            if len(tasks_completed) > 5:
                lines.append(f"  ... e mais {len(tasks_completed) - 5} outras.")

        context = "\n".join(lines)

        system = (
            "Você é um coach de vendas B2B que dá feedback diário sobre a produtividade. "
            "Analise as métricas do dia do vendedor e forneça: "
            "1) Uma avaliação honesta e motivadora de como foi o dia, "
            "2) O que foi bem e o que poderia ter sido melhor, "
            "3) Uma sugestão para amanhã. "
            "Use um tom encorajador mas realista. Se o dia foi pouco produtivo, "
            "seja gentil mas direto. Responda em português brasileiro."
        )
        user = f"Como foi meu dia hoje? Analise minha produtividade.\n\n{context}"
        return system, user
