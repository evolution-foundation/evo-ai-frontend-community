import { useState } from 'react';
import { Button, Label } from '@evoapi/design-system';
import { ArrowLeft, Check, CheckCircle2, Megaphone, Users, MessageSquare, Settings2, Calendar, Zap, Clock } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { useNavigate } from 'react-router-dom';

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
          <div className="w-20 h-20 mx-auto bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center mb-6 shadow-lg animate-in zoom-in duration-500">
            <CheckCircle2 className="h-10 w-10 text-white" />
          </div>

          <div className="space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <h1 className="text-3xl font-bold text-green-600">
              {isEditMode ? 'Campanha Atualizada!' : 'Campanha Criada!'}
            </h1>
            <p className="text-muted-foreground">
              {isEditMode
                ? 'Sua campanha foi atualizada com sucesso.'
                : 'Sua campanha foi criada com sucesso e está pronta'}
            </p>
          </div>

          <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-6 space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
            <h3 className="font-semibold text-green-900 dark:text-green-100">Próximos Passos</h3>
            <div className="space-y-2 text-sm text-green-800 dark:text-green-200">
              <div className="flex items-start gap-2">
                <Check className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>Acompanhe o progresso da campanha no painel</span>
              </div>
              <div className="flex items-start gap-2">
                <Check className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>Monitorize as estatísticas de envio e envolvimento</span>
              </div>
              <div className="flex items-start gap-2">
                <Check className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>Pode pausar ou editar a campanha a qualquer momento</span>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
            <Button variant="outline" className="flex-1" onClick={() => navigate('/campaigns')}>
              Ver Campanhas
            </Button>
            <Button className="flex-1" onClick={() => window.location.reload()}>
              {isEditMode ? 'Continuar editando' : 'Nova Campanha'}
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
              <Label className="text-lg font-bold">Informações Gerais</Label>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Nome:</span>
                <span className="font-bold">{data.name}</span>
              </div>
              {data.description && (
                <div className="flex flex-col gap-1">
                  <span className="text-muted-foreground text-xs font-bold uppercase tracking-widest">Descrição</span>
                  <p className="text-sm p-3 bg-muted/30 rounded-lg border border-border italic text-muted-foreground">
                    {data.description}
                  </p>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Canal e Tipo:</span>
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
              <Label className="text-lg font-bold">Audiência</Label>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Seleção:</span>
                <span className="font-bold capitalize">{data.contact_selection}</span>
              </div>
              {data.estimated_contacts && (
                <div className="flex justify-between items-center p-3 bg-blue-500/5 rounded-lg border border-blue-500/10">
                  <span className="text-muted-foreground font-medium">Contatos estimados</span>
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
              <Label className="text-lg font-bold">Conteúdo</Label>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Inbox:</span>
                <span className="font-bold">{data.inbox_id ? 'Inbox selecionado' : 'Nenhum selecionado'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Templates:</span>
                <span className="font-bold text-primary">{data.template_ids.length} selecionado(s)</span>
              </div>
            </div>
          </div>

          {/* CONFIGURAÇÕES */}
          <div className="border border-border bg-card rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Settings2 className="h-5 w-5 text-primary" />
              </div>
              <Label className="text-xl font-bold">Configurações</Label>
            </div>

            <div className="space-y-4 text-sm">
              {data.template_strategy !== 'ab_test' ? (
                <div className="grid grid-cols-1 gap-4">
                  <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg border border-border">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>Agendamento</span>
                    </div>
                    <span className="font-bold">
                      {data.schedule_option === 'now'
                        ? 'Envio Imediato'
                        : data.scheduled_date ? new Date(data.scheduled_date).toLocaleString('pt-BR') : 'N/A'}
                    </span>
                  </div>

                  {data.template_strategy && (
                    <div className="flex flex-col gap-3">
                      <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg border border-border">
                        <span className="text-muted-foreground">Estratégia de Distribuição</span>
                        <span className="font-bold uppercase text-primary">
                          {data.template_strategy === 'round_robin' ? 'sequencial' :
                            data.template_strategy === 'weighted' ? 'Split' :
                              data.template_strategy === 'random' ? 'Aleatorio' : 'Teste A/B'}
                        </span>
                      </div>

                      {data.template_strategy === 'weighted' && data.template_ids && (
                        <div className="bg-muted/10 rounded-xl p-4 border border-dashed border-border space-y-2">
                          <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1 block">Pesos por Template</Label>
                          {data.template_ids.map(id => {
                            const templateName = availableTemplates.find(t => t.id === id)?.name || `Template ${id}`;
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
                    <span className="text-muted-foreground">Critério de vencedor</span>
                    <span className="font-bold text-primary">
                      {data.ab_test_winner_criteria === 'open_rate' ? 'Taxa de Abertura' : 'Taxa de Clique'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg border border-border">
                    <span className="text-muted-foreground">Tamanho da amostra</span>
                    <span className="font-bold">{data.ab_test_percentage}% dos contatos</span>
                  </div>

                  <div className="p-4 bg-primary/5 rounded-xl border border-primary/20 space-y-3">
                    <div className="flex justify-between items-center text-xs">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>Fase de Teste</span>
                      </div>
                      <span className="font-bold">
                        {data.ab_test_schedule_option === 'now'
                          ? 'Imediato'
                          : data.ab_test_scheduled_date ? new Date(data.ab_test_scheduled_date).toLocaleString('pt-BR') : 'N/A'}
                      </span>
                    </div>

                    {!data.ab_test_skip_winner && (
                      <div className="flex justify-between items-center text-xs">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <CheckCircle2 className="h-4 w-4 text-primary" />
                          <span>Envio do Vencedor</span>
                        </div>
                        <span className="font-bold">
                          {data.ab_test_winner_scheduled_date
                            ? new Date(data.ab_test_winner_scheduled_date).toLocaleString('pt-BR') : 'Manual'}
                        </span>
                      </div>
                    )}

                    {data.ab_test_skip_winner && (
                      <div className="flex items-center gap-2 text-orange-600 text-xs font-medium">
                        <Settings2 className="h-3 w-3" />
                        <span>Vencedor não será enviado automaticamente</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-3 pt-4 border-t border-border mt-2">
                {data.spread_sending_hours !== undefined && data.spread_sending_hours > 0 && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Zap className="h-4 w-4 text-primary" />
                    <span>Intervalo de Envio: <b>{data.spread_sending_hours}h</b></span>
                  </div>
                )}

                {data.use_business_hours ? (
                  <div className="flex flex-col gap-1.5 p-3 bg-green-500/5 border border-green-500/20 rounded-lg">
                    <div className="flex items-center justify-between text-[10px] font-bold text-green-600 uppercase tracking-widest">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3 w-3" />
                        <span>Horário Permitido</span>
                      </div>
                      <span>{data.business_hours_start} - {data.business_hours_end}</span>
                    </div>
                    {data.allowed_weekdays && (
                      <div className="flex gap-1">
                        {[
                          { id: 1, label: 'S' },
                          { id: 2, label: 'T' },
                          { id: 3, label: 'Q' },
                          { id: 4, label: 'Q' },
                          { id: 5, label: 'S' },
                          { id: 6, label: 'S' },
                          { id: 0, label: 'D' },
                        ].map(day => (
                          <span
                            key={day.id}
                            className={`w-5 h-5 flex items-center justify-center text-[10px] rounded ${data.allowed_weekdays?.includes(day.id)
                                ? 'bg-green-500 text-white font-bold'
                                : 'bg-muted text-muted-foreground'
                              }`}
                          >
                            {day.label}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>Sem restrição de horário</span>
                  </div>
                )}

                <div className="flex flex-wrap gap-2 pt-2">
                  {data.enable_rate_limit && (
                    <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-[10px] font-bold rounded uppercase tracking-wider">
                      Limite de Taxa
                    </span>
                  )}
                  {data.enable_retry && (
                    <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 text-[10px] font-bold rounded uppercase tracking-wider">
                      Retentativas Ativas
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
          {isCreating ? 'Salvando...' : isEditMode ? t('wizard.actions.save') : t('wizard.actions.create')}
          {!isCreating && <Check className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
};

export default Step5_Review;
