import { useState } from 'react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@evoapi/design-system';
import { Settings, Plus, Edit, Trash2, Copy, Search } from 'lucide-react';
import { useJourneyVariables } from '@/hooks/useJourneyVariables';
import { useLanguage } from '@/hooks/useLanguage';

export interface JourneyVariable {
  id: string;
  name: string;
  type: 'text' | 'number' | 'boolean' | 'date';
  defaultValue?: string;
  description?: string;
}

interface EnvironmentManagerProps {
  journeyId?: string;
}

export interface VariableOption {
  value: string;
  label: string;
  description?: string;
  category?: string;
}

export const getSystemVariables = (t: any): VariableOption[] => [
  // Contato
  {
    value: '{{contact.name}}',
    label: t('environmentManager.systemVariables.contact.name'),
    description: t('environmentManager.systemVariables.contact.nameDescription'),
    category: t('environmentManager.categories.contact'),
  },
  {
    value: '{{contact.email}}',
    label: t('environmentManager.systemVariables.contact.email'),
    description: t('environmentManager.systemVariables.contact.emailDescription'),
    category: t('environmentManager.categories.contact'),
  },
  {
    value: '{{contact.phone}}',
    label: t('environmentManager.systemVariables.contact.phone'),
    description: t('environmentManager.systemVariables.contact.phoneDescription'),
    category: t('environmentManager.categories.contact'),
  },
  {
    value: '{{contact.identifier}}',
    label: t('environmentManager.systemVariables.contact.identifier'),
    description: t('environmentManager.systemVariables.contact.identifierDescription'),
    category: t('environmentManager.categories.contact'),
  },

  // Evento
  {
    value: '{{event.name}}',
    label: t('environmentManager.systemVariables.event.name'),
    description: t('environmentManager.systemVariables.event.nameDescription'),
    category: t('environmentManager.categories.event'),
  },
  {
    value: '{{event.value}}',
    label: t('environmentManager.systemVariables.event.value'),
    description: t('environmentManager.systemVariables.event.valueDescription'),
    category: t('environmentManager.categories.event'),
  },
  {
    value: '{{event.timestamp}}',
    label: t('environmentManager.systemVariables.event.timestamp'),
    description: t('environmentManager.systemVariables.event.timestampDescription'),
    category: t('environmentManager.categories.event'),
  },

  // Webhook
  {
    value: '{{webhook.response}}',
    label: t('environmentManager.systemVariables.webhook.response'),
    description: t('environmentManager.systemVariables.webhook.responseDescription'),
    category: t('environmentManager.categories.webhook'),
  },
  {
    value: '{{webhook.status}}',
    label: t('environmentManager.systemVariables.webhook.status'),
    description: t('environmentManager.systemVariables.webhook.statusDescription'),
    category: t('environmentManager.categories.webhook'),
  },
  {
    value: '{{webhook.data}}',
    label: t('environmentManager.systemVariables.webhook.data'),
    description: t('environmentManager.systemVariables.webhook.dataDescription'),
    category: t('environmentManager.categories.webhook'),
  },

  // Jornada
  {
    value: '{{journey.start_date}}',
    label: t('environmentManager.systemVariables.journey.startDate'),
    description: t('environmentManager.systemVariables.journey.startDateDescription'),
    category: t('environmentManager.categories.journey'),
  },
  {
    value: '{{journey.current_step}}',
    label: t('environmentManager.systemVariables.journey.currentStep'),
    description: t('environmentManager.systemVariables.journey.currentStepDescription'),
    category: t('environmentManager.categories.journey'),
  },
];

export function EnvironmentManager({
  journeyId,
}: EnvironmentManagerProps) {
  const { t } = useLanguage('journey');
  const { variables, loading, error, addVariable, updateVariable, deleteVariable } =
    useJourneyVariables(journeyId);

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingVariable, setEditingVariable] = useState<JourneyVariable | null>(null);
  const [deletingVariable, setDeletingVariable] = useState<JourneyVariable | null>(null);
  const [newVariable, setNewVariable] = useState<Omit<JourneyVariable, 'id'>>({
    name: '',
    type: 'text',
    defaultValue: '',
    description: '',
  });

  const handleCreateVariable = async () => {
    if (!newVariable.name.trim()) {
      alert(t('environmentManager.form.fields.name.required'));
      return;
    }

    // Validar nome (sem espaços, apenas letras, números e underscore)
    if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(newVariable.name)) {
      alert(t('environmentManager.form.fields.name.invalid'));
      return;
    }

    // Verificar se já existe
    if (variables.some(v => v.name === newVariable.name)) {
      alert(t('environmentManager.form.fields.name.exists'));
      return;
    }

    try {
      await addVariable(newVariable);

      setNewVariable({ name: '', type: 'text', defaultValue: '', description: '' });
      setShowCreateForm(false);
    } catch (err) {
      alert(t('environmentManager.form.messages.createError'));
    }
  };

  const handleEditVariable = (variable: JourneyVariable) => {
    setEditingVariable(variable);
    setNewVariable({
      name: variable.name,
      type: variable.type,
      defaultValue: variable.defaultValue || '',
      description: variable.description || '',
    });
    setShowCreateForm(true);
  };

  const handleUpdateVariable = async () => {
    if (!editingVariable) return;

    if (!newVariable.name.trim()) {
      alert(t('environmentManager.form.fields.name.required'));
      return;
    }

    // Validar nome (sem espaços, apenas letras, números e underscore)
    if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(newVariable.name)) {
      alert(t('environmentManager.form.fields.name.invalid'));
      return;
    }

    // Verificar se já existe (exceto a própria variável)
    if (variables.some(v => v.name === newVariable.name && v.id !== editingVariable.id)) {
      alert(t('environmentManager.form.fields.name.exists'));
      return;
    }

    try {
      await updateVariable(editingVariable.id, newVariable);

      setNewVariable({ name: '', type: 'text', defaultValue: '', description: '' });
      setShowCreateForm(false);
      setEditingVariable(null);
    } catch (err) {
      alert(t('environmentManager.form.messages.updateError'));
    }
  };

  const handleDeleteVariable = (variable: JourneyVariable) => {
    setDeletingVariable(variable);
  };

  const confirmDelete = async () => {
    if (!deletingVariable) return;

    try {
      await deleteVariable(deletingVariable.id);
      setDeletingVariable(null);
    } catch (err) {
      alert(t('environmentManager.form.messages.deleteError'));
    }
  };

  const copyToClipboard = (variableName: string) => {
    navigator.clipboard.writeText(`{${variableName}}`);
    // TODO: Adicionar toast de sucesso
  };

  // Agrupar SYSTEM_VARIABLES por categoria para exibição
  const SYSTEM_VARIABLES = getSystemVariables(t);
  const systemVariablesByCategory = SYSTEM_VARIABLES.reduce((acc, variable) => {
    const category = variable.category || t('environmentManager.categories.others');
    if (!acc[category]) {
      acc[category] = { category, variables: [] };
    }

    // Aplicar filtro de busca
    const matchesSearch =
      searchQuery === '' ||
      variable.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (variable.description &&
        variable.description.toLowerCase().includes(searchQuery.toLowerCase()));

    if (matchesSearch) {
      acc[category].variables.push({
        name: variable.value.replace(/[{}]/g, ''), // Remove {{}} para mostrar só o nome
        description: variable.description || '',
        example: variable.label, // Usar label como exemplo
      });
    }

    return acc;
  }, {} as Record<string, { category: string; variables: { name: string; description: string; example: string }[] }>);

  const filteredSystemVariables = Object.values(systemVariablesByCategory).filter(
    cat => cat.variables.length > 0,
  );

  const filteredCustomVariables = variables.filter(
    v =>
      v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (v.description && v.description.toLowerCase().includes(searchQuery.toLowerCase())),
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings className="w-4 h-4" />
          ENV
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden flex flex-col bg-sidebar border-sidebar-border">
        <DialogHeader className="pb-4">
          <DialogTitle className="flex items-center gap-3 text-sidebar-foreground">
            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
              <Settings className="w-4 h-4 text-primary" />
            </div>
            {t('environmentManager.title')}
          </DialogTitle>
          <DialogDescription className="text-sidebar-foreground/60">
            {t('environmentManager.description')}
          </DialogDescription>
        </DialogHeader>

        {/* Barra de busca */}
        <div className="pb-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder={t('environmentManager.searchPlaceholder')}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10 bg-sidebar-accent border-sidebar-border"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Loading indicator */}
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-2 text-sidebar-foreground/60">{t('environmentManager.loading')}</span>
            </div>
          )}

          {/* Error indicator */}
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
              <p className="text-red-600 dark:text-red-400 text-sm">
                ⚠️ {t('environmentManager.errorTitle')} {error}
              </p>
            </div>
          )}

          {/* Formulário de Criar/Editar - No topo quando ativo */}
          {showCreateForm && (
            <div className="mb-6 p-4 rounded-lg bg-sidebar-accent border border-sidebar-border">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-sidebar-foreground">
                  {editingVariable ? `✏️ ${t('environmentManager.form.edit.title')}` : `➕ ${t('environmentManager.form.create.title')}`}
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowCreateForm(false);
                    setEditingVariable(null);
                    setNewVariable({ name: '', type: 'text', defaultValue: '', description: '' });
                  }}
                >
                  ✕
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-sidebar-foreground mb-2 block">
                    {t('environmentManager.form.fields.name.label')}
                  </Label>
                  <Input
                    placeholder={t('environmentManager.form.fields.name.placeholder')}
                    value={newVariable.name}
                    onChange={e => setNewVariable(prev => ({ ...prev, name: e.target.value }))}
                    className="bg-sidebar border-sidebar-border"
                  />
                  <p className="text-xs text-sidebar-foreground/50 mt-1">
                    {t('environmentManager.form.fields.name.help')}
                  </p>
                </div>

                <div>
                  <Label className="text-sm font-medium text-sidebar-foreground mb-2 block">
                    {t('environmentManager.form.fields.type.label')}
                  </Label>
                  <Select
                    value={newVariable.type}
                    onValueChange={(value: 'text' | 'number' | 'boolean' | 'date') =>
                      setNewVariable(prev => ({ ...prev, type: value }))
                    }
                  >
                    <SelectTrigger className="bg-sidebar border-sidebar-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">📝 {t('environmentManager.form.fields.type.text')}</SelectItem>
                      <SelectItem value="number">🔢 {t('environmentManager.form.fields.type.number')}</SelectItem>
                      <SelectItem value="boolean">☑️ {t('environmentManager.form.fields.type.boolean')}</SelectItem>
                      <SelectItem value="date">📅 {t('environmentManager.form.fields.type.date')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-medium text-sidebar-foreground mb-2 block">
                    {t('environmentManager.form.fields.description.label')}
                  </Label>
                  <Input
                    placeholder={t('environmentManager.form.fields.description.placeholder')}
                    value={newVariable.description}
                    onChange={e =>
                      setNewVariable(prev => ({ ...prev, description: e.target.value }))
                    }
                    className="bg-sidebar border-sidebar-border"
                  />
                </div>

                <div>
                  <Label className="text-sm font-medium text-sidebar-foreground mb-2 block">
                    {t('environmentManager.form.fields.defaultValue.label')}
                  </Label>
                  <Input
                    placeholder={t('environmentManager.form.fields.defaultValue.placeholder')}
                    value={newVariable.defaultValue}
                    onChange={e =>
                      setNewVariable(prev => ({ ...prev, defaultValue: e.target.value }))
                    }
                    className="bg-sidebar border-sidebar-border"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCreateForm(false);
                    setEditingVariable(null);
                    setNewVariable({ name: '', type: 'text', defaultValue: '', description: '' });
                  }}
                  className="border-sidebar-border"
                >
                  {t('environmentManager.form.actions.cancel')}
                </Button>
                <Button onClick={editingVariable ? handleUpdateVariable : handleCreateVariable}>
                  {editingVariable ? t('environmentManager.form.edit.button') : t('environmentManager.form.create.button')}
                </Button>
              </div>
            </div>
          )}

          <Tabs defaultValue="system" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="system" className="flex items-center gap-2">
                <span className="text-xs">🔒</span>
                {t('environmentManager.tabs.system')}
              </TabsTrigger>
              <TabsTrigger value="custom" className="flex items-center gap-2">
                <span className="text-xs">⚙️</span>
                {t('environmentManager.tabs.custom', { count: filteredCustomVariables.length })}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="system" className="mt-6 space-y-4">
              <div className="space-y-3">
                {filteredSystemVariables.map(category => (
                  <div key={category.category}>
                    <h4 className="text-sm font-medium text-sidebar-foreground/80 mb-2 flex items-center gap-2">
                      <span className="text-xs">
                        {category.category === t('environmentManager.categories.contact') && '👤'}
                        {category.category === t('environmentManager.categories.event') && '⚡'}
                        {category.category === t('environmentManager.categories.webhook') && '🌐'}
                        {category.category === t('environmentManager.categories.journey') && '🎯'}
                      </span>
                      {category.category}
                    </h4>
                    <div className="space-y-1">
                      {category.variables.map(variable => (
                        <div
                          key={variable.name}
                          className="group p-3 rounded-lg bg-sidebar-accent/50 border border-sidebar-border/50 hover:bg-sidebar-accent hover:border-sidebar-border transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <code className="text-sm font-mono bg-primary/10 text-primary px-2 py-1 rounded font-medium">
                                  {'{' + variable.name + '}'}
                                </code>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => copyToClipboard(variable.name)}
                                  className="opacity-0 group-hover:opacity-100 h-7 w-7 p-0 transition-opacity"
                                  title={t('environmentManager.customVariables.actions.copy')}
                                >
                                  <Copy className="w-3 h-3" />
                                </Button>
                              </div>
                              <p className="text-xs text-sidebar-foreground/60 mb-1">
                                {variable.description}
                              </p>
                              <div className="text-xs font-mono text-green-600 bg-green-50 dark:bg-green-950/20 px-2 py-1 rounded inline-block">
                                {t('environmentManager.examples.prefix', { example: variable.example })}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="custom" className="mt-6 space-y-4">
              {/* Header com botão de nova variável */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-medium text-sidebar-foreground">
                    {filteredCustomVariables.length === 0
                      ? t('environmentManager.customVariables.empty.title')
                      : t('environmentManager.customVariables.empty.count', { count: filteredCustomVariables.length })}
                  </h3>
                </div>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setShowCreateForm(true)}
                  className="gap-2"
                >
                  <Plus className="w-4 h-4" />
                  {t('environmentManager.customVariables.actions.new')}
                </Button>
              </div>

              <div className="space-y-2">
                {filteredCustomVariables.length === 0 && !showCreateForm && (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 bg-sidebar-accent rounded-full flex items-center justify-center mx-auto mb-3">
                      <Plus className="w-6 h-6 text-sidebar-foreground/40" />
                    </div>
                    <p className="text-sidebar-foreground/60 text-sm">
                      {t('environmentManager.customVariables.empty.subtitle')}
                    </p>
                  </div>
                )}

                {filteredCustomVariables.map(variable => (
                  <div
                    key={variable.id}
                    className="group p-3 rounded-lg bg-sidebar-accent/50 border border-sidebar-border/50 hover:bg-sidebar-accent hover:border-sidebar-border transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <code className="text-sm font-mono bg-primary/10 text-primary px-2 py-1 rounded font-medium">
                            {'{' + variable.name + '}'}
                          </code>
                          <span className="text-xs bg-sidebar-accent px-2 py-1 rounded border border-sidebar-border/50">
                            {variable.type === 'text' && '📝'}
                            {variable.type === 'number' && '🔢'}
                            {variable.type === 'boolean' && '☑️'}
                            {variable.type === 'date' && '📅'}
                            {variable.type}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(variable.name)}
                            className="opacity-0 group-hover:opacity-100 h-7 w-7 p-0 transition-opacity"
                            title={t('environmentManager.customVariables.actions.copy')}
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                        {variable.description && (
                          <p className="text-xs text-sidebar-foreground/60 mb-1">
                            {variable.description}
                          </p>
                        )}
                        {variable.defaultValue && (
                          <div className="text-xs font-mono text-green-600 bg-green-50 dark:bg-green-950/20 px-2 py-1 rounded inline-block">
                            {t('environmentManager.customVariables.actions.default', { value: variable.defaultValue })}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditVariable(variable)}
                          className="h-8 w-8 p-0 hover:bg-blue-50 dark:hover:bg-blue-950/20 text-blue-600 hover:text-blue-700"
                          title={t('environmentManager.customVariables.actions.edit')}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteVariable(variable)}
                          className="h-8 w-8 p-0 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-500 hover:text-red-600"
                          title={t('environmentManager.customVariables.actions.delete')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <div className="pt-4 border-t border-sidebar-border">
          <div className="flex justify-between items-center">
            <div className="text-xs text-sidebar-foreground/60">
              {t('environmentManager.footer.tip')}
            </div>
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              className="border-sidebar-border"
            >
              {t('environmentManager.form.actions.close')}
            </Button>
          </div>
        </div>
      </DialogContent>

      {/* Dialog de confirmação de exclusão */}
      {deletingVariable && (
        <Dialog open={!!deletingVariable} onOpenChange={() => setDeletingVariable(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <div className="w-8 h-8 bg-red-500/10 rounded-lg flex items-center justify-center">
                  <Trash2 className="w-4 h-4 text-red-500" />
                </div>
                {t('environmentManager.deleteDialog.title')}
              </DialogTitle>
              <DialogDescription>
                {t('environmentManager.deleteDialog.description', { name: deletingVariable.name })}
              </DialogDescription>
            </DialogHeader>

            <div className="flex gap-3 justify-end pt-4">
              <Button variant="outline" onClick={() => setDeletingVariable(null)}>
                {t('environmentManager.deleteDialog.cancel')}
              </Button>
              <Button variant="destructive" onClick={confirmDelete} className="gap-2">
                <Trash2 className="w-4 h-4" />
                {t('environmentManager.deleteDialog.confirm')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  );
}
