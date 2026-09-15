"""
Armazenamento das gravações no Cloudflare R2 (API compatível com S3).

O bucket é privado: nada nele é acessível por URL direta. Todo acesso — do
vendedor ou do cliente — passa por um link temporário assinado, que expira
sozinho. Se um link vazar, ele deixa de funcionar no prazo.

O nome do arquivo carrega o título da reunião, porque a sala se chama
`hsg-{id}` e não diz nada sobre o assunto: sem isso, achar uma gravação no
bucket seria adivinhação (seção 15.11 do design).
"""
import re
import unicodedata
from datetime import datetime
from typing import Optional

from app.core.config import settings

# Deixa o nome do arquivo curto o bastante para caber em caminho e listagem
TAMANHO_MAXIMO_TITULO = 60

# Tamanho de cada parte no envio de arquivo grande. O S3 exige no mínimo 5 MB
# por parte (exceto a última); 8 MB dá margem sem pesar na memória.
TAMANHO_BLOCO = 8 * 1024 * 1024


def montar_chave_gravacao(
    titulo: str, task_id: int, quando: Optional[datetime] = None, parte: int = 1
) -> str:
    """
    Monta o caminho do arquivo no bucket.

    Organiza por ano/mês (facilita achar e aplicar a retenção depois) e usa
    data + título + id da tarefa no nome:

        2026/09/2026-09-10-apresentacao-de-proposta-36197.mp4
    """
    quando = quando or datetime.utcnow()

    # tira acento, deixa minúsculo e troca o que não for letra/número por hífen
    sem_acento = unicodedata.normalize("NFKD", titulo or "").encode("ascii", "ignore").decode()
    limpo = re.sub(r"[^a-zA-Z0-9]+", "-", sem_acento).strip("-").lower()
    limpo = limpo[:TAMANHO_MAXIMO_TITULO].strip("-")

    partes = [quando.strftime("%Y-%m-%d")]
    if limpo:
        partes.append(limpo)
    partes.append(str(task_id))

    # A partir do segundo trecho o nome ganha sufixo: sem isso, gravar em
    # partes faria um arquivo sobrescrever o outro no bucket.
    if parte > 1:
        partes.append(f"parte{parte}")

    return f"{quando.strftime('%Y/%m')}/{'-'.join(partes)}.mp4"


class StorageService:
    """Operações no bucket de gravações."""

    def _cliente(self):
        """
        Cria o cliente do R2.

        Erro de configuração precisa aparecer aqui, e não virar arquivo
        perdido silenciosamente.
        """
        if not (settings.R2_ACCOUNT_ID and settings.R2_ACCESS_KEY_ID and settings.R2_SECRET_ACCESS_KEY):
            raise ValueError(
                "Credenciais do R2 não configuradas — armazenamento de gravação indisponível."
            )

        import boto3

        return boto3.client(
            "s3",
            endpoint_url=f"https://{settings.R2_ACCOUNT_ID}.r2.cloudflarestorage.com",
            aws_access_key_id=settings.R2_ACCESS_KEY_ID,
            aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
            region_name="auto",
        )

    def upload(self, conteudo: bytes, chave: str, content_type: str = "video/mp4") -> str:
        """Sobe o arquivo e devolve a chave usada."""
        cliente = self._cliente()

        cliente.put_object(
            Bucket=settings.R2_BUCKET,
            Key=chave,
            Body=conteudo,
            ContentType=content_type,
        )

        return chave

    def upload_em_partes(self, blocos, chave: str, content_type: str = "video/mp4") -> int:
        """
        Sobe um arquivo grande sem carregá-lo inteiro na memória.

        `blocos` é um gerador que entrega o arquivo em pedaços. Eles são
        enviados um a um e montados no bucket no final — o resultado é **um
        arquivo único**, igual a qualquer outro. As "partes" existem apenas
        durante o transporte.

        É assim que uma gravação de 1 hora (500 MB ou mais) passa por um
        servidor que não teria memória para segurá-la de uma vez.

        Se algo falhar no meio, o envio é abortado e nenhum arquivo pela
        metade fica no bucket — melhor nenhum vídeo do que um truncado.

        Returns:
            Total de bytes enviados.
        """
        cliente = self._cliente()

        acumulado = b""
        total = 0
        partes = []
        upload_id: Optional[str] = None

        def _garantir_upload_aberto() -> str:
            nonlocal upload_id
            if upload_id is None:
                resposta = cliente.create_multipart_upload(
                    Bucket=settings.R2_BUCKET, Key=chave, ContentType=content_type
                )
                upload_id = resposta["UploadId"]
            return upload_id

        try:
            for bloco in blocos:
                if not bloco:
                    continue
                acumulado += bloco
                total += len(bloco)

                # O S3 exige que cada parte (menos a última) tenha um tamanho
                # mínimo, então acumulamos até atingir o bloco antes de enviar.
                while len(acumulado) >= TAMANHO_BLOCO:
                    pedaco, acumulado = acumulado[:TAMANHO_BLOCO], acumulado[TAMANHO_BLOCO:]
                    numero = len(partes) + 1
                    resposta = cliente.upload_part(
                        Bucket=settings.R2_BUCKET,
                        Key=chave,
                        PartNumber=numero,
                        UploadId=_garantir_upload_aberto(),
                        Body=pedaco,
                    )
                    partes.append({"PartNumber": numero, "ETag": resposta["ETag"]})

            # Arquivo pequeno: não vale abrir envio em partes
            if upload_id is None:
                cliente.put_object(
                    Bucket=settings.R2_BUCKET,
                    Key=chave,
                    Body=acumulado,
                    ContentType=content_type,
                )
                return total

            # Sobra final vira a última parte (pode ser menor que o mínimo)
            if acumulado:
                numero = len(partes) + 1
                resposta = cliente.upload_part(
                    Bucket=settings.R2_BUCKET,
                    Key=chave,
                    PartNumber=numero,
                    UploadId=upload_id,
                    Body=acumulado,
                )
                partes.append({"PartNumber": numero, "ETag": resposta["ETag"]})

            # "junta tudo": é aqui que as partes viram um arquivo só
            cliente.complete_multipart_upload(
                Bucket=settings.R2_BUCKET,
                Key=chave,
                UploadId=upload_id,
                MultipartUpload={"Parts": partes},
            )

            return total

        except Exception:
            if upload_id is not None:
                try:
                    cliente.abort_multipart_upload(
                        Bucket=settings.R2_BUCKET, Key=chave, UploadId=upload_id
                    )
                except Exception as e:
                    print(f"[STORAGE] Aviso: falha ao abortar envio de {chave}: {e}")
            raise

    def gerar_link_temporario(self, chave: str, dias: Optional[int] = None) -> str:
        """
        Devolve uma URL assinada, válida pelo prazo informado.

        É por aqui que a gravação é assistida ou baixada — o bucket em si
        nunca fica público.
        """
        cliente = self._cliente()
        dias = dias if dias is not None else settings.R2_LINK_EXPIRACAO_DIAS

        return cliente.generate_presigned_url(
            "get_object",
            Params={"Bucket": settings.R2_BUCKET, "Key": chave},
            ExpiresIn=dias * 24 * 3600,
        )

    def apagar(self, chave: str) -> bool:
        """
        Remove o arquivo.

        Devolve False em caso de falha em vez de levantar: a rotina de descarte
        percorre muitos arquivos, e um problemático não pode interromper os
        demais.
        """
        try:
            cliente = self._cliente()
            cliente.delete_object(Bucket=settings.R2_BUCKET, Key=chave)
            return True
        except Exception as e:
            print(f"[STORAGE] Falha ao apagar {chave}: {e}")
            return False


storage_service = StorageService()
