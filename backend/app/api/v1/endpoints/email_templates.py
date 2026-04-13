"""
Endpoints CRUD para Templates de E-mail.
- Leitura: todos os usuários autenticados.
- Criação/edição/exclusão: apenas admin e manager.
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.email_template import EmailTemplate
from app.models.user import User
from app.schemas.email_template import EmailTemplateCreate, EmailTemplateUpdate, EmailTemplateResponse
from app.api.deps import get_current_active_user, require_manager_or_admin

router = APIRouter()


def _build_response(template: EmailTemplate) -> EmailTemplateResponse:
    created_by_name = None
    if template.created_by:
        created_by_name = template.created_by.name or template.created_by.email
    return EmailTemplateResponse(
        id=template.id,
        name=template.name,
        subject=template.subject,
        body=template.body,
        is_active=template.is_active,
        created_by_id=template.created_by_id,
        created_by_name=created_by_name,
        created_at=template.created_at,
        updated_at=template.updated_at,
    )


@router.get("", response_model=List[EmailTemplateResponse], summary="Listar templates ativos")
def list_templates(
    include_inactive: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Retorna todos os templates ativos.
    Admin/manager podem passar include_inactive=true para ver também os inativos.
    """
    from sqlalchemy.orm import joinedload
    query = db.query(EmailTemplate).options(joinedload(EmailTemplate.created_by)).filter(
        EmailTemplate.deleted_at.is_(None)
    )
    if not include_inactive:
        query = query.filter(EmailTemplate.is_active == True)
    templates = query.order_by(EmailTemplate.name).all()
    return [_build_response(t) for t in templates]


@router.post("", response_model=EmailTemplateResponse, status_code=status.HTTP_201_CREATED, summary="Criar template")
def create_template(
    data: EmailTemplateCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_admin()),
):
    template = EmailTemplate(
        name=data.name,
        subject=data.subject,
        body=data.body,
        is_active=data.is_active,
        created_by_id=current_user.id,
    )
    db.add(template)
    db.commit()
    db.refresh(template)
    # Recarrega com relacionamento
    from sqlalchemy.orm import joinedload
    template = db.query(EmailTemplate).options(joinedload(EmailTemplate.created_by)).filter(
        EmailTemplate.id == template.id
    ).first()
    return _build_response(template)


@router.put("/{template_id}", response_model=EmailTemplateResponse, summary="Atualizar template")
def update_template(
    template_id: int,
    data: EmailTemplateUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_admin()),
):
    from sqlalchemy.orm import joinedload
    template = db.query(EmailTemplate).options(joinedload(EmailTemplate.created_by)).filter(
        EmailTemplate.id == template_id,
        EmailTemplate.deleted_at.is_(None),
    ).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template não encontrado")

    if data.name is not None:
        template.name = data.name
    if data.subject is not None:
        template.subject = data.subject
    if data.body is not None:
        template.body = data.body
    if data.is_active is not None:
        template.is_active = data.is_active

    db.commit()
    db.refresh(template)
    template = db.query(EmailTemplate).options(joinedload(EmailTemplate.created_by)).filter(
        EmailTemplate.id == template_id
    ).first()
    return _build_response(template)


@router.delete("/{template_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Excluir template (soft delete)")
def delete_template(
    template_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_admin()),
):
    from datetime import datetime, timezone
    template = db.query(EmailTemplate).filter(
        EmailTemplate.id == template_id,
        EmailTemplate.deleted_at.is_(None),
    ).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template não encontrado")

    template.deleted_at = datetime.now(timezone.utc)
    db.commit()
