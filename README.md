# HSGrowth CRM

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Status](https://img.shields.io/badge/status-production-green)
![License](https://img.shields.io/badge/license-proprietary-red)

Sistema CRM customizado para gerenciamento de vendas, leads e relacionamento com clientes.

---

## 🚀 Status: v1.0.0 em Produção

**Data de lançamento**: 29/01/2026

O HSGrowth CRM está oficialmente em produção! Esta é a primeira versão estável do sistema.

---

## 📋 Funcionalidades Principais

### Módulo de Boards (Kanban)
- Quadros personalizados com sistema de listas (colunas)
- Drag-and-drop de cards entre listas
- Filtros por responsável e status
- Visualização otimizada para grandes volumes

### Módulo de Cards (Negócios)
- Informações completas de contato e negócio
- Vinculação com clientes/organizações
- Sistema de responsáveis
- Campos customizados
- Histórico de atividades
- Sistema de notas
- Gerenciamento de produtos vinculados

### Módulo de Clientes
- Cadastro completo de organizações
- Informações fiscais (CNPJ, IE)
- Múltiplos contatos
- Endereço completo
- Vinculação com negócios

### Módulo de Produtos
- Catálogo de produtos/serviços
- Controle de preço e SKU
- Vinculação com negócios

### Sistema de Usuários
- Autenticação JWT
- Controle de permissões por perfil
- Dashboard personalizado

### Importação de Dados
- Importação completa do Pipedrive via CSV
- Migração de organizações, pessoas, deals, leads, notas e atividades

---

## 🛠️ Stack Tecnológica

### Backend
- **Framework**: FastAPI (Python)
- **Banco de Dados**: PostgreSQL 15
- **ORM**: SQLAlchemy
- **Migrations**: Alembic
- **Cache**: Redis (opcional)
- **Autenticação**: JWT
- **Validação**: Pydantic

### Frontend
- **Framework**: React 18 + TypeScript
- **Estilização**: Tailwind CSS
- **Roteamento**: React Router
- **HTTP**: Axios
- **Estado**: Context API
- **Drag & Drop**: React Beautiful DnD

### DevOps
- **Containerização**: Docker + Docker Compose
- **Deploy**: Easypanel
- **Proxy**: Nginx
- **SSL**: Let's Encrypt
- **Monitoramento**: (em planejamento)

---

## 🚀 Instalação e Uso

### Pré-requisitos

- Docker e Docker Compose instalados
- Git
- Porta 8000 (backend) e 3000 (frontend) disponíveis

### Instalação Local

1. **Clone o repositório**
```bash
git clone https://github.com/seu-usuario/hsgrowth-sistema.git
cd hsgrowth-sistema
```

2. **Configure variáveis de ambiente**
```bash
# Backend
cp backend/.env.example backend/.env
# Edite backend/.env com suas configurações

# Frontend
cp frontend/.env.example frontend/.env
# Edite frontend/.env com suas configurações
```

3. **Suba os containers**
```bash
cd backend
docker-compose up -d
```

4. **Acesse o sistema**
- Frontend: http://localhost:3000
- Backend: http://localhost:8000
- API Docs: http://localhost:8000/docs

### Primeiro Acesso

```bash
# Executar migrations
docker exec -it hsgrowth-api alembic upgrade head

# Criar usuário admin
docker exec -it hsgrowth-api python scripts/init_database.py
```

**Credenciais padrão**:
- Email: admin@hsgrowth.com
- Senha: admin123

⚠️ **IMPORTANTE**: Altere a senha padrão imediatamente após o primeiro acesso!

---

## 📚 Documentação

A documentação completa está na pasta `Documentação/`:

- [Visão Geral e Escopo](Documentação/01%20-%20VISÃO%20GERAL%20E%20ESCOPO%20DO%20PROJETO.md)
- [Requisitos Funcionais](Documentação/02_Requisitos_Funcionais.md)
- [Arquitetura Técnica](Documentação/08%20-%20ARQUITETURA%20TÉCNICA.md)
- [Guia de Desenvolvimento](Documentação/12%20-%20GUIA%20DE%20DESENVOLVIMENTO.md)
- [Modelo do Banco de Dados](Documentação/06_Modelo_Banco_de_Dados.md)
- [Especificação de API](Documentação/10%20-%20ESPECIFICAÇÃO%20DE%20API.md)

### Documentos Importantes

- [CHANGELOG.md](CHANGELOG.md) - Histórico de versões e mudanças
- [DESENVOLVIMENTO.md](DESENVOLVIMENTO.md) - Guia de desenvolvimento e boas práticas
- [TODO.md](Documentação/TODO.md) - Roadmap e funcionalidades planejadas

---

## 🔧 Desenvolvimento

### ⚠️ IMPORTANTE: Ambiente de Produção Ativo

A partir de 29/01/2026, o sistema está em produção. **Siga rigorosamente as diretrizes**:

1. **Nunca faça push direto para `main`**
2. **Sempre teste localmente antes do deploy**
3. **Crie migrations do Alembic para mudanças no banco**
4. **Atualize o CHANGELOG.md**
5. **Use branches de feature/bugfix**
6. **Faça Pull Requests para revisão**

Leia o [DESENVOLVIMENTO.md](DESENVOLVIMENTO.md) completo antes de começar a desenvolver.

### Workflow de Desenvolvimento

```bash
# 1. Criar branch de feature
git checkout -b feature/nome-da-funcionalidade

# 2. Fazer alterações e commitar
git add .
git commit -m "feat: adiciona funcionalidade X"

# 3. Push e abrir Pull Request
git push origin feature/nome-da-funcionalidade

# 4. Após aprovação, fazer merge na main

# 5. Criar tag de versão
git tag -a v1.1.0 -m "Versão 1.1.0"
git push origin v1.1.0
```

### Scripts Úteis

```bash
# Limpar banco de dados local
docker exec -it hsgrowth-api python scripts/clean_database.py

# Executar migrations
docker exec -it hsgrowth-api alembic upgrade head

# Ver logs
docker logs -f hsgrowth-api

# Acessar banco de dados
docker exec -it hsgrowth-postgres psql -U postgres -d hsgrowth
```

---

## 📊 Dados Importados (Pipedrive)

Na v1.0.0, foram importados com sucesso:

- **2.366** organizações
- **4.043** pessoas
- **4.512** deals (negócios)
- **1.583** leads
- **11.915** notas
- **10.601** atividades
- **61** produtos

---

## 🗺️ Roadmap

### v1.1.0 - Relatórios e Dashboards (Fevereiro 2026)
- Dashboard de vendas com KPIs
- Relatórios customizáveis
- Ranking de vendedores
- Exportação Excel/CSV

### v1.2.0 - Automações de Funil (Março 2026)
- Automações baseadas em triggers
- Automações agendadas
- Interface de gerenciamento
- Logs de execução

### v1.3.0 - Integração com WhatsApp (Abril 2026)
- Envio de mensagens do CRM
- Recebimento de mensagens
- Automações via WhatsApp

### v1.4.0 - Gamificação (Maio 2026)
- Sistema de pontos
- Badges e conquistas
- Rankings

### v1.5.0 - Módulo de Leads (Junho 2026)
- Funil de leads separado
- Conversão de lead para deal
- Automações de leads

Veja o [TODO.md](Documentação/TODO.md) completo para mais detalhes.

---

## 🐛 Reportar Bugs

Encontrou um bug? Abra uma issue no GitHub com:

1. Descrição do problema
2. Passos para reproduzir
3. Comportamento esperado vs atual
4. Screenshots (se aplicável)
5. Versão do sistema

---

## 🤝 Contribuindo

Este é um projeto proprietário. Contribuições são aceitas apenas de membros autorizados da equipe.

### Convenções de Código

- **Python**: Código em inglês, comentários e docstrings em português
- **TypeScript/React**: Código em inglês, comentários em português
- **Commits**: Seguir [Conventional Commits](https://www.conventionalcommits.org/)

---

## 📄 Licença

Este é um software proprietário. Todos os direitos reservados.

**Copyright © 2026 HSGrowth**

---

## 👤 Autor

**Erick** - Cientista de Dados e Desenvolvedor Full Stack

---

## 📞 Suporte

Para questões ou suporte:
- Abra uma issue no GitHub
- Contate o administrador do sistema

---

**Versão atual**: 1.0.0
**Última atualização**: 29/01/2026
**Status**: Em produção
