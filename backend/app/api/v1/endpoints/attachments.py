"""
Endpoints da API para gerenciamento de Attachments (arquivos anexados).

Rotas disponíveis:
- POST /cards/{card_id}/attachments - Upload de arquivo
- GET /cards/{card_id}/attachments - Listar arquivos de um card
- GET /attachments/{attachment_id}/download - Download de arquivo
- DELETE /attachments/{attachment_id} - Deletar arquivo
"""
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, status, Request
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List

from app.api.deps import get_db, get_current_active_user
from app.models.user import User
from app.models.audit_log import AuditLog
from app.services.attachment_service import AttachmentService
from app.schemas.attachment import AttachmentResponse, AttachmentListResponse
from app.repositories.activity_repository import ActivityRepository


router = APIRouter()


@router.post(
    "/cards/{card_id}/attachments",
    response_model=AttachmentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload de arquivo",
    description="""
    Faz upload de um arquivo e vincula a um card.

    **Restrições:**
    - Tamanho máximo: 10MB
    - Tipos permitidos: PDF, DOCX, XLSX, TXT, CSV, imagens (JPG, PNG, GIF, WEBP), ZIP, RAR, 7Z

    **Fluxo:**
    1. Arquivo é enviado via multipart/form-data
    2. Sistema valida tipo e tamanho
    3. Arquivo é salvo em /app/uploads/cards/{card_id}/
    4. Registro é criado no banco de dados
    5. Informações do arquivo são retornadas
    """,
    responses={
        201: {
            "description": "Arquivo enviado com sucesso",
            "content": {
                "application/json": {
                    "example": {
                        "id": 1,
                        "card_id": 123,
                        "original_filename": "proposta_comercial.pdf",
                        "file_size": 524288,
                        "file_size_mb": 0.5,
                        "mime_type": "application/pdf",
                        "is_pdf": True,
                        "uploader_name": "João Silva"
                    }
                }
            }
        },
        400: {"description": "Tipo de arquivo não permitido"},
        413: {"description": "Arquivo muito grande (máximo 10MB)"},
        500: {"description": "Erro ao salvar arquivo no servidor"}
    }
)
async def upload_file(
    card_id: int,
    request: Request,
    file: UploadFile = File(..., description="Arquivo a ser enviado"),
    attachment_type: str = Form(default='general', description="Tipo do anexo: 'general' ou 'proposal'"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Upload de arquivo para um card"""
    service = AttachmentService(db)
    attachment = await service.upload_file(card_id, file, current_user, attachment_type)

    # Registra no audit log
    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")

    audit_log = AuditLog(
        user_id=current_user.id,
        action="CREATE",
        entity_type="Attachment",
        entity_id=attachment.id,
        description=f"Arquivo anexado: {attachment.original_filename} ({attachment.file_size_mb:.2f} MB) ao card #{card_id}",
        ip_address=client_ip,
        user_agent=user_agent,
        data_after={
            "filename": attachment.original_filename,
            "file_size_mb": attachment.file_size_mb,
            "mime_type": attachment.mime_type,
            "card_id": card_id
        }
    )
    db.add(audit_log)
    db.commit()

    # Registra no histórico de atividades do card (visível para o usuário)
    activity_repo = ActivityRepository(db)
    activity_repo.create(
        card_id=card_id,
        user_id=current_user.id,
        activity_type="file_attached",
        description=f"Arquivo anexado: {attachment.original_filename} ({attachment.file_size_mb:.2f} MB)",
        activity_metadata={
            "filename": attachment.original_filename,
            "file_size_mb": round(attachment.file_size_mb, 2),
            "mime_type": attachment.mime_type,
            "attachment_id": attachment.id
        }
    )

    return attachment


@router.get(
    "/cards/{card_id}/attachments",
    response_model=AttachmentListResponse,
    summary="Listar arquivos de um card",
    description="""
    Retorna todos os arquivos anexados a um card.

    **Retorna:**
    - Lista de arquivos com informações completas
    - Total de arquivos
    - Tamanho total em MB
    """,
    responses={
        200: {
            "description": "Lista de arquivos retornada com sucesso",
            "content": {
                "application/json": {
                    "example": {
                        "attachments": [
                            {
                                "id": 1,
                                "original_filename": "proposta.pdf",
                                "file_size_mb": 0.5,
                                "mime_type": "application/pdf",
                                "is_pdf": True
                            }
                        ],
                        "total": 3,
                        "total_size_mb": 2.5
                    }
                }
            }
        }
    }
)
def list_files(
    card_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Lista todos os arquivos de um card"""
    service = AttachmentService(db)
    return service.list_files(card_id)


@router.get(
    "/attachments/{attachment_id}/download",
    response_class=FileResponse,
    summary="Download de arquivo",
    description="""
    Faz download de um arquivo anexado.

    **Retorna:**
    - Arquivo binário com Content-Type correto
    - Nome original do arquivo no header Content-Disposition
    """,
    responses={
        200: {
            "description": "Arquivo retornado com sucesso",
            "content": {
                "application/octet-stream": {
                    "example": "arquivo binário..."
                }
            }
        },
        404: {"description": "Arquivo não encontrado"}
    }
)
def download_file(
    attachment_id: int,
    request: Request,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Faz download de um arquivo"""
    service = AttachmentService(db)

    # Busca informações do arquivo para o log
    attachment = service.repository.get_by_id(attachment_id)

    if attachment:
        # Registra no audit log
        client_ip = request.client.host if request.client else "unknown"
        user_agent = request.headers.get("user-agent", "unknown")

        audit_log = AuditLog(
            user_id=current_user.id,
            action="READ",
            entity_type="Attachment",
            entity_id=attachment_id,
            description=f"Download de arquivo: {attachment.original_filename} do card #{attachment.card_id}",
            ip_address=client_ip,
            user_agent=user_agent
        )
        db.add(audit_log)
        db.commit()

    return service.download_file(attachment_id, current_user)


@router.delete(
    "/attachments/{attachment_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Deletar arquivo",
    description="""
    Deleta um arquivo anexado.

    **Ação:**
    - Remove arquivo do disco
    - Faz soft delete no banco de dados

    **Permissões:**
    - Apenas o usuário que fez upload ou admin podem deletar
    """,
    responses={
        204: {"description": "Arquivo deletado com sucesso"},
        404: {"description": "Arquivo não encontrado"}
    }
)
def delete_file(
    attachment_id: int,
    request: Request,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Deleta um arquivo"""
    service = AttachmentService(db)

    # Busca informações do arquivo antes de deletar (para o log)
    attachment = service.repository.get_by_id(attachment_id)

    if not attachment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Arquivo não encontrado"
        )

    # Salva informações para o log de auditoria
    attachment_info = {
        "filename": attachment.original_filename,
        "file_size_mb": round(attachment.file_size / (1024 * 1024), 2),
        "mime_type": attachment.mime_type,
        "card_id": attachment.card_id
    }

    # Deleta o arquivo
    service.delete_file(attachment_id, current_user)

    # Registra no audit log
    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")

    audit_log = AuditLog(
        user_id=current_user.id,
        action="DELETE",
        entity_type="Attachment",
        entity_id=attachment_id,
        description=f"Arquivo deletado: {attachment_info['filename']} ({attachment_info['file_size_mb']:.2f} MB) do card #{attachment_info['card_id']}",
        ip_address=client_ip,
        user_agent=user_agent,
        data_before=attachment_info
    )
    db.add(audit_log)
    db.commit()

    # Registra no histórico de atividades do card (visível para o usuário)
    activity_repo = ActivityRepository(db)
    activity_repo.create(
        card_id=attachment_info["card_id"],
        user_id=current_user.id,
        activity_type="file_deleted",
        description=f"Arquivo removido: {attachment_info['filename']} ({attachment_info['file_size_mb']:.2f} MB)",
        activity_metadata={
            "filename": attachment_info["filename"],
            "file_size_mb": attachment_info["file_size_mb"],
            "mime_type": attachment_info["mime_type"]
        }
    )

    return None  # FastAPI retorna 204 automaticamente
