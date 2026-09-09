"""
Serviço de análise de transcrições de reuniões via OpenAI.

Recebe o VTT (do Microsoft Teams ou do Daily), converte para texto legível e
pede ao GPT uma leitura estruturada da conversa.

Devolve 14 campos: os 6 originais (resumo, sentimento, interesse, objeções,
próximos passos e pontos de atenção) e 8 acrescentados na Fase 3 — o que foi
combinado, produtos e concorrentes citados, orçamento, nota, decisor,
temperatura e o que o vendedor deixou passar.
"""
import re
import json
from openai import OpenAI
from app.core.config import settings


# Valor padrão de cada campo. A IA às vezes omite algum, e o card não pode
# quebrar por isso — melhor um campo vazio do que uma tela de erro.
CAMPOS_PADRAO = {
    "resumo": "",
    "sentimento": "neutro",
    "interesse_cliente": "médio",
    "objecoes": [],
    "proximos_passos": [],
    "pontos_de_atencao": [],
    "compromissos": [],
    "produtos_citados": [],
    "concorrentes": [],
    "orcamento": "",
    "nota": None,
    "decisor": "",
    "temperatura": "morno",
    "oportunidades_perdidas": [],
}


ANALYSIS_PROMPT = """Você analisa reuniões de vendas B2B de equipamentos de segurança do trabalho
(bafômetros, medidores e afins) para uma equipe comercial.

Leia a transcrição e devolva APENAS um JSON válido nesta estrutura:

{{
  "resumo": "3 a 5 frases sobre o que foi discutido",
  "sentimento": "positivo",
  "interesse_cliente": "alto",
  "objecoes": ["objeção levantada pelo cliente"],
  "proximos_passos": ["passo combinado na reunião"],
  "pontos_de_atencao": ["algo que merece atenção do vendedor"],
  "compromissos": [{{"quem": "Vendedor", "o_que": "enviar a proposta", "quando": "sexta-feira"}}],
  "produtos_citados": ["produto ou serviço mencionado"],
  "concorrentes": ["empresa concorrente citada e em que contexto"],
  "orcamento": "o que foi dito sobre valores, faixa e reação do cliente",
  "nota": 8,
  "decisor": "quem decide a compra e se estava presente",
  "temperatura": "quente",
  "oportunidades_perdidas": ["o que o vendedor poderia ter feito e não fez"]
}}

Regras de preenchimento:
- "sentimento": exatamente "positivo", "neutro" ou "negativo"
- "interesse_cliente": exatamente "alto", "médio" ou "baixo"
- "temperatura": exatamente "quente", "morno" ou "frio" — o quão perto de fechar,
  segundo o que o CLIENTE disse, não segundo o otimismo do vendedor
- "nota": inteiro de 0 a 10 para a condução da reunião pelo vendedor
- "compromissos": cada item com "quem", "o_que" e "quando"; use "" em "quando"
  se o prazo não foi dito
- Listas podem ficar vazias []; textos podem ficar ""

Regra mais importante — NÃO INVENTE:
- Só registre o que foi realmente dito na transcrição
- Não deduza valores, prazos, nomes de concorrentes ou compromissos que não
  apareceram. Preferir campo vazio a informação suposta: um compromisso ou um
  orçamento inventado leva a equipe a decidir errado
- Em "decisor", se não ficou claro quem decide, diga exatamente isso

Sobre "oportunidades_perdidas": este campo é lido pelo próprio vendedor.
Aponte o que dá para fazer diferente na próxima ("não foi perguntado o prazo
de decisão"), de forma construtiva e específica. Não julgue a pessoa nem use
tom de crítica.

Responda SOMENTE com o JSON, sem markdown e sem texto em volta.

Transcrição:
{transcript}"""


class TranscriptAnalysisService:

    def _parse_vtt(self, vtt_content: str) -> str:
        """
        Converte VTT (WebVTT) em texto legível, com o nome de quem falou.

        Precisa dar conta de dois formatos, porque o CRM usa os dois:

        Teams:
            00:00:01.000 --> 00:00:04.000
            <v João Silva>Olá, como vai?

        Daily:
            transcript:357
            00:00:01.000 --> 00:00:04.000
            <v Maria:</v>Bom dia, tudo bem?

        O do Daily traz identificadores de trecho e fecha a tag de voz. Sem
        tratar isso, o texto sai com números e marcação no meio das frases — e
        a IA analisa uma conversa que ninguém teve.

        Falas seguidas da mesma pessoa são juntadas: o Daily quebra a fala em
        trechos curtos, e repetir o nome a cada linha polui a leitura e gasta
        contexto do modelo à toa.

        Saída:
            João Silva: Olá, como vai?
        """
        normalized = vtt_content.replace("\r\n", "\n").replace("\r", "\n")

        # Cada turno é (quem falou, [o que falou])
        turnos: list[tuple[str | None, list[str]]] = []

        for line in normalized.split("\n"):
            trimmed = line.strip()

            if not trimmed:
                continue
            if trimmed == "WEBVTT" or trimmed.startswith("NOTE"):
                continue
            if "-->" in trimmed:
                continue
            if re.match(r"^\d+$", trimmed):
                continue
            # Identificador de trecho do Daily: "transcript:357"
            if re.match(r"^[A-Za-z_][A-Za-z0-9_-]*:\d+$", trimmed):
                continue

            # <v Nome>texto (Teams) ou <v Nome:</v>texto (Daily)
            voz = re.match(r"^<v(?:\s[^>]*?)?>\s*(.*)$", trimmed)
            if voz is None:
                voz = re.match(r"^<v\s+([^>]*?)>\s*(.*)$", trimmed)

            falante = None
            texto = trimmed

            # Daily: <v Maria:</v>Bom dia
            daily = re.match(r"^<v\s+([^<>]*?):?\s*</v>\s*(.*)$", trimmed)
            if daily:
                falante = (daily.group(1) or "").strip() or None
                texto = daily.group(2)
            else:
                # Teams: <v João Silva>Olá
                teams = re.match(r"^<v\s+([^>]+)>(.*)$", trimmed)
                if teams:
                    falante = teams.group(1).strip().rstrip(":") or None
                    texto = teams.group(2)

            texto = re.sub(r"</?[^>]+>", "", texto).strip()
            if not texto:
                continue

            atual = turnos[-1] if turnos else None
            if atual and atual[0] == falante:
                atual[1].append(texto)
            else:
                turnos.append((falante, [texto]))

        result = "\n".join(
            f"{falante}: {' '.join(falas)}" if falante else " ".join(falas)
            for falante, falas in turnos
        )

        # Limita a 12.000 caracteres para não estourar o contexto do GPT
        if len(result) > 12000:
            result = result[:12000] + "\n[... transcrição truncada ...]"
        return result

    def analyze(self, transcript_vtt: str) -> dict:
        """
        Analisa a transcrição VTT e retorna dict com análise estruturada.

        Raises:
            ValueError: Se a análise falhar ou o JSON retornado for inválido
        """
        if not settings.OPENAI_API_KEY:
            raise ValueError("OPENAI_API_KEY não configurada — análise IA indisponível.")

        readable = self._parse_vtt(transcript_vtt)
        if not readable.strip():
            raise ValueError("Transcrição vazia ou sem conteúdo legível.")

        result = self._chamar_openai(readable)

        # A IA às vezes omite campos. Preencher com o padrão evita que a tela
        # do card quebre por causa de uma chave ausente.
        for campo, padrao in CAMPOS_PADRAO.items():
            if campo not in result or result[campo] is None and padrao is not None:
                result[campo] = padrao if not isinstance(padrao, list) else list(padrao)

        return result

    def _chamar_openai(self, transcricao_legivel: str) -> dict:
        """
        Manda a transcrição para o modelo e devolve o JSON já convertido.

        Separado do `analyze` para que os testes possam simular a resposta sem
        gastar chamada real.
        """
        client = OpenAI(api_key=settings.OPENAI_API_KEY)
        prompt = ANALYSIS_PROMPT.format(transcript=transcricao_legivel)

        try:
            response = client.chat.completions.create(
                model="gpt-4o",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.3,
                # 14 campos pedem mais espaço de resposta que os 6 originais
                max_tokens=2500,
            )
            raw = response.choices[0].message.content.strip()

            # Remove markdown code blocks caso o modelo insira
            raw = re.sub(r"^```(?:json)?\s*", "", raw)
            raw = re.sub(r"\s*```$", "", raw)

            return json.loads(raw)

        except json.JSONDecodeError as e:
            raise ValueError(f"A IA retornou um JSON inválido: {e}")
        except ValueError:
            raise
        except Exception as e:
            raise ValueError(f"Erro ao analisar transcrição: {e}")


transcript_analysis_service = TranscriptAnalysisService()
