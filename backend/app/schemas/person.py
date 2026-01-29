"""
Schemas Pydantic para Pessoas/Contatos.
Define os modelos de entrada/saída para operações com pessoas.
"""
from typing import Optional
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, field_validator


class PersonBase(BaseModel):
    """
    Schema base de pessoa (campos comuns).
    """
    name: str = Field(..., min_length=1, max_length=200, description="Nome completo")
    first_name: Optional[str] = Field(None, max_length=100, description="Primeiro nome")
    last_name: Optional[str] = Field(None, max_length=100, description="Sobrenome")

    # Emails
    email: Optional[EmailStr] = Field(None, description="Email principal (legado)")
    email_commercial: Optional[EmailStr] = Field(None, description="Email comercial")
    email_personal: Optional[EmailStr] = Field(None, description="Email pessoal")
    email_alternative: Optional[EmailStr] = Field(None, description="Email alternativo")

    # Telefones
    phone: Optional[str] = Field(None, max_length=50, description="Telefone principal (legado)")
    phone_commercial: Optional[str] = Field(None, max_length=50, description="Telefone comercial")
    phone_whatsapp: Optional[str] = Field(None, max_length=50, description="Celular/WhatsApp")
    phone_alternative: Optional[str] = Field(None, max_length=50, description="Telefone alternativo")

    # Profissional
    position: Optional[str] = Field(None, max_length=200, description="Cargo")

    # Redes sociais
    linkedin: Optional[str] = Field(None, max_length=500, description="LinkedIn URL")
    instagram: Optional[str] = Field(None, max_length=500, description="Instagram URL")
    facebook: Optional[str] = Field(None, max_length=500, description="Facebook URL")

    # Relacionamentos
    organization_id: Optional[int] = Field(None, description="ID da organização (cliente)")
    owner_id: Optional[int] = Field(None, description="ID do responsável (usuário)")

    # Controle
    is_active: bool = Field(True, description="Pessoa ativa/inativa")
    pipedrive_id: Optional[int] = Field(None, description="ID no Pipedrive")


class PersonCreate(PersonBase):
    """
    Schema para criação de pessoa.
    """
    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "name": "Maria Silva",
                    "first_name": "Maria",
                    "last_name": "Silva",
                    "email_commercial": "maria.silva@empresa.com",
                    "email_personal": "maria@gmail.com",
                    "phone_whatsapp": "11987654321",
                    "phone_commercial": "1133334444",
                    "position": "Gerente de Compras",
                    "linkedin": "https://linkedin.com/in/mariasilva",
                    "organization_id": 1,
                    "owner_id": 1,
                    "is_active": True
                }
            ]
        }
    }


class PersonUpdate(BaseModel):
    """
    Schema para atualização de pessoa (todos os campos opcionais).
    """
    name: Optional[str] = Field(None, min_length=1, max_length=200, description="Nome completo")
    first_name: Optional[str] = Field(None, max_length=100, description="Primeiro nome")
    last_name: Optional[str] = Field(None, max_length=100, description="Sobrenome")

    # Emails
    email: Optional[EmailStr] = Field(None, description="Email principal (legado)")
    email_commercial: Optional[EmailStr] = Field(None, description="Email comercial")
    email_personal: Optional[EmailStr] = Field(None, description="Email pessoal")
    email_alternative: Optional[EmailStr] = Field(None, description="Email alternativo")

    # Telefones
    phone: Optional[str] = Field(None, max_length=50, description="Telefone principal (legado)")
    phone_commercial: Optional[str] = Field(None, max_length=50, description="Telefone comercial")
    phone_whatsapp: Optional[str] = Field(None, max_length=50, description="Celular/WhatsApp")
    phone_alternative: Optional[str] = Field(None, max_length=50, description="Telefone alternativo")

    # Profissional
    position: Optional[str] = Field(None, max_length=200, description="Cargo")

    # Redes sociais
    linkedin: Optional[str] = Field(None, max_length=500, description="LinkedIn URL")
    instagram: Optional[str] = Field(None, max_length=500, description="Instagram URL")
    facebook: Optional[str] = Field(None, max_length=500, description="Facebook URL")

    # Relacionamentos
    organization_id: Optional[int] = Field(None, description="ID da organização (cliente)")
    owner_id: Optional[int] = Field(None, description="ID do responsável (usuário)")

    # Controle
    is_active: Optional[bool] = Field(None, description="Pessoa ativa/inativa")
    pipedrive_id: Optional[int] = Field(None, description="ID no Pipedrive")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "position": "Diretora de Compras",
                    "phone_whatsapp": "11988888888",
                    "linkedin": "https://linkedin.com/in/mariasilva-updated"
                }
            ]
        }
    }


class PersonResponse(PersonBase):
    """
    Schema de resposta de pessoa.
    """
    id: int = Field(..., description="ID da pessoa")
    created_at: datetime = Field(..., description="Data de criação")
    updated_at: datetime = Field(..., description="Data de atualização")

    @field_validator('email', 'email_commercial', 'email_personal', 'email_alternative', mode='before')
    @classmethod
    def clean_email(cls, v):
        """
        Limpa e valida emails antes da validação do EmailStr.
        Retorna None para qualquer email inválido ao invés de quebrar a validação.
        """
        if not v or v == '':
            return None

        try:
            # Converte para string se necessário
            v = str(v).strip()

            # Remove caracteres inválidos comuns no início/fim
            invalid_chars = '.><,;"\' '
            v = v.strip(invalid_chars)

            # Se ficou vazio após limpeza
            if not v:
                return None

            # Remove caracteres HTML/especiais
            v = v.replace('<', '').replace('>', '').replace('"', '').replace("'", '')

            # Se tiver múltiplos emails, pega apenas o primeiro
            if ',' in v or ';' in v or '  ' in v:
                for separator in [',', ';', '  ']:
                    if separator in v:
                        emails = [e.strip(invalid_chars) for e in v.split(separator)]
                        for email in emails:
                            if '@' in email and ' ' not in email and '.' in email.split('@')[1] and len(email) > 5:
                                return email
                        return None

            # Validação básica
            if '@' not in v or ' ' in v:
                return None

            # Verifica se tem ponto depois do @
            if '.' not in v.split('@')[1]:
                return None

            # Se tiver mais de um @, é inválido
            if v.count('@') > 1:
                return None

            # Validação final simples de formato
            parts = v.split('@')
            if len(parts) != 2 or len(parts[0]) < 1 or len(parts[1]) < 3:
                return None

            return v

        except Exception:
            # Se qualquer erro ocorrer, retorna None ao invés de quebrar
            return None

    model_config = {
        "from_attributes": True,  # Permite criar a partir de modelos SQLAlchemy
        "json_schema_extra": {
            "examples": [
                {
                    "id": 1,
                    "name": "Maria Silva",
                    "first_name": "Maria",
                    "last_name": "Silva",
                    "email": "maria.silva@empresa.com",
                    "email_commercial": "maria.silva@empresa.com",
                    "email_personal": "maria@gmail.com",
                    "email_alternative": None,
                    "phone": "11987654321",
                    "phone_commercial": "1133334444",
                    "phone_whatsapp": "11987654321",
                    "phone_alternative": None,
                    "position": "Gerente de Compras",
                    "linkedin": "https://linkedin.com/in/mariasilva",
                    "instagram": None,
                    "facebook": None,
                    "organization_id": 1,
                    "owner_id": 1,
                    "is_active": True,
                    "pipedrive_id": None,
                    "created_at": "2026-01-29T10:00:00",
                    "updated_at": "2026-01-29T10:00:00"
                }
            ]
        }
    }


class PersonListResponse(BaseModel):
    """
    Schema de resposta para lista de pessoas com paginação.
    """
    persons: list[PersonResponse] = Field(..., description="Lista de pessoas")
    total: int = Field(..., description="Total de pessoas")
    page: int = Field(..., description="Página atual")
    page_size: int = Field(..., description="Tamanho da página")
    total_pages: int = Field(..., description="Total de páginas")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "persons": [
                        {
                            "id": 1,
                            "name": "Maria Silva",
                            "first_name": "Maria",
                            "last_name": "Silva",
                            "email_commercial": "maria.silva@empresa.com",
                            "phone_whatsapp": "11987654321",
                            "position": "Gerente de Compras",
                            "organization_id": 1,
                            "is_active": True,
                            "created_at": "2026-01-29T10:00:00",
                            "updated_at": "2026-01-29T10:00:00"
                        }
                    ],
                    "total": 4043,
                    "page": 1,
                    "page_size": 50,
                    "total_pages": 81
                }
            ]
        }
    }
