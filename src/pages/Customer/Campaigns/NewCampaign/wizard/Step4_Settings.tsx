import { useTranslation as useUiTranslation } from 'react-i18next';
import {
  Button,
  Label,
  RadioGroup,
  RadioGroupItem,
  Switch,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@evoapi/design-system';
import { ArrowRight, ArrowLeft, Settings2, Calendar, Clock, Zap, CheckCircle2 } from 'lucide-react';

interface Step4Props {
  data: {
    // Agendamento
    schedule_option: 'now' | 'later' | '';
    scheduled_date?: string;

    // Distribuição de Templates
    template_strategy?: 'round_robin' | 'weighted' | 'random' | 'ab_test';
    template_weights?: Record<string, number>;
    ab_test_percentage?: number; // % para fase de teste do A/B

    // Janelas de tempo
    use_business_hours?: boolean;
    business_hours_start?: string;
    business_hours_end?: string;
    timezone?: string;
    allowed_weekdays?: number[];

    // Técnicas
    enable_rate_limit?: boolean;
    rate_limit_per_hour?: number;
    enable_retry?: boolean;
    max_retry_attempts?: number;
    spread_sending_hours?: number;

    // A/B Test Details
    ab_test_winner_criteria?: 'open_rate' | 'click_rate';
    ab_test_schedule_option?: 'now' | 'later';
    ab_test_scheduled_date?: string;
    ab_test_skip_winner?: boolean;
    ab_test_winner_scheduled_date?: string;
    ab_test_spread_sending_hours?: number;

    // Templates selecionados (para mostrar configuração)
    template_ids?: string[];
  };
  availableTemplates?: { id: string; name: string }[];
  onChange: (data: Partial<Step4Props['data']>) => void;
  onNext: () => void;
  onBack: () => void;
}

const Step4_Settings = ({ data, availableTemplates = [], onChange, onNext, onBack }: Step4Props) => {
  const { t: tUi } = useUiTranslation();

  const handleNext = () => {
    const scheduleOption = data.template_strategy === 'ab_test' ? data.ab_test_schedule_option : data.schedule_option;
    const scheduleDate = data.template_strategy === 'ab_test' ? data.ab_test_scheduled_date : data.scheduled_date;

    if (!scheduleOption) return;
    if (scheduleOption === 'later' && !scheduleDate) return;

    if (data.template_strategy === 'ab_test' && !data.ab_test_skip_winner && !data.ab_test_winner_scheduled_date) {
      return;
    }

    onNext();
  };

  const isScheduledValid = data.template_strategy === 'ab_test'
    ? (data.ab_test_schedule_option === 'now' || !!data.ab_test_scheduled_date) && (data.ab_test_skip_winner || !!data.ab_test_winner_scheduled_date)
    : (data.schedule_option === 'now' || !!data.scheduled_date);

  const isSplitValid = data.template_strategy === 'weighted'
    ? Object.values(data.template_weights || {}).reduce((a, b) => a + b, 0) === 100
    : true;

  const isValid = !!(data.template_strategy === 'ab_test' ? data.ab_test_schedule_option : data.schedule_option) && isScheduledValid && isSplitValid;

  const currentScheduleOption = data.template_strategy === 'ab_test' ? data.ab_test_schedule_option : data.schedule_option;

  const showStrategySelector = (data.template_ids?.length || 0) > 1;

  return (
    <div className="flex flex-col max-w-4xl mx-auto h-full text-foreground px-6">
      <div className="flex-1 overflow-y-auto pb-12">
        <div className="w-full space-y-8 max-w-2xl mx-auto">

          {/* 1. DISTRIBUIÇÃO DE TEMPLATES (Condicional) */}
          {showStrategySelector && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Settings2 className="h-5 w-5 text-primary" />
                </div>
                <Label className="text-xl font-bold">{tUi("interface:step4Settings.sendingStrategy")}</Label>
              </div>

              <div className="bg-card border border-border rounded-xl p-6 space-y-6">
                <div className="space-y-2">
                  <Label className="text-sm font-bold text-muted-foreground uppercase tracking-widest">{tUi("interface:step4Settings.distributionStrategy")}</Label>
                  <Select
                    value={data.template_strategy || 'round_robin'}
                    onValueChange={(value) => onChange({ template_strategy: value as any })}
                  >
                    <SelectTrigger className="h-12 bg-background border-border text-foreground hover:border-primary/50 transition-colors rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="round_robin">{tUi("interface:step4Settings.sequential")}</SelectItem>
                      <SelectItem value="weighted">{tUi("journey:panels.split.nodeTitle")}</SelectItem>
                      <SelectItem value="random">{tUi("interface:step4Settings.random")}</SelectItem>
                      <SelectItem value="ab_test">{tUi("campaigns:status.sending_testab")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Split (Weighted) Strategy UI */}
                {data.template_strategy === 'weighted' && (
                  <div className="space-y-4 pt-4 border-t border-border animate-in fade-in duration-500">
                    <Label className="text-sm font-bold text-muted-foreground uppercase tracking-widest">{tUi("interface:step4Settings.distributionByTemplate")}</Label>
                    <div className="space-y-3">
                      {data.template_ids?.map((id) => {
                        const templateName = availableTemplates.find((t) => t.id === id)?.name || `Template ${id}`;
                        return (
                          <div key={id} className="flex items-center gap-4 bg-muted/40 p-3 rounded-xl border border-border">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{templateName}</p>
                            </div>
                            <div className="w-24">
                              <div className="relative">
                                <Input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={data.template_weights?.[id] || 0}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value) || 0;
                                    onChange({
                                      template_weights: {
                                        ...(data.template_weights || {}),
                                        [id]: val,
                                      },
                                    });
                                  }}
                                  className="h-10 bg-background border-border text-foreground text-right pr-7 rounded-lg"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      <div className="flex justify-between items-center px-1 pt-2">
                        <span className="text-xs text-muted-foreground">Total</span>
                        <span className={`text-sm font-bold ${Object.values(data.template_weights || {}).reduce((a, b) => a + b, 0) === 100 ? 'text-primary' : 'text-orange-500'}`}>
                          {Object.values(data.template_weights || {}).reduce((a, b) => a + b, 0)}%
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* A/B Test Config */}
                {data.template_strategy === 'ab_test' && (
                  <div className="space-y-6 pt-4 border-t border-border animate-in fade-in duration-500">
                    <div className="space-y-3">
                      <Label className="text-sm font-bold text-muted-foreground uppercase tracking-widest">{tUi("interface:step4Settings.winnerCriterion")}</Label>
                      <RadioGroup
                        value={data.ab_test_winner_criteria || 'open_rate'}
                        onValueChange={(value) => onChange({ ab_test_winner_criteria: value as any })}
                        className="grid grid-cols-2 gap-3"
                      >
                        <div className={`flex items-center space-x-3 p-4 border rounded-xl transition-all cursor-pointer ${data.ab_test_winner_criteria === 'open_rate' ? 'border-primary bg-primary/5' : 'border-border bg-background hover:border-primary/50'}`}>
                          <RadioGroupItem value="open_rate" id="open_rate" />
                          <Label htmlFor="open_rate" className="font-semibold cursor-pointer">{tUi("interface:step4Settings.openRate")}</Label>
                        </div>
                        <div className={`flex items-center space-x-3 p-4 border rounded-xl transition-all cursor-pointer ${data.ab_test_winner_criteria === 'click_rate' ? 'border-primary bg-primary/5' : 'border-border bg-background hover:border-primary/50'}`}>
                          <RadioGroupItem value="click_rate" id="click_rate" />
                          <Label htmlFor="click_rate" className="font-semibold cursor-pointer">{tUi("interface:step4Settings.clickRate")}</Label>
                        </div>
                      </RadioGroup>
                    </div>

                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <Label className="text-sm font-bold text-muted-foreground uppercase tracking-widest">{tUi("interface:step4Settings.testSample")}</Label>
                        <span className="text-primary font-bold">{data.ab_test_percentage || 20}%</span>
                      </div>
                      <Input
                        type="range"
                        min="10"
                        max="50"
                        step="5"
                        value={data.ab_test_percentage || 20}
                        onChange={(e) => onChange({ ab_test_percentage: parseInt(e.target.value) })}
                        className="h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                      />
                      <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-tight">
                        <span>{tUi("interface:step4Settings.baseMessage")} {(data.ab_test_percentage || 20) / 2}%</span>
                        <span>{tUi("interface:step4Settings.remainingWinner")} {100 - (data.ab_test_percentage || 20)}%</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 2. AGENDAMENTO */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-orange-500" />
              </div>
              <Label className="text-xl font-bold">{tUi("campaigns:wizard.step4.scheduling")} <span className="text-destructive">*</span></Label>
            </div>

            <div className="space-y-3">
              <div
                className={`relative flex items-center p-4 rounded-xl border transition-all cursor-pointer group ${currentScheduleOption === 'now'
                  ? 'border-primary bg-primary/5 shadow-sm'
                  : 'border-border bg-card hover:border-primary/50 hover:shadow-sm'
                  }`}
                onClick={() => {
                  if (data.template_strategy === 'ab_test') onChange({ ab_test_schedule_option: 'now' });
                  else onChange({ schedule_option: 'now' });
                }}
              >
                <div className={`w-5 h-5 rounded-full border-2 mr-3 flex items-center justify-center transition-colors ${currentScheduleOption === 'now' ? 'border-primary bg-primary' : 'border-muted-foreground'}`}>
                  {currentScheduleOption === 'now' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Zap className={`h-4 w-4 ${currentScheduleOption === 'now' ? 'text-primary' : 'text-muted-foreground'}`} />
                    <Label className="text-base font-semibold cursor-pointer">{tUi("campaigns:wizard.step4.sendNow")}</Label>
                  </div>
                  <p className="text-xs text-muted-foreground">{tUi("interface:step4Settings.sendingWillStartAsSoonAsTheCampaignIsCreated")}</p>
                </div>
              </div>

              <div
                className={`relative flex items-center p-4 rounded-xl border transition-all cursor-pointer group ${currentScheduleOption === 'later'
                  ? 'border-primary bg-primary/5 shadow-sm'
                  : 'border-border bg-card hover:border-primary/50 hover:shadow-sm'
                  }`}
                onClick={() => {
                  if (data.template_strategy === 'ab_test') onChange({ ab_test_schedule_option: 'later' });
                  else onChange({ schedule_option: 'later' });
                }}
              >
                <div className={`w-5 h-5 rounded-full border-2 mr-3 flex items-center justify-center transition-colors ${currentScheduleOption === 'later' ? 'border-primary bg-primary' : 'border-muted-foreground'}`}>
                  {currentScheduleOption === 'later' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Clock className={`h-4 w-4 ${currentScheduleOption === 'later' ? 'text-primary' : 'text-muted-foreground'}`} />
                    <Label className="text-base font-semibold cursor-pointer">{tUi("campaigns:wizard.step4.scheduleLater")}</Label>
                  </div>
                  <p className="text-xs text-muted-foreground">{tUi("interface:step4Settings.chooseAFutureStartDateAndTime")}</p>
                </div>
              </div>

              {currentScheduleOption === 'later' && (
                <div className="bg-muted/20 border border-border rounded-xl p-4 mt-2 animate-in zoom-in-95 duration-300">
                  <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 block">
                    {tUi("campaigns:wizard.step4.dateTime")} {data.template_strategy === 'ab_test' ? tUi("interface:step4Settings.test") : ''}
                  </Label>
                  <Input
                    type="datetime-local"
                    value={(data.template_strategy === 'ab_test' ? data.ab_test_scheduled_date : data.scheduled_date) || ''}
                    onChange={(e) => {
                      if (data.template_strategy === 'ab_test') onChange({ ab_test_scheduled_date: e.target.value });
                      else onChange({ scheduled_date: e.target.value });
                    }}
                    className="h-10 bg-background border-border text-foreground rounded-lg focus-visible:ring-primary"
                  />
                </div>
              )}

              {data.template_strategy === 'ab_test' && (
                <div className="bg-muted/30 border border-border rounded-xl p-4 mt-4 space-y-4 animate-in slide-in-from-top-4 duration-500">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-bold">{tUi("interface:step4Settings.winningMessage")}</Label>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{tUi("interface:step4Settings.doNotSendAutomatically")}</span>
                      <Switch
                        checked={data.ab_test_skip_winner}
                        onCheckedChange={(v) => onChange({ ab_test_skip_winner: v })}
                      />
                    </div>
                  </div>

                  {!data.ab_test_skip_winner && (
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{tUi("interface:step4Settings.sendIn")}</Label>
                      <Input
                        type="datetime-local"
                        value={data.ab_test_winner_scheduled_date || ''}
                        onChange={(e) => onChange({ ab_test_winner_scheduled_date: e.target.value })}
                        className="h-10 bg-background border-border text-foreground rounded-lg"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 3. OPÇÕES AVANÇADAS */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Settings2 className="h-5 w-5 text-blue-500" />
              </div>
              <Label className="text-xl font-bold">{tUi("interface:step4Settings.advancedOptions")}</Label>
            </div>

            <div className="bg-card border border-border rounded-xl divide-y divide-border overflow-hidden">
              {/* Janela de Distribuição (Spread Sending) */}
              <div className="p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                    <Zap className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <Label className="text-sm font-bold">{tUi("interface:step4Settings.distributionInterval")}</Label>
                    <p className="text-[10px] text-muted-foreground">{tUi("interface:step4Settings.intervalBetweenCampaignSends")}</p>
                  </div>
                </div>
                <Select
                  value={String(data.spread_sending_hours || '0')}
                  onValueChange={(val) => onChange({ spread_sending_hours: parseFloat(val) })}
                >
                  <SelectTrigger className="h-10 bg-background border-border text-foreground rounded-lg">
                    <SelectValue placeholder={tUi("interface:step4Settings.noInterval")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0.166">{tUi("interface:step4Settings.10Minutes")}</SelectItem>
                    <SelectItem value="0.5">{tUi("interface:step4Settings.30Minutes")}</SelectItem>
                    <SelectItem value="1">{tUi("interface:step4Settings.60Minutes")}</SelectItem>
                    <SelectItem value="1.5">{tUi("interface:step4Settings.1Hour30Minutes")}</SelectItem>
                    <SelectItem value="2">{tUi("interface:step4Settings.2Hours")}</SelectItem>
                    <SelectItem value="2.5">{tUi("interface:step4Settings.2Hours30Minutes")}</SelectItem>
                    <SelectItem value="3">{tUi("interface:step4Settings.3Hours")}</SelectItem>
                    <SelectItem value="4">{tUi("interface:step4Settings.4Hours")}</SelectItem>
                    <SelectItem value="5">{tUi("interface:step4Settings.5Hours")}</SelectItem>
                    <SelectItem value="6">{tUi("interface:step4Settings.6Hours")}</SelectItem>
                    <SelectItem value="7">{tUi("interface:step4Settings.7Hours")}</SelectItem>
                    <SelectItem value="8">{tUi("interface:step4Settings.8Hours")}</SelectItem>
                    <SelectItem value="9">{tUi("interface:step4Settings.10Hours")}</SelectItem>
                    <SelectItem value="11">{tUi("interface:step4Settings.11Hours")}</SelectItem>
                    <SelectItem value="12">{tUi("interface:step4Settings.12Hours")}</SelectItem>
                    <SelectItem value="18">{tUi("interface:step4Settings.18Hours")}</SelectItem>
                    <SelectItem value="24">{tUi("interface:step4Settings.24Hours")}</SelectItem>
                    <SelectItem value="0">{tUi("interface:step4Settings.noInterval")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Janelas de Tempo (Business Hours) */}
              <div className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <Label className="text-sm font-bold">{tUi("campaigns:wizard.step4.timeWindows")}</Label>
                      <p className="text-[10px] text-muted-foreground">{tUi("interface:step4Settings.restrictSendingToAllowedHoursAndDays")}</p>
                    </div>
                  </div>
                  <Switch
                    checked={data.use_business_hours}
                    onCheckedChange={(v) => onChange({ use_business_hours: v })}
                  />
                </div>

                {data.use_business_hours && (
                  <div className="space-y-4 animate-in fade-in duration-300 pl-11">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{tUi("campaigns:wizard.step4.start")}</Label>
                        <Input
                          type="time"
                          value={data.business_hours_start || '09:00'}
                          onChange={(e) => onChange({ business_hours_start: e.target.value })}
                          className="h-9 bg-background border-border"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{tUi("campaigns:wizard.step4.end")}</Label>
                        <Input
                          type="time"
                          value={data.business_hours_end || '18:00'}
                          onChange={(e) => onChange({ business_hours_end: e.target.value })}
                          className="h-9 bg-background border-border"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{tUi("campaigns:wizard.step4.weekdays")}</Label>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { id: 1, label: tUi("campaigns:wizard.step4.monday") },
                          { id: 2, label: tUi("campaigns:wizard.step4.tuesday") },
                          { id: 3, label: tUi("campaigns:wizard.step4.wednesday") },
                          { id: 4, label: tUi("campaigns:wizard.step4.thursday") },
                          { id: 5, label: tUi("campaigns:wizard.step4.friday") },
                          { id: 6, label: tUi("campaigns:wizard.step4.saturday") },
                          { id: 0, label: tUi("campaigns:wizard.step4.sunday") },
                        ].map((day) => {
                          const isSelected = data.allowed_weekdays?.includes(day.id);
                          return (
                            <button
                              key={day.id}
                              type="button"
                              onClick={() => {
                                const current = data.allowed_weekdays || [];
                                const next = isSelected
                                  ? current.filter(d => d !== day.id)
                                  : [...current, day.id];
                                onChange({ allowed_weekdays: next });
                              }}
                              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all border ${isSelected
                                  ? 'bg-primary border-primary text-white shadow-sm'
                                  : 'bg-background border-border text-muted-foreground hover:border-primary/50'
                                }`}
                            >
                              {day.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                    <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <Label className="text-sm font-bold">{tUi("interface:step4Settings.automaticRetries")}</Label>
                    <p className="text-[10px] text-muted-foreground">{tUi("interface:step4Settings.retrySendingOnFailure")}</p>
                  </div>
                </div>
                <Switch
                  checked={data.enable_retry}
                  onCheckedChange={(v) => onChange({ enable_retry: v })}
                />
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* FOOTER ACTIONS */}
      <div className="flex justify-between items-center py-6 border-t border-border mt-auto">
        <Button variant="outline" className="px-6" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" /> {tUi("common:base.buttons.back")}</Button>
        <Button
          className={`h-11 px-8 rounded-lg font-bold transition-all ${isValid
            ? 'bg-primary text-primary-foreground hover:opacity-90 shadow-md'
            : 'bg-muted text-muted-foreground cursor-not-allowed'
            }`}
          onClick={handleNext}
          disabled={!isValid}
        >
          {tUi("aiAgents:actions.continue")} <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default Step4_Settings;
