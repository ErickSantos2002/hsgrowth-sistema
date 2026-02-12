"""
Schemas Pydantic para Attachments (Arquivos Anexados).
Define os modelos de entrada/saída para operações com arquivos.
"""
from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field, field_validator


class AttachmentBase(BaseModel):
    """Schema base para attachment"""
    original_filename: str = Field(..., max_length=500, description="Nome original do arquivo")
    file_size: int = Field(..., ge=1, description="Tamanho do arquivo em bytes")
    mime_type: str = Field(..., max_length=100, description="Tipo MIME do arquivo")


class AttachmentCreate(AttachmentBase):
    """
    Schema para criar um attachment.
    Usado internamente pelo service após receber o arquivo.
    """
    filename: str = Field(..., max_length=255, description="Nome único gerado para o arquivo")
    storage_path: str = Field(..., max_length=1000, description="Caminho de armazenamento relativo")
    card_id: int = Field(..., description="ID do card")
    uploaded_by_id: int = Field(..., description="ID do usuário que fez upload")

    @field_validator('file_size')
    @classmethod
    def validate_file_size(cls, v):
        """Valida tamanho máximo do arquivo (10MB)"""
        max_size = 10 * 1024 * 1024  # 10MB em bytes
        if v > max_size:
            raise ValueError(f'Arquivo muito grande. Tamanho máximo: 10MB')
        return v

    @field_validator('mime_type')
    @classmethod
    def validate_mime_type(cls, v):
        """Valida tipos de arquivo permitidos"""
        allowed_types = [
            # Documentos
            'application/pdf',
            'application/msword',  # .doc
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',  # .docx
            'application/vnd.ms-excel',  # .xls
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',  # .xlsx
            'text/plain',  # .txt
            'text/csv',  # .csv
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

        if v not in allowed_types:
            raise ValueError(f'Tipo de arquivo não permitido: {v}')

        return v


class AttachmentResponse(BaseModel):
    """Schema de resposta para attachment"""
    id: int
    card_id: int
    uploaded_by_id: Optional[int] = None

    # Informações do arquivo
    filename: str
    original_filename: str
    file_size: int
    mime_type: str
    storage_path: str

    # Informações do uploader
    uploader_name: Optional[str] = None
    uploader_email: Optional[str] = None

    # Timestamps
    created_at: datetime
    updated_at: datetime

    # Propriedades calculadas
    file_size_mb: Optional[float] = None
    file_extension: Optional[str] = None
    is_image: Optional[bool] = None
    is_pdf: Optional[bool] = None
    is_document: Optional[bool] = None

    model_config = {
        "from_attributes": True,
        "json_schema_extra": {
            "examples": [
                {
                    "id": 1,
                    "card_id": 123,
                    "uploaded_by_id": 5,
                    "filename": "abc123def456.pdf",
                    "original_filename": "proposta_comercial.pdf",
                    "file_size": 524288,
                    "mime_type": "application/pdf",
                    "storage_path": "cards/123/abc123def456.pdf",
                    "uploader_name": "João Silva",
                    "uploader_email": "joao@email.com",
                    "created_at": "2026-02-12T14:30:00Z",
                    "updated_at": "2026-02-12T14:30:00Z",
                    "file_size_mb": 0.5,
                    "file_extension": "pdf",
                    "is_image": False,
                    "is_pdf": True,
                    "is_document": False
                }
            ]
        }
    }


class AttachmentListResponse(BaseModel):
    """Schema para listagem de attachments"""
    attachments: list[AttachmentResponse]
    total: int = Field(..., description="Total de arquivos")
    total_size_mb: float = Field(..., description="Tamanho total em MB")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "attachments": [
                        {
                            "id": 1,
                            "original_filename": "proposta.pdf",
                            "file_size": 524288,
                            "mime_type": "application/pdf"
                        }
                    ],
                    "total": 3,
                    "total_size_mb": 2.5
                }
            ]
        }
    }
