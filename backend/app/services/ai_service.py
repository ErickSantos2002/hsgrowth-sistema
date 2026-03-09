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
from app.schemas.ai import TextGenerateType


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
