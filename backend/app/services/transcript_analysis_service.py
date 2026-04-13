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

{
  "resumo": "Resumo objetivo em 3 a 5 frases do que foi discutido na reunião",
  "sentimento": "positivo",
  "interesse_cliente": "alto",
  "objecoes": ["objeção 1", "objeção 2"],
  "proximos_passos": ["próximo passo 1", "próximo passo 2"],
  "pontos_de_atencao": ["ponto de atenção 1"]
}

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
        Converte VTT (WebVTT) para texto legível.
        Remove timestamps e tags HTML, preserva nome do falante quando disponível.

        Exemplo de entrada VTT:
            WEBVTT
            00:00:01.000 --> 00:00:04.000
            <v João Silva>Olá, como vai?

        Saída:
            João Silva: Olá, como vai?
        """
        lines = []
        blocks = vtt_content.strip().split("\n\n")

        for block in blocks:
            block = block.strip()
            if not block or block.startswith("WEBVTT") or block.startswith("NOTE"):
                continue

            block_lines = block.split("\n")
            text_lines = []

            for line in block_lines:
                # Pular linhas de timestamp e numeração
                if re.match(r"^\d{2}:\d{2}:\d{2}", line) or re.match(r"^\d+$", line):
                    continue

                # Extrair nome do falante da tag <v NomeFalante>
                speaker_match = re.match(r"<v ([^>]+)>(.*)", line)
                if speaker_match:
                    speaker = speaker_match.group(1).strip()
                    text = speaker_match.group(2).strip()
                    # Remove outras tags HTML do texto
                    text = re.sub(r"<[^>]+>", "", text).strip()
                    if text:
                        text_lines.append(f"{speaker}: {text}")
                else:
                    # Remove tags HTML genéricas
                    clean = re.sub(r"<[^>]+>", "", line).strip()
                    if clean:
                        text_lines.append(clean)

            lines.extend(text_lines)

        result = "\n".join(lines)
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
