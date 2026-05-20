import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@evoapi/design-system';
import { Plus, X, ArrowRight } from 'lucide-react';
import { useState, useEffect } from 'react';
import { VariableSelect } from './VariableSelect';
import { useLanguage } from '@/hooks/useLanguage';

export interface DataMapping {
  id: string;
  sourcePath: string;
  variableName: string;
  transform?: 'none' | 'uppercase' | 'lowercase' | 'date' | 'number';
}

interface VariableMappingProps {
  mappings: DataMapping[];
  onMappingsChange: (mappings: DataMapping[]) => void;
  paths?: string[];
  className?: string;
  journeyId?: string;
}

const getTransformOptions = (t: any) => [
  { value: 'none', label: t('environmentManager.form.fields.type.text') },
  { value: 'uppercase', label: t('environmentManager.form.fields.type.uppercase') },
  { value: 'lowercase', label: t('environmentManager.form.fields.type.lowercase') },
  { value: 'date', label: t('environmentManager.form.fields.type.date') },
  { value: 'number', label: t('environmentManager.form.fields.type.number') },
];

export function VariableMapping({
  mappings,
  onMappingsChange,
  paths,
  className = '',
  journeyId,
}: VariableMappingProps) {
  const { t } = useLanguage('journey');
  const [showCustomInput, setShowCustomInput] = useState<Record<string, boolean>>({});
  const TRANSFORM_OPTIONS = getTransformOptions(t);

  // Verificar se algum mapping tem um sourcePath que não está na lista de paths
  useEffect(() => {
    const customInputs: Record<string, boolean> = {};

    mappings.forEach(mapping => {
      if (mapping.sourcePath && mapping.sourcePath !== '' && mapping.sourcePath !== '__custom__') {
        // Se não há paths ou se o sourcePath não está na lista de paths
        if (!paths || paths.length === 0 || !paths.includes(mapping.sourcePath)) {
          customInputs[mapping.id] = true;
        }
      }
    });

    setShowCustomInput(customInputs);
  }, [mappings, paths]);

  const addMapping = () => {
    const newMapping: DataMapping = {
      id: Date.now().toString(),
      sourcePath: '',
      variableName: '',
      transform: 'none',
    };
    onMappingsChange([...mappings, newMapping]);
  };

  const updateMapping = (id: string, field: keyof DataMapping, value: string) => {
    const updatedMappings = mappings.map(mapping =>
      mapping.id === id ? { ...mapping, [field]: value } : mapping,
    );
    onMappingsChange(updatedMappings);
  };

  const removeMapping = (id: string) => {
    onMappingsChange(mappings.filter(mapping => mapping.id !== id));
  };

  const validMappings = mappings.filter(m => m.sourcePath && m.variableName);

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-sm font-medium">{t('environmentManager.title')}</Label>
          <p className="text-xs text-gray-500 mt-1">{t('environmentManager.description')}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addMapping}
          className="flex items-center gap-1"
        >
          <Plus className="w-4 h-4" />
          {t('environmentManager.customVariables.actions.new')}
        </Button>
      </div>

      {/* Mostrar mapeamentos configurados em formato compacto */}
      {validMappings.length > 0 && (
        <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/30 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <ArrowRight className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
              {t('environmentManager.customVariables.empty.count', { count: validMappings.length })}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {validMappings.map(mapping => (
              <div
                key={mapping.id}
                className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 rounded text-xs max-w-full"
              >
                <code className="font-mono text-blue-700 dark:text-blue-300 truncate max-w-[150px]">
                  {mapping.sourcePath}
                </code>
                <ArrowRight className="w-3 h-3 text-blue-500 flex-shrink-0" />
                <span className="font-medium text-blue-800 dark:text-blue-200 truncate max-w-[120px]">
                  ${mapping.variableName}
                </span>
                {mapping.transform && mapping.transform !== 'none' && (
                  <span className="text-blue-600 dark:text-blue-400 flex-shrink-0">
                    ({mapping.transform})
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {mappings.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
          <p className="text-sm text-gray-500">
            {t('environmentManager.customVariables.empty.title')}
          </p>
          <Button
            type="button"
            variant="ghost"
            onClick={addMapping}
            className="mt-2 text-blue-600 hover:text-blue-700"
          >
            <Plus className="w-4 h-4 mr-1" />
            {t('environmentManager.customVariables.actions.new')}
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {mappings.map(mapping => (
            <div
              key={mapping.id}
              className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50"
            >
              <div className="flex items-end gap-2">
                {/* Caminho de origem */}
                <div className="flex-1 space-y-1">
                  <Label className="text-xs text-gray-600 font-medium">
                    {t('environmentManager.form.fields.description.label')}
                  </Label>
                  {paths && paths.length > 0 ? (
                    <Select
                      value={
                        showCustomInput[mapping.id]
                          ? '__custom__'
                          : paths.includes(mapping.sourcePath || '')
                          ? mapping.sourcePath
                          : '__custom__'
                      }
                      onValueChange={value => {
                        if (value === '__custom__') {
                          setShowCustomInput(prev => ({ ...prev, [mapping.id]: true }));
                        } else {
                          setShowCustomInput(prev => ({ ...prev, [mapping.id]: false }));
                          updateMapping(mapping.id, 'sourcePath', value);
                        }
                      }}
                    >
                      <SelectTrigger className="bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 h-8 w-full">
                        <SelectValue placeholder={t('environmentManager.searchPlaceholder')} />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 max-h-[200px]">
                        {paths.map(path => (
                          <SelectItem
                            key={path}
                            value={path}
                            className="text-gray-900 dark:text-gray-100"
                          >
                            <span className="font-mono text-xs">{path}</span>
                          </SelectItem>
                        ))}
                        <SelectItem value="__custom__" className="text-blue-600">
                          <div className="flex items-center gap-2">
                            <Plus className="w-3 h-3" />
                            <span className="text-xs">
                              {t('environmentManager.customVariables.actions.new')}
                            </span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      placeholder={t('environmentManager.form.fields.name.placeholder')}
                      value={mapping.sourcePath || ''}
                      onChange={e => updateMapping(mapping.id, 'sourcePath', e.target.value)}
                      className="bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 font-mono text-xs h-8"
                    />
                  )}
                </div>

                {/* Input para caminho personalizado quando selecionado */}
                {showCustomInput[mapping.id] && (
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs text-gray-600 font-medium">
                      {t('environmentManager.form.fields.name.help')}
                    </Label>
                    <Input
                      placeholder={t('environmentManager.form.fields.name.placeholder')}
                      value={mapping.sourcePath || ''}
                      onChange={e => {
                        updateMapping(mapping.id, 'sourcePath', e.target.value);
                      }}
                      onBlur={e => {
                        if (!e.target.value.trim()) {
                          setShowCustomInput(prev => ({ ...prev, [mapping.id]: false }));
                          updateMapping(mapping.id, 'sourcePath', '');
                        }
                      }}
                      className="bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 font-mono text-xs h-8"
                      autoFocus
                    />
                  </div>
                )}

                {/* Seta visual */}
                <div className="pb-2">
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                </div>

                {/* Variável destino */}
                <div className="flex-1 space-y-1">
                  <Label className="text-xs text-gray-600 font-medium">
                    {t('environmentManager.form.fields.name.label')}
                  </Label>
                  <VariableSelect
                    value={mapping.variableName}
                    onValueChange={value => updateMapping(mapping.id, 'variableName', value)}
                    journeyId={journeyId}
                    placeholder={t('environmentManager.searchPlaceholder')}
                    showCreateOption={true}
                    showSystemVariables={false}
                    className="bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 h-8 text-xs w-full"
                  />
                </div>

                {/* Transformação */}
                <div className="w-24 space-y-1">
                  <Label className="text-xs text-gray-600 font-medium">
                    {t('environmentManager.form.fields.type.label')}
                  </Label>
                  <Select
                    value={mapping.transform || 'none'}
                    onValueChange={value => updateMapping(mapping.id, 'transform', value)}
                  >
                    <SelectTrigger className="bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 h-8 w-full">
                      <SelectValue>
                        {mapping.transform && (
                          <span
                            className="truncate max-w-full"
                            title={
                              TRANSFORM_OPTIONS.find(o => o.value === mapping.transform)?.label
                            }
                          >
                            {TRANSFORM_OPTIONS.find(o => o.value === mapping.transform)?.label ||
                              mapping.transform}
                          </span>
                        )}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600">
                      {TRANSFORM_OPTIONS.map(option => (
                        <SelectItem key={option.value} value={option.value} className="text-xs">
                          {option.value === 'none' ? 'None' : option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Botão remover */}
                <div className="pb-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeMapping(mapping.id)}
                    className="text-red-500 hover:text-red-600 hover:bg-red-50 h-8 w-8 p-0"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Informação adicional */}
      {mappings.length > 0 && (
        <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/30 p-3 rounded border border-dashed">
          <p>{t('environmentManager.footer.tip')}</p>
        </div>
      )}
    </div>
  );
}
