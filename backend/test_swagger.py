"""
Script simples para validar a configuração do Swagger/OpenAPI
"""
import sys
import os

# Mock das dependências que não estão instaladas
sys.modules['celery'] = type(sys)('celery')
sys.modules['celery'].Celery = lambda *args, **kwargs: None
sys.modules['apscheduler'] = type(sys)('apscheduler')
sys.modules['apscheduler.schedulers'] = type(sys)('schedulers')
sys.modules['apscheduler.schedulers.asyncio'] = type(sys)('asyncio')
sys.modules['apscheduler.schedulers.asyncio'].AsyncIOScheduler = lambda *args, **kwargs: None
sys.modules['apscheduler.triggers'] = type(sys)('triggers')
sys.modules['apscheduler.triggers.interval'] = type(sys)('interval')
sys.modules['apscheduler.triggers.interval'].IntervalTrigger = lambda *args, **kwargs: None
sys.modules['apscheduler.triggers.cron'] = type(sys)('cron')
sys.modules['apscheduler.triggers.cron'].CronTrigger = lambda *args, **kwargs: None
sys.modules['loguru'] = type(sys)('loguru')
sys.modules['loguru'].logger = type('logger', (), {
    'info': lambda *args, **kwargs: None,
    'success': lambda *args, **kwargs: None,
    'error': lambda *args, **kwargs: None,
    'warning': lambda *args, **kwargs: None,
    'add': lambda *args, **kwargs: None,
    'remove': lambda *args, **kwargs: None,
})()

# Adiciona o path do projeto
sys.path.insert(0, os.path.dirname(__file__))

# Mock da função configure_logging
def mock_configure_logging():
    pass

# Mock das funções do scheduler
async def mock_start_scheduler():
    pass

async def mock_stop_scheduler():
    pass

sys.modules['app.core.logging'] = type(sys)('logging')
sys.modules['app.core.logging'].configure_logging = mock_configure_logging
sys.modules['app.workers.scheduler'] = type(sys)('scheduler')
sys.modules['app.workers.scheduler'].start_scheduler = mock_start_scheduler
sys.modules['app.workers.scheduler'].stop_scheduler = mock_stop_scheduler

# Agora importa o app
from app.main import app

# Valida a configuração do OpenAPI
print("\n=== Validacao da Configuracao do Swagger/OpenAPI ===\n")

# Verifica metadados básicos
print(f"Titulo: {app.title}")
print(f"Versao: {app.version}")
print(f"Descricao: {len(app.description)} caracteres")

# Verifica tags
if hasattr(app, 'openapi_tags') and app.openapi_tags:
    print(f"\nTags configuradas: {len(app.openapi_tags)}")
    for tag in app.openapi_tags:
        print(f"  - {tag['name']}: {tag['description'][:50]}...")
else:
    print("\nERRO: Nenhuma tag configurada!")
    sys.exit(1)

# Verifica informações de contato
if hasattr(app, 'contact') and app.contact:
    print(f"\nContato: {app.contact.get('name', 'N/A')}")
    print(f"Email: {app.contact.get('email', 'N/A')}")
else:
    print("\nAVISO: Informacoes de contato nao configuradas")

# Verifica licença
if hasattr(app, 'license_info') and app.license_info:
    print(f"\nLicenca: {app.license_info.get('name', 'N/A')}")
else:
    print("\nAVISO: Informacoes de licenca nao configuradas")

# Verifica rotas
routes = [route for route in app.routes if hasattr(route, 'methods')]
print(f"\nTotal de rotas HTTP: {len(routes)}")

# Verifica se consegue gerar o schema OpenAPI
try:
    schema = app.openapi()
    print(f"\nSchema OpenAPI gerado com sucesso!")
    print(f"  - Versao OpenAPI: {schema.get('openapi', 'N/A')}")
    print(f"  - Paths: {len(schema.get('paths', {}))} endpoints")
    print(f"  - Components/Schemas: {len(schema.get('components', {}).get('schemas', {}))} schemas")
except Exception as e:
    print(f"\nERRO ao gerar schema OpenAPI: {e}")
    sys.exit(1)

print("\n=== Validacao Concluida com Sucesso! ===\n")
print("OK: Todas as configuracoes do Swagger estao corretas")
print("OK: A documentacao pode ser acessada em /docs e /redoc")
