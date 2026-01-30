# ==================== STAGE 1: Builder ====================
FROM python:3.11-slim as builder

# Define build arguments
ARG ENVIRONMENT=production

# Evita prompts durante build
ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Instala dependências do sistema necessárias para build
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Cria diretório de trabalho
WORKDIR /app

# Copia apenas requirements primeiro (melhor cache do Docker)
COPY requirements.txt .

# Instala dependências Python em um virtual environment
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
RUN pip install --upgrade pip setuptools wheel && \
    pip install -r requirements.txt


# ==================== STAGE 2: Runtime ====================
FROM python:3.11-slim

# Define build arguments
ARG ENVIRONMENT=production

# Variáveis de ambiente
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PATH="/opt/venv/bin:$PATH" \
    ENVIRONMENT=${ENVIRONMENT}

# Instala apenas dependências runtime necessárias
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    postgresql-client \
    curl \
    redis-tools \
    && rm -rf /var/lib/apt/lists/*

# Cria usuário não-root para segurança
RUN groupadd -r appuser && useradd -r -g appuser appuser

# Cria diretórios necessários
WORKDIR /app
RUN mkdir -p /app/logs /app/backups && \
    chown -R appuser:appuser /app

# Copia virtual environment do builder
COPY --from=builder /opt/venv /opt/venv

# Copia código da aplicação
COPY --chown=appuser:appuser . .

# Muda para usuário não-root
USER appuser

# Expõe porta da API
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Script de inicialização
RUN chmod +x /app/scripts/start.sh

# Limpa cache do Python para garantir código atualizado
RUN find /app -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
RUN find /app -type f -name "*.pyc" -delete 2>/dev/null || true

# Comando padrão
CMD ["sh", "/app/scripts/start.sh"]
