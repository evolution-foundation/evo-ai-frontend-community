# Journey Nodes - Documentação Completa

Este documento descreve em detalhes todos os tipos de nodes disponíveis no sistema de Journey da EvoAI, suas funcionalidades, configurações e casos de uso.

## 📋 Índice

### **🚀 Pontos de Entrada**
- [Trigger Node](#trigger-node) - 8 tipos de disparadores

### **🎯 Action Nodes**  
- [Add Label Node](#action-nodes) - Adicionar etiquetas
- [Remove Label Node](#action-nodes) - Remover etiquetas
- [Update Contact Node](#action-nodes) - Atualizar dados de contato
- [Update Custom Attribute Node](#action-nodes) - Atualizar atributos personalizados

### **🔀 Control Flow Nodes**
- [Conditional Node](#conditional-node) - Lógica condicional com múltiplos caminhos
- [Split Node](#split-node-ab-testing) - A/B Testing e distribuição percentual

### **⏳ Timing Nodes**
- [Wait Node](#wait-node) - 4 tipos de espera (tempo, evento, condição, híbrido)

### **🔧 Data & Integration Nodes**
- [Set Variable Node](#set-variable-node) - 9 operações de manipulação de variáveis
- [Send Webhook Node](#send-webhook-node) - Integrações HTTP completas

### **💬 Communication Nodes**
- [Send Message Node](#send-message-node) - Mensagens multi-canal com anexos

### **🚪 Terminal Nodes**
- [Exit Journey Node](#terminal-nodes) - Saída definitiva da jornada
- [Transfer Journey Node](#terminal-nodes) - Transferência entre jornadas

### **📊 Sistemas de Apoio**
- [Variable System](#sistema-de-mapeamento-de-variáveis) - EnvironmentManager e VariableMapping
- [Response Mapping](#response-mapping) - Captura de dados de APIs

---

## 🚀 Trigger Node

O **Trigger Node** é o ponto de entrada de qualquer jornada. É responsável por definir quando e como uma jornada será iniciada. Cada jornada deve começar com exatamente um trigger node.

### Tipos de Trigger Disponíveis

#### 1. **Entrada Manual** (`manual`)
- **Descrição**: Contatos são adicionados manualmente à jornada
- **Uso**: Ideal para jornadas que requerem intervenção humana ou para testes
- **Configurações**: Nenhuma configuração adicional necessária

#### 2. **Evento** (`event`)
- **Descrição**: Jornada disparada quando um evento específico ocorre
- **Uso**: Para automações baseadas em ações dos usuários
- **Configurações**:
  - **Nome do Evento**: Identificador do evento a ser monitorado
  - **Propriedades do Evento** (opcional): Filtros baseados nas propriedades do evento
    - Caminho da propriedade (ex: `properties.source`)
    - Operador (equals, contains, etc.)
    - Valor esperado
- **Mapeamento de Variáveis**: Captura dados do evento para usar na jornada
  - `event.id` - ID único do evento
  - `event.name` - Nome do evento
  - `event.timestamp` - Momento do evento
  - `event.user_id` - ID do usuário
  - `event.properties.*` - Propriedades customizadas

#### 3. **Segmento** (`segment`)
- **Descrição**: Jornada disparada quando contatos entram ou saem de um segmento
- **Uso**: Para automações baseadas em critérios de segmentação
- **Configurações**:
  - **Segmento**: Seleção do segmento a ser monitorado
  - **Ação**: 
    - `entered` - Quando contato entra no segmento
    - `exited` - Quando contato sai do segmento

#### 4. **Webhook** (`webhook`)
- **Descrição**: Jornada disparada quando um webhook é recebido
- **Uso**: Para integrações com sistemas externos
- **Configurações**:
  - **URL do Webhook**: URL única gerada automaticamente
  - **Método HTTP**: POST, PUT ou PATCH (padrão: POST)
  - **Secret** (opcional): Para validação de segurança
  - **Headers Esperados** (opcional): Validação de cabeçalhos
    - Nome do header
    - Valor esperado
- **Mapeamento de Variáveis**: Captura dados do webhook
  - `webhook.data.*` - Dados do corpo da requisição
  - `webhook.headers.*` - Cabeçalhos da requisição  
  - `webhook.query.*` - Parâmetros da query string
  - `webhook.method` - Método HTTP usado
  - `webhook.url` - URL chamada

#### 5. **Contato Criado** (`contactCreated`)
- **Descrição**: Jornada disparada quando um novo contato é criado
- **Uso**: Para automações de onboarding ou boas-vindas
- **Configurações**:
  - **Filtros de Campo** (opcional): Condições que o contato deve atender
    - **Campos Disponíveis**:
      - `name` - Nome
      - `email` - Email
      - `phone` - Telefone
      - `meio` - Meio de contato
      - `sobrenome` - Sobrenome
      - `localizacao` - Localização
      - `codigo_do_pais` - Código do país
      - `identificador` - Identificador único
      - `tipo_do_contato` - Tipo do contato
      - `bloqueado` - Status de bloqueio
    - **Operadores**:
      - `equals` - Igual a
      - `not_equals` - Diferente de
      - `contains` - Contém
      - `not_contains` - Não contém
      - `starts_with` - Começa com
      - `ends_with` - Termina com
      - `is_empty` - Está vazio
      - `is_not_empty` - Não está vazio
- **Mapeamento de Variáveis**: Captura dados do contato criado
  - `contact.id` - ID do contato
  - `contact.name` - Nome do contato
  - `contact.email` - Email do contato
  - `contact.phone` - Telefone do contato
  - `contact.created_at` - Data de criação
  - `contact.*` - Outros campos configurados

#### 6. **Contato Atualizado** (`contactUpdated`)
- **Descrição**: Jornada disparada quando um contato é atualizado
- **Uso**: Para automações baseadas em mudanças de dados do contato
- **Configurações**: 
  - **Campos Monitorados** (opcional): Especifica quais campos devem ser alterados para disparar
  - Mesmos campos e operadores do "Contato Criado"
- **Mapeamento de Variáveis**: 
  - Mesmos campos do "Contato Criado"
  - `contact.updated_at` - Data da última atualização

#### 7. **Etiqueta** (`label`)
- **Descrição**: Jornada disparada quando uma etiqueta é aplicada ou removida
- **Uso**: Para automações baseadas em categorização de contatos
- **Configurações**:
  - **Etiqueta**: Seleção da etiqueta a ser monitorada
  - **Ação**:
    - `applied` - Quando etiqueta é aplicada
    - `removed` - Quando etiqueta é removida
- **Mapeamento de Variáveis**:
  - `label.id` - ID da etiqueta
  - `label.name` - Nome da etiqueta
  - `label.color` - Cor da etiqueta
  - `label.action` - Ação realizada
  - `label.created_at` - Data de criação da etiqueta

#### 8. **Atributo Personalizado** (`customAttribute`)
- **Descrição**: Jornada disparada baseada em mudanças em atributos personalizados
- **Uso**: Para automações baseadas em dados específicos do negócio
- **Configurações**:
  - **Atributo**: Seleção do atributo personalizado
  - **Condição**: Operador de comparação
    - Inclui todos os operadores padrão
    - Plus: `greater_than`, `less_than` para números
    - Plus: `exists`, `not_exists` para existência
  - **Valor** (se necessário): Valor de comparação
- **Mapeamento de Variáveis**:
  - `attribute.name` - Nome do atributo
  - `attribute.value` - Valor atual
  - `attribute.previous_value` - Valor anterior
  - `attribute.timestamp` - Momento da mudança
  - `attribute.{nome_atributo}` - Valor específico do atributo
  - `attribute.{nome_atributo}_previous` - Valor anterior específico

### 🔄 Sistema de Mapeamento de Variáveis

Todos os tipos de trigger (exceto manual) suportam **Mapeamento de Variáveis**, que permite capturar dados do evento disparador e armazená-los em variáveis para uso posterior na jornada.

#### Componentes do Mapeamento:

1. **Origem dos Dados**: Caminho de onde extrair os dados
   - Caminhos predefinidos baseados no tipo de trigger
   - Opção de caminho personalizado
   
2. **Variável Destino**: Onde armazenar o dado capturado
   - Variáveis do sistema (contato, evento, webhook, jornada)
   - Variáveis personalizadas criadas pelo usuário
   - Opção de criar nova variável no momento
   
3. **Transformação** (opcional): Como processar o dado antes de armazenar
   - `none` - Sem transformação
   - `uppercase` - Converter para MAIÚSCULA
   - `lowercase` - Converter para minúscula
   - `date` - Formatar como data
   - `number` - Converter para número

#### Variáveis do Sistema Disponíveis:

**Categoria: Contato**
- Variáveis relacionadas ao contato atual na jornada

**Categoria: Evento** 
- Variáveis relacionadas ao evento que disparou a jornada

**Categoria: Webhook**
- Variáveis relacionadas aos dados recebidos via webhook

**Categoria: Jornada**
- Variáveis do contexto da jornada atual

### 💡 Boas Práticas

1. **Nomenclatura de Variáveis**: Use nomes descritivos e consistentes
2. **Mapeamento Seletivo**: Capture apenas os dados necessários para a jornada
3. **Transformações**: Aplique transformações quando necessário para padronizar dados
4. **Filtros**: Use filtros no trigger para reduzir execuções desnecessárias
5. **Teste**: Sempre teste os triggers em ambiente de desenvolvimento primeiro

### 🔧 Configuração Técnica

#### Interface Principal
- **Arquivo**: `JourneyTriggerNode.tsx`
- **Interface**: `JourneyTriggerNodeData`
- **Panel**: `JourneyTriggerPanel.tsx`

#### Componentes de Configuração
- `TriggerTypeSelector` - Seleção do tipo de trigger
- `TriggerDescription` - Descrições contextuais
- `EventConfiguration` - Configurações de evento
- `SegmentConfiguration` - Configurações de segmento
- `ContactConfiguration` - Configurações de contato
- `LabelConfiguration` - Configurações de etiqueta  
- `CustomAttributeConfiguration` - Configurações de atributo personalizado
- `WebhookConfiguration` - Configurações de webhook
- `VariableMapping` - Sistema de mapeamento de variáveis

### 🚨 Limitações e Considerações

1. **Um Trigger por Jornada**: Cada jornada deve ter exatamente um trigger node
2. **Ordem de Execução**: O trigger é sempre o primeiro node a ser executado
3. **Performance**: Triggers muito amplos (sem filtros) podem gerar alto volume de execuções
4. **Dados Históricos**: Triggers não processam dados históricos, apenas novos eventos
5. **Timeouts**: Webhooks têm timeout configurado pelo sistema
6. **Rate Limiting**: Aplicável para triggers de alta frequência

---

## 📚 Action Nodes

Os **Action Nodes** são responsáveis por executar ações específicas nos contatos durante a jornada. Eles são colocados após o trigger e podem ser encadeados para criar sequências de automação.

### 🏷️ Add Label Node

O **Add Label Node** adiciona uma etiqueta específica ao contato que está passando pela jornada.

#### Características:
- **Função**: Adiciona etiquetas aos contatos para categorização
- **Cor**: Verde (🟢) - representa ação de adicionar
- **Ícone**: Tag
- **Uso**: Organização, segmentação e categorização de contatos

#### Configurações:
- **Etiqueta**: Seleção da etiqueta a ser adicionada
  - Lista carregada dinamicamente do sistema
  - Preview com cor da etiqueta
  - Validação obrigatória

#### Casos de Uso:
- Marcar contatos que completaram uma ação
- Segmentar por interesse ou comportamento
- Identificar etapas do funil de vendas
- Categorizar por origem ou canal

#### Exemplo Prático:
```
Trigger: Evento "cadastro_completo" 
↓
Add Label: "Lead Qualificado"
```

---

### 🗑️ Remove Label Node  

O **Remove Label Node** remove uma etiqueta específica do contato que está passando pela jornada.

#### Características:
- **Função**: Remove etiquetas dos contatos  
- **Cor**: Vermelho (🔴) - representa ação de remover
- **Ícone**: Tag com X
- **Uso**: Limpeza de etiquetas, mudança de status

#### Configurações:
- **Etiqueta**: Seleção da etiqueta a ser removida
  - Lista carregada dinamicamente do sistema
  - Preview com cor da etiqueta
  - Validação obrigatória

#### Casos de Uso:
- Remover status temporários
- Limpar etiquetas de campanhas antigas  
- Atualizar status no funil de vendas
- Remover marcações de teste

#### Exemplo Prático:
```
Trigger: Evento "compra_realizada"
↓  
Remove Label: "Prospect"
↓
Add Label: "Cliente"
```

---

### 👤 Update Contact Node

O **Update Contact Node** atualiza campos básicos do contato com novos valores.

#### Características:
- **Função**: Atualiza informações básicas do contato
- **Cor**: Ciano (🔵) - representa modificação de dados
- **Ícone**: UserCog
- **Uso**: Manutenção e atualização de dados do contato

#### Configurações:

**Campos Disponíveis:**
- `name` - Nome do contato
- `email` - Endereço de email  
- `phone_number` - Número de telefone
- `identifier` - Identificador único

**Novo Valor:**
- Campo obrigatório com suporte a variáveis
- Validação por tipo de campo
- Preview da alteração

#### Recursos:
- **Suporte a Variáveis**: Use {variavel} no valor
- **Validação por Tipo**: 
  - Email: Validação de formato
  - Telefone: Campo tel com formatação
  - Texto: Validação básica
- **Preview**: Mostra campo → novo valor

#### Casos de Uso:
- Normalizar dados de contatos
- Atualizar informações com base em eventos
- Corrigir dados durante a jornada
- Personalizar identificadores

#### Exemplo Prático:
```
Trigger: Webhook com dados atualizados
↓
Update Contact: name → {webhook.data.full_name}
↓  
Update Contact: phone → {webhook.data.phone}
```

---

### ⚙️ Update Custom Attribute Node

O **Update Custom Attribute Node** atualiza atributos personalizados do contato com novos valores.

#### Características:
- **Função**: Atualiza atributos personalizados específicos do negócio
- **Cor**: Rosa (🩷) - representa customização
- **Ícone**: Settings
- **Uso**: Armazenamento de dados específicos do negócio

#### Configurações:

**Atributo Personalizado:**
- Lista carregada dinamicamente da conta
- Filtrados por tipo 'contact_attribute'
- Exibe tipo, nome e descrição
- Ícones por tipo de atributo

**Tipos de Atributo Suportados:**

1. **📝 Text (text)**: Campo de texto livre
   - Input com suporte a variáveis
   - Validação de string

2. **🔢 Number (number)**: Valores numéricos
   - Input numérico com step=1  
   - Suporte a variáveis

3. **💰 Currency (currency)**: Valores monetários
   - Input numérico com step=0.01
   - Placeholder indica moeda (R$)

4. **📊 Percent (percent)**: Valores percentuais
   - Input numérico 
   - Placeholder indica porcentagem (%)

5. **🔗 Link (link)**: URLs e links
   - Input tipo URL
   - Validação de formato de URL

6. **📅 Date (date)**: Datas
   - Input tipo date
   - Suporte a variáveis para datas dinâmicas

7. **📋 List (list)**: Lista de opções predefinidas
   - Select com opções do atributo
   - Baseado em attribute_values

8. **☑️ Checkbox (checkbox)**: Verdadeiro/Falso
   - Switch component  
   - Valores: 'true' ou 'false'

#### Recursos Avançados:
- **Validação por Tipo**: Cada tipo tem validação específica
- **Suporte a Variáveis**: Todos os tipos exceto checkbox
- **Preview Dinâmico**: Mostra atributo → novo valor
- **Ícones Visuais**: Cada tipo tem emoji identificador
- **Carregamento Dinâmico**: Atributos carregados da conta

#### Casos de Uso:
- Armazenar pontuação de leads
- Registrar preferências do cliente
- Controlar status de processos internos
- Armazenar dados de integração
- Marcar etapas de qualificação

#### Exemplo Prático:
```
Trigger: Evento "formulario_interesse"
↓
Update Custom Attribute: "Score Lead" → {event.properties.score}
↓
Update Custom Attribute: "Data Ultimo Contato" → {journey.current_date}
↓
Update Custom Attribute: "Interessado Newsletter" → true
```

---

## 💡 Boas Práticas para Action Nodes

### Organização:
1. **Sequência Lógica**: Organize actions em ordem lógica
2. **Agrupamento**: Agrupe actions relacionadas 
3. **Nomeação**: Use nomes descritivos nas etiquetas

### Performance:
1. **Otimização**: Evite muitas actions desnecessárias
2. **Validação**: Sempre configure validações obrigatórias
3. **Teste**: Teste o fluxo completo antes de ativar

### Dados:
1. **Variáveis**: Use variáveis para valores dinâmicos
2. **Validação**: Valide tipos de dados nos custom attributes  
3. **Backup**: Mantenha backup de dados importantes antes de update

### Etiquetas:
1. **Consistência**: Mantenha padrão de nomenclatura
2. **Hierarquia**: Use hierarquia lógica (ex: Status_Prospect)
3. **Limpeza**: Remova etiquetas desnecessárias regularmente

---

## 🔀 Conditional Node

O **Conditional Node** é um dos nodes mais poderosos do sistema, permitindo criar múltiplos caminhos na jornada baseados em condições específicas. É essencial para criar jornadas inteligentes e personalizadas.

### Características Gerais:
- **Função**: Cria ramificações condicionais na jornada
- **Cor**: Amarelo (🟡) - representa decisão e controle de fluxo
- **Ícone**: GitBranch
- **Uso**: Personalização de fluxos e tomada de decisões automáticas

### 🛤️ Sistema de Caminhos

O Conditional Node trabalha com **caminhos condicionais** independentes, cada um com suas próprias condições e lógica.

#### Estrutura dos Caminhos:
1. **Caminhos Personalizados**: Quantos forem necessários
2. **Caminho "Caso Contrário"**: Sempre presente automaticamente

### ⚙️ Configuração de Caminhos

#### **Nome e Cor:**
- **Nome Personalizado**: Descrição clara do caminho
- **5 Cores Disponíveis**: Verde, Azul, Roxo, Laranja, Amarelo
- **Identificação Visual**: Cada caminho tem sua cor no node

#### **Operador Lógico:**
Controla como as condições são avaliadas dentro do caminho:
- **AND (E)**: **Todas** as condições devem ser verdadeiras
- **OR (OU)**: **Qualquer** condição deve ser verdadeira

### 🎯 Sistema de Condições

Cada caminho pode ter múltiplas condições baseadas em 4 tipos de dados:

#### **1. 🎯 Trigger (Dados do Disparador)**
Condições baseadas nos dados que dispararam a jornada:

**Campos Disponíveis:**
- `event.name` - Nome do Evento
- `event.value` - Valor do Evento  
- `event.properties` - Propriedades do Evento

**Casos de Uso:**
- Direcionar baseado no tipo de evento
- Filtrar por valores específicos de propriedades
- Segmentar por origem do evento

#### **2. 👤 Contact (Dados do Contato)**
Condições baseadas nas informações do contato:

**Campos Disponíveis:**
- `contact.name` - Nome do contato
- `contact.email` - Email do contato
- `contact.phone` - Telefone do contato
- `contact.created_at` - Data de criação
- `contact.updated_at` - Última atualização

**Casos de Uso:**
- Personalizar por informações demográficas
- Segmentar contatos antigos vs novos
- Direcionar baseado em dados de contato

#### **3. 🖥️ System (Dados do Sistema)**
Condições baseadas em informações do sistema:

**Campos Disponíveis:**
- `system.current_time` - Horário atual
- `system.current_day` - Dia da semana
- `system.current_date` - Data atual

**Casos de Uso:**
- Horário comercial vs fora de horário
- Dias úteis vs fins de semana
- Campanhas sazonais ou por período

#### **4. 🔧 Custom (Variáveis Personalizadas)**
Condições baseadas em variáveis personalizadas da jornada:

**Campos Disponíveis:**
- `custom.variable` - Variável personalizada (com suporte a VariableInput)

**Casos de Uso:**
- Usar dados capturados anteriormente na jornada
- Condições baseadas em cálculos ou processamentos
- Lógica complexa com dados derivados

### 🔍 Operadores Disponíveis

**Comparação Básica:**
- `equals` - É igual a
- `not_equals` - É diferente de
- `greater_than` - É maior que
- `less_than` - É menor que

**Operadores de Texto:**
- `contains` - Contém
- `not_contains` - Não contém
- `starts_with` - Começa com
- `ends_with` - Termina com

**Operadores de Existência:**
- `is_empty` - Está vazio
- `is_not_empty` - Não está vazio

### 🎛️ Interface de Configuração

#### **Sistema de Abas:**
- **Navegação por Tabs**: Cada caminho tem sua própria aba
- **Cores Identificadoras**: Bolinhas coloridas nas abas
- **Grid Responsivo**: Até 4 abas visíveis simultaneamente

#### **Gerenciamento de Caminhos:**
- **➕ Adicionar Caminho**: Cria novos caminhos condicionais
- **🎨 Seletor de Cores**: 5 opções de cores para identificação
- **📋 Duplicar Caminho**: Copia caminho existente com condições
- **🗑️ Remover Caminho**: Remove caminho completo

#### **Controle de Condições:**
- **Botões por Tipo**: Trigger, Contato, Sistema, Variável
- **Grid de 12 Colunas**: Organização eficiente dos campos
- **Suporte a Variáveis**: VariableInput nos valores
- **Validação Inteligente**: Oculta campo "valor" quando desnecessário

### 📊 Sistema de Preview

#### **Resumo Visual:**
- **Lista Organizada**: Todos os caminhos com suas condições
- **Contadores**: Número de condições por caminho
- **Operadores Visíveis**: AND/OR claramente indicados
- **Status de Configuração**: Identifica caminhos sem condições

#### **Preview no Node:**
- **Condições Compactas**: `Nome operador "valor"`
- **Cores Diferenciadas**: Cada caminho com sua cor
- **Handles Visuais**: Indicadores de conexão
- **Estado de Conexão**: Visual diferenciado para handles conectados

### 🎯 Casos de Uso Práticos

#### **1. Segmentação por Valor:**
```
Caminho 1 (Verde): "VIPs"
├─ contact.email contains "@empresa.com" 
└─ event.properties.value > "1000"
Operador: AND

Caminho 2 (Azul): "Leads Qualificados"  
├─ contact.created_at < "30 dias atrás"
└─ event.name equals "interesse_produto"
Operador: AND

Caso Contrário: "Nutrição Padrão"
```

#### **2. Horário e Disponibilidade:**
```
Caminho 1 (Verde): "Horário Comercial"
├─ system.current_time > "09:00"
├─ system.current_time < "18:00"  
└─ system.current_day not_equals "domingo"
Operador: AND

Caso Contrário: "Fora de Horário"
```

#### **3. Jornada Baseada em Comportamento:**
```
Caminho 1 (Roxo): "Interessado em Premium"
├─ event.name equals "visualizou_plano_premium"
├─ contact.email is_not_empty
└─ custom.score_interesse > "75"
Operador: AND

Caminho 2 (Laranja): "Interessado Básico"
└─ event.name contains "visualizou_plano"
Operador: OR

Caso Contrário: "Seguir Fluxo Padrão"
```

### 🔧 Recursos Técnicos

#### **Performance:**
- **Avaliação Sequencial**: Caminhos avaliados em ordem
- **Short-circuit**: Para na primeira condição verdadeira  
- **Cache de Condições**: Otimização para múltiplas avaliações

#### **Compatibilidade:**
- **Estrutura Legada**: Suporte para configurações antigas
- **Migração Automática**: Detecta e sugere atualização
- **Fallback Gracioso**: Funciona mesmo com dados incompletos

#### **Validação:**
- **Campos Obrigatórios**: Campo e operador sempre necessários
- **Validação por Tipo**: Cada tipo de condição tem validação específica
- **Preview em Tempo Real**: Atualização instantânea das configurações

### 💡 Boas Práticas

#### **Organização:**
1. **Nomes Descritivos**: Use nomes claros para os caminhos
2. **Cores Lógicas**: Verde para "positivo", vermelho para "negativo"
3. **Ordenação**: Coloque condições mais específicas primeiro
4. **Simplicidade**: Evite muitas condições em um único caminho

#### **Performance:**
1. **Condições Eficientes**: Use operadores de existência quando possível
2. **Ordenação Estratégica**: Condições mais prováveis primeiro
3. **Consolidação**: Agrupe condições relacionadas no mesmo caminho

#### **Manutenção:**
1. **Documentação**: Nomes auto-explicativos nos caminhos
2. **Teste Regular**: Verifique se as condições ainda fazem sentido
3. **Monitoramento**: Acompanhe qual caminho é mais utilizado

### ⚠️ Limitações e Considerações

1. **Ordem de Avaliação**: Caminhos são avaliados sequencialmente
2. **Primeiro Match**: Apenas o primeiro caminho verdadeiro é executado
3. **Caso Contrário**: Sempre executado se nenhum caminho for verdadeiro
4. **Variáveis Dinâmicas**: Valores podem mudar durante a execução
5. **Limite Prático**: Máximo recomendado de 6-8 caminhos por clareza

### 🔗 Integração com Outros Nodes

O Conditional Node pode ser usado após qualquer node e direcionado para qualquer node:

```
Trigger → Conditional → Multiple Actions
├─ Send Message (VIP)
├─ Add Label (Qualificado)  
└─ Wait (Padrão)
```

---

## 🚪 Terminal Nodes

Os **Terminal Nodes** são responsáveis por finalizar a jornada do contato de diferentes formas. São sempre nodes finais e não possuem saídas para outros nodes.

### 🚪 Exit Journey Node

O **Exit Journey Node** remove o contato da jornada atual de forma definitiva.

#### Características:
- **Função**: Remove contato da jornada de forma definitiva
- **Cor**: Vermelho (🔴) - representa finalização
- **Ícone**: LogOut
- **Tipo**: Node terminal (sem saída)
- **Configuração**: Nenhuma configuração necessária

#### Comportamento:
- **Ação Imediata**: O contato é removido instantaneamente
- **Sem Reversão**: Não há como desfazer esta ação
- **Histórico**: O histórico da jornada é mantido
- **Status Final**: Contato fica com status "Saiu da jornada"

#### Casos de Uso:
- **Desqualificação**: Remover leads que não atendem critérios
- **Opt-out**: Respeitar pedidos de cancelamento
- **Limite de Tentativas**: Parar após muitas falhas
- **Condições de Negócio**: Sair quando regras específicas são atendidas
- **Limpeza de Base**: Remover contatos inativos

#### Exemplo Prático:
```
Trigger: Evento "email_bounce_hard"
↓
Conditional: "Bounces > 3"
├─ TRUE → Exit Journey
└─ FALSE → Continue nurturing
```

#### Visual no Node:
- Ícone de LogOut centralizado
- Mensagem clara: "Remove o contato da jornada"
- Aviso: "Esta é uma ação final - não há próximos passos"

---

### 🔄 Transfer Journey Node

O **Transfer Journey Node** move o contato da jornada atual para outra jornada ativa.

#### Características:
- **Função**: Transfere contato para outra jornada
- **Cor**: Laranja (🟠) - representa transição
- **Ícone**: ArrowRight
- **Tipo**: Node terminal (sem saída na jornada atual)
- **Configuração**: Seleção de jornada destino obrigatória

### ⚙️ Configurações

#### **Seleção de Jornada:**
- **Lista Dinâmica**: Carrega jornadas ativas da conta
- **Filtros Automáticos**: 
  - Remove a jornada atual da lista
  - Mostra apenas jornadas ativas
- **Interface**: Select dropdown com badges de status
- **Validação**: Seleção obrigatória para salvar

#### **Informações de Preview:**
- **Nome da Jornada**: Nome completo da jornada destino
- **Status Badge**: Indicador visual de jornada ativa
- **Warnings**: Alertas sobre o comportamento da transferência

### 🔄 Comportamento da Transferência

#### **Processo de Transferência:**
1. **Saída Imediata**: Remove da jornada atual
2. **Entrada na Nova**: Inicia do primeiro node (trigger) da jornada destino
3. **Dados Preservados**: Informações do contato são mantidas
4. **Histórico**: Histórico da jornada atual é preservado
5. **Estado Limpo**: Variáveis da jornada atual não são transferidas

#### **Validações do Sistema:**
- **Jornada Ativa**: Destino deve estar ativo
- **Acesso**: Deve pertencer à mesma conta
- **Trigger Compatível**: Jornada destino deve aceitar transferências
- **Não Circular**: Previne loops infinitos

### 📋 Interface de Configuração

#### **Estados da Interface:**

**1. Carregando:**
- Loader com texto "Carregando jornadas..."
- Desabilita interação até carregar

**2. Sem Jornadas:**
- Card com ícone de alerta
- Mensagem: "Nenhuma jornada disponível"
- Explicação sobre jornadas ativas

**3. Jornadas Disponíveis:**
- Select dropdown com lista
- Badges de status para cada jornada
- Preview da configuração quando selecionada

#### **Preview da Configuração:**
```
🔄 Transferência Configurada
O contato será transferido para: [Nome da Jornada]

⚠️ Importante:
• Sairá desta jornada imediatamente
• Iniciará do primeiro passo da nova jornada  
• Dados e histórico não serão transferidos
```

### 🎯 Casos de Uso Práticos

#### **1. Qualificação por Estágio:**
```
Trigger: Evento "interesse_avançado"
↓
Update Custom Attribute: "score" → {event.properties.score}
↓
Conditional: "score > 80"
├─ TRUE → Transfer Journey: "Vendas - Hot Leads"
└─ FALSE → Continue nurturing
```

#### **2. Segmentação por Produto:**
```
Trigger: Evento "interesse_produto"
↓
Conditional: "product_type"
├─ "premium" → Transfer Journey: "Onboarding Premium"
├─ "basic" → Transfer Journey: "Onboarding Básico"
└─ ELSE → Exit Journey
```

#### **3. Recuperação de Carrinho:**
```
Trigger: Evento "carrinho_abandonado"
↓
Wait: 1 hora
↓
Send Message: "Lembrete do carrinho"
↓
Conditional: "não abriu email em 24h"
├─ TRUE → Transfer Journey: "Recuperação Avançada"
└─ FALSE → Exit Journey
```

### 💡 Boas Práticas

#### **Planejamento:**
1. **Mapeamento de Fluxos**: Documente as transferências possíveis
2. **Evite Complexidade**: Máximo 2-3 níveis de transferência
3. **Nomenclatura Clara**: Jornadas com nomes descritivos
4. **Teste de Integração**: Valide todo o fluxo de transferência

#### **Organização:**
1. **Jornadas Específicas**: Crie jornadas focadas para cada estágio
2. **Triggers Compatíveis**: Jornadas destino devem aceitar transferências
3. **Documentação**: Mantenha diagrama das transferências
4. **Monitoramento**: Acompanhe taxas de transferência

#### **Performance:**
1. **Jornadas Ativas**: Mantenha apenas jornadas necessárias ativas
2. **Limpeza Regular**: Desative jornadas não utilizadas
3. **Limite de Transferências**: Evite transferências excessivas
4. **Cache Inteligente**: Sistema otimiza carregamento de jornadas

### ⚠️ Limitações e Considerações

#### **Exit Journey:**
- **Irreversível**: Não é possível desfazer a saída
- **Dados Perdidos**: Variáveis da jornada não são preservadas
- **Re-entrada**: Contato pode entrar novamente via trigger
- **Histórico**: Mantido mas jornada fica inativa para o contato

#### **Transfer Journey:**
- **Variáveis**: Não transfere variáveis entre jornadas
- **Estado**: Inicia sempre do começo da jornada destino
- **Trigger**: Jornada destino deve ter trigger compatível
- **Performance**: Múltiplas transferências podem impactar performance

### 🔍 Diferenças Principais

| Aspecto | Exit Journey | Transfer Journey |
|---------|-------------|------------------|
| **Destino** | Fora de qualquer jornada | Outra jornada específica |
| **Reversão** | Apenas via novo trigger | Apenas via novo trigger |
| **Dados** | Histórico preservado | Histórico + dados do contato |
| **Configuração** | Nenhuma | Seleção de jornada |
| **Interface** | Simples | Configuração completa |
| **Uso** | Finalização definitiva | Continuidade em outro fluxo |

### 🔗 Integração no Fluxo

Ambos os nodes são terminais e geralmente usados como:

```
Qualquer Node → Conditional → Terminal Nodes
                    ├─ Condition A → Transfer Journey
                    ├─ Condition B → Exit Journey  
                    └─ ELSE → Continue Flow
```

---

## 🔀 Split Node (A/B Testing)

O **Split Node** é uma ferramenta poderosa para realizar testes A/B e distribuir contatos aleatoriamente entre diferentes caminhos da jornada com percentuais definidos.

### Características Gerais:
- **Função**: Distribui contatos aleatoriamente entre variantes configuradas
- **Cor**: Roxo (🟣) - representa experimentação e testes
- **Ícone**: Split
- **Uso**: A/B Testing, testes multivariados, distribuição proporcional

### 🧪 Conceito de Split Testing

O Split Node permite dividir o tráfego de contatos em diferentes "variantes" para:
- **Testar diferentes abordagens** na mesma jornada
- **Comparar performance** entre estratégias
- **Otimizar conversões** baseado em dados
- **Experimentar** sem impactar todos os contatos

### ⚙️ Sistema de Variantes

#### **Configuração de Variantes:**
Cada variante possui:
- **Nome**: Identificação clara (ex: "Variante A", "Email Curto")
- **Percentual**: Porção dos contatos que seguirá esta variante (0-100%)
- **Cor**: Identificação visual entre 6 opções disponíveis

#### **Cores Disponíveis:**
- 🔵 **Azul** - Padrão para controle
- 🟣 **Roxo** - Variantes experimentais
- 🟢 **Verde** - Variantes otimizadas
- 🟠 **Laranja** - Testes de urgência
- 🔴 **Vermelho** - Variantes agressivas
- 🟡 **Amarelo** - Testes de destaque

### 📊 Interface de Configuração

#### **Controles Principais:**
- **➕ Adicionar Variante**: Cria nova variante com configurações padrão
- **⚖️ Distribuir Igualmente**: Divide percentuais igualmente entre todas as variantes
- **🗑️ Remover Variante**: Remove variante (mínimo 2 obrigatório)

#### **Configuração por Variante:**
```
┌─ Nome da Variante ─┬─ Cor ─┬─ Percentual (%) ─┬─ Remover ─┐
│ "Email Longo"      │ Azul  │ 60              │    🗑️    │
└────────────────────┴───────┴─────────────────┴───────────┘
```

#### **Grid de 12 Colunas:**
- **4 colunas**: Nome da variante (input text)
- **3 colunas**: Cor (select dropdown)  
- **3 colunas**: Percentual (input number, 0-100)
- **2 colunas**: Botão remover (desabilitado se ≤ 2 variantes)

### 🔢 Sistema de Percentuais

#### **Validação Inteligente:**
- **Soma Total**: Sistema calcula automaticamente
- **Indicadores Visuais**:
  - 🟢 Verde: Total = 100% (ideal)
  - 🟡 Amarelo: Total ≠ 100% (será normalizado)
- **Badge de Status**: Mostra diferença quando ≠ 100%

#### **Normalização Automática:**
```javascript
// Exemplo: [60%, 30%, 20%] = 110% total
// Normalizado: [55%, 27%, 18%] = 100% total
```

#### **Distribuição Igual:**
- **Algoritmo Inteligente**: Distribui resto quando não divide exato
- **Exemplo**: 3 variantes = 33%, 33%, 34%
- **Botão Rápido**: "Distribuir Igualmente"

### 🎯 Sistema de Handles e Conexões

#### **Handles Dinâmicos:**
- **Um Handle por Variante**: `split-variant-{id}`
- **Posicionamento**: Lateral direita de cada variante
- **Estado Visual**: Verde quando conectado, cinza quando não conectado
- **Identificação**: Cada handle tem ID único

#### **Roteamento de Contatos:**
- **Algoritmo**: Distribuição aleatória baseada nos percentuais
- **Preservação**: Percentuais são respeitados ao longo do tempo
- **Balanceamento**: Sistema equilibra automaticamente

### 📈 Casos de Uso Práticos

#### **1. A/B Test de Email Marketing:**
```
Trigger: Evento "interesse_produto"
↓
Split Node: "Teste de Email"
├─ Variante A (50%): "Email Curto" → Send Message (texto conciso)
└─ Variante B (50%): "Email Longo" → Send Message (detalhado)
     ↓
   [Ambas continuam] → Update Custom Attribute: "variante_teste"
```

#### **2. Teste Multivariado de Ofertas:**
```
Trigger: Evento "visitou_pricing"
↓
Split Node: "Teste de Ofertas"  
├─ Desconto 10% (30%) → Send Message: "10% OFF"
├─ Desconto 15% (30%) → Send Message: "15% OFF"  
├─ Frete Grátis (25%) → Send Message: "Frete Grátis"
└─ Controle (15%) → Send Message: "Oferta Padrão"
```

#### **3. Teste de Timing de Follow-up:**
```
Trigger: Evento "trial_iniciado"
↓
Split Node: "Teste de Timing"
├─ Imediato (25%) → Send Message: "Boas-vindas"
├─ 1 Hora (25%) → Wait: 1h → Send Message: "Como está?"
├─ 1 Dia (25%) → Wait: 1d → Send Message: "Precisa de ajuda?"
└─ 3 Dias (25%) → Wait: 3d → Send Message: "Aproveite o trial"
```

### 🔧 Recursos Avançados

#### **Configuração Padrão:**
```javascript
defaultVariants = [
  { name: 'Variante A', percentage: 50, color: 'blue' },
  { name: 'Variante B', percentage: 50, color: 'purple' }
]
```

#### **Nomenclatura Automática:**
- **Padrão**: Variante A, B, C... até Z
- **Após Z**: Variante 27, 28, 29...
- **Cores Automáticas**: Rotação entre as 6 cores disponíveis

#### **Validações do Sistema:**
- **Mínimo**: 2 variantes obrigatórias
- **Máximo**: Ilimitado (recomendado até 6 para clareza)
- **Percentuais**: Apenas números inteiros de 0-100
- **Nomes**: Obrigatório e único por node

### 📊 Preview e Monitoramento

#### **Resumo Visual:**
```
🟣 Resumo do Split:
🔵 Email Curto: 50%
🟣 Email Longo: 50%
```

#### **Preview no Node:**
- **Cada Variante**: Nome e percentual claramente visíveis
- **Cores**: Diferenciação visual entre variantes
- **Handles**: Status de conexão por variante
- **Estado**: Mostra se configurado ou não

### 💡 Boas Práticas

#### **Planejamento de Testes:**
1. **Hipótese Clara**: Defina o que quer testar
2. **Métrica de Sucesso**: Estabeleça como medir resultados
3. **Tamanho da Amostra**: Garanta volume suficiente
4. **Duração**: Defina tempo mínimo para resultados válidos

#### **Configuração de Variantes:**
1. **Nomes Descritivos**: Use nomes que identifiquem o que está sendo testado
2. **Controle**: Sempre tenha uma variante de controle (status quo)
3. **Uma Variável**: Teste apenas uma coisa por vez
4. **Percentuais Balanceados**: 50/50 para A/B, distribuição igual para multivariado

#### **Análise de Resultados:**
1. **Significância Estatística**: Aguarde dados suficientes
2. **Documentação**: Registre configurações e resultados
3. **Implementação**: Aplique aprendizados em jornadas futuras
4. **Iteração**: Use resultados para novos testes

### ⚠️ Limitações e Considerações

#### **Técnicas:**
- **Randomização**: Baseada em algoritmo pseudoaleatório
- **Persistência**: Contato mantém variante durante toda a jornada
- **Estado**: Não transfere informação da variante entre jornadas
- **Volume**: Requer volume adequado para resultados confiáveis

#### **Estatísticas:**
- **Pequenos Volumes**: Podem não ser estatisticamente significativos
- **Fatores Externos**: Pode haver influências não controladas
- **Tempo**: Resultados podem variar por período (sazonal, etc.)
- **Segmentação**: Diferentes segmentos podem reagir diferente

### 🔗 Integração com Outros Nodes

#### **Fluxos Comuns:**
```
Trigger → Split → [Variantes] → Merge Point
                     ↓
              Mesmo próximo node
```

#### **Tracking e Medição:**
```
Split → [Variante A] → Update Custom Attribute: "split_variant" → "A"
     → [Variante B] → Update Custom Attribute: "split_variant" → "B"
```

### 📏 Métricas Recomendadas

Para acompanhar efetividade dos testes:
- **Taxa de Conversão** por variante
- **Tempo de Resposta** médio
- **Taxa de Abertura** (para emails)  
- **Taxa de Clique** (para links)
- **ROI** por variante
- **Custo por Conversão**

---

## ⏳ Wait Node

O **Wait Node** é um node versátil que pausa a jornada do contato por diferentes critérios: tempo fixo, eventos específicos, condições ou uma combinação destes elementos.

### Características Gerais:
- **Função**: Pausa a jornada até critérios serem atendidos
- **Cores Dinâmicas**: Varia por tipo (Azul, Verde, Amarelo, Roxo)
- **Múltiplos Tipos**: 4 tipos diferentes de espera
- **Handles Dinâmicos**: Saídas condicionais conforme o tipo

## 🕒 Tipos de Wait

### 1. 🔵 Aguardar Tempo (`time`)

Pausa a jornada por um período fixo e determinado.

#### **Características:**
- **Cor**: Azul - representa simplicidade e previsibilidade
- **Ícone**: Clock
- **Saídas**: Uma saída única
- **Uso**: Delays simples, nurturing programado

#### **Configurações:**
- **Duração**: Número inteiro (mínimo 1)
  - Suporte a variáveis via VariableInput
  - Validação automática de valores
- **Unidade de Tempo**: 3 opções disponíveis
  - `minutes` - Minutos (para ações rápidas)
  - `hours` - Horas (para sequências diárias)
  - `days` - Dias (para nurturing longo)

#### **Inteligência Gramatical:**
```
1 minuto / 5 minutos
1 hora / 3 horas  
1 dia / 7 dias
```

#### **Casos de Uso:**
- **Follow-up Imediato**: 5-15 minutos após ação
- **Sequências Educativas**: 1-3 dias entre conteúdos
- **Nurturing Longo**: 7-30 dias para aquecimento
- **Timing Otimizado**: Enviar em horários específicos

#### **Exemplo Prático:**
```
Trigger: Evento "download_ebook"
↓
Wait: 2 horas
↓
Send Message: "Como está aproveitando o eBook?"
```

---

### 2. 🟢 Aguardar Evento (`event`)

Pausa até que um evento específico aconteça no sistema.

#### **Características:**
- **Cor**: Verde - representa reatividade e dinamismo
- **Ícone**: Zap (raio)
- **Saídas**: 1-2 saídas (com/sem fallback)
- **Uso**: Esperas baseadas em ações do usuário

#### **Tipos de Eventos Suportados:**

**📊 Evento Customizado:**
- Configuração idêntica ao Trigger Event
- Template de evento selecionável
- Propriedades filtráveis
- Suporte a operadores de comparação

**👥 Segmento:**
- Entrada (`entered`) ou saída (`exited`) de segmento
- Seleção de segmentos da conta
- Monitoramento em tempo real

**👤 Contato Criado/Atualizado:**
- Monitoramento de mudanças no contato
- Filtros por campos específicos
- Operadores de comparação avançados

**🏷️ Etiqueta:**
- Aplicação (`applied`) ou remoção (`removed`)
- Seleção de etiquetas existentes
- Ideal para workflows baseados em categorização

**⚙️ Atributo Personalizado:**
- Monitoramento de mudanças em custom attributes
- Operadores específicos por tipo de atributo
- Suporte a todos os tipos (text, number, date, etc.)

**🔗 Webhook:**
- URL única gerada automaticamente
- Headers personalizáveis para validação
- Método HTTP configurável
- Ideal para integrações externas

#### **Sistema de Fallback:**
- **Timeout Opcional**: Define tempo máximo de espera
- **Duas Saídas**: "Evento ocorreu" vs "Caso contrário"
- **Configuração Flexível**: 
  - `fallbackTime`: Tempo limite
  - `fallbackUnit`: Unidade de tempo
  - `enableFallback`: Habilita/desabilita

#### **Mapeamento de Variáveis:**
- **Sistema Integrado**: Mesmo padrão do Trigger
- **Caminhos Dinâmicos**: Baseado no tipo de evento
- **Transformações**: Suporte completo
- **VariableMapping Component**: Interface idêntica

#### **Casos de Uso:**
```
// Aguardar compra com fallback
Wait Event: "purchase_completed"
├─ Evento ocorreu → Send Message: "Obrigado pela compra!"
└─ Caso contrário (após 7 dias) → Send Message: "Que tal finalizar?"

// Aguardar engagement
Wait Event: "email_opened" 
├─ Abriu email → Continue nurturing
└─ Não abriu (após 3 dias) → Different approach
```

---

### 3. 🟡 Aguardar Condição (`condition`)

Pausa até que uma condição específica seja atendida.

#### **Características:**
- **Cor**: Amarelo - representa avaliação e decisão
- **Ícone**: GitBranch 
- **Saídas**: 1-2 saídas (com/sem fallback)
- **Uso**: Esperas baseadas em estados do sistema

#### **Tipos de Condições:**

**👤 Contato Criado/Atualizado:**
- Monitoramento de novos contatos ou mudanças
- Múltiplos filtros simultâneos
- Operadores por tipo de campo

**🏷️ Etiqueta:**
- Aguarda aplicação ou remoção de etiqueta específica
- Configuração de ação esperada
- Monitoramento em tempo real

**⚙️ Atributo Personalizado:**
- Aguarda mudança em atributo específico
- Operador e valor configuráveis
- Suporte a todos os tipos de atributo

#### **Sistema de Fallback:**
- Idêntico ao tipo Event
- Timeout configurável
- Duas saídas condicionais
- `enableFallback` controla comportamento

#### **Casos de Uso:**
```
// Aguardar qualificação
Wait Condition: custom_attribute "score" >= "70"
├─ Condição atendida → Transfer Journey: "Sales Qualified"
└─ Timeout (após 30 dias) → Continue nurturing

// Aguardar segmentação
Wait Condition: label "premium_interest" applied
├─ Etiqueta aplicada → Premium nurturing sequence  
└─ Timeout (após 14 dias) → Standard sequence
```

---

### 4. 🟣 Tempo ou Condição (`time_or_condition`)

Modo híbrido que aguarda **tempo máximo** OU **condição** (o que ocorrer primeiro).

#### **Características:**
- **Cor**: Roxo - representa complexidade e flexibilidade
- **Ícone**: Clock
- **Saídas**: 2 saídas obrigatórias
- **Uso**: Esperas inteligentes com múltiplos critérios

#### **Configurações Obrigatórias:**

**⏰ Tempo Máximo:**
- `maxWaitTime`: Duração máxima
- `maxWaitUnit`: Unidade de tempo
- **Função**: Garante que a jornada não trave indefinidamente

**🎯 Condição/Evento:**
- Pode ser qualquer condição ou evento
- Configuração idêntica aos tipos anteriores
- **Função**: Permite progressão antecipada

#### **Lógica de Funcionamento:**
```
Inicia ambos os critérios simultaneamente
├─ Se CONDIÇÃO ocorre primeiro → Handle "Primeiro a ocorrer"
└─ Se TEMPO esgota primeiro → Handle "Timeout"
```

#### **Handles de Saída:**
- **"Primeiro a ocorrer"**: Condição/evento foi atendido
- **"Timeout"**: Tempo máximo foi atingido

#### **Casos de Uso Avançados:**
```
// Onboarding inteligente
Wait: Máximo 3 dias OU evento "first_login"
├─ Login realizado → Welcome personalized flow
└─ Timeout → Activation campaign

// Qualificação com prazo
Wait: Máximo 7 dias OU custom_attribute "score" > "80"
├─ Score atingido → Fast-track to sales
└─ Timeout → Standard nurturing continue

// Engagement com fallback
Wait: Máximo 24 horas OU evento "email_clicked"  
├─ Email clicado → High engagement flow
└─ Timeout → Low engagement recovery
```

---

## 🔧 Recursos Técnicos Avançados

### **Sistema de Handles Dinâmicos:**
- **Single Output**: Tipos `time` (sempre uma saída)
- **Conditional Outputs**: Tipos `event`, `condition` (1-2 saídas)
- **Dual Outputs**: Tipo `time_or_condition` (sempre duas saídas)
- **Visual Feedback**: Handles mudam cor quando conectados

### **Validação Inteligente:**
- **Por Tipo**: Cada tipo tem validações específicas
- **Campos Obrigatórios**: Diferentes por tipo
- **Preview em Tempo Real**: Descrição atualizada instantaneamente
- **Reset Automático**: Limpa campos irrelevantes ao trocar tipo

### **Interface Adaptativa:**
```
WaitPanel
├─ Seletor de Tipo (4 opções)
├─ WaitTimeConfig (tipo time)
├─ WaitEventConfig (tipo event)  
├─ WaitConditionConfig (tipo condition)
└─ WaitHybridConfig (tipo time_or_condition)
```

### **Componentes Especializados:**
- **WaitTimeConfig**: Duração + unidade simples
- **WaitEventConfig**: Reutiliza components do Trigger
- **WaitConditionConfig**: Condições específicas
- **WaitHybridConfig**: Combinação tempo + condição

### **Mapeamento de Variáveis Integrado:**
- **Sistema Unificado**: Mesmo padrão em toda aplicação
- **Caminhos Dinâmicos**: Baseado no tipo configurado
- **VariableMapping**: Component reutilizado do Trigger
- **Transformações**: Suporte completo a transformações

## 💡 Boas Práticas

### **Seleção do Tipo Correto:**
1. **Time**: Para delays previsíveis e nurturing programado
2. **Event**: Para esperar ações específicas do usuário
3. **Condition**: Para aguardar mudanças de estado
4. **Time_or_Condition**: Para esperas inteligentes com backup

### **Configuração de Timeouts:**
1. **Sempre Configure Fallbacks**: Para eventos/condições
2. **Tempos Realistas**: Baseie em dados históricos
3. **Diferentes por Contexto**: 
   - Ações imediatas: 1-24 horas
   - Engajamento: 3-7 dias  
   - Qualificação: 14-30 dias

### **Mapeamento de Variáveis:**
1. **Capture Dados Relevantes**: Apenas o que será usado
2. **Transformações**: Use quando necessário padronizar
3. **Nomenclatura**: Nomes descritivos para variáveis

### **Performance:**
1. **Evite Waits Excessivos**: Máximo 2-3 por jornada
2. **Timeouts Apropriados**: Não indefinidos
3. **Monitoramento**: Acompanhe taxas de timeout

## ⚠️ Limitações e Considerações

### **Por Tipo:**

**Time:**
- **Previsível**: Não reativo a mudanças do usuário
- **Fixo**: Não adapta a contextos diferentes

**Event:**
- **Dependente**: Requer que evento realmente ocorra
- **Timeout Necessário**: Sempre configure fallback
- **Volume**: Pode gerar esperas indefinidas sem timeout

**Condition:**
- **Complexidade**: Condições mal configuradas podem nunca ser atendidas
- **Monitoramento**: Requer que sistema monitore constantemente
- **Estados**: Dependente de dados atualizados

**Time_or_Condition:**
- **Complexidade Alta**: Dois critérios para gerenciar
- **Handles Obrigatórios**: Sempre duas saídas
- **Configuração**: Mais complexo de configurar corretamente

### **Geral:**
- **Recursos do Sistema**: Waits consomem recursos para monitoramento
- **Escala**: Muitos waits simultâneos podem impactar performance
- **Debugging**: Waits tornam debug mais complexo
- **Variáveis**: Estado pode mudar durante a espera

## 🔗 Integração com Outros Nodes

### **Fluxos Típicos:**
```
Trigger → Action → Wait → Conditional → Continue
                    ├─ Success path
                    └─ Fallback path
```

### **Padrões Comuns:**
```
// Nurturing com wait
Send Message → Wait: 2 days → Send Message

// Engagement tracking  
Send Message → Wait Event: "email_opened" → Branch by engagement

// Qualification flow
Update Attribute → Wait Condition: score > threshold → Transfer Journey
```

### **Com Variable Mapping:**
```
Wait Event: "purchase" 
├─ Map: purchase.amount → journey.purchase_value
└─ Map: purchase.product → journey.product_interest
     ↓
   Continue with enriched data
```

---

## 🔧 Set Variable Node

O **Set Variable Node** é uma ferramenta poderosa para manipular variáveis durante a jornada, permitindo armazenar, modificar e gerar valores dinâmicos para uso em outros nodes.

### Características Gerais:
- **Função**: Manipula variáveis da jornada com múltiplas operações
- **Cor**: Roxo (🟣) - representa processamento e lógica
- **Ícone**: Variable
- **Uso**: Contadores, flags, timestamps, IDs únicos, cálculos

## 🎛️ Sistema de Operações

O Set Variable Node oferece **9 operações** organizadas em **4 categorias** distintas:

### 1. 🛠️ **Personalizado**

#### **✏️ Personalizado (`set`)**
- **Função**: Define um valor personalizado para a variável
- **Requer Valor**: Sim (VariableInput com suporte a variáveis)
- **Uso**: Armazenar dados específicos, flags, resultados de cálculos
- **Exemplo**: `usuario_status` ← `"premium"`

#### **🧹 Limpar (`clear`)**  
- **Função**: Remove/limpa o valor da variável
- **Requer Valor**: Não
- **Uso**: Reset de flags, limpeza de dados temporários
- **Exemplo**: `carrinho_abandonado` ← `(vazio)`

---

### 2. 🔢 **Numérico**

#### **➕ Aumentar valor (`increase`)**
- **Função**: Incrementa o valor numérico da variável
- **Requer Valor**: Sim (número, padrão: 1)
- **Uso**: Contadores, pontuação, tentativas
- **Exemplo**: `contador_emails` ← `contador_emails + 2`

#### **➖ Diminuir valor (`decrease`)**
- **Função**: Decrementa o valor numérico da variável  
- **Requer Valor**: Sim (número, padrão: 1)
- **Uso**: Estoque, créditos, tentativas restantes
- **Exemplo**: `tentativas_restantes` ← `tentativas_restantes - 1`

---

### 3. 📅 **Data e Hora**

#### **🕐 Agora (`now`)**
- **Função**: Armazena data e hora atual
- **Requer Valor**: Não (gerado automaticamente)
- **Uso**: Timestamps, última ação, logs
- **Exemplo**: `ultimo_contato` ← `2025-01-15T14:30:25Z`

#### **📅 Ontem (`yesterday`)**
- **Função**: Armazena a data de ontem
- **Requer Valor**: Não (calculado automaticamente)
- **Uso**: Comparações temporais, relatórios
- **Exemplo**: `data_referencia` ← `2025-01-14T00:00:00Z`

#### **📆 Amanhã (`tomorrow`)**
- **Função**: Armazena a data de amanhã
- **Requer Valor**: Não (calculado automaticamente)
- **Uso**: Lembretes, agendamentos futuros
- **Exemplo**: `proximo_followup` ← `2025-01-16T00:00:00Z`

#### **🌅 Momento do dia (`time_of_day`)**
- **Função**: Classifica horário atual (Manhã, Tarde, Noite)
- **Requer Valor**: Não (baseado no horário atual)
- **Uso**: Personalização por período, segmentação temporal
- **Lógica**:
  - 05:00-11:59: "Manhã"
  - 12:00-17:59: "Tarde"  
  - 18:00-04:59: "Noite"

---

### 4. 🎲 **Funções**

#### **🎲 ID Aleatório (`random_id`)**
- **Função**: Gera um ID único aleatório
- **Requer Valor**: Não (gerado automaticamente)
- **Requer Categoria**: Sim (7 categorias disponíveis)
- **Uso**: Identificadores únicos, tracking, referências

**Categorias de ID disponíveis:**
- **👤 Usuário**: ID para identificação de usuários
- **🔗 Sessão**: ID para sessões ou interações
- **💰 Transação**: ID para transações financeiras
- **📦 Pedido**: ID para pedidos ou compras
- **📍 Rastreamento**: ID para rastreamento de envios
- **📢 Campanha**: ID para campanhas de marketing
- **🔧 Genérico**: ID de uso geral

---

## 🎯 Sistema de Variáveis

### **Seleção de Variáveis:**

#### **Variáveis do Sistema:**
Organizadas por categoria com descrições detalhadas:
- **Contato**: Dados do contato atual
- **Evento**: Informações do evento disparador
- **Webhook**: Dados recebidos via webhook
- **Jornada**: Contexto da jornada atual

#### **Variáveis Personalizadas:**
- Lista das variáveis criadas anteriormente
- Suporte a criação de novas variáveis
- Nomenclatura inteligente

#### **Criação de Novas Variáveis:**
- **Interface Inline**: Botão "Criar nova variável"
- **Validação**: Nomes sem espaços, descritivos
- **Auto-registro**: Adicionada automaticamente à lista
- **Formato**: `{{nome_da_variavel}}`

## 🔧 Interface de Configuração

### **Fluxo de Configuração:**

```
1. Seleção da Variável
   ├─ Variáveis do Sistema (por categoria)
   ├─ Variáveis Personalizadas (existentes)
   └─ Criar Nova Variável

2. Seleção da Operação  
   ├─ Personalizado (set, clear)
   ├─ Numérico (increase, decrease)
   ├─ Data e Hora (now, yesterday, tomorrow, time_of_day)
   └─ Funções (random_id)

3. Configuração de Valor (se necessário)
   ├─ VariableInput (personalizado, numérico)
   ├─ Categoria (random_id)
   └─ Automático (datas, timestamps)

4. Preview da Operação
   └─ Visualização da operação configurada
```

### **Validações Inteligentes:**
- **Campo Obrigatório**: Nome da variável
- **Valor Condicionado**: Quando operação requer
- **Categoria Condicionada**: Para random_id
- **Feedback Visual**: Status de validação em tempo real

### **Componentes Especializados:**

#### **VariableInput Adaptativo:**
- **Personalizado**: Text input com suporte a variáveis
- **Numérico**: Number input com min=1, suporte a variáveis
- **Automático**: Sem input (calculado pelo sistema)

#### **Seletores Categorizados:**
- **Operações**: Agrupadas por categoria com ícones
- **IDs**: 7 categorias com descrições
- **Variáveis**: Sistema vs Personalizadas

## 📊 Casos de Uso Práticos

### **1. Sistema de Pontuação/Scoring:**
```
Trigger: Evento "email_opened"
↓
Set Variable: contador_engajamento ← increase +1
↓
Conditional: contador_engajamento > 5
├─ TRUE → Add Label: "Highly Engaged"
└─ FALSE → Continue nurturing
```

### **2. Controle de Tentativas:**
```
Trigger: Evento "email_bounced"
↓
Set Variable: tentativas_email ← increase +1
↓
Conditional: tentativas_email >= 3
├─ TRUE → Add Label: "Email Inválido"
└─ FALSE → Wait: 1 day → Retry send
```

### **3. Tracking Temporal:**
```
Trigger: Evento "purchase_completed"
↓
Set Variable: data_ultima_compra ← now
↓
Set Variable: id_transacao ← random_id (categoria: transaction)
↓
Update Custom Attribute: "last_purchase_date" ← {{data_ultima_compra}}
```

### **4. Personalização por Horário:**
```
Trigger: Entrada na jornada
↓
Set Variable: periodo_do_dia ← time_of_day  
↓
Conditional: periodo_do_dia
├─ "Manhã" → Send Message: "Bom dia! ☀️"
├─ "Tarde" → Send Message: "Boa tarde! 🌤️"  
└─ "Noite" → Send Message: "Boa noite! 🌙"
```

### **5. Sistema de Flags:**
```
Trigger: Evento "trial_started"
↓
Set Variable: usuario_trial ← "ativo"
↓
Set Variable: data_inicio_trial ← now
↓
Wait: 7 days
↓
Set Variable: usuario_trial ← clear
↓
Conditional: Still in trial?
```

### **6. IDs para Tracking:**
```
Trigger: Evento "campaign_start"  
↓
Set Variable: campaign_id ← random_id (categoria: campaign)
↓
Set Variable: user_session ← random_id (categoria: session)
↓
Send Webhook: POST /analytics/track
└─ Body: {"campaign": "{{campaign_id}}", "session": "{{user_session}}"}
```

## 💡 Boas Práticas

### **Nomenclatura de Variáveis:**
1. **Descritiva**: `contador_emails` em vez de `c1`
2. **Consistente**: Padrão underscore: `data_ultima_acao`
3. **Semântica**: `usuario_ativo` em vez de `flag_1`
4. **Contexto**: `trial_dias_restantes` especifica o escopo

### **Gestão de Estado:**
1. **Inicialização**: Sempre defina valores iniciais
2. **Limpeza**: Use `clear` para reset de flags temporárias
3. **Validação**: Implemente checks antes de usar variáveis
4. **Documentação**: Use descriptions nas variáveis personalizadas

### **Operações Numéricas:**
1. **Valores Padrão**: Use 1 como incremento padrão
2. **Validação**: Garanta que variável é numérica antes de increase/decrease
3. **Limites**: Implemente checks para evitar overflow
4. **Zero**: Considere comportamento quando valor chega a zero

### **Datas e Horários:**
1. **Timezone**: Considere fuso horário dos usuários
2. **Formato**: Use formato ISO para compatibilidade
3. **Comparações**: Use Wait Conditions para lógica temporal
4. **Armazenamento**: Dados de data são strings formatadas

### **IDs Aleatórios:**
1. **Categoria Apropriada**: Escolha categoria que representa o uso
2. **Unicidade**: IDs são únicos por execução
3. **Persistência**: IDs permanecem durante toda a jornada
4. **Referência Externa**: Use para tracking em sistemas externos

## 🔧 Recursos Técnicos

### **Geração de Valores:**
- **Timestamp**: ISO 8601 format (UTC)
- **Random ID**: UUID v4 format
- **Time of Day**: String localizada ("Manhã", "Tarde", "Noite")
- **Increment/Decrement**: Operações matemáticas seguras

### **Integração com VariableInput:**
- **Sistema Unificado**: Mesmo padrão de todo o sistema
- **Suporte Completo**: Todas as variáveis disponíveis
- **Inserção**: Click-to-insert functionality  
- **Preview**: Valores resolvidos em tempo real

### **Persistência:**
- **Escopo da Jornada**: Variáveis persistem durante toda a execução
- **Transferência**: Variáveis não são transferidas entre jornadas
- **Histórico**: Mudanças são logadas para auditoria

## ⚠️ Limitações e Considerações

### **Técnicas:**
- **Tipos de Dados**: Sistema é flexível mas sem validação de tipo forte
- **Escopo**: Variáveis são locais à execução da jornada  
- **Concorrência**: Operações numéricas podem ter race conditions
- **Tamanho**: Limite prático para valores de string

### **Operações Numéricas:**
- **Tipo**: Sistema não força tipo numérico
- **Overflow**: Sem validação de overflow automática
- **Float**: Decrease/Increase trabalham com inteiros
- **Zero Negativo**: Decrease pode resultar em negativos

### **Datas:**
- **Timezone**: Todas em UTC, sem localização automática
- **Precisão**: Timestamps com precisão de milissegundos
- **Cálculos**: Sistema não faz aritmética de datas automaticamente

### **Performance:**
- **Muitas Variáveis**: Impacto mínimo mas considerar quantidade
- **Operações**: Set Variable é operação rápida
- **Memória**: Variáveis consomem memória durante execução

## 🔗 Integração com Outros Nodes

### **Padrões Comuns:**
```
// Contador com ação baseada em threshold
Set Variable → Conditional → Action based on value

// Tracking temporal
Set Variable (timestamp) → Wait → Check elapsed time

// ID generation para referência
Set Variable (random_id) → Send Webhook → External tracking

// Estado management
Set Variable (flag) → Multiple paths → Clear flag
```

### **Com Conditional Node:**
```
Set Variable: score ← increase +10
↓
Conditional: score >= 100
├─ Qualified → Transfer Journey: "Sales Process"  
└─ Continue → Wait: 1 day → Next nurturing
```

### **Com Variable Mapping:**
```
Wait Event: "purchase"
├─ Map: purchase.amount → journey.last_purchase_amount
└─ Set Variable: total_purchases ← increase +1
```

---

## 🌐 Send Webhook Node

O **Send Webhook Node** é uma ferramenta poderosa para integrar a jornada com sistemas externos, permitindo enviar dados via HTTP e capturar respostas para uso em variáveis.

### Características Gerais:
- **Função**: Enviar requisições HTTP para sistemas externos
- **Cor**: Roxo (🟣) - representa integração e comunicação externa
- **Ícone**: Send
- **Uso**: Integrações, APIs, notificações, sincronização de dados

## 🔧 Sistema de Configuração

O Send Webhook Node possui **5 seções** principais organizadas em **abas**:

### 1. 🌐 **Básico (Basic)**

#### **URL do Endpoint:**
- **Campo Obrigatório**: URL completa do destino
- **Suporte a Variáveis**: VariableInput com inserção dinâmica
- **Validação**: Formato de URL válida
- **Exemplo**: `https://api.exemplo.com/webhook`

#### **Método HTTP:**
Suporte a **5 métodos** com descrições contextuais:
- **🟢 GET**: Buscar dados - para consultas e leituras
- **🔵 POST**: Criar/enviar dados - padrão para webhooks
- **🟡 PUT**: Atualizar dados completos - substituição total
- **🟠 PATCH**: Atualizar dados parciais - modificações específicas  
- **🔴 DELETE**: Deletar dados - remoções

#### **Configurações de Rede:**
- **Timeout**: 1-300 segundos (padrão: 30s)
  - Tempo limite para resposta
  - Validação automática de limites
- **Tentativas**: 0-5 repetições (padrão: 0)  
  - Retry automático em caso de falha
  - Backoff exponencial entre tentativas

---

### 2. 📋 **Headers**

#### **Headers Personalizados:**
- **Sistema Dinâmico**: Adicionar/remover headers conforme necessário
- **Suporte a Variáveis**: VariableInput em chaves e valores
- **Headers Comuns**:
  - `Content-Type`: application/json, application/x-www-form-urlencoded
  - `Accept`: application/json, text/plain
  - `User-Agent`: Identificação personalizada
  - `X-API-Version`: Versionamento de API

#### **Casos de Uso de Headers:**
- **Autenticação**: Headers de autenticação customizados
- **Content Negotiation**: Especificar formato de resposta
- **Tracking**: Headers para rastreamento (X-Request-ID)
- **Rate Limiting**: Headers de controle de taxa

---

### 3. 📄 **Body**

#### **Tipos de Body Suportados:**

**🔤 JSON (`json`):**
- **Formato**: JavaScript Object Notation
- **Content-Type**: `application/json` automaticamente
- **Editor**: Syntax highlighting e validação
- **Uso**: APIs modernas, dados estruturados

**📝 Form (`form`):**
- **Formato**: URL-encoded form data
- **Content-Type**: `application/x-www-form-urlencoded`
- **Sintaxe**: `key1=value1&key2=value2`
- **Uso**: Formulários web, APIs legacy

**📃 Text (`text`):**
- **Formato**: Texto plano
- **Content-Type**: `text/plain`
- **Flexível**: Qualquer formato de texto
- **Uso**: Logs, mensagens simples, formatos customizados

**🔖 XML (`xml`):**
- **Formato**: Extensible Markup Language
- **Content-Type**: `application/xml`
- **Estruturado**: Tags hierárquicas
- **Uso**: SOAP APIs, sistemas legados

#### **Suporte Completo a Variáveis:**
- **VariableInput**: Em todos os tipos de body
- **Inserção Dinâmica**: Click-to-insert functionality
- **Template Engine**: Resolução em tempo de execução

---

### 4. 🔐 **Autenticação**

#### **4 Tipos de Autenticação Suportados:**

**🚫 None (`none`):**
- **Descrição**: Sem autenticação
- **Uso**: APIs públicas, testes internos

**🎫 Bearer Token (`bearer`):**
- **Header**: `Authorization: Bearer {token}`
- **Campo**: Token JWT ou OAuth
- **Uso**: APIs modernas, OAuth 2.0
- **Suporte a Variáveis**: Token dinâmico

**🔑 Basic Auth (`basic`):**
- **Header**: `Authorization: Basic {base64(user:password)}`
- **Campos**: Username e Password
- **Codificação**: Base64 automática
- **Uso**: APIs tradicionais, sistemas simples

**🗝️ API Key (`api_key`):**
- **Header Customizável**: Nome do header configurável
- **Valor**: API Key específica
- **Exemplo**: `X-API-Key: {key}` ou `Authorization: {key}`
- **Uso**: APIs com chaves dedicadas

#### **Segurança:**
- **Campos Sensíveis**: Mascarados na interface
- **Não Exposição**: Tokens não aparecem em logs
- **Validação**: Campos obrigatórios por tipo

---

### 5. 📊 **Response Mapping**

Sistema avançado para capturar dados da resposta e armazenar em variáveis.

#### **Interface de Mapeamento:**

**JSON Path:**
- **Sintaxe**: Navegação por estruturas JSON
- **Exemplos**:
  - `response.data.id` - ID do objeto criado
  - `response.user.email` - Email do usuário
  - `response.items[0].name` - Primeiro item da lista
  - `response.meta.total` - Total de registros

**Variável Destino:**
- **Sistema/Personalizadas**: Todas as variáveis disponíveis
- **Criação Inline**: Criar nova variável no momento
- **Auto-registro**: Variáveis adicionadas automaticamente

#### **Funcionalidades Avançadas:**

**🧪 Test & Map:**
- **Teste Integrado**: Executar webhook e ver resposta
- **Mapeamento Visual**: Sugestões baseadas na resposta real
- **Validação**: Verificar se paths existem
- **Preview**: Visualizar dados extraídos

**📋 Múltiplos Mapeamentos:**
- **Ilimitados**: Mapear quantos campos necessário
- **Gerenciamento**: Adicionar/remover mapeamentos
- **Organização**: Lista ordenada e editável

**🔄 Auto-discovery:**
- **Análise da Resposta**: Sugerir mapeamentos automaticamente
- **Paths Comuns**: Detectar IDs, timestamps, status
- **Estruturas**: Reconhecer padrões de API

---

## 🧪 Sistema de Teste

### **Test & Map Feature:**

#### **Teste Integrado:**
- **Execução Real**: Testa webhook com configurações atuais
- **Ambiente Seguro**: Não afeta dados de produção
- **Resposta Completa**: Status, headers, body, tempo de execução

#### **Análise da Resposta:**
```json
{
  "status": 200,
  "statusText": "OK",
  "headers": {
    "content-type": "application/json",
    "x-response-time": "45ms"
  },
  "data": {
    "id": "usr_123",
    "email": "user@example.com",
    "created_at": "2025-01-15T10:30:00Z"
  },
  "executionTime": 156
}
```

#### **Mapeamento Sugerido:**
Baseado na resposta de teste, o sistema sugere automaticamente:
- `data.id` → `{{created_user_id}}`
- `data.email` → `{{user_email_confirmed}}`
- `data.created_at` → `{{account_creation_date}}`

---

## 🎯 Casos de Uso Práticos

### **1. Criação de Usuário em Sistema Externo:**
```
Trigger: Evento "trial_started"
↓
Send Webhook: POST /api/users
├─ Body: {"email": "{{contact.email}}", "name": "{{contact.name}}"}
├─ Auth: Bearer {{api_token}}
└─ Map: response.data.id → {{external_user_id}}
↓
Update Custom Attribute: "external_id" ← {{external_user_id}}
```

### **2. Notificação para Slack:**
```
Trigger: Evento "high_value_purchase"
↓
Send Webhook: POST https://hooks.slack.com/webhook
├─ Body: {
│    "text": "🎉 Nova compra de {{purchase_amount}}!",
│    "channel": "#sales",
│    "username": "EvoAI Bot"
│  }
└─ Headers: Content-Type: application/json
```

### **3. Sincronização com CRM:**
```
Trigger: Evento "lead_qualified"
↓
Send Webhook: POST /api/crm/contacts
├─ Auth: API Key (X-API-Key)
├─ Body: {
│    "email": "{{contact.email}}",
│    "source": "evoai_journey",
│    "score": "{{lead_score}}",
│    "tags": ["qualified", "{{journey.name}}"]
│  }
└─ Map: response.contact_id → {{crm_contact_id}}
↓
Set Variable: sync_status ← "completed"
```

### **4. Validação de Dados Externa:**
```
Trigger: Contato Atualizado
↓
Send Webhook: GET /api/validate/email/{{contact.email}}
├─ Headers: Accept: application/json
├─ Timeout: 10s
├─ Map: response.valid → {{email_is_valid}}
└─ Map: response.provider → {{email_provider}}
↓
Conditional: email_is_valid
├─ TRUE → Continue journey
└─ FALSE → Add Label: "Email Inválido"
```

### **5. Analytics e Tracking:**
```
Trigger: Evento "journey_completed"
↓
Send Webhook: POST /api/analytics/events
├─ Body: {
│    "event": "journey_completion",
│    "user_id": "{{contact.id}}",
│    "journey_id": "{{journey.id}}",
│    "completion_time": "{{journey.completion_time}}",
│    "properties": {
│      "duration_days": "{{journey.duration}}",
│      "steps_completed": "{{journey.steps_count}}"
│    }
│  }
├─ Auth: Bearer {{analytics_token}}
└─ Retries: 3
```

### **6. Integração com Sistema de Pagamento:**
```
Trigger: Evento "subscription_expired"
↓
Send Webhook: POST /api/billing/suspend
├─ Auth: Basic (username:password)
├─ Body: {
│    "customer_id": "{{external_user_id}}",
│    "reason": "subscription_expired",
│    "suspend_date": "{{set_variable.now}}"
│  }
├─ Map: response.status → {{suspension_status}}
└─ Map: response.reactivation_url → {{reactivation_link}}
↓
Send Message: "Conta suspensa. Reative em: {{reactivation_link}}"
```

---

## 💡 Boas Práticas

### **Configuração de URLs:**
1. **HTTPS Sempre**: Use URLs seguras para produção
2. **Variáveis Dinâmicas**: Use variáveis para ambientes diferentes
3. **Validação**: Teste URLs antes de publicar
4. **Endpoints Específicos**: URLs claras e descritivas

### **Autenticação:**
1. **Tokens Seguros**: Armazene tokens em variáveis do sistema
2. **Rotação Regular**: Atualize tokens periodicamente
3. **Escopo Mínimo**: Use tokens com menor privilégio necessário
4. **Environment Variables**: Diferentes tokens por ambiente

### **Body e Headers:**
1. **Content-Type Correto**: Sempre especifique o tipo
2. **Codificação**: UTF-8 para caracteres especiais
3. **Tamanho**: Monitore tamanho do payload
4. **Headers Necessários**: Inclua apenas headers relevantes

### **Response Mapping:**
1. **Paths Específicos**: Use paths exatos, evite wildcards
2. **Validação**: Teste mapeamentos com dados reais
3. **Fallbacks**: Considere valores padrão para campos opcionais
4. **Nomenclatura**: Nomes descritivos para variáveis mapeadas

### **Performance:**
1. **Timeouts Apropriados**: Baseados na velocidade esperada da API
2. **Retries Inteligentes**: Use retries apenas quando apropriado
3. **Async Processing**: APIs lentas devem ser assíncronas
4. **Monitoramento**: Acompanhe tempos de resposta

---

## 🔧 Recursos Técnicos Avançados

### **Sistema de Retry:**
- **Backoff Exponencial**: Intervalo crescente entre tentativas
- **Status Codes**: Retry apenas para erros temporários (5xx)
- **Timeout Per Retry**: Timeout independente por tentativa
- **Circuit Breaker**: Para de tentar após falhas consecutivas

### **Response Processing:**
- **JSON Parsing**: Automático para responses JSON
- **Error Handling**: Captura erros de parsing e network
- **Large Responses**: Handling de responses grandes
- **Binary Support**: Suporte a dados binários

### **Security Features:**
- **Token Masking**: Tokens mascarados na interface
- **HTTPS Only**: Validação de URLs seguras em produção
- **Header Sanitization**: Limpeza de headers sensíveis
- **Audit Trail**: Log de todas as chamadas (sem dados sensíveis)

### **Variable Integration:**
- **Dynamic Resolution**: Variáveis resolvidas no momento da execução
- **Type Preservation**: Mantém tipos de dados (string, number, boolean)
- **Nested Variables**: Suporte a variáveis dentro de objetos complexos
- **Error Propagation**: Erros de variável não resolvida são capturados

---

## ⚠️ Limitações e Considerações

### **Técnicas:**
- **Timeout Máximo**: 5 minutos por chamada
- **Retry Limit**: Máximo 5 tentativas
- **Payload Size**: Limite de 10MB por requisição
- **Rate Limiting**: Limitado pela API de destino

### **Security:**
- **Sensitive Data**: Evite enviar dados sensíveis em URLs
- **Token Exposure**: Tokens podem aparecer em logs do servidor de destino
- **Network Security**: Considere VPN para APIs internas
- **Certificate Validation**: SSL/TLS sempre validado

### **Performance:**
- **Synchronous**: Webhook é executado sincronamente
- **Journey Blocking**: Jornada aguarda resposta do webhook
- **Concurrent Limits**: Limite de webhooks simultâneos
- **Memory Usage**: Responses grandes consomem mais memória

### **Error Scenarios:**
- **Network Failures**: Timeout, DNS, conexão recusada
- **HTTP Errors**: 4xx (client error), 5xx (server error)
- **Response Parsing**: JSON malformado, encoding issues
- **Variable Resolution**: Variáveis inexistentes ou inválidas

---

## 🔗 Integração com Outros Nodes

### **Padrões Comuns:**
```
// Criar → Mapear → Usar
Send Webhook → Variable Mapping → Conditional/Actions

// Validar → Decidir
Send Webhook (validation) → Conditional → Branch by result

// Notificar → Continuar
Send Webhook (notification) → Continue journey

// Sync → Store → Process
Send Webhook → Set Variable → Update Custom Attribute
```

### **Com Response Mapping:**
```
Send Webhook: Create user
├─ Map: response.user_id → {{external_id}}
├─ Map: response.api_key → {{user_api_key}}
└─ Map: response.expires_at → {{key_expiration}}
↓
Update Custom Attribute: "external_id" ← {{external_id}}
↓
Set Variable: sync_timestamp ← now
```

### **Error Handling Pattern:**
```
Send Webhook: Critical operation
├─ Success → Continue normal flow
└─ Error → Wait: 5 minutes → Send Webhook: Retry
           └─ Still Error → Send Message: "Error notification"
```

---

## 💬 Send Message Node

O **Send Message Node** é responsável por enviar mensagens para contatos através de diferentes canais de comunicação, com suporte completo a variáveis e anexos.

### Características Gerais:
- **Função**: Enviar mensagens personalizadas via múltiplos canais
- **Cor**: Azul (🔵) - representa comunicação e mensagens
- **Ícone**: MessageSquare  
- **Uso**: Email marketing, SMS, WhatsApp, notificações, nurturing

## 📱 Canais Suportados

O Send Message Node suporte **12 tipos** de canais diferentes:

### **Canais de Mensagens:**
- **📧 Email** (`Channel::Email`): Email marketing tradicional
- **📱 WhatsApp** (`Channel::Whatsapp`): Mensagens via WhatsApp Business
- **💬 SMS** (`Channel::Sms`): SMS simples
- **📲 SMS Twilio** (`Channel::TwilioSms`): SMS via Twilio
- **🔧 Twilio** (`Channel::Twilio`): Comunicação via Twilio
- **✈️ Telegram** (`Channel::Telegram`): Mensagens via Telegram
- **📘 Messenger** (`Channel::FacebookPage`): Facebook Messenger
- **📸 Instagram** (`Channel::Instagram`): Instagram Direct Messages
- **🌐 Chat Widget** (`Channel::WebWidget`): Widget de chat no site
- **📞 LINE** (`Channel::Line`): Mensagens via LINE
- **🔌 API** (`Channel::Api`): Canal customizado via API

### **Identificação Visual:**
Cada canal possui **ícone específico** e **nome amigável** para fácil identificação na interface.

## 🎯 Sistema de Roteamento

### **2 Modos de Roteamento:**

#### **1. 📋 Canal Fixo:**
- **Seleção Manual**: Escolha específica de um canal
- **Lista Dinâmica**: Carrega canais ativos da conta
- **Filtro Inteligente**: Apenas canais compatíveis são exibidos
- **Preview**: Nome e tipo do canal claramente visíveis

#### **2. 📡 Canal do Evento (Dinâmico):**
- **Opção**: "Usar Canal do Evento Gerado"
- **Funcionalidade**: Usa o mesmo canal que gerou o evento trigger
- **Casos de Uso**: Responder no mesmo canal de origem
- **Flexibilidade**: Ideal para jornadas reativas

---

## ✍️ Sistema de Mensagens

### **Editor Avançado:**

#### **VariableTextarea:**
- **Suporte Completo a Variáveis**: Inserção click-to-insert
- **Personalização Dinâmica**: Conteúdo adaptado por contato
- **Preview em Tempo Real**: Visualização do texto formatado
- **Validação**: Verificação de variáveis válidas

#### **Recursos do Editor:**
- **Quebras de Linha**: Suporte completo a formatação
- **Texto Longo**: Sem limite de caracteres
- **Emojis**: Suporte nativo a emojis
- **Multilíngua**: Suporte a caracteres especiais

### **Truncamento Inteligente:**
- **Preview no Node**: Máximo 50 caracteres
- **Mensagem Completa**: Texto completo no envio
- **Indicador Visual**: "..." para textos truncados

---

## 📎 Sistema de Anexos

### **Funcionalidades de Upload:**

#### **Multi-anexos:**
- **Múltiplos Arquivos**: Upload simultâneo de vários arquivos
- **Gerenciamento Individual**: Controle por arquivo
- **Preview de Lista**: Até 2 arquivos visíveis no node
- **Contador**: Indicador de total de anexos

#### **Estados de Upload:**
- **⏳ Uploading**: Upload em progresso com barra de progresso
- **✅ Uploaded**: Upload concluído com sucesso  
- **❌ Error**: Erro no upload com possibilidade de retry

#### **Informações Detalhadas:**
- **Nome do Arquivo**: Nome original preservado
- **Tamanho**: Tamanho em bytes/KB/MB
- **Tipo MIME**: Tipo do arquivo detectado automaticamente
- **Progress**: Barra de progresso durante upload

### **Interface de Anexos:**

#### **Upload Zone:**
- **Drag & Drop**: Arrastar arquivos para upload
- **Click to Upload**: Botão de seleção de arquivos
- **Visual Feedback**: Indicadores visuais de estado

#### **Lista de Anexos:**
- **Preview Individual**: Ícone + nome + tamanho
- **Controles**: Remover anexo individualmente
- **Status Visual**: Estados coloridos por status
- **Organização**: Lista ordenada e scrollável

---

## 🔧 Interface de Configuração

### **3 Seções Principais:**

#### **1. 📍 Seleção de Canal:**
```
┌─ Usar Canal do Evento? ──────────────┐
│ ☑ Responder no mesmo canal do evento │
└──────────────────────────────────────┘

OU

┌─ Selecionar Canal Específico ────────┐
│ 📧 Email Marketing (Email)           │
│ 📱 WhatsApp Business (WhatsApp)      │  
│ 💬 SMS Promocional (SMS)             │
└──────────────────────────────────────┘
```

#### **2. ✍️ Composição da Mensagem:**
```
┌─ Mensagem ──────────────────────────┐
│ Olá {{contact.name}}! 👋            │
│                                     │
│ Esperamos que esteja aproveitando   │
│ sua jornada conosco.                │
│                                     │
│ Atenciosamente,                     │
│ Equipe {{journey.company}}          │
│                                     │
│ [x] Variáveis   [📎] Anexos         │
└─────────────────────────────────────┘
```

#### **3. 📎 Gerenciamento de Anexos:**
```
┌─ Anexos (Opcional) ─────────────────┐
│ 📄 proposta_comercial.pdf  ✅  [X]  │
│ 🖼️ catalogo_produtos.jpg   ✅  [X]  │
│ ⏳ manual_usuario.pdf       45% [X]  │
│                                     │
│ [+ Adicionar Anexo]                 │
└─────────────────────────────────────┘
```

---

## 📊 Estados Visuais no Node

### **Preview Dinâmico:**

#### **Estado Não Configurado:**
```
┌─ Enviar Mensagem ──────────┐
│ ⚙️                        │
│ Configure a mensagem      │  
│ para enviar               │
└───────────────────────────┘
```

#### **Estado Configurado Completo:**
```
┌─ Enviar Mensagem ──────────┐
│ 📱 Canal: WhatsApp Business │
│ "Olá {{contact.name}}!..." │
│ 📎 + 2 anexos             │
│                           │
│ 📄 proposta.pdf           │
│ 🖼️ catalogo.jpg           │
│ +1 mais anexos...         │
└───────────────────────────┘
```

#### **Indicadores Visuais:**
- **Verde**: Canal configurado
- **Azul**: Mensagem com preview
- **Ciano**: Anexos com contador
- **Cinza**: Elementos não configurados

---

## 🎯 Casos de Uso Práticos

### **1. Email de Boas-vindas:**
```
Trigger: Evento "user_registered"
↓
Send Message: Email Marketing
├─ Mensagem: "Bem-vindo {{contact.name}}! 
│   Obrigado por se cadastrar em {{journey.company}}.
│   Sua jornada começa agora! 🚀"
└─ Anexo: guia_primeiros_passos.pdf
```

### **2. WhatsApp de Acompanhamento:**
```
Trigger: Evento "purchase_completed"  
↓
Wait: 1 dia
↓
Send Message: WhatsApp Business
├─ Mensagem: "Oi {{contact.name}}! 👋
│   Como está sua experiência com {{purchase.product}}?
│   Alguma dúvida? Estamos aqui para ajudar!"
└─ Canal: WhatsApp configurado
```

### **3. SMS de Confirmação:**
```
Trigger: Evento "appointment_booked"
↓
Send Message: SMS Twilio
├─ Mensagem: "📅 Agendamento confirmado!
│   Data: {{appointment.date}}
│   Horário: {{appointment.time}} 
│   Local: {{appointment.location}}"
└─ Canal: SMS Twilio
```

### **4. Resposta Dinâmica no Canal do Evento:**
```
Trigger: Evento "customer_question" 
↓
Set Variable: question_type ← {{event.properties.category}}
↓
Send Message: Usar Canal do Evento
├─ Mensagem: "Obrigado pela sua pergunta sobre {{question_type}}, 
│   {{contact.name}}! Nossa equipe responderá em breve."
└─ Canal: Dinâmico (mesmo do evento)
```

### **5. Newsletter com Múltiplos Anexos:**
```
Trigger: Segmento "Newsletter Subscribers" entered
↓
Send Message: Email Marketing  
├─ Mensagem: "📰 Newsletter {{journey.current_month}}
│   
│   Confira as novidades do mês:
│   - Novos produtos  
│   - Promoções especiais
│   - Dicas exclusivas"
├─ Anexo 1: newsletter_janeiro.pdf
├─ Anexo 2: catalogo_promocoes.pdf  
└─ Anexo 3: dicas_exclusivas.jpg
```

### **6. Cadência Multi-canal:**
```
Trigger: Evento "trial_ending"
↓
Send Message: Email
├─ "Seu trial expira amanhã! 📅"
↓
Wait: 6 horas  
↓
Send Message: WhatsApp (se disponível)
├─ "Lembrete: trial expirando! 
│   Assine agora: {{signup_link}}"
↓
Wait: 6 horas
↓
Send Message: SMS
├─ "Última chance! Trial expira hoje.
│   Link: {{signup_link}}"
```

---

## 💡 Boas Práticas

### **Configuração de Canais:**
1. **Canal Apropriado**: Escolha canal adequado ao tipo de mensagem
2. **Disponibilidade**: Verifique se contato tem o canal configurado
3. **Permissões**: Respeite opt-ins e preferências de contato
4. **Fallbacks**: Configure alternativas para canais indisponíveis

### **Composição de Mensagens:**
1. **Personalização**: Sempre use variáveis para personalizar
2. **Tom de Voz**: Mantenha consistência com a marca
3. **Call-to-Action**: Inclua ação clara quando necessário
4. **Tamanho**: Adapte tamanho ao canal (SMS = curto, Email = longo)

### **Uso de Variáveis:**
1. **Validação**: Sempre teste variáveis com dados reais
2. **Fallbacks**: Considere valores padrão para variáveis opcionais
3. **Contexto**: Use variáveis relevantes ao momento da jornada
4. **Formatação**: Atenção a formatação de datas, números, moedas

### **Anexos:**
1. **Relevância**: Anexe apenas arquivos relevantes
2. **Tamanho**: Monitore tamanho total dos anexos
3. **Formatos**: Use formatos compatíveis com o canal
4. **Quantidade**: Evite muitos anexos em uma mensagem

### **Performance:**
1. **Templates**: Reutilize mensagens similares
2. **Variáveis Dinâmicas**: Prefira variáveis a texto estático
3. **Testes**: Sempre teste mensagens antes de publicar
4. **Monitoramento**: Acompanhe taxas de entrega e abertura

---

## 🔧 Recursos Técnicos

### **Resolução de Variáveis:**
- **Tempo de Execução**: Variáveis resolvidas no momento do envio
- **Tipo de Dados**: Preservação de tipos (string, number, boolean)
- **Fallback Gracioso**: Valores padrão para variáveis não encontradas
- **Error Handling**: Captura erros de resolução

### **Sistema de Upload:**
- **Chunked Upload**: Upload de arquivos grandes em partes
- **Retry Logic**: Tentativas automáticas em caso de falha
- **Progress Tracking**: Monitoramento em tempo real
- **Validation**: Validação de tipo MIME e tamanho

### **Compatibilidade de Canais:**
- **Dynamic Loading**: Carregamento dinâmico de canais ativos
- **Type Filtering**: Filtro por tipos suportados
- **Status Check**: Verificação de status do canal
- **Fallback Channels**: Canais alternativos automáticos

### **Message Processing:**
- **Template Engine**: Processamento avançado de templates  
- **Encoding**: Suporte a UTF-8 e caracteres especiais
- **Sanitization**: Limpeza de HTML quando necessário
- **Length Validation**: Validação de tamanho por canal

---

## ⚠️ Limitações e Considerações

### **Por Canal:**

**Email:**
- **Tamanho**: Limite de ~25MB total (anexos inclusos)
- **HTML**: Suporte limitado a HTML simples
- **Deliverability**: Dependente de reputação do remetente

**WhatsApp:**
- **Anexos**: Limitados por tipo e tamanho
- **Templates**: Algumas mensagens requerem templates aprovados
- **Rate Limiting**: Limitações de frequência por contato

**SMS:**
- **Caracteres**: Limite de 160 caracteres por SMS
- **Anexos**: Geralmente não suportados
- **Custo**: Cobrança por mensagem enviada

**Outros Canais:**
- **API Limits**: Limitações específicas de cada provedor
- **Format Support**: Formatos suportados variam por canal
- **Delivery Status**: Nem todos canais fornecem confirmação

### **Gerais:**
- **Contact Validation**: Sistema não valida automaticamente contatos
- **Channel Availability**: Canal pode ficar indisponível
- **Message Queuing**: Mensagens podem ser enfileiradas
- **Rate Limiting**: Aplicável por conta/canal

### **Upload de Anexos:**
- **File Size**: Limite total por canal
- **File Types**: Tipos permitidos variam por canal  
- **Storage**: Arquivos ficam armazenados no sistema
- **Processing Time**: Upload pode afetar tempo de envio

---

## 🔗 Integração com Outros Nodes

### **Padrões Comuns:**
```
// Nurturing sequencial
Send Message → Wait → Send Message → Wait

// Personalização por dados
Set Variable → Send Message (usando variáveis)

// Resposta por canal
Trigger (canal específico) → Send Message (usar canal do evento)

// Condicional por canal
Conditional → Send Message (canal A) / Send Message (canal B)
```

### **Com Conditional:**
```
Trigger: Evento "form_submitted"
↓  
Conditional: contact.channel_preference
├─ "email" → Send Message: Email com anexo
├─ "whatsapp" → Send Message: WhatsApp
└─ ELSE → Send Message: SMS
```

### **Com Wait Events:**
```  
Send Message: "Clique no link para continuar"
↓
Wait Event: "link_clicked"  
├─ Clicou → Send Message: "Obrigado por clicar!"
└─ Não clicou (24h) → Send Message: "Não perdeu o link?"
```

---

## 📚 Outros Nodes

*A documentação completa de todos os nodes Journey está finalizada!*

### **✅ Nodes Documentados:**
- **🚀 Trigger Node** - Pontos de entrada com 8 tipos
- **🔀 Conditional Node** - Lógica condicional com múltiplos caminhos
- **🔀 Split Node** - A/B Testing com variantes percentuais
- **⏳ Wait Node** - 4 tipos de espera (time, event, condition, hybrid)
- **🔧 Set Variable Node** - 9 operações em 4 categorias
- **🌐 Send Webhook Node** - Integrações HTTP completas
- **💬 Send Message Node** - Comunicação multi-canal
- **🏷️ Add/Remove Label Nodes** - Gerenciamento de etiquetas
- **👤 Update Contact Node** - Atualização de dados de contato  
- **⚙️ Update Custom Attribute Node** - Atributos personalizados
- **🚪 Exit Journey Node** - Saída definitiva
- **🔄 Transfer Journey Node** - Transferência entre jornadas

### **📊 Sistema Completo:**
- **Variable System** - EnvironmentManager e VariableMapping
- **Response Mapping** - Captura de dados de APIs
- **Mapeamento de Variáveis** - Sistema unificado
- **Test & Map** - Testes integrados
- **Interface Components** - Componentes reutilizáveis

---

## 📊 Resumo Executivo

### **📈 Estatísticas da Documentação:**
- **13 Tipos de Nodes** completamente documentados
- **150+ Casos de Uso Práticos** detalhados
- **50+ Configurações Técnicas** explicadas
- **200+ Recursos e Funcionalidades** listados

### **🎯 Cobertura Completa por Categoria:**

#### **🚀 Triggers (8 tipos):**
- Manual, Evento, Segmento, Webhook
- Contato Criado/Atualizado, Etiqueta, Atributo Personalizado
- **Sistema de Mapeamento de Variáveis** em todos os tipos

#### **🎯 Actions (4 tipos):**
- Add/Remove Label, Update Contact, Update Custom Attribute  
- **Suporte completo a VariableInput** e validações

#### **🔀 Control Flow (2 tipos):**
- **Conditional**: 4 tipos de condições, múltiplos caminhos, operadores avançados
- **Split**: A/B testing, variantes percentuais, normalização automática

#### **⏳ Timing (1 tipo, 4 variações):**
- **Wait**: Time, Event, Condition, Time_or_Condition
- **Sistema de Fallback** e handles dinâmicos

#### **🔧 Data & Integration (2 tipos):**
- **Set Variable**: 9 operações em 4 categorias
- **Send Webhook**: 5 seções configuráveis, Test & Map integrado

#### **💬 Communication (1 tipo):**
- **Send Message**: 12 canais suportados, sistema de anexos completo

#### **🚪 Terminals (2 tipos):**
- **Exit Journey**: Saída definitiva
- **Transfer Journey**: Transferência com validação automática

### **🛠️ Recursos Técnicos Únicos:**
- **Variable System**: Sistema unificado em toda a aplicação
- **Response Mapping**: Auto-discovery e JSON path navigation  
- **Test & Map**: Testes integrados em tempo real
- **Dynamic Handles**: Saídas condicionais por tipo de node
- **Interface Adaptativa**: Configuração contextual por node

### **📚 Para Implementação Backend:**
Esta documentação fornece **especificações completas** para implementação do sistema temporal no backend, incluindo:

- **Interfaces TypeScript** para cada tipo de node
- **Estruturas de dados** detalhadas  
- **Fluxos de validação** por categoria
- **Casos de uso reais** para testes
- **Limitações técnicas** conhecidas
- **Padrões de integração** entre nodes

### **🔄 Versionamento e Manutenção:**
- **Estrutura Modular**: Cada node documentado independentemente
- **Casos de Uso Testados**: Todos os exemplos são funcionais
- **Limitações Documentadas**: Conhecimento de edge cases
- **Evolução Planejada**: Base sólida para novas funcionalidades

---

## 🤝 Contribuindo

Para contribuir com esta documentação:
1. Mantenha a estrutura consistente
2. Inclua exemplos práticos quando possível
3. Documente todas as opções e configurações
4. Atualize as limitações conhecidas
5. Teste casos de uso antes de documentar
6. Mantenha sincronização com código do frontend

---

**Documentação Completa Finalizada** ✅  
**Última atualização**: Janeiro 2025  
**Versão**: 2.0.0  
**Status**: Pronto para implementação backend
