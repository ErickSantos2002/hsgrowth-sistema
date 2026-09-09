"""
Serviço de análise de transcrições de reuniões via OpenAI.

Recebe o conteúdo bruto VTT (gerado pelo Microsoft Teams),
converte para texto legível e envia para o GPT analisar.

Retorna JSON estruturado com:
- resumo: resumo da reunião em 3-5 frases
- sentimento: positivo | neutro | negativo
- interesse_cliente: alto | médio | baixo
- objecoes: lista de objeções levantadas
- proximos_passos: lista de próximos passos combinados
- pontos_de_atencao: alertas importantes para o vendedor
"""
import re
import json
from openai import OpenAI
from app.core.config import settings


ANALYSIS_PROMPT = """Você é um assistente especializado em análise de reuniões de vendas B2B.
Analise a transcrição abaixo e retorne APENAS um JSON válido com a estrutura exata a seguir:

{{
  "resumo": "Resumo objetivo em 3 a 5 frases do que foi discutido na reunião",
  "sentimento": "positivo",
  "interesse_cliente": "alto",
  "objecoes": ["objeção 1", "objeção 2"],
  "proximos_passos": ["próximo passo 1", "próximo passo 2"],
  "pontos_de_atencao": ["ponto de atenção 1"]
}}

Regras:
- "sentimento" deve ser exatamente: "positivo", "neutro" ou "negativo"
- "interesse_cliente" deve ser exatamente: "alto", "médio" ou "baixo"
- "objecoes" pode ser lista vazia [] se não houver objeções
- "proximos_passos" pode ser lista vazia [] se não foram definidos passos
- "pontos_de_atencao" pode ser lista vazia [] se não houver alertas
- Responda SOMENTE com o JSON, sem markdown, sem texto adicional

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

        client = OpenAI(api_key=settings.OPENAI_API_KEY)
        prompt = ANALYSIS_PROMPT.format(transcript=readable)

        try:
            response = client.chat.completions.create(
                model="gpt-4o",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.3,
                max_tokens=1000,
            )
            raw = response.choices[0].message.content.strip()

            # Remove markdown code blocks caso o modelo insira
            raw = re.sub(r"^```(?:json)?\s*", "", raw)
            raw = re.sub(r"\s*```$", "", raw)

            result = json.loads(raw)

            # Garante estrutura mínima
            result.setdefault("resumo", "")
            result.setdefault("sentimento", "neutro")
            result.setdefault("interesse_cliente", "médio")
            result.setdefault("objecoes", [])
            result.setdefault("proximos_passos", [])
            result.setdefault("pontos_de_atencao", [])

            return result

        except json.JSONDecodeError as e:
            raise ValueError(f"A IA retornou um JSON inválido: {e}")
        except Exception as e:
            raise ValueError(f"Erro ao analisar transcrição: {e}")


transcript_analysis_service = TranscriptAnalysisService()
