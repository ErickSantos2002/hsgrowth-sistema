"""
Endpoints para upload e gerenciamento de avatar de usuário.
"""
import os
import uuid
from pathlib import Path
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status, Request
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_active_user
from app.models.user import User
from app.models.audit_log import AuditLog
from app.repositories.user_repository import UserRepository

router = APIRouter()

# Configurações
UPLOAD_DIR = Path("/app/uploads/avatars")
SIGNATURE_UPLOAD_DIR = Path("/app/uploads/signatures")
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB
ALLOWED_MIME_TYPES = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
]


@router.post(
    "/users/me/avatar",
    summary="Upload de avatar do usuário atual",
    description="""
    Faz upload de uma imagem de avatar para o usuário atual.

    **Restrições:**
    - Tamanho máximo: 5MB
    - Tipos permitidos: JPG, PNG, GIF, WEBP
    - Apenas o próprio usuário pode fazer upload do seu avatar

    **Fluxo:**
    1. Valida tipo e tamanho da imagem
    2. Remove avatar antigo se existir
    3. Salva novo avatar em /app/uploads/avatars/{user_id}/
    4. Atualiza campo avatar_url no banco
    5. Registra ação no log de auditoria
    """,
    responses={
        200: {
            "description": "Avatar atualizado com sucesso",
            "content": {
                "application/json": {
                    "example": {
                        "message": "Avatar atualizado com sucesso",
                        "avatar_url": "/api/v1/users/123/avatar"
                    }
                }
            }
        },
        400: {"description": "Tipo de arquivo não permitido ou arquivo muito grande"},
        500: {"description": "Erro ao salvar arquivo"}
    }
)
async def upload_avatar(
    request: Request,
    file: UploadFile = File(..., description="Imagem do avatar"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Upload de avatar do usuário atual"""

    # Validação de tipo
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Tipo de arquivo não permitido: {file.content_type}. "
                   f"Tipos permitidos: JPG, PNG, GIF, WEBP"
        )

    # Ler arquivo e validar tamanho
    file_content = await file.read()
    file_size = len(file_content)

    if file_size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Arquivo muito grande. Tamanho máximo: 5MB"
        )

    # Criar diretório do usuário
    user_dir = UPLOAD_DIR / str(current_user.id)
    user_dir.mkdir(parents=True, exist_ok=True)

    # Remover avatar antigo se existir
    if current_user.avatar_url:
        try:
            # Extrair nome do arquivo do avatar_url
            old_filename = current_user.avatar_url.split('/')[-1]
            old_file_path = user_dir / old_filename
            if old_file_path.exists():
                old_file_path.unlink()
        except Exception as e:
            print(f"Erro ao deletar avatar antigo: {e}")

    # Gerar nome único
    file_extension = Path(file.filename).suffix
    unique_filename = f"{uuid.uuid4().hex}{file_extension}"
    file_path = user_dir / unique_filename

    # Salvar arquivo
    try:
        with open(file_path, "wb") as f:
            f.write(file_content)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao salvar arquivo: {str(e)}"
        )

    # Atualizar avatar_url no banco
    avatar_url = f"/api/v1/users/{current_user.id}/avatar"
    current_user.avatar_url = avatar_url
    db.commit()
    db.refresh(current_user)

    # Registrar no audit log
    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")

    audit_log = AuditLog(
        user_id=current_user.id,
        action="UPDATE",
        entity_type="User",
        entity_id=current_user.id,
        description=f"Avatar atualizado: {unique_filename}",
        ip_address=client_ip,
        user_agent=user_agent,
        data_after={
            "avatar_url": avatar_url,
            "filename": unique_filename,
            "file_size": file_size
        }
    )
    db.add(audit_log)
    db.commit()

    return {
        "message": "Avatar atualizado com sucesso",
        "avatar_url": avatar_url
    }


@router.get(
    "/users/{user_id}/avatar",
    response_class=FileResponse,
    summary="Obtém avatar do usuário",
    description="""
    Retorna a imagem de avatar de um usuário.

    **Comportamento:**
    - Retorna a imagem se existir
    - Retorna 404 se usuário não tiver avatar
    """,
    responses={
        200: {
            "description": "Avatar retornado com sucesso",
            "content": {
                "image/jpeg": {},
                "image/png": {},
                "image/gif": {},
                "image/webp": {}
            }
        },
        404: {"description": "Avatar não encontrado"}
    }
)
def get_avatar(
    user_id: int,
    db: Session = Depends(get_db)
):
    """Retorna avatar do usuário"""

    # Buscar usuário
    user_repo = UserRepository(db)
    user = user_repo.find_by_id(user_id)

    if not user or not user.avatar_url:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Avatar não encontrado"
        )

    # Buscar arquivo no disco
    user_dir = UPLOAD_DIR / str(user_id)

    # Listar arquivos no diretório do usuário (deve ter apenas 1)
    if not user_dir.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Avatar não encontrado no servidor"
        )

    # Pegar o primeiro arquivo (deve ser o avatar)
    avatar_files = list(user_dir.glob("*"))
    if not avatar_files:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Avatar não encontrado no servidor"
        )

    avatar_path = avatar_files[0]

    # Detectar mime type baseado na extensão
    extension = avatar_path.suffix.lower()
    mime_types = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp'
    }
    media_type = mime_types.get(extension, 'image/jpeg')

    return FileResponse(
        path=str(avatar_path),
        media_type=media_type
    )


@router.delete(
    "/users/me/avatar",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remove avatar do usuário atual",
    description="""
    Remove o avatar do usuário atual.

    **Ação:**
    - Remove arquivo do disco
    - Limpa campo avatar_url no banco
    - Registra ação no log de auditoria
    """,
    responses={
        204: {"description": "Avatar removido com sucesso"},
        404: {"description": "Avatar não encontrado"}
    }
)
async def delete_avatar(
    request: Request,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Remove avatar do usuário atual"""

    if not current_user.avatar_url:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Você não possui avatar"
        )

    # Remover arquivo do disco
    user_dir = UPLOAD_DIR / str(current_user.id)
    if user_dir.exists():
        for file in user_dir.glob("*"):
            try:
                file.unlink()
            except Exception as e:
                print(f"Erro ao deletar arquivo: {e}")

    # Limpar avatar_url no banco
    current_user.avatar_url = None
    db.commit()
    db.refresh(current_user)

    # Registrar no audit log
    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")

    audit_log = AuditLog(
        user_id=current_user.id,
        action="DELETE",
        entity_type="User",
        entity_id=current_user.id,
        description="Avatar removido",
        ip_address=client_ip,
        user_agent=user_agent,
        data_before={"avatar_url": current_user.avatar_url}
    )
    db.add(audit_log)
    db.commit()

    return None


# ==================== IMAGEM DE ASSINATURA ====================

@router.post(
    "/users/me/signature-image",
    summary="Upload de imagem de assinatura do usuário",
)
async def upload_signature_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Tipo não permitido: {file.content_type}. Use JPG, PNG ou WEBP.",
        )

    file_content = await file.read()
    if len(file_content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Arquivo muito grande. Máximo 5 MB.",
        )

    user_dir = SIGNATURE_UPLOAD_DIR / str(current_user.id)
    user_dir.mkdir(parents=True, exist_ok=True)

    # Remove imagem anterior
    for old_file in user_dir.glob("*"):
        try:
            old_file.unlink()
        except Exception:
            pass

    file_extension = Path(file.filename).suffix
    unique_filename = f"{uuid.uuid4().hex}{file_extension}"
    file_path = user_dir / unique_filename

    with open(file_path, "wb") as f:
        f.write(file_content)

    image_url = f"/api/v1/users/{current_user.id}/signature-image"
    return {"image_url": image_url}


@router.get(
    "/users/{user_id}/signature-image",
    response_class=FileResponse,
    summary="Retorna imagem de assinatura do usuário",
)
def get_signature_image(user_id: int):
    user_dir = SIGNATURE_UPLOAD_DIR / str(user_id)
    if not user_dir.exists():
        raise HTTPException(status_code=404, detail="Imagem de assinatura não encontrada")

    files = list(user_dir.glob("*"))
    if not files:
        raise HTTPException(status_code=404, detail="Imagem de assinatura não encontrada")

    img_path = files[0]
    extension = img_path.suffix.lower()
    mime_types = {'.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp'}
    media_type = mime_types.get(extension, 'image/png')

    return FileResponse(path=str(img_path), media_type=media_type)
