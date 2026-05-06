
export interface AvailableMCP {
  id: string;
  name: string;
  description: string;
}

export const getAvailableMCPs = (t: (key: string) => string): AvailableMCP[] => [
  {
    id: 'github',
    name: 'GitHub',
    description:
      t('mcpServers.github.description') ||
      'Integração com repositórios, issues, pull requests e ações do GitHub.',
  },
  {
    id: 'notion',
    name: 'Notion',
    description:
      t('mcpServers.notion.description') || 'Acesse e atualize páginas, databases e blocos do Notion.',
  },
  {
    id: 'stripe',
    name: 'Stripe',
    description:
      t('mcpServers.stripe.description') ||
      'Gerencie pagamentos, assinaturas e informações de clientes no Stripe.',
  },
  {
    id: 'hubspot',
    name: 'HubSpot',
    description:
      t('mcpServers.hubspot.description') || 'Sincronize contatos, deals e atividades com o HubSpot CRM.',
  },
  {
    id: 'linear',
    name: 'Linear',
    description:
      t('mcpServers.linear.description') || 'Crie e gerencie issues, projetos e roadmaps no Linear.',
  },
  {
    id: 'monday',
    name: 'Monday.com',
    description:
      t('mcpServers.monday.description') || 'Gerencie boards, itens e automações no Monday.com.',
  },
  {
    id: 'supabase',
    name: 'Supabase',
    description:
      t('mcpServers.supabase.description') ||
      'Acesse e gerencie projetos, bancos de dados e APIs do Supabase.',
  },
  {
    id: 'atlassian',
    name: 'Atlassian',
    description:
      t('mcpServers.atlassian.description') ||
      'Acesse Jira, Confluence e outras ferramentas do Atlassian.',
  },
  {
    id: 'asana',
    name: 'Asana',
    description:
      t('mcpServers.asana.description') || 'Gerencie projetos, tarefas e equipes no Asana.',
  },
  {
    id: 'paypal',
    name: 'PayPal',
    description:
      t('mcpServers.paypal.description') ||
      'Gerencie pagamentos, transações e informações de clientes no PayPal.',
  },
  {
    id: 'canva',
    name: 'Canva',
    description:
      t('mcpServers.canva.description') ||
      'Crie e edite designs, apresentações e materiais visuais com Canva.',
  },
];

