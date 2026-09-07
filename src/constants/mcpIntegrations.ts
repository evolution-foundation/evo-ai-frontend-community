
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
      t('mcpServers.github.description'),
  },
  {
    id: 'notion',
    name: 'Notion',
    description:
      t('mcpServers.notion.description'),
  },
  {
    id: 'stripe',
    name: 'Stripe',
    description:
      t('mcpServers.stripe.description'),
  },
  {
    id: 'hubspot',
    name: 'HubSpot',
    description:
      t("edit.integrations.hubspot.description"),
  },
  {
    id: 'linear',
    name: 'Linear',
    description:
      t('mcpServers.linear.description'),
  },
  {
    id: 'monday',
    name: 'Monday.com',
    description:
      t('mcpServers.monday.description'),
  },
  {
    id: 'supabase',
    name: 'Supabase',
    description:
      t('mcpServers.supabase.description'),
  },
  {
    id: 'atlassian',
    name: 'Atlassian',
    description:
      t('mcpServers.atlassian.description'),
  },
  {
    id: 'asana',
    name: 'Asana',
    description:
      t('mcpServers.asana.description'),
  },
  {
    id: 'paypal',
    name: 'PayPal',
    description:
      t('mcpServers.paypal.description'),
  },
  {
    id: 'canva',
    name: 'Canva',
    description:
      t('mcpServers.canva.description'),
  },
];

