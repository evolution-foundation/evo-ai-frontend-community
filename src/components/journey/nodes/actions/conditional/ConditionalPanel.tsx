import { useState, useEffect } from 'react';
import {
  Button,
  Label,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Badge,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@evoapi/design-system';
import { GitBranch, Plus, Trash2, Copy } from 'lucide-react';
import { ConditionalNodeData, ConditionalPath, Condition } from './ConditionalNode';
import { BaseFlowPanel } from '@/components/base';
import { VariableInput, VariableSelect } from '@/components/journey/environment-manager';
import { v4 as uuidv4 } from 'uuid';
import { useLanguage } from '@/hooks/useLanguage';

interface ConditionalPanelProps {
  nodeId: string;
  data: ConditionalNodeData;
  onUpdate: (nodeId: string, newData: ConditionalNodeData) => void;
  onClose: () => void;
  journeyId: string;
}

// Operadores serão traduzidos dinamicamente no componente

// Campos de condição serão traduzidos dinamicamente no componente

// Cores dos caminhos serão traduzidas dinamicamente no componente

export function ConditionalPanel({
  nodeId,
  data,
  onUpdate,
  onClose,
  journeyId,
}: ConditionalPanelProps) {
  const { t } = useLanguage('journey');
  const [formData, setFormData] = useState<ConditionalNodeData>({
    ...data,
    paths: data.paths || [],
  });

  // Constantes traduzidas dinamicamente
  const OPERATORS = [
    { value: 'equals', label: t('panels.conditional.operators.equals') },
    { value: 'not_equals', label: t('panels.conditional.operators.notEquals') },
    { value: 'greater_than', label: t('panels.conditional.operators.greaterThan') },
    { value: 'less_than', label: t('panels.conditional.operators.lessThan') },
    { value: 'contains', label: t('panels.conditional.operators.contains') },
    { value: 'not_contains', label: t('panels.conditional.operators.notContains') },
    { value: 'starts_with', label: t('panels.conditional.operators.startsWith') },
    { value: 'ends_with', label: t('panels.conditional.operators.endsWith') },
    { value: 'is_empty', label: t('panels.conditional.operators.isEmpty') },
    { value: 'is_not_empty', label: t('panels.conditional.operators.isNotEmpty') },
  ];

  const PATH_COLORS = [
    { value: 'green', label: t('panels.conditional.colors.green'), hex: '#10b981' },
    { value: 'blue', label: t('panels.conditional.colors.blue'), hex: '#3b82f6' },
    { value: 'purple', label: t('panels.conditional.colors.purple'), hex: '#8b5cf6' },
    { value: 'orange', label: t('panels.conditional.colors.orange'), hex: '#f97316' },
    { value: 'yellow', label: t('panels.conditional.colors.yellow'), hex: '#eab308' },
  ];

  const [activePathId, setActivePathId] = useState<string>('');

  useEffect(() => {
    setFormData({
      ...data,
      paths: data.paths || [],
    });

    // Set first path as active if exists
    if (data.paths && data.paths.length > 0) {
      setActivePathId(data.paths[0].id);
    }
  }, [data]);

  const handleSave = () => {
    onUpdate(nodeId, formData);
    onClose();
  };

  const addPath = () => {
    const newPath: ConditionalPath = {
      id: uuidv4(),
      name: t('panels.conditional.pathNumber', { number: formData.paths.length + 1 }),
      color: PATH_COLORS[formData.paths.length % PATH_COLORS.length].value,
      logicalOperator: 'AND',
      conditions: [],
    };

    setFormData(prev => ({
      ...prev,
      paths: [...prev.paths, newPath],
    }));

    setActivePathId(newPath.id);
  };

  const updatePath = (pathId: string, updates: Partial<ConditionalPath>) => {
    setFormData(prev => ({
      ...prev,
      paths: prev.paths.map(path => (path.id === pathId ? { ...path, ...updates } : path)),
    }));
  };

  const removePath = (pathId: string) => {
    setFormData(prev => ({
      ...prev,
      paths: prev.paths.filter(path => path.id !== pathId),
    }));

    // Set a new active path if we deleted the current one
    if (activePathId === pathId && formData.paths.length > 1) {
      const remainingPaths = formData.paths.filter(p => p.id !== pathId);
      if (remainingPaths.length > 0) {
        setActivePathId(remainingPaths[0].id);
      }
    }
  };

  const duplicatePath = (pathId: string) => {
    const pathToDuplicate = formData.paths.find(p => p.id === pathId);
    if (pathToDuplicate) {
      const newPath: ConditionalPath = {
        ...pathToDuplicate,
        id: uuidv4(),
        name: `${pathToDuplicate.name} (${t('actions.duplicate')})`,
        conditions: pathToDuplicate.conditions.map(c => ({
          ...c,
          id: uuidv4(),
        })),
      };

      setFormData(prev => ({
        ...prev,
        paths: [...prev.paths, newPath],
      }));

      setActivePathId(newPath.id);
    }
  };

  const addCondition = (pathId: string, type: 'trigger' | 'contact' | 'system' | 'custom') => {
    const path = formData.paths.find(p => p.id === pathId);
    if (!path) return;

    const newCondition: Condition = {
      id: uuidv4(),
      type,
      field: '',
      operator: 'equals',
      value: '',
    };

    updatePath(pathId, {
      conditions: [...path.conditions, newCondition],
    });
  };

  const updateCondition = (pathId: string, conditionId: string, updates: Partial<Condition>) => {
    const path = formData.paths.find(p => p.id === pathId);
    if (!path) return;

    updatePath(pathId, {
      conditions: path.conditions.map(condition =>
        condition.id === conditionId ? { ...condition, ...updates } : condition,
      ),
    });
  };

  const removeCondition = (pathId: string, conditionId: string) => {
    const path = formData.paths.find(p => p.id === pathId);
    if (!path) return;

    updatePath(pathId, {
      conditions: path.conditions.filter(c => c.id !== conditionId),
    });
  };

  const needsValue = (operator: string) => {
    return !['is_empty', 'is_not_empty'].includes(operator);
  };

  const renderCondition = (pathId: string, condition: Condition, index: number) => {
    const path = formData.paths.find(p => p.id === pathId);
    if (!path) return null;

    return (
      <div
        key={condition.id}
        className="p-3 rounded-lg bg-sidebar-accent/10 border border-sidebar-border/30 space-y-3"
      >
        {/* Operador lógico entre condições */}
        {index > 0 && (
          <div className="flex items-center gap-2 pb-2 border-b border-sidebar-border/30">
            <Badge variant="outline" className="text-xs">
              {path.logicalOperator === 'AND'
                ? t('panels.conditional.logicalOperators.and')
                : t('panels.conditional.logicalOperators.or')}
            </Badge>
          </div>
        )}

        <div className="grid grid-cols-12 gap-2 items-end">
          {/* Campo */}
          <div className="col-span-4">
            <Label className="text-xs">{t('panels.conditional.field')}</Label>
            <VariableSelect
              value={condition.field || ''}
              onValueChange={value => updateCondition(pathId, condition.id, { field: value })}
              placeholder="Selecionar variável..."
              journeyId={journeyId}
              className="w-full"
              showSystemVariables={true}
            />
          </div>

          {/* Operador */}
          <div className="col-span-3">
            <Label className="text-xs">{t('panels.conditional.operator')}</Label>
            <Select
              value={condition.operator}
              onValueChange={value => updateCondition(pathId, condition.id, { operator: value })}
            >
              <SelectTrigger className="bg-sidebar border-sidebar-border text-sidebar-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-sidebar border-sidebar-border">
                {OPERATORS.map(option => (
                  <SelectItem
                    key={option.value}
                    value={option.value}
                    className="text-sidebar-foreground"
                  >
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Valor */}
          <div className="col-span-4">
            <Label className="text-xs">{t('panels.conditional.value')}</Label>
            {needsValue(condition.operator) ? (
              <VariableInput
                value={condition.value || ''}
                onChange={e => updateCondition(pathId, condition.id, { value: e.target.value })}
                placeholder={t('panels.conditional.value')}
                className="bg-sidebar border-sidebar-border text-sidebar-foreground"
                journeyId={journeyId}
                onVariableInsert={variable => {
                  console.log('Variable inserted in condition:', variable);
                }}
              />
            ) : (
              <div className="h-10 flex items-center text-xs text-gray-500 italic px-3">
                {t('panels.conditional.notNecessary')}
              </div>
            )}
          </div>

          {/* Botão remover */}
          <div className="col-span-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => removeCondition(pathId, condition.id)}
              className="h-10 w-10 p-0 text-red-500 hover:text-red-700"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const renderPath = (path: ConditionalPath) => {
    const pathColor = PATH_COLORS.find(c => c.value === path.color) || PATH_COLORS[0];

    return (
      <div className="space-y-4">
        {/* Header do Caminho */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: pathColor.hex }} />
            <Input
              value={path.name}
              onChange={e => updatePath(path.id, { name: e.target.value })}
              placeholder={t('panels.conditional.pathName')}
              className="w-48 bg-sidebar border-sidebar-border text-sidebar-foreground"
            />
            <Select
              value={path.color}
              onValueChange={value => updatePath(path.id, { color: value })}
            >
              <SelectTrigger className="w-32 bg-sidebar border-sidebar-border text-sidebar-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-sidebar border-sidebar-border">
                {PATH_COLORS.map(color => (
                  <SelectItem
                    key={color.value}
                    value={color.value}
                    className="text-sidebar-foreground"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: color.hex }}
                      />
                      {color.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => duplicatePath(path.id)}
              className="h-8 w-8 p-0"
            >
              <Copy className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => removePath(path.id)}
              className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Operador Lógico do Caminho */}
        <div className="flex items-center gap-2">
          <Label className="text-sm">
            {t('panels.conditional.logicalOperatorBetweenConditions')}
          </Label>
          <Select
            value={path.logicalOperator}
            onValueChange={(value: 'AND' | 'OR') => updatePath(path.id, { logicalOperator: value })}
          >
            <SelectTrigger className="w-32 bg-sidebar border-sidebar-border text-sidebar-foreground">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-sidebar border-sidebar-border">
              <SelectItem value="AND" className="text-sidebar-foreground">
                {t('panels.conditional.andAll')}
              </SelectItem>
              <SelectItem value="OR" className="text-sidebar-foreground">
                {t('panels.conditional.orAny')}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Botões para adicionar condições */}
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => addCondition(path.id, 'trigger')}>
            <Plus className="w-4 h-4 mr-1" />
            {t('panels.conditional.trigger')}
          </Button>
          <Button variant="outline" size="sm" onClick={() => addCondition(path.id, 'contact')}>
            <Plus className="w-4 h-4 mr-1" />
            {t('panels.conditional.contact')}
          </Button>
          <Button variant="outline" size="sm" onClick={() => addCondition(path.id, 'system')}>
            <Plus className="w-4 h-4 mr-1" />
            {t('panels.conditional.system')}
          </Button>
          <Button variant="outline" size="sm" onClick={() => addCondition(path.id, 'custom')}>
            <Plus className="w-4 h-4 mr-1" />
            {t('panels.conditional.customVariable')}
          </Button>
        </div>

        {/* Lista de Condições */}
        <div className="space-y-3">
          {path.conditions.length > 0 ? (
            path.conditions.map((condition, index) => renderCondition(path.id, condition, index))
          ) : (
            <div className="p-4 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 dark:bg-gray-950/20 text-center">
              <p className="text-gray-500 text-sm">{t('panels.conditional.noConditionsAdded')}</p>
              <p className="text-xs text-gray-400 mt-1">
                {t('panels.conditional.clickButtonsToAdd')}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <BaseFlowPanel
      title={t('panels.conditional.title')}
      icon={<GitBranch className="w-5 h-5 text-yellow-500" />}
      onClose={onClose}
      width="w-[800px]"
    >
      <Separator />

      <div className="space-y-4">
        {/* Gerenciamento de Caminhos */}
        <div className="flex items-center justify-between">
          <Label className="text-sidebar-foreground font-medium">
            {t('panels.conditional.pathsTitle')}
          </Label>
          <Button variant="outline" size="sm" onClick={addPath}>
            <Plus className="w-4 h-4 mr-1" />
            {t('panels.conditional.addPath')}
          </Button>
        </div>

        {formData.paths.length > 0 ? (
          <>
            {/* Tabs para navegar entre caminhos */}
            <Tabs value={activePathId} onValueChange={setActivePathId}>
              <TabsList
                className="grid w-full"
                style={{
                  gridTemplateColumns: `repeat(${Math.min(formData.paths.length, 4)}, 1fr)`,
                }}
              >
                {formData.paths.map(path => {
                  const color = PATH_COLORS.find(c => c.value === path.color) || PATH_COLORS[0];
                  return (
                    <TabsTrigger key={path.id} value={path.id} className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: color.hex }}
                      />
                      <span className="truncate">{path.name}</span>
                    </TabsTrigger>
                  );
                })}
              </TabsList>

              {formData.paths.map(path => (
                <TabsContent key={path.id} value={path.id} className="mt-4">
                  {renderPath(path)}
                </TabsContent>
              ))}
            </Tabs>

            {/* Resumo */}
            <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/30">
              <Label className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2 block">
                {t('panels.conditional.summary.title')}
              </Label>
              <div className="space-y-2">
                {formData.paths.map(path => {
                  const color = PATH_COLORS.find(c => c.value === path.color) || PATH_COLORS[0];
                  return (
                    <div key={path.id} className="text-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: color.hex }}
                        />
                        <span className="font-medium text-blue-700 dark:text-blue-300">
                          {path.name}:
                        </span>
                      </div>
                      {path.conditions.length > 0 ? (
                        <div className="ml-4 text-xs text-blue-600 dark:text-blue-400">
                          {t('panels.conditional.summary.conditionsCount', {
                            count: path.conditions.length,
                            operator: path.logicalOperator,
                          })}
                        </div>
                      ) : (
                        <div className="ml-4 text-xs text-gray-500">
                          {t('panels.conditional.summary.noConditionsConfigured')}
                        </div>
                      )}
                    </div>
                  );
                })}
                <div className="text-sm mt-2 pt-2 border-t border-blue-200 dark:border-blue-700">
                  <span className="text-red-600 dark:text-red-400 font-medium">
                    {t('panels.conditional.otherwiseCase')}:
                  </span>
                  <span className="text-xs text-gray-600 dark:text-gray-400 ml-2">
                    {t('panels.conditional.summary.otherwiseAlwaysAvailable')}
                  </span>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="p-6 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 dark:bg-gray-950/20 text-center">
            <GitBranch className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-500">{t('panels.conditional.emptyState.noPathsConfigured')}</p>
            <p className="text-xs text-gray-400 mt-1">
              {t('panels.conditional.emptyState.clickToCreateFirst')}
            </p>
          </div>
        )}
      </div>

      {/* Botões de ação */}
      <div className="flex gap-3 pt-2">
        <Button variant="outline" onClick={onClose} className="flex-1 h-10">
          {t('actions.cancel')}
        </Button>
        <Button onClick={handleSave} className="flex-1 h-10">
          {t('actions.save')}
        </Button>
      </div>
    </BaseFlowPanel>
  );
}
