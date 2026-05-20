# Segments Components

Este diretório contém os componentes relacionados à funcionalidade de segmentos da aplicação.

## Estrutura

```
segments/
├── index.ts                    # Exports principais
├── README.md                   # Esta documentação
│
├── ui/                         # Componentes de interface genéricos
│   ├── ConditionTypeSelector.tsx  # Seletor de tipos de condição
│   ├── TimeWindowSelector.tsx     # Seletor de janela de tempo
│   └── index.ts
│
├── editors/                    # Editores especializados por tipo
│   ├── UserPropertyEditor.tsx     # Editor de propriedades do usuário
│   ├── LabelConditionEditor.tsx   # Editor de condições de etiquetas
│   ├── CustomAttributeEditor.tsx  # Editor de atributos personalizados
│   └── index.ts
│
└── [componentes principais]
    ├── SegmentModal.tsx           # Modal de criação/edição
    ├── SegmentConditionEditor.tsx # Editor principal de condições
    ├── SegmentsHeader.tsx         # Cabeçalho da lista
    ├── SegmentsPagination.tsx     # Paginação
    └── SegmentsTable.tsx          # Tabela de segmentos
```

## Uso

### Importação dos componentes principais
```tsx
import { SegmentModal, SegmentsTable } from '@/components/segments';
```

### Importação dos editores especializados
```tsx
import { UserPropertyEditor, LabelConditionEditor } from '@/components/segments';
```

### Importação dos componentes de UI
```tsx
import { ConditionTypeSelector, TimeWindowSelector } from '@/components/segments';
```

## Arquitetura

### Componentes UI (`ui/`)
Componentes reutilizáveis e genéricos que podem ser usados em diferentes contextos dentro da funcionalidade de segmentos.

### Componentes Editores (`editors/`)
Componentes especializados para editar tipos específicos de condições de segmentos. Cada editor é responsável por um tipo específico de condição:

- **UserPropertyEditor**: Edita propriedades básicas do usuário (nome, email, etc.)
- **LabelConditionEditor**: Edita condições baseadas em etiquetas 
- **CustomAttributeEditor**: Edita condições baseadas em atributos personalizados

### Benefícios da Organização

1. **Separação de Responsabilidades**: Cada componente tem uma função específica
2. **Reutilização**: Componentes podem ser facilmente reutilizados
3. **Manutenibilidade**: Código mais fácil de encontrar e modificar
4. **Testabilidade**: Componentes isolados são mais fáceis de testar
5. **Escalabilidade**: Fácil adicionar novos tipos de editores

## Adicionando Novos Componentes

### Para adicionar um novo editor:
1. Crie o arquivo em `editors/NewEditor.tsx`
2. Adicione a exportação em `editors/index.ts`
3. O componente estará disponível via `import { NewEditor } from '@/components/segments'`

### Para adicionar um novo componente UI:
1. Crie o arquivo em `ui/NewUIComponent.tsx`  
2. Adicione a exportação em `ui/index.ts`
3. O componente estará disponível via `import { NewUIComponent } from '@/components/segments'`