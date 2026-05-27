import { Activity, Building2, GitBranch, History, Settings, StickyNote, Users } from 'lucide-react';
import type { ComponentType } from 'react';

export interface ContactDetailsTab {
  value: string;
  icon: ComponentType<{ className?: string }>;
  label: string;
}

export interface BuildContactDetailsTabsOpts {
  hasCompanies: boolean | undefined;
  hasPersons: boolean | undefined;
  t: (key: string) => string;
}

// Deterministic order (AC1b): the contact-type-specific entries (`companies`
// / `persons`) come first when applicable, followed by the FIXED sequence
// `pipeline → events → history → notes → attributes`. Adding or moving a
// tab in this sequence must update the snapshot in
// `contactDetailsTabs.spec.ts`. The commented `scheduled-actions` line in
// ContactDetails.tsx stays put — it's the placeholder for a feature still
// in development (AC28).
export function buildContactDetailsTabs(opts: BuildContactDetailsTabsOpts): ContactDetailsTab[] {
  const { hasCompanies, hasPersons, t } = opts;
  return [
    ...(hasCompanies
      ? [{ value: 'companies', icon: Building2, label: t('details.tabs.companies') }]
      : []),
    ...(hasPersons
      ? [{ value: 'persons', icon: Users, label: t('details.tabs.persons') }]
      : []),
    { value: 'pipeline', icon: GitBranch, label: t('details.tabs.pipeline') },
    { value: 'events', icon: Activity, label: t('details.tabs.events') },
    { value: 'history', icon: History, label: t('details.tabs.history') },
    { value: 'notes', icon: StickyNote, label: t('details.tabs.notes') },
    { value: 'attributes', icon: Settings, label: t('details.tabs.attributes') },
  ];
}
