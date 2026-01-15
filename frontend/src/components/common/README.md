# Componentes Comuns - Sistema de Design

Biblioteca de componentes reutilizáveis que seguem o padrão visual unificado do sistema.

## 📦 Componentes Disponíveis

### BaseModal
Modal base reutilizável com header fixo, conteúdo scrollável e footer customizável.

```tsx
import { BaseModal, Button } from "@/components/common";

<BaseModal
  isOpen={isOpen}
  onClose={handleClose}
  title="Título da Modal"
  subtitle="Subtítulo opcional"
  size="lg" // sm, md, lg, xl, 2xl, full
  footer={
    <div className="flex gap-3 justify-end">
      <Button variant="secondary" onClick={handleClose}>
        Cancelar
      </Button>
      <Button variant="primary" onClick={handleSave}>
        Salvar
      </Button>
    </div>
  }
>
  {/* Conteúdo da modal */}
</BaseModal>
```

### FormField
Wrapper para campos de formulário com label, erro e hint.

```tsx
import { FormField, Input } from "@/components/common";

<FormField
  label="Nome completo"
  required
  error={errors.name}
  hint="Digite seu nome como aparece no documento"
>
  <Input
    value={name}
    onChange={(e) => setName(e.target.value)}
    placeholder="João Silva"
  />
</FormField>
```

### Input
Campo de texto padronizado.

```tsx
import { Input } from "@/components/common";

<Input
  type="text"
  value={value}
  onChange={handleChange}
  placeholder="Digite aqui..."
  error={hasError}
  fullWidth // padrão true
/>
```

### Select
Select dropdown padronizado.

```tsx
import { Select } from "@/components/common";

<Select
  value={selectedValue}
  onChange={handleChange}
  error={hasError}
>
  <option value="">Selecione...</option>
  <option value="1">Opção 1</option>
  <option value="2">Opção 2</option>
</Select>
```

### Textarea
Campo de texto multilinha padronizado.

```tsx
import { Textarea } from "@/components/common";

<Textarea
  value={description}
  onChange={handleChange}
  placeholder="Digite a descrição..."
  rows={4}
  error={hasError}
/>
```

### Button
Botão padronizado com variantes, tamanhos e estado de loading.

```tsx
import { Button } from "@/components/common";

// Variantes
<Button variant="primary">Primário</Button>
<Button variant="secondary">Secundário</Button>
<Button variant="success">Sucesso</Button>
<Button variant="danger">Perigo</Button>
<Button variant="ghost">Ghost</Button>

// Tamanhos
<Button size="sm">Pequeno</Button>
<Button size="md">Médio</Button>
<Button size="lg">Grande</Button>

// Com loading
<Button loading={isSaving}>Salvando...</Button>

// Com ícone
<Button icon={<Plus size={16} />}>Adicionar</Button>
```

### Alert
Componente de alerta/mensagem com diferentes tipos.

```tsx
import { Alert } from "@/components/common";

<Alert type="info" title="Informação">
  Esta é uma mensagem informativa
</Alert>

<Alert type="success" title="Sucesso!">
  Operação realizada com sucesso
</Alert>

<Alert type="warning" title="Atenção">
  Verifique os dados antes de continuar
</Alert>

<Alert type="error" title="Erro">
  Ocorreu um erro ao processar sua solicitação
</Alert>

<Alert type="help">
  Dica: Você pode usar atalhos de teclado
</Alert>
```

## 🎨 Padrão Visual

Todos os componentes seguem o esquema de cores **Slate** para um visual mais profissional:

- **Background**: `bg-slate-900`, `bg-slate-800`
- **Bordas**: `border-slate-700`, `border-slate-600`
- **Texto**: `text-white`, `text-slate-300`, `text-slate-400`
- **Focus**: `focus:ring-emerald-500` (verde)
- **Primário**: `bg-emerald-600` (botões principais)
- **Bordas arredondadas**: `rounded-lg`, `rounded-xl`, `rounded-2xl`

## 📝 Exemplo Completo de Modal

```tsx
import { useState } from "react";
import {
  BaseModal,
  FormField,
  Input,
  Select,
  Textarea,
  Button,
  Alert,
} from "@/components/common";

function ExemploModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Salvar dados...
      setIsOpen(false);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      title="Criar Novo Item"
      subtitle="Preencha os dados abaixo"
      size="lg"
      footer={
        <div className="flex gap-3 justify-end">
          <Button
            variant="secondary"
            onClick={() => setIsOpen(false)}
            disabled={isSaving}
          >
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            loading={isSaving}
          >
            Salvar
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <Alert type="help">
          Preencha todos os campos obrigatórios antes de salvar
        </Alert>

        <FormField label="Nome" required error={errors.name}>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Digite o nome..."
            error={!!errors.name}
          />
        </FormField>

        <FormField label="Tipo" required error={errors.type}>
          <Select
            value={type}
            onChange={(e) => setType(e.target.value)}
            error={!!errors.type}
          >
            <option value="">Selecione...</option>
            <option value="1">Tipo 1</option>
            <option value="2">Tipo 2</option>
          </Select>
        </FormField>

        <FormField label="Descrição" error={errors.description}>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descreva aqui..."
            rows={4}
            error={!!errors.description}
          />
        </FormField>
      </div>
    </BaseModal>
  );
}
```

## 🚀 Benefícios

- ✅ **Consistência visual** em todo o sistema
- ✅ **Menos código** e mais produtividade
- ✅ **Acessibilidade** built-in
- ✅ **Responsivo** por padrão
- ✅ **TypeScript** com tipagem completa
- ✅ **Fácil manutenção** - mudanças centralizadas
- ✅ **Documentado** com exemplos práticos

## 📦 Importação

Todos os componentes podem ser importados de uma vez:

```tsx
import {
  BaseModal,
  FormField,
  Input,
  Select,
  Textarea,
  Button,
  Alert,
} from "@/components/common";
```

Ou individualmente:

```tsx
import BaseModal from "@/components/common/BaseModal";
import Button from "@/components/common/Button";
```
