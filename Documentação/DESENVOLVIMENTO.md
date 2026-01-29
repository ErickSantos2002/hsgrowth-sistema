# Guia de Desenvolvimento - HSGrowth CRM

## ⚠️ IMPORTANTE: AMBIENTE DE PRODUÇÃO ATIVO

**A partir de 29/01/2026, o HSGrowth CRM está em PRODUÇÃO (v1.0.0).**

Isso significa que qualquer mudança no código pode afetar diretamente os usuários e dados reais. Siga rigorosamente as diretrizes abaixo.

---

## 🚨 Regras Críticas

### 1. NUNCA faça push direto para `main`

- Branch `main` está em produção
- Sempre trabalhe em branches de feature/bugfix
- Use Pull Requests para revisão antes do merge

### 2. SEMPRE teste localmente antes do deploy

```bash
# 1. Rode os testes
pytest

# 2. Teste manualmente as mudanças
# 3. Verifique os logs do Docker
docker logs hsgrowth-api

# 4. Teste em um ambiente de staging se possível
```

### 3. Migrations do Alembic

**NUNCA modifique o banco de produção diretamente!**

```bash
# Criar migration
docker exec -it hsgrowth-api alembic revision --autogenerate -m "descricao_da_mudanca"

# Testar migration localmente
docker exec -it hsgrowth-api alembic upgrade head

# Reverter se necessário
docker exec -it hsgrowth-api alembic downgrade -1

# Verificar histórico
docker exec -it hsgrowth-api alembic history
```

### 4. Versionamento Semântico

Siga o padrão [Semantic Versioning](https://semver.org/):

- **MAJOR (X.0.0)**: Mudanças incompatíveis (breaking changes)
- **MINOR (0.X.0)**: Novas funcionalidades (compatíveis)
- **PATCH (0.0.X)**: Correções de bugs (compatíveis)

### 5. Documentação do CHANGELOG

**SEMPRE atualize o CHANGELOG.md** ao adicionar funcionalidades ou corrigir bugs:

```markdown
## [1.1.0] - 2026-02-XX

### Adicionado
- Nova funcionalidade X

### Corrigido
- Bug Y que causava Z

### Alterado
- Comportamento de W
```

---

## 📋 Workflow de Desenvolvimento

### 1. Criar Branch de Feature/Bugfix

```bash
# Para nova funcionalidade
git checkout -b feature/nome-da-funcionalidade

# Para correção de bug
git checkout -b bugfix/nome-do-bug

# Para hotfix urgente em produção
git checkout -b hotfix/descricao-urgente
```

### 2. Desenvolver e Testar

```bash
# Faça suas alterações
# ...

# Adicione os arquivos
git add .

# Commit com mensagem descritiva
git commit -m "feat: adiciona funcionalidade X

- Detalhe 1
- Detalhe 2

Closes #123"

# Push para o repositório
git push origin feature/nome-da-funcionalidade
```

### 3. Abrir Pull Request

1. Vá no GitHub/GitLab
2. Crie Pull Request de `feature/nome` → `main`
3. Adicione descrição detalhada
4. Marque reviewer (se houver equipe)
5. Aguarde aprovação
6. Faça merge

### 4. Deploy em Produção

Após o merge na `main`:

```bash
# Criar tag de versão
git tag -a v1.1.0 -m "Versão 1.1.0 - Descrição das mudanças"
git push origin v1.1.0

# Atualizar CHANGELOG.md
# ...

# Deploy no Easypanel/servidor
# (automático ou manual dependendo da configuração)
```

---

## 🔍 Checklist Antes de Fazer Deploy

- [ ] Código testado localmente
- [ ] Migrations criadas e testadas
- [ ] CHANGELOG.md atualizado
- [ ] Documentação técnica atualizada (se necessário)
- [ ] Nenhum `console.log` ou código de debug
- [ ] Variáveis de ambiente corretas
- [ ] Backup do banco de produção (se mudança sensível)
- [ ] Plano de rollback preparado

---

## 🛠️ Ambiente de Desenvolvimento Local

### Estrutura de Branches

```
main (produção)
├── develop (staging/integração)
├── feature/nova-funcionalidade
├── bugfix/correcao-bug
└── hotfix/correcao-urgente
```

### Configuração Local

```bash
# 1. Clone o repositório
git clone https://github.com/seu-usuario/hsgrowth-sistema.git
cd hsgrowth-sistema

# 2. Configure variáveis de ambiente
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# 3. Suba os containers
cd backend
docker-compose up -d

# 4. Acesse
# Frontend: http://localhost:3000
# Backend: http://localhost:8000
# API Docs: http://localhost:8000/docs
```

### Scripts Úteis

```bash
# Limpar banco de dados local
docker exec -it hsgrowth-api python scripts/clean_database.py

# Inicializar dados de exemplo
docker exec -it hsgrowth-api python scripts/init_database.py

# Ver logs
docker logs -f hsgrowth-api
docker logs -f hsgrowth-postgres

# Acessar banco de dados
docker exec -it hsgrowth-postgres psql -U postgres -d hsgrowth
```

---

## 🐛 Resolução de Problemas

### Migration Falhou

```bash
# Ver status atual
docker exec -it hsgrowth-api alembic current

# Reverter para versão anterior
docker exec -it hsgrowth-api alembic downgrade -1

# Corrigir migration e tentar novamente
docker exec -it hsgrowth-api alembic upgrade head
```

### Banco de Dados Inconsistente

```bash
# Backup primeiro!
docker exec hsgrowth-postgres pg_dump -U postgres hsgrowth > backup.sql

# Limpar e reinicializar (CUIDADO!)
docker exec -it hsgrowth-api python scripts/clean_database.py
docker exec -it hsgrowth-api alembic upgrade head
docker exec -it hsgrowth-api python scripts/init_database.py
```

### Container não Inicia

```bash
# Ver logs
docker logs hsgrowth-api

# Verificar variáveis de ambiente
docker exec -it hsgrowth-api env | grep DB

# Reiniciar container
docker restart hsgrowth-api
```

---

## 📚 Recursos Úteis

- **Documentação Completa**: `Documentação/`
- **API Docs**: http://localhost:8000/docs (local) ou https://api.hsgrowth.com/docs (produção)
- **Guia de Desenvolvimento Local**: `Documentação/GUIA-DESENVOLVIMENTO-LOCAL.md`
- **Modelo do Banco**: `Documentação/06_Modelo_Banco_de_Dados.md`
- **Especificação de API**: `Documentação/10 - ESPECIFICAÇÃO DE API.md`

---

## 🚀 Convenções de Código

### Python (Backend)

```python
# Código (variáveis, funções, classes): SEMPRE em inglês
def calculate_total(items):
    """Calcula o total dos itens."""  # Docstrings em português
    total = 0
    # Comentários em português
    for item in items:
        total += item.price
    return total
```

### TypeScript/React (Frontend)

```typescript
// Código em inglês
interface UserData {
  name: string;
  email: string;
}

// Comentários em português
function fetchUserData(userId: string): Promise<UserData> {
  // Busca os dados do usuário no banco
  return api.get(`/users/${userId}`);
}
```

### Commits

Siga o padrão [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: adiciona nova funcionalidade X
fix: corrige bug Y
docs: atualiza documentação
style: formatação de código
refactor: refatora código sem mudar comportamento
test: adiciona testes
chore: tarefas de manutenção
```

---

## 👥 Contato e Suporte

- **Issues**: Use o GitHub Issues para reportar bugs ou sugerir features
- **Emergências**: Contate o administrador do sistema

---

**Última atualização**: 29/01/2026 - v1.0.0
