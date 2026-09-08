import { useState } from 'react';
import { Button, Label } from '@evoapi/design-system';
import { ArrowLeft, Check, CheckCircle2, Megaphone, Users, MessageSquare, Settings2, Calendar, Zap, Clock } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { useNavigate } from 'react-router-dom';
import { WEEKDAYS } from './options';

interface Step5Props {
  data: {
    // Step 1: Geral
    name: string;
    description: string;
    type: string;
    channel_type: string;

    // Step 2: Audiência
    contact_selection: string;
    segment_ids?: string[];
    tag_ids?: string[];
    estimated_contacts?: number;

    // Step 3: Conteúdo
    inbox_id: string;
    template_ids: string[];

    // Configurações
    schedule_option: string;
    scheduled_date?: string;
    template_strategy?: string;
    template_weights?: Record<string, number>;
    use_business_hours?: boolean;
    business_hours_start?: string;
    business_hours_end?: string;
    allowed_weekdays?: number[];
    enable_rate_limit?: boolean;
    enable_retry?: boolean;
    spread_sending_hours?: number;

    // A/B Test Details
    ab_test_winner_criteria?: string;
    ab_test_schedule_option?: string;
    ab_test_scheduled_date?: string;
    ab_test_skip_winner?: boolean;
    ab_test_winner_scheduled_date?: string;
    ab_test_spread_sending_hours?: number;
    ab_test_percentage?: number;
  };
  availableTemplates?: { id: string; name: string }[];
  onBack: () => void;
  onCreate: () => Promise<void>;
  isEditMode?: boolean;
}

const Step5_Review = ({
  data,
  availableTemplates = [],
  onBack,
  onCreate,
  isEditMode = false,
}: Step5Props) => {
  const { t } = useLanguage('campaigns');
  const navigate = useNavigate();
  const [isCreating, setIsCreating] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleCreate = async () => {
    setIsCreating(true);
    try {
      await onCreate();
      setIsSuccess(true);
    } catch (error) {
      console.error('Erro ao criar campanha:', error);
    } finally {
      setIsCreating(false);
    }
  };

  // SUCCESS STATE
  if (isSuccess) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-6 py-12">
        <div className="max-w-md w-full text-center space-y-6">
          {/* The orb carries the whitelabel primary (CRM-451): fill plus paired foreground, so
              contrast holds for any agency color. The title stays on text-foreground — primary
              over the page background has no such pairing. "Próximos Passos" is semantic. */}
          <div className="w-20 h-20 mx-auto bg-gradient-to-br from-primary to-primary/70 rounded-full flex items-center justify-center mb-6 shadow-lg animate-in zoom-in duration-500">
            <CheckCircle2 className="h-10 w-10 text-primary-foreground" />
          </div>

          <div className="space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <h1 className="text-3xl font-bold text-foreground">
              {isEditMode ? t('wizard.success.titleUpdated') : t('wizard.success.titleCreated')}
            </h1>
            <p className="text-muted-foreground">
              {isEditMode
                ? t('wizard.success.subtitleUpdated')
                : t('wizard.success.subtitleCreated')}
            </p>
          </div>

          <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-6 space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
            <h3 className="font-semibold text-green-900 dark:text-green-100">{t('wizard.success.nextSteps')}</h3>
            <div className="space-y-2 text-sm text-green-800 dark:text-green-200">
              <div className="flex items-start gap-2">
                <Check className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{t('wizard.success.nextStep1')}</span>
              </div>
              <div className="flex items-start gap-2">
                <Check className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{t('wizard.success.nextStep2')}</span>
              </div>
              <div className="flex items-start gap-2">
                <Check className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{t('wizard.success.nextStep3')}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
            <Button variant="outline" className="flex-1" onClick={() => navigate('/campaigns')}>
              {t('wizard.success.viewCampaigns')}
            </Button>
            <Button className="flex-1" onClick={() => window.location.reload()}>
              {isEditMode ? t('wizard.success.continueEditing') : t('wizard.success.newCampaign')}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col max-w-4xl mx-auto py-6 px-6 h-full">
      <div className="flex-1 overflow-y-auto min-h-0 px-1">
        <div className="w-full space-y-6 max-w-2xl mx-auto pb-4">

          {/* GERAL */}
          <div className="border border-border bg-card rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center">
                <Megaphone className="h-5 w-5 text-purple-600" />
              </div>
              <Label className="text-lg font-bold">{t('wizard.step5.general')}</Label>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('wizard.step5.name')}</span>
                <span className="font-bold">{data.name}</span>
              </div>
              {data.description && (
                <div className="flex flex-col gap-1">
                  <span className="text-muted-foreground text-xs font-bold uppercase tracking-widest">{t('wizard.step5.description')}</span>
                  <p className="text-sm p-3 bg-muted/30 rounded-lg border border-border italic text-muted-foreground">
                    {data.description}
                  </p>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('wizard.step5.channelAndType')}</span>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-bold rounded uppercase">{data.channel_type}</span>
                  <span className="px-2 py-0.5 bg-muted text-muted-foreground text-[10px] font-bold rounded uppercase">{data.type}</span>
                </div>
              </div>
            </div>
          </div>

          {/* AUDIÊNCIA */}
          <div className="border border-border bg-card rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <Label className="text-lg font-bold">{t('wizard.step5.audience')}</Label>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('wizard.step5.selection')}</span>
                <span className="font-bold capitalize">{data.contact_selection}</span>
              </div>
              {data.estimated_contacts && (
                <div className="flex justify-between items-center p-3 bg-blue-500/5 rounded-lg border border-blue-500/10">
                  <span className="text-muted-foreground font-medium">{t('wizard.step5.estimatedContacts')}</span>
                  <span className="text-lg font-bold text-blue-600">{data.estimated_contacts.toLocaleString('pt-BR')}</span>
                </div>
              )}
            </div>
          </div>

          {/* CONTEÚDO */}
          <div className="border border-border bg-card rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                <MessageSquare className="h-5 w-5 text-green-600" />
              </div>
              <Label className="text-lg font-bold">{t('wizard.step5.content')}</Label>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('wizard.step5.inbox')}</span>
                <span className="font-bold">{data.inbox_id ? t('wizard.step5.inboxSelected') : t('wizard.step5.inboxNone')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('wizard.step5.templates')}</span>
                <span className="font-bold text-primary">{t('wizard.step5.templatesSelected', { count: data.template_ids.length })}</span>
              </div>
            </div>
          </div>

          {/* CONFIGURAÇÕES */}
          <div className="border border-border bg-card rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Settings2 className="h-5 w-5 text-primary" />
              </div>
              <Label className="text-xl font-bold">{t('wizard.step5.settings')}</Label>
            </div>

            <div className="space-y-4 text-sm">
              {data.template_strategy !== 'ab_test' ? (
                <div className="grid grid-cols-1 gap-4">
                  <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg border border-border">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>{t('wizard.step5.schedule')}</span>
                    </div>
                    <span className="font-bold">
                      {data.schedule_option === 'now'
                        ? t('wizard.step5.sendImmediate')
                        : data.scheduled_date ? new Date(data.scheduled_date).toLocaleString('pt-BR') : t('wizard.step5.notAvailable')}
                    </span>
                  </div>

                  {data.template_strategy && (
                    <div className="flex flex-col gap-3">
                      <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg border border-border">
                        <span className="text-muted-foreground">{t('wizard.step5.strategyLabel')}</span>
                        <span className="font-bold uppercase text-primary">
                          {t(`wizard.step4.strategyOptions.${data.template_strategy}`)}
                        </span>
                      </div>

                      {data.template_strategy === 'weighted' && data.template_ids && (
                        <div className="bg-muted/10 rounded-xl p-4 border border-dashed border-border space-y-2">
                          <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1 block">{t('wizard.step5.weightsPerTemplate')}</Label>
                          {data.template_ids.map(id => {
                            const templateName = availableTemplates.find(template => template.id === id)?.name || t('wizard.step5.templateFallback', { id });
                            return (
                              <div key={id} className="flex justify-between items-center">
                                <span className="text-muted-foreground truncate max-w-[150px]">{templateName}</span>
                                <div className="flex items-center gap-2">
                                  <div className="h-1.5 w-24 bg-muted rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-primary"
                                      style={{ width: `${data.template_weights?.[id] || 0}%` }}
                                    />
                                  </div>
                                  <span className="font-bold w-10 text-right">{data.template_weights?.[id] || 0}%</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg border border-border">
                    <span className="text-muted-foreground">{t('wizard.step5.winnerCriteria')}</span>
                    <span className="font-bold text-primary">
                      {data.ab_test_winner_criteria === 'open_rate'
                        ? t('wizard.step4.winnerCriteria.open_rate')
                        : t('wizard.step4.winnerCriteria.click_rate')}
                    </span>
                  </div>

                  <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg border border-border">
                    <span className="text-muted-foreground">{t('wizard.step5.sampleSize')}</span>
                    <span className="font-bold">{t('wizard.step5.sampleSizeValue', { percentage: data.ab_test_percentage })}</span>
                  </div>

                  <div className="p-4 bg-primary/5 rounded-xl border border-primary/20 space-y-3">
                    <div className="flex justify-between items-center text-xs">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>{t('wizard.step5.testPhase')}</span>
                      </div>
                      <span className="font-bold">
                        {data.ab_test_schedule_option === 'now'
                          ? t('wizard.step5.immediate')
                          : data.ab_test_scheduled_date ? new Date(data.ab_test_scheduled_date).toLocaleString('pt-BR') : t('wizard.step5.notAvailable')}
                      </span>
                    </div>

                    {!data.ab_test_skip_winner && (
                      <div className="flex justify-between items-center text-xs">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <CheckCircle2 className="h-4 w-4 text-primary" />
                          <span>{t('wizard.step5.winnerSend')}</span>
                        </div>
                        <span className="font-bold">
                          {data.ab_test_winner_scheduled_date
                            ? new Date(data.ab_test_winner_scheduled_date).toLocaleString('pt-BR') : t('wizard.step5.winnerManual')}
                        </span>
                      </div>
                    )}

                    {data.ab_test_skip_winner && (
                      <div className="flex items-center gap-2 text-orange-600 text-xs font-medium">
                        <Settings2 className="h-3 w-3" />
                        <span>{t('wizard.step5.winnerNotAutomatic')}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-3 pt-4 border-t border-border mt-2">
                {data.spread_sending_hours !== undefined && data.spread_sending_hours > 0 && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Zap className="h-4 w-4 text-primary" />
                    <span>{t('wizard.step5.spreadInterval')} <b>{t('wizard.step5.spreadIntervalValue', { hours: data.spread_sending_hours })}</b></span>
                  </div>
                )}

                {data.use_business_hours ? (
                  <div className="flex flex-col gap-1.5 p-3 bg-green-500/5 border border-green-500/20 rounded-lg">
                    <div className="flex items-center justify-between text-[10px] font-bold text-green-600 uppercase tracking-widest">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3 w-3" />
                        <span>{t('wizard.step5.allowedHours')}</span>
                      </div>
                      <span>{data.business_hours_start} - {data.business_hours_end}</span>
                    </div>
                    {data.allowed_weekdays && (
                      <div className="flex gap-1">
                        {WEEKDAYS.map(day => (
                          <span
                            key={day.id}
                            className={`w-5 h-5 flex items-center justify-center text-[10px] rounded ${data.allowed_weekdays?.includes(day.id)
                                ? 'bg-green-500 text-white font-bold'
                                : 'bg-muted text-muted-foreground'
                              }`}
                          >
                            {t(`wizard.step5.weekdayInitials.${day.key}`)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>{t('wizard.step5.noTimeRestriction')}</span>
                  </div>
                )}

                <div className="flex flex-wrap gap-2 pt-2">
                  {data.enable_rate_limit && (
                    <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-[10px] font-bold rounded uppercase tracking-wider">
                      {t('wizard.step5.rateLimitBadge')}
                    </span>
                  )}
                  {data.enable_retry && (
                    <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 text-[10px] font-bold rounded uppercase tracking-wider">
                      {t('wizard.step5.retryBadge')}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-between flex-shrink-0 pt-4 border-t mt-6">
        <Button variant="outline" className="px-6 gap-2" onClick={onBack} disabled={isCreating}>
          <ArrowLeft className="h-4 w-4" />
          {t('wizard.actions.back')}
        </Button>
        <Button className="px-6 gap-2" onClick={handleCreate} disabled={isCreating}>
          {isCreating ? t('wizard.step5.saving') : isEditMode ? t('wizard.actions.save') : t('wizard.actions.create')}
          {!isCreating && <Check className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
};

export default Step5_Review;
