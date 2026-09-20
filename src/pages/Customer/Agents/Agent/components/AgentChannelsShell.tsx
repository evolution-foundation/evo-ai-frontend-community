import { useLanguage } from '@/hooks/useLanguage';

/** Shell for the Channels tab; linking and unlinking land here later. */
const AgentChannelsShell = () => {
  const { t } = useLanguage('aiAgents');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-2 text-2xl font-bold">{t('edit.channels.title') || 'Canais'}</h2>
        <p className="text-sm text-muted-foreground">
          {t('edit.channels.subtitle') || 'Configure os canais de comunicação do agente'}
        </p>
      </div>
      <div className="py-12 text-center text-muted-foreground">
        {t('edit.channels.comingSoon') || 'Em breve...'}
      </div>
    </div>
  );
};

export default AgentChannelsShell;
