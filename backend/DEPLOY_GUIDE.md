# Guia Rápido de Deploy - HSGrowth CRM v2.0

**Data**: 29/01/2026
**Versão**: 2.0.0 (Migração Persons)

---

## 📋 Pré-Deploy Checklist

### Backup
- [ ] Backup completo do banco de dados PostgreSQL
- [ ] Backup dos arquivos de configuração (.env)
- [ ] Backup dos logs da aplicação

### Validação
- [ ] Testes locais executados com sucesso
- [ ] Migration testada em ambiente de staging
- [ ] Scripts de migração validados
- [ ] Frontend atualizado e testado

### Comunicação
- [ ] Equipe notificada sobre deploy
- [ ] Janela de manutenção agendada (recomendado: 5-10 minutos)
- [ ] Plano de rollback preparado

---

## 🚀 Passos do Deploy

### 1. Backup do Banco de Dados

```bash
# PostgreSQL dump
pg_dump -h <host> -U <user> -d hsgrowth > backup_pre_v2.0_$(date +%Y%m%d_%H%M%S).sql

# Verificar tamanho do backup
ls -lh backup_pre_v2.0_*.sql
```

### 2. Deploy do Backend

```bash
# No servidor ou Easypanel

# 2.1. Atualizar código
git pull origin main

# 2.2. Aplicar migrations
alembic upgrade head

# 2.3. Verificar migrations aplicadas
alembic current
# Deve mostrar: <revision_id> (head)

# 2.4. Executar migração de dados (IMPORTANTE!)
python scripts/migrate_contact_info_to_persons.py

# Output esperado:
# ✅ 4.043 pessoas criadas
# ✅ 3.525 cards vinculados

# 2.5. Limpar nomes inválidos
python scripts/clean_person_names.py

# Output esperado:
# ✅ 1.197 nomes corrigidos

# 2.6. Reiniciar aplicação
# Easypanel: usar botão de restart
# Docker: docker-compose restart api
# Systemd: systemctl restart hsgrowth-api
```

### 3. Deploy do Frontend

```bash
# No diretório frontend

# 3.1. Atualizar código
git pull origin main

# 3.2. Instalar dependências (se necessário)
npm install

# 3.3. Build de produção
npm run build

# 3.4. Deploy (Easypanel ou outro serviço)
# Seguir processo específico da plataforma
```

### 4. Validação Pós-Deploy

```bash
# 4.1. Health check da API
curl http://<seu-dominio>/health
# Esperado: {"status": "healthy"}

# 4.2. Verificar logs
# Easypanel: Ver logs na interface
# Docker: docker-compose logs -f api --tail=100
# Systemd: journalctl -u hsgrowth-api -f

# 4.3. Verificar se não há erros
# Procurar por: ERROR, CRITICAL, Exception, Traceback
```

### 5. Testes de Funcionalidade

#### Backend (API)
```bash
# Listar pessoas
curl -X GET http://<seu-dominio>/api/v1/persons \
  -H "Authorization: Bearer <seu-token>"

# Resposta esperada: lista de pessoas com paginação
```

#### Frontend
- [ ] Acessar `/persons` - deve listar pessoas
- [ ] Buscar pessoa por nome/email
- [ ] Abrir um card - dados da pessoa devem aparecer
- [ ] Vincular nova pessoa a um card
- [ ] Desvincular pessoa de um card
- [ ] Verificar performance (carregamento rápido)

---

## 🔄 Rollback (se necessário)

### Se algo der errado:

```bash
# 1. Reverter migration
alembic downgrade -1

# 2. Restaurar backup do banco
psql -h <host> -U <user> -d hsgrowth < backup_pre_v2.0_<timestamp>.sql

# 3. Reverter código
git checkout <commit-anterior>
git push -f origin main  # ⚠️ Apenas se necessário

# 4. Reiniciar aplicação
# Easypanel: botão de restart
# Docker: docker-compose restart
```

---

## 📊 Monitoramento Pós-Deploy

### Primeiras 24 horas

**Métricas a observar:**
- Tempo de resposta da API (`/persons` endpoints)
- Uso de CPU/memória
- Taxa de erros (deve ser < 1%)
- Logs de erros

**Alertas:**
- Aumento súbito de erros 500
- Aumento de uso de memória
- Lentidão nos endpoints de persons
- Erros de validação de emails

### Ferramentas

```bash
# Monitorar logs em tempo real
# Docker:
docker-compose logs -f api

# Systemd:
journalctl -u hsgrowth-api -f

# Verificar uso de recursos
# Docker:
docker stats hsgrowth-api

# Sistema:
htop
```

---

## 🐛 Troubleshooting

### Problema: Migration falha

**Sintomas**: `alembic upgrade head` retorna erro

**Soluções**:
```bash
# Verificar estado atual
alembic current

# Ver histórico
alembic history

# Forçar migration específica
alembic upgrade <revision_id>

# Logs detalhados
alembic -v upgrade head
```

### Problema: Script de migração falha

**Sintomas**: `migrate_contact_info_to_persons.py` retorna erro

**Soluções**:
1. Verificar se migration da tabela foi aplicada: `\dt persons` no psql
2. Verificar se há dados: `SELECT COUNT(*) FROM cards WHERE contact_info IS NOT NULL;`
3. Executar script com debug: `python -u scripts/migrate_contact_info_to_persons.py`
4. Verificar logs para identificar card/contato específico com problema

### Problema: Erro 422 ao listar pessoas

**Sintomas**: `GET /persons` retorna 422 Unprocessable Entity

**Causa**: Email inválido não tratado pelo validador

**Solução**:
1. Verificar logs para identificar email problemático
2. Executar script de limpeza novamente: `python scripts/clean_person_names.py`
3. Se persistir, atualizar diretamente no banco:
```sql
UPDATE persons SET email = NULL WHERE email = '<email-problematico>';
```

### Problema: Pessoa não aparece no card

**Sintomas**: Card vinculado mas seção de contato vazia

**Soluções**:
1. Verificar no banco: `SELECT person_id FROM cards WHERE id = <card_id>;`
2. Verificar schema CardResponse tem person_id e person_name
3. Limpar cache do navegador (Ctrl+Shift+R)
4. Verificar logs da API para erros

### Problema: Performance lenta

**Sintomas**: Listagem de pessoas demora muito

**Soluções**:
1. Verificar índices criados: `\di persons` no psql
2. Verificar query plan: `EXPLAIN ANALYZE SELECT * FROM persons LIMIT 100;`
3. Verificar se page_size não está muito alto (máximo: 10.000)
4. Verificar uso de memória do banco

---

## 📞 Contatos de Emergência

**Desenvolvedor**: Erick
**Infraestrutura**: [Easypanel Support]
**Banco de Dados**: [PostgreSQL Admin]

---

## 📝 Notas Importantes

1. **Campo contact_info não foi removido**: mantido por compatibilidade, será removido em v2.1 ou v3.0
2. **Scripts são idempotentes**: podem ser executados múltiplas vezes sem duplicar dados
3. **Validação de emails é permissiva**: retorna None em vez de erro para dados inválidos
4. **Índices foram criados**: performance de busca está otimizada
5. **Page size aumentado**: permite até 10.000 registros por request (use com moderação)

---

## ✅ Checklist de Conclusão

Após deploy bem-sucedido:

- [ ] Backup confirmado e armazenado
- [ ] Migrations aplicadas com sucesso
- [ ] Scripts de migração executados
- [ ] API respondendo corretamente
- [ ] Frontend carregando páginas
- [ ] Testes de funcionalidade passando
- [ ] Logs sem erros críticos
- [ ] Performance dentro do esperado
- [ ] Equipe notificada do sucesso
- [ ] Documentação atualizada
- [ ] Changelog commitado

---

**Deploy realizado com sucesso** ✅

**Data**: ___/___/______
**Por**: ________________
**Tempo total**: _______ minutos
**Downtime**: _______ minutos
**Notas**: ________________________________________________
