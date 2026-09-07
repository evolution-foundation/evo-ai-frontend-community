import { useTranslation as useUiTranslation } from 'react-i18next';
import { useState, useCallback, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
  Badge,
  Input,
  Label,
  ScrollArea,
  Textarea,
  Switch,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@evoapi/design-system';
import { Search, Wrench, Loader2, AlertTriangle, Settings, ArrowRight } from 'lucide-react';
import { listTools, listToolCategories } from '@/services/agents';
import type { Tool, ToolCategory } from '@/types/ai';
import { isValidUUID } from '@/utils/agentUtils';
import { useLanguage } from '@/hooks/useLanguage';

// Extensão do tipo Tool para incluir configuração
type ConfiguredTool = Tool & {
  config: Tool['config'] & {
    configured_values?: Record<string, string | number | boolean>;
  };
};

interface ToolsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectTools: (tools: Tool[]) => void;
  editingTool?: Tool | null;
}

const ToolsDialog = ({ open, onOpenChange, onSelectTools, editingTool }: ToolsDialogProps) => {
  const { t: tUi } = useUiTranslation();
  const { t } = useLanguage('aiAgents');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [availableTools, setAvailableTools] = useState<Tool[]>([]);
  const [toolCategories, setToolCategories] = useState<ToolCategory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('');

  // Estados para configuração inline
  const [selectedToolForConfig, setSelectedToolForConfig] = useState<Tool | null>(null);
  const [toolConfig, setToolConfig] = useState<Record<string, string | number | boolean>>({});
  const [configErrors, setConfigErrors] = useState<Record<string, string>>({});
  const [configuredTools, setConfiguredTools] = useState<ConfiguredTool[]>([]);

  const loadToolsData = useCallback(async (search?: string, category?: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const toolsParams: { search?: string; category?: string } = {};
      if (search) toolsParams.search = search;
      if (category) toolsParams.category = category;

      const [toolsResponse, categoriesResponse] = await Promise.all([
        listTools(toolsParams),
        listToolCategories(),
      ]);

      setAvailableTools(toolsResponse.tools || []);
      setToolCategories(categoriesResponse || []);
    } catch (err) {
      console.error('Error loading tools:', err);
      setError(t('messages.loadingTools'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Carregar ferramentas do backend quando o modal abrir
  useEffect(() => {
    if (open) {
      if (editingTool) {
        // Modo edição: configurar ferramenta diretamente
        setSelectedToolForConfig(editingTool);
        setConfiguredTools([]);

        // Inicializar configuração com valores atuais da ferramenta ou valores padrão
        const configuredTool = editingTool as ConfiguredTool;
        const currentConfig = configuredTool.config?.configured_values || {};
        const defaultConfig = editingTool.config.default_values || {};
        const initialConfig = { ...defaultConfig, ...currentConfig };

        setToolConfig(initialConfig as Record<string, string | number | boolean>);
        setConfigErrors({});
      } else {
        setConfiguredTools([]);
        setSelectedToolForConfig(null);
        loadToolsData(searchTerm, selectedCategoryFilter);
      }
    }
  }, [open, editingTool, loadToolsData, searchTerm, selectedCategoryFilter]);

  // Filtrar ferramentas baseado no termo de busca e categoria
  const filteredTools = availableTools.filter(tool => {
    const matchesSearch =
      !searchTerm ||
      tool.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tool.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (Array.isArray(tool.tags) &&
        tool.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())));

    const matchesCategory =
      !selectedCategoryFilter ||
      toolCategories.find(cat => cat.id === selectedCategoryFilter)?.tools.includes(tool.id);

    return matchesSearch && matchesCategory;
  });

  // Agrupar por categoria usando as categorias do backend
  const groupedTools = filteredTools.reduce((acc, tool) => {
    // Encontrar a categoria do tool
    const toolCategory = toolCategories.find(cat => cat.tools.includes(tool.id));
    const categoryName = toolCategory ? toolCategory.name : tUi("interface:toolsdialog.other");

    if (!acc[categoryName]) {
      acc[categoryName] = [];
    }
    acc[categoryName].push(tool);
    return acc;
  }, {} as Record<string, Tool[]>);

  // Handler para abrir configuração inline de uma ferramenta
  const handleConfigureTool = useCallback((tool: Tool) => {
    setSelectedToolForConfig(tool);

    // Inicializar configuração com valores padrão
    const initialConfig = { ...tool.config.default_values };

    // Adicionar campos obrigatórios vazios se não existirem
    const requiredFields = Array.isArray(tool.config.required_fields)
      ? tool.config.required_fields
      : [];
    requiredFields.forEach(field => {
      if (!(field in initialConfig)) {
        const fieldType = tool.config.field_types?.[field];
        const type = typeof fieldType === 'string' ? fieldType : fieldType?.type || 'string';

        switch (type.toLowerCase()) {
          case 'boolean':
            initialConfig[field] = false;
            break;
          case 'number':
          case 'float':
            initialConfig[field] = 0;
            break;
          default:
            initialConfig[field] = '';
        }
      }
    });

    setToolConfig(initialConfig as Record<string, string | number | boolean>);
    setConfigErrors({});
  }, []);

  // Handler para atualizar campo de configuração
  const handleConfigChange = useCallback(
    (field: string, value: string | number | boolean) => {
      setToolConfig(prev => ({
        ...prev,
        [field]: value,
      }));

      // Limpar erro do campo se houver
      if (configErrors[field]) {
        setConfigErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[field];
          return newErrors;
        });
      }
    },
    [configErrors],
  );

  // Handler para remover uma ferramenta configurada
  const handleRemoveConfiguredTool = useCallback((toolId: string) => {
    setConfiguredTools(prev => prev.filter(tool => tool.id !== toolId));
  }, []);

  const handleSave = useCallback(() => {
    // Se estamos configurando uma ferramenta (modo configuração)
    if (selectedToolForConfig || editingTool) {
      const currentTool = selectedToolForConfig || editingTool;
      if (!currentTool) return;

      // Validar campos obrigatórios
      const errors: Record<string, string> = {};
      const requiredFields = Array.isArray(currentTool.config.required_fields)
        ? currentTool.config.required_fields
        : [];
      requiredFields.forEach(field => {
        const value = toolConfig[field];

        if (!value || value === '') {
          errors[field] = t('validation.required');
        } else if (field === 'api_key_id' && typeof value === 'string' && !isValidUUID(value)) {
          errors[field] = t('validation.invalidApiKey');
        }
      });

      if (Object.keys(errors).length > 0) {
        setConfigErrors(errors);
        return;
      }

      if (editingTool) {
        // Modo edição: retornar ferramenta editada e fechar modal
        const editedTool: ConfiguredTool = {
          ...currentTool,
          config: {
            ...currentTool.config,
            configured_values: toolConfig,
          },
        };
        onSelectTools([editedTool]);
        onOpenChange(false);
      } else {
        // Modo normal: adicionar à lista de configuradas e voltar para lista
        const configuredTool: ConfiguredTool = {
          ...currentTool,
          config: {
            ...currentTool.config,
            configured_values: toolConfig,
          },
        };
        setConfiguredTools(prev => [...prev, configuredTool]);
        setSelectedToolForConfig(null);
        setToolConfig({});
        setConfigErrors({});
      }
    } else {
      // Modo lista: retornar ferramentas configuradas
      onSelectTools(configuredTools);
      onOpenChange(false);
    }
  }, [
    configuredTools,
    onSelectTools,
    onOpenChange,
    editingTool,
    selectedToolForConfig,
    toolConfig,
  ]);

  const handleCancel = useCallback(() => {
    if (selectedToolForConfig && !editingTool) {
      // Se estamos configurando uma ferramenta no modo normal, voltar para lista
      setSelectedToolForConfig(null);
      setToolConfig({});
      setConfigErrors({});
    } else {
      // Se estamos editando ou no modo lista, fechar modal
      setConfiguredTools([]);
      onOpenChange(false);
    }
  }, [selectedToolForConfig, editingTool, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {selectedToolForConfig || editingTool
              ? t('dialogs.toolsDialog.configureTool', {
                  name: (selectedToolForConfig || editingTool)?.name,
                })
              : t('dialogs.toolsDialog.title')}
          </DialogTitle>
          <DialogDescription>
            {selectedToolForConfig || editingTool
              ? t('dialogs.toolsDialog.configureDescription', {
                  name: (selectedToolForConfig || editingTool)?.name,
                })
              : t('tools.customTools.description')}
          </DialogDescription>
        </DialogHeader>

        {/* Modal completamente dedicado à configuração quando há ferramenta selecionada */}
        {selectedToolForConfig || editingTool ? (
          <div className="flex flex-col gap-4 flex-1 min-h-0">
            {/* Informações da ferramenta */}
            <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-lg border">
              <Wrench className="h-6 w-6 text-emerald-500" />
              <div className="flex-1">
                <h3 className="font-medium text-foreground">
                  {(selectedToolForConfig || editingTool)?.name}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {(selectedToolForConfig || editingTool)?.description}
                </p>
                {/* Tags da ferramenta */}
                {Array.isArray((selectedToolForConfig || editingTool)?.tags) && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {(selectedToolForConfig || editingTool)?.tags.map(tag => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Campos de configuração */}
            <ScrollArea className="flex-1 min-h-0">
              <div className="space-y-6 pr-4">
                {/* Campos obrigatórios */}
                {((selectedToolForConfig || editingTool)?.config.required_fields?.length || 0) >
                  0 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                      <h4 className="text-base font-semibold text-destructive">
                        {t('dialogs.toolsDialog.requiredFields')}
                      </h4>
                    </div>
                    <div className="space-y-4">
                      {((selectedToolForConfig || editingTool)?.config.required_fields || []).map(
                        field => {
                          const tool = selectedToolForConfig || editingTool;
                          const fieldType = tool?.config.field_types?.[field];
                          const type =
                            typeof fieldType === 'string' ? fieldType : fieldType?.type || 'string';
                          const options =
                            typeof fieldType === 'object' ? fieldType.enum : undefined;
                          const description =
                            typeof fieldType === 'object' ? fieldType.description : undefined;
                          const hasError = !!configErrors[field];
                          const value = toolConfig[field] || '';

                          return (
                            <div key={field} className="space-y-2">
                              <Label className="text-sm font-medium">
                                {field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                <span className="text-destructive ml-1">*</span>
                                {description && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {description}
                                  </p>
                                )}
                              </Label>

                              {options && options.length > 0 ? (
                                <Select
                                  value={String(value)}
                                  onValueChange={val => handleConfigChange(field, val)}
                                >
                                  <SelectTrigger className={hasError ? 'border-destructive' : ''}>
                                    <SelectValue
                                      placeholder={t('dialogs.toolsDialog.selectField', {
                                        field: field.replace(/_/g, ' '),
                                      })}
                                    />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {options.map(option => (
                                      <SelectItem key={option} value={option}>
                                        {option}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : type === 'boolean' ? (
                                <div className="flex items-center space-x-2">
                                  <Switch
                                    checked={!!value}
                                    onCheckedChange={checked => handleConfigChange(field, checked)}
                                  />
                                  <Label className="text-sm">
                                    {value
                                      ? t('dialogs.toolsDialog.enabled')
                                      : t('dialogs.toolsDialog.disabled')}
                                  </Label>
                                </div>
                              ) : type === 'textarea' ? (
                                <Textarea
                                  value={String(value)}
                                  onChange={e => handleConfigChange(field, e.target.value)}
                                  placeholder={t('dialogs.toolsDialog.enterField', {
                                    field: field.replace(/_/g, ' '),
                                  })}
                                  className={hasError ? 'border-destructive' : ''}
                                  rows={3}
                                />
                              ) : (
                                <Input
                                  type={type === 'number' ? 'number' : 'text'}
                                  value={String(value)}
                                  onChange={e =>
                                    handleConfigChange(
                                      field,
                                      type === 'number' ? Number(e.target.value) : e.target.value,
                                    )
                                  }
                                  placeholder={t('dialogs.toolsDialog.enterField', {
                                    field: field.replace(/_/g, ' '),
                                  })}
                                  className={hasError ? 'border-destructive' : ''}
                                />
                              )}

                              {hasError && (
                                <div className="flex items-center gap-1 text-destructive text-xs">
                                  <AlertTriangle className="h-3 w-3" />
                                  {configErrors[field]}
                                </div>
                              )}
                            </div>
                          );
                        },
                      )}
                    </div>
                  </div>
                )}

                {/* Campos opcionais */}
                {((selectedToolForConfig || editingTool)?.config.optional_fields?.length || 0) >
                  0 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Settings className="h-5 w-5 text-muted-foreground" />
                      <h4 className="text-base font-semibold text-muted-foreground">
                        {t('dialogs.toolsDialog.optionalFields')}
                      </h4>
                    </div>
                    <div className="space-y-4">
                      {((selectedToolForConfig || editingTool)?.config.optional_fields || []).map(
                        field => {
                          const tool = selectedToolForConfig || editingTool;
                          const fieldType = tool?.config.field_types?.[field];
                          const type =
                            typeof fieldType === 'string' ? fieldType : fieldType?.type || 'string';
                          const options =
                            typeof fieldType === 'object' ? fieldType.enum : undefined;
                          const description =
                            typeof fieldType === 'object' ? fieldType.description : undefined;
                          const value = toolConfig[field] || '';

                          return (
                            <div key={field} className="space-y-2">
                              <Label className="text-sm font-medium">
                                {field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                {description && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {description}
                                  </p>
                                )}
                              </Label>

                              {options && options.length > 0 ? (
                                <Select
                                  value={String(value)}
                                  onValueChange={val => handleConfigChange(field, val)}
                                >
                                  <SelectTrigger>
                                    <SelectValue
                                      placeholder={t('dialogs.toolsDialog.selectField', {
                                        field: field.replace(/_/g, ' '),
                                      })}
                                    />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {options.map(option => (
                                      <SelectItem key={option} value={option}>
                                        {option}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : type === 'boolean' ? (
                                <div className="flex items-center space-x-2">
                                  <Switch
                                    checked={!!value}
                                    onCheckedChange={checked => handleConfigChange(field, checked)}
                                  />
                                  <Label className="text-sm">
                                    {value
                                      ? t('dialogs.toolsDialog.enabled')
                                      : t('dialogs.toolsDialog.disabled')}
                                  </Label>
                                </div>
                              ) : type === 'textarea' ? (
                                <Textarea
                                  value={String(value)}
                                  onChange={e => handleConfigChange(field, e.target.value)}
                                  placeholder={t('dialogs.toolsDialog.enterField', {
                                    field: field.replace(/_/g, ' '),
                                  })}
                                  rows={3}
                                />
                              ) : (
                                <Input
                                  type={type === 'number' ? 'number' : 'text'}
                                  value={String(value)}
                                  onChange={e =>
                                    handleConfigChange(
                                      field,
                                      type === 'number' ? Number(e.target.value) : e.target.value,
                                    )
                                  }
                                  placeholder={t('dialogs.toolsDialog.enterField', {
                                    field: field.replace(/_/g, ' '),
                                  })}
                                />
                              )}
                            </div>
                          );
                        },
                      )}
                    </div>
                  </div>
                )}

                {/* Botões de ação para configuração */}
                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button variant="outline" size="sm" onClick={handleCancel}>
                    {t('actions.cancel')}
                  </Button>
                  <Button size="sm" onClick={handleSave} className="flex items-center gap-1">
                    {editingTool
                      ? t('dialogs.toolsDialog.saveChanges')
                      : t('dialogs.toolsDialog.addTool')}
                  </Button>
                </div>
              </div>
            </ScrollArea>
          </div>
        ) : (
          /* Modal para seleção de ferramentas */
          <div className="flex flex-col gap-4 flex-1 min-h-0">
            {/* Ferramentas Configuradas */}
            {configuredTools.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-foreground">
                  {t('dialogs.toolsDialog.configuredTools', { count: configuredTools.length })}
                </Label>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {configuredTools.map(tool => (
                    <div
                      key={tool.id}
                      className="flex items-center justify-between p-2 bg-muted/30 border rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <Wrench className="h-4 w-4 text-emerald-500" />
                        <span className="font-medium text-sm">{tool.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {t('dialogs.toolsDialog.configured')}
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveConfiguredTool(tool.id)}
                        className="text-destructive hover:text-destructive/80 h-6 w-6 p-0"
                      >
                        ×
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Filtros */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Campo de busca */}
              <div className="space-y-2">
                <Label htmlFor="search">{t('dialogs.toolsDialog.searchTools')}</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    value={searchInput}
                    onChange={e => setSearchInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        setSearchTerm(searchInput);
                        loadToolsData(searchInput, selectedCategoryFilter);
                      }
                    }}
                    onBlur={() => {
                      setSearchTerm(searchInput);
                      loadToolsData(searchInput, selectedCategoryFilter);
                    }}
                    placeholder={t('dialogs.toolsDialog.searchPlaceholder')}
                    className="pl-10"
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Filtro de categoria */}
              <div className="space-y-2">
                <Label htmlFor="category-filter">{t('dialogs.toolsDialog.filterByCategory')}</Label>
                <Select
                  value={selectedCategoryFilter || undefined}
                  onValueChange={value => {
                    const newValue = value === 'clear' ? '' : value || '';
                    setSelectedCategoryFilter(newValue);
                    loadToolsData(searchTerm, newValue);
                  }}
                  disabled={isLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('dialogs.toolsDialog.allCategories')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="clear">{t('dialogs.toolsDialog.allCategories')}</SelectItem>
                    {toolCategories.map(category => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Estado de carregamento */}
            {isLoading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">{t('messages.loadingTools')}</span>
              </div>
            )}

            {/* Estado de erro */}
            {error && (
              <div className="flex items-center justify-center py-8 text-destructive">
                <AlertTriangle className="h-8 w-8 mr-2" />
                <div className="text-center">
                  <p className="font-medium">{error}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => loadToolsData()}
                    className="mt-2"
                  >
                    {t('dialogs.toolsDialog.tryAgain')}
                  </Button>
                </div>
              </div>
            )}

            {/* Lista de ferramentas */}
            {!isLoading && !error && (
              <ScrollArea className="flex-1 min-h-0">
                <div className="space-y-4 pr-4">
                  {Object.entries(groupedTools).map(([category, tools]) => {
                    const toolsArray = tools as Tool[];
                    return (
                      <div key={category} className="space-y-2">
                        <h3 className="text-sm font-semibold text-muted-foreground sticky top-0 bg-background py-1">
                          {category} ({toolsArray.length})
                        </h3>
                        <div className="space-y-2">
                          {toolsArray
                            .filter(
                              tool => !configuredTools.some(configured => configured.id === tool.id),
                            )
                            .map(tool => (
                            <div
                              key={tool.id}
                              className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                  <div className="flex items-center gap-2">
                                    <Wrench className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                                    <span className="font-medium">{tool.name}</span>
                                  </div>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleConfigureTool(tool)}
                                    className="ml-2 flex items-center gap-1"
                                  >
                                    <Settings className="h-3 w-3" />
                                    {t('actions.configure')}
                                    <ArrowRight className="h-3 w-3" />
                                  </Button>
                                </div>
                                <p className="text-sm text-muted-foreground mb-2">
                                  {tool.description}
                                </p>

                                {/* Mostrar examples se disponível */}
                                {Array.isArray(tool.examples) && tool.examples.length > 0 && (
                                  <div className="mb-2">
                                    <p className="text-xs font-medium text-muted-foreground mb-1">
                                      {t('dialogs.toolsDialog.examples')}:
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {tool.examples.slice(0, 2).join(', ')}
                                      {tool.examples.length > 2 && '...'}
                                    </p>
                                  </div>
                                )}

                                {/* Mostrar inputModes e outputModes se disponível */}
                                {((Array.isArray(tool.inputModes) && tool.inputModes.length > 0) ||
                                  (Array.isArray(tool.outputModes) &&
                                    tool.outputModes.length > 0)) && (
                                  <div className="mb-2 space-y-1">
                                    {Array.isArray(tool.inputModes) &&
                                      tool.inputModes.length > 0 && (
                                        <div className="flex items-center gap-1">
                                          <span className="text-xs font-medium text-muted-foreground">
                                            {t('dialogs.toolsDialog.input')}:
                                          </span>
                                          <div className="flex gap-1">
                                            {tool.inputModes.slice(0, 3).map(mode => (
                                              <Badge
                                                key={mode}
                                                variant="secondary"
                                                className="text-xs"
                                              >
                                                {mode}
                                              </Badge>
                                            ))}
                                            {tool.inputModes.length > 3 && (
                                              <span className="text-xs text-muted-foreground">
                                                +{tool.inputModes.length - 3}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      )}
                                    {Array.isArray(tool.outputModes) &&
                                      tool.outputModes.length > 0 && (
                                        <div className="flex items-center gap-1">
                                          <span className="text-xs font-medium text-muted-foreground">
                                            {t('dialogs.toolsDialog.output')}:
                                          </span>
                                          <div className="flex gap-1">
                                            {tool.outputModes.slice(0, 3).map((mode: string) => (
                                              <Badge
                                                key={mode}
                                                variant="secondary"
                                                className="text-xs"
                                              >
                                                {mode}
                                              </Badge>
                                            ))}
                                            {tool.outputModes.length > 3 && (
                                              <span className="text-xs text-muted-foreground">
                                                +{tool.outputModes.length - 3}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      )}
                                  </div>
                                )}

                                {/* Tags */}
                                {Array.isArray(tool.tags) && (
                                  <div className="flex flex-wrap gap-1">
                                    {tool.tags.map((tag: string) => (
                                      <Badge key={tag} variant="outline" className="text-xs">
                                        {tag}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
                  })}

                  {filteredTools.length === 0 && availableTools.length > 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Wrench className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="font-medium">{t('dialogs.toolsDialog.noToolsFound')}</p>
                      <p className="text-sm">{t('dialogs.toolsDialog.adjustFilters')}</p>
                    </div>
                  )}

                  {availableTools.length === 0 && !isLoading && !error && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Wrench className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="font-medium">{t('dialogs.toolsDialog.noToolsAvailable')}</p>
                      <p className="text-sm">{t('dialogs.toolsDialog.contactAdmin')}</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            )}
          </div>
        )}

        {/* Footer apenas para modo lista */}
        {!selectedToolForConfig && !editingTool && (
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={handleCancel}>
              {t('actions.cancel')}
            </Button>
            <Button onClick={handleSave} disabled={configuredTools.length === 0}>
              {t('dialogs.toolsDialog.addTools', { count: configuredTools.length })}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ToolsDialog;
