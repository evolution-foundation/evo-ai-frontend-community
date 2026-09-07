import i18n from '@/i18n/config';
import { useState, useEffect, useCallback } from 'react';
import {
  Input,
  Label,
  Textarea,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Badge,
} from '@evoapi/design-system';
import {
  Bot,
  ExternalLink,
  ArrowRight,
  GitBranch,
  RefreshCw,
  ListChecks,
  Plug,
} from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { ProviderSelector } from '@/components/agents/ProviderSelector';

export interface BasicInfoData {
  name: string;
  description: string;
  type: string;
  role: string;
  goal: string;
  provider?: string; // For external agents
}

export interface BasicInfoFormProps {
  mode: 'create' | 'edit' | 'view';
  data: BasicInfoData;
  onChange: (data: BasicInfoData) => void;
  onValidationChange: (isValid: boolean, errors: string[]) => void;
}

const getAgentTypes = (t: (key: string) => string) => [
  {
    value: 'llm',
    label: t('basicInfo.types.llm'),
    description: t('basicInfo.types.llm'),
    icon: Bot,
    badge: t('basicInfo.types.llm'),
    badgeVariant: 'default' as const,
  },
  {
    value: 'a2a',
    label: t('basicInfo.types.a2a'),
    description: t('basicInfo.types.a2a'),
    icon: ExternalLink,
    badge: t('basicInfo.types.a2a'),
    badgeVariant: 'secondary' as const,
  },
  {
    value: 'task',
    label: t('basicInfo.types.task'),
    description: t('basicInfo.types.task'),
    icon: ListChecks,
    badge: t('basicInfo.types.task'),
    badgeVariant: 'outline' as const,
  },
  {
    value: 'loop',
    label: i18n.t("interface:basicinfoform.loop"),
    description: i18n.t("interface:basicinfoform.loop"),
    icon: RefreshCw,
    badge: 'Loop',
    badgeVariant: 'outline' as const,
  },
  {
    value: 'sequential',
    label: i18n.t("aiAgents:planner.types.sequential"),
    description: i18n.t("aiAgents:planner.types.sequential"),
    icon: ArrowRight,
    badge: 'Sequential',
    badgeVariant: 'outline' as const,
  },
  {
    value: 'parallel',
    label: i18n.t("aiAgents:planner.types.parallel"),
    description: i18n.t("aiAgents:planner.types.parallel"),
    icon: GitBranch,
    badge: 'Parallel',
    badgeVariant: 'outline' as const,
  },
  {
    value: 'external',
    label: t('basicInfo.types.external'),
    description: t('basicInfo.types.externalDescription'),
    icon: Plug,
    badge: 'External',
    badgeVariant: 'secondary' as const,
  },
];

const BasicInfoForm = ({ mode, data, onChange, onValidationChange }: BasicInfoFormProps) => {
  const { t } = useLanguage('aiAgents');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const agentTypes = getAgentTypes(t);

  // Memoizar função de validação para evitar loops infinitos
  const validateForm = useCallback(() => {
    const newErrors: Record<string, string> = {};

    // Validar nome
    if (!data.name?.trim()) {
      newErrors.name = t('validation.nameRequired');
    } else if (data.name.trim().length < 3) {
      newErrors.name = t('validation.minLength', { min: 3 });
    } else if (data.name.trim().length > 100) {
      newErrors.name = t('validation.maxLength', { max: 100 });
    }

    // Validar tipo
    if (!data.type) {
      newErrors.type = t('validation.typeRequired');
    }

    return newErrors;
  }, [data.name, data.type, t]);

  // Validação em tempo real
  useEffect(() => {
    const newErrors = validateForm();
    setErrors(newErrors);

    // Notificar componente pai sobre validação apenas se mudou
    const isValid = Object.keys(newErrors).length === 0;
    const errorMessages = Object.values(newErrors);

    // Usar setTimeout para evitar atualizações síncronas
    const timer = setTimeout(() => {
      onValidationChange(isValid, errorMessages);
    }, 0);

    return () => clearTimeout(timer);
  }, [validateForm, onValidationChange]);

  const handleInputChange = useCallback(
    (field: keyof BasicInfoData, value: string) => {
      onChange({
        ...data,
        [field]: value,
      });
    },
    [data, onChange],
  );

  const isReadOnly = mode === 'view';
  const selectedAgentType = agentTypes.find(type => type.value === data.type);

  return (
    <div className="space-y-6">
      {/* Informações Básicas Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Bot className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="pb-2">{t('basicInfo.title')}</CardTitle>
              <CardDescription>{t('basicInfo.title')}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Tipo de Agente */}
          <div className="space-y-2">
            <Label htmlFor="agent-type" className="text-sm font-medium">
              {t('basicInfo.type')} <span className="text-red-500">*</span>
            </Label>

            {isReadOnly && selectedAgentType ? (
              // Modo visualização
              <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <selectedAgentType.icon className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{selectedAgentType.label}</p>
                    <p className="text-sm text-muted-foreground">{selectedAgentType.description}</p>
                  </div>
                </div>
                <Badge variant={selectedAgentType.badgeVariant}>{selectedAgentType.badge}</Badge>
              </div>
            ) : (
              // Modo edição/criação
              <Select
                value={data.type || ''}
                onValueChange={value => handleInputChange('type', value)}
              >
                <SelectTrigger
                  className={`w-full ${errors.type ? 'border-red-500 focus:border-red-500' : ''}`}
                  id="agent-type"
                >
                  <SelectValue placeholder={t('basicInfo.type')} />
                </SelectTrigger>
                <SelectContent>
                  {agentTypes.map(type => {
                    const IconComponent = type.icon;
                    return (
                      <SelectItem key={type.value} value={type.value} className="cursor-pointer">
                        <div className="flex items-center gap-3">
                          <IconComponent className="h-4 w-4" />
                          <span className="font-medium">{type.label}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            )}

            {errors.type && <p className="text-xs text-red-600">{errors.type}</p>}
          </div>

          {/* Nome do Agente */}
          <div className="space-y-2">
            <Label htmlFor="agent-name" className="text-sm font-medium">
              {t('basicInfo.name')} <span className="text-red-500">*</span>
            </Label>
            <Input
              id="agent-name"
              value={data.name || ''}
              onChange={e => handleInputChange('name', e.target.value)}
              placeholder={t('basicInfo.namePlaceholder')}
              disabled={isReadOnly}
              className={errors.name ? 'border-red-500 focus:border-red-500' : ''}
            />
            {errors.name && <p className="text-xs text-red-600">{errors.name}</p>}
            <p className="text-xs text-muted-foreground">{t('basicInfo.namePlaceholder')}</p>
          </div>

          {/* Descrição - Visível para todos EXCETO A2A */}
          {data.type !== 'a2a' && (
            <div className="space-y-2">
              <Label htmlFor="agent-description" className="text-sm font-medium">
                {t('basicInfo.description')}
              </Label>
              <Textarea
                id="agent-description"
                value={data.description || ''}
                onChange={e => handleInputChange('description', e.target.value)}
                placeholder={t('basicInfo.descriptionPlaceholder')}
                rows={3}
                disabled={isReadOnly}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{t('basicInfo.descriptionPlaceholder')}</span>
                <span>{data.description?.length || 0}/500</span>
              </div>
            </div>
          )}

          {/* Campos específicos para agentes LLM */}
          {data.type === 'llm' && (
            <>
              {/* Papel do Agente */}
              <div className="space-y-2">
                <Label htmlFor="agent-role" className="text-sm font-medium">
                  {t('basicInfo.role')}
                </Label>
                <Input
                  id="agent-role"
                  value={data.role || ''}
                  onChange={e => handleInputChange('role', e.target.value)}
                  placeholder={t('basicInfo.rolePlaceholder')}
                  disabled={isReadOnly}
                  className={errors.role ? 'border-red-500 focus:border-red-500' : ''}
                />
                {errors.role && <p className="text-xs text-red-600">{errors.role}</p>}
                <p className="text-xs text-muted-foreground">{t('basicInfo.rolePlaceholder')}</p>
              </div>

              {/* Objetivo do Agente */}
              <div className="space-y-2">
                <Label htmlFor="agent-goal" className="text-sm font-medium">
                  {t('basicInfo.goal')}
                </Label>
                <Input
                  id="agent-goal"
                  value={data.goal || ''}
                  onChange={e => handleInputChange('goal', e.target.value)}
                  placeholder={t('basicInfo.goalPlaceholder')}
                  disabled={isReadOnly}
                  className={errors.goal ? 'border-red-500 focus:border-red-500' : ''}
                />
                {errors.goal && <p className="text-xs text-red-600">{errors.goal}</p>}
                <p className="text-xs text-muted-foreground">{t('basicInfo.goalPlaceholder')}</p>
              </div>
            </>
          )}

          {/* Provider Selector para agentes External */}
          {data.type === 'external' && (
            <ProviderSelector
              value={data.provider as any}
              onChange={(provider) => handleInputChange('provider', provider)}
              disabled={isReadOnly}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BasicInfoForm;
