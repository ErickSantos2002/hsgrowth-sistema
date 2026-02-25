"""
Service para gerenciamento de Attachments (arquivos anexados).
Responsável pela lógica de upload, download e deleção de arquivos.
"""
import os
import uuid
import shutil
from pathlib import Path
from typing import List, Optional
from fastapi import UploadFile, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.models.attachment import Attachment
from app.models.user import User
from app.repositories.attachment_repository import AttachmentRepository
from app.schemas.attachment import AttachmentCreate, AttachmentResponse, AttachmentListResponse


class AttachmentService:
    """Service para operações com attachments"""

    # Configurações
    UPLOAD_DIR = Path("/app/uploads")  # Diretório base (volume montado)
    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB em bytes

    ALLOWED_MIME_TYPES = [
        # Documentos
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain',
        'text/csv',
        # Imagens
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'image/webp',
        # Compactados
        'application/zip',
        'application/x-rar-compressed',
        'application/x-7z-compressed',
    ]

    def __init__(self, db: Session):
        self.db = db
        self.repository = AttachmentRepository(db)

        # Garante que o diretório base existe
        self.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

    async def upload_file(
        self,
        card_id: int,
        file: UploadFile,
        uploaded_by: User,
        attachment_type: str = 'general'
    ) -> AttachmentResponse:
        """
        Faz upload de um arquivo e salva no volume.

        Fluxo:
        1. Validar tipo e tamanho do arquivo
        2. Gerar nome único
        3. Salvar arquivo no disco (/app/uploads/cards/{card_id}/)
        4. Criar registro no banco de dados
        5. Retornar informações do attachment
        """
        # Validação de tipo de arquivo
        if file.content_type not in self.ALLOWED_MIME_TYPES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Tipo de arquivo não permitido: {file.content_type}. "
                       f"Tipos permitidos: PDF, DOCX, XLSX, TXT, CSV, imagens (JPG, PNG, GIF, WEBP), ZIP, RAR, 7Z"
            )

        # Ler arquivo para memória (necessário para validar tamanho)
        file_content = await file.read()
        file_size = len(file_content)

        # Validação de tamanho
        if file_size > self.MAX_FILE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"Arquivo muito grande. Tamanho máximo: 10MB"
            )

        # Gerar nome único para o arquivo (mantém extensão original)
        original_filename = file.filename
        file_extension = Path(original_filename).suffix  # Pega extensão (.pdf, .jpg, etc)
        unique_filename = f"{uuid.uuid4().hex}{file_extension}"

        # Definir caminho de armazenamento: cards/{card_id}/
        card_dir = self.UPLOAD_DIR / "cards" / str(card_id)
        card_dir.mkdir(parents=True, exist_ok=True)

        # Caminho completo do arquivo
        file_path = card_dir / unique_filename

        # Salvar arquivo no disco
        try:
            with open(file_path, "wb") as f:
                f.write(file_content)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Erro ao salvar arquivo no disco: {str(e)}"
            )

        # Caminho relativo (para salvar no banco)
        storage_path = f"cards/{card_id}/{unique_filename}"

        # Criar registro no banco de dados
        attachment_data = AttachmentCreate(
            filename=unique_filename,
            original_filename=original_filename,
            file_size=file_size,
            mime_type=file.content_type,
            storage_path=storage_path,
            card_id=card_id,
            uploaded_by_id=uploaded_by.id,
            attachment_type=attachment_type
        )

        attachment = self.repository.create(attachment_data)

        # Retornar response com propriedades calculadas
        return self._to_response(attachment)

    def download_file(self, attachment_id: int, current_user: User) -> FileResponse:
        """
        Faz download de um arquivo.
        Retorna FileResponse para o FastAPI servir o arquivo.
        """
        # Buscar attachment no banco
        attachment = self.repository.get_by_id(attachment_id)

        if not attachment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Arquivo não encontrado"
            )

        # TODO: Verificar permissões (apenas dono do card ou admin)
        # Por enquanto, qualquer usuário autenticado pode baixar

        # Caminho completo do arquivo
        file_path = self.UPLOAD_DIR / attachment.storage_path

        # Verificar se arquivo existe no disco
        if not file_path.exists():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Arquivo não encontrado no servidor"
            )

        # Retornar FileResponse
        return FileResponse(
            path=str(file_path),
            filename=attachment.original_filename,
            media_type=attachment.mime_type
        )

    def delete_file(self, attachment_id: int, current_user: User) -> None:
        """
        Deleta um arquivo (soft delete no banco + remove do disco).

        TODO: Implementar verificação de permissões
        """
        # Buscar attachment
        attachment = self.repository.get_by_id(attachment_id)

        if not attachment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Arquivo não encontrado"
            )

        # TODO: Verificar permissões (apenas uploader ou admin)

        # Caminho completo do arquivo
        file_path = self.UPLOAD_DIR / attachment.storage_path

        # Remover arquivo do disco
        try:
            if file_path.exists():
                file_path.unlink()  # Remove o arquivo
        except Exception as e:
            # Loga erro mas continua (soft delete no banco é mais importante)
            print(f"Erro ao deletar arquivo do disco: {e}")

        # Soft delete no banco
        self.repository.delete(attachment)

    def list_files(self, card_id: int) -> AttachmentListResponse:
        """
        Lista todos os arquivos de um card.
        Retorna lista + estatísticas (total de arquivos, tamanho total).
        """
        attachments = self.repository.get_by_card_id(card_id)

        # Converter para response
        attachments_response = [self._to_response(att) for att in attachments]

        # Calcular estatísticas
        total = len(attachments)
        total_size_bytes = self.repository.get_total_size_by_card(card_id)
        total_size_mb = round(total_size_bytes / (1024 * 1024), 2)

        return AttachmentListResponse(
            attachments=attachments_response,
            total=total,
            total_size_mb=total_size_mb
        )

    def _to_response(self, attachment: Attachment) -> AttachmentResponse:
        """
        Converte model Attachment para AttachmentResponse.
        Adiciona informações do uploader e propriedades calculadas.
        """
        return AttachmentResponse(
            id=attachment.id,
            card_id=attachment.card_id,
            uploaded_by_id=attachment.uploaded_by_id,
            filename=attachment.filename,
            original_filename=attachment.original_filename,
            file_size=attachment.file_size,
            mime_type=attachment.mime_type,
            storage_path=attachment.storage_path,
            attachment_type=attachment.attachment_type,
            uploader_name=attachment.uploaded_by.name if attachment.uploaded_by else None,
            uploader_email=attachment.uploaded_by.email if attachment.uploaded_by else None,
            created_at=attachment.created_at,
            updated_at=attachment.updated_at,
            file_size_mb=attachment.file_size_mb,
            file_extension=attachment.file_extension,
            is_image=attachment.is_image,
            is_pdf=attachment.is_pdf,
            is_document=attachment.is_document
        )
