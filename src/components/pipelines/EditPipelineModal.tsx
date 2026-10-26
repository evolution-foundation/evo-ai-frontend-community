import { useState, useEffect } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
  Input,
  Label,
  Textarea,
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
import { Loader2, X, Users } from 'lucide-react';
import { Pipeline, UpdatePipelineData } from '@/types/analytics';
import TeamsService from '@/services/teams/teamsService';
import { Team } from '@/types/users/teams';
import { LocalAttributeDefinition, LocalAttributeDefinitionPayload } from '@/types/pipelines/localAttributeDefinition';
import PipelineCustomAttributes from './PipelineCustomAttributes';

interface EditPipelineModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pipeline: Pipeline;
  onSubmit: (data: UpdatePipelineData) => void;
  loading: boolean;
}

export default function EditPipelineModal({
  open,
  onOpenChange,
  pipeline,
  onSubmit,
  loading,
}: EditPipelineModalProps) {
  const { t } = useLanguage('pipelines');
  const [formData, setFormData] = useState<UpdatePipelineData>({
    name: pipeline.name,
    description: pipeline.description || '',
    pipeline_type: pipeline.pipeline_type,
    visibility: pipeline.visibility,
    is_active: pipeline.is_active,
  });
  const [teamIds, setTeamIds] = useState<string[]>(pipeline.team_ids || []);
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [customAttributes, setCustomAttributes] = useState<Record<string, unknown>>({});

  useEffect(() => {
    // Update form data when pipeline changes
    setFormData({
      name: pipeline.name,
      description: pipeline.description || '',
      pipeline_type: pipeline.pipeline_type,
      visibility: pipeline.visibility,
      is_active: pipeline.is_active,
    });
    setTeamIds(pipeline.team_ids || []);
    // Load attributes array from custom_fields.attributes
    // Structure: custom_fields = { attributes: ["key1", "key2", ...] }
    const attributesArray = (pipeline.custom_fields?.attributes as string[]) || [];
    const localDefinitions =
      (pipeline.custom_fields?.attribute_definitions as Record<string, LocalAttributeDefinitionPayload>) || {};
    const createdAttributes: Record<string, unknown> = {};
    attributesArray.forEach(key => {
      const localDefinition = localDefinitions[key];
      createdAttributes[key] = localDefinition
        ? {
            __local_definition: true,
            ...localDefinition,
          }
        : null;
    });
    Object.entries(localDefinitions).forEach(([key, definition]) => {
      if (!createdAttributes[key]) {
        createdAttributes[key] = {
          __local_definition: true,
          ...definition,
        };
      }
    });
    setCustomAttributes(createdAttributes);
  }, [pipeline]);

  // Load teams when visibility is 'team'
  useEffect(() => {
    if (formData.visibility === 'team' && teams.length === 0) {
      setTeamsLoading(true);
      TeamsService.getAllTeams({ sort: 'name', order: 'asc' })
        .then(setTeams)
        .catch(err => console.error('Error loading teams:', err))
        .finally(() => setTeamsLoading(false));
    }
    if (formData.visibility !== 'team') {
      setTeamIds([]);
    }
  }, [formData.visibility]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) return;
    if (formData.visibility === 'team' && teamIds.length === 0) return;

    const attributeKeys = Object.keys(customAttributes);
    const attributeDefinitions = Object.entries(customAttributes).reduce(
      (acc, [key, value]) => {
        if (value && typeof value === 'object' && (value as LocalAttributeDefinition).__local_definition) {
          const localDefinition = value as LocalAttributeDefinition;
          acc[key] = {
            attribute_display_name: localDefinition.attribute_display_name,
            attribute_display_type: localDefinition.attribute_display_type,
            ...(localDefinition.attribute_values?.length
              ? { attribute_values: localDefinition.attribute_values }
              : {}),
          };
        }
        return acc;
      },
      {} as Record<string, LocalAttributeDefinitionPayload>,
    );

    const existingCustomFields = { ...(pipeline.custom_fields || {}) };
    delete (existingCustomFields as Record<string, unknown>).attributes;
    delete (existingCustomFields as Record<string, unknown>).attribute_definitions;

    const submitData: UpdatePipelineData = {
      ...formData,
      team_ids: formData.visibility === 'team' ? teamIds : [],
      custom_fields: attributeKeys.length > 0
        ? {
            ...existingCustomFields,
            attributes: attributeKeys,
            ...(Object.keys(attributeDefinitions).length > 0
              ? { attribute_definitions: attributeDefinitions }
              : {}),
          }
        : undefined,
    };

    onSubmit(submitData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <DialogHeader>
            <DialogTitle>{t('editPipeline.title')}</DialogTitle>
            <DialogDescription>
              {t('editPipeline.description', { name: pipeline.name })}
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="details" className="flex-1 flex flex-col min-h-0">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="details">{t('editPipeline.details')}</TabsTrigger>
              <TabsTrigger value="attributes">{t('editPipeline.customAttributes')}</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="py-4 overflow-y-auto flex-1">
              <div className="grid gap-4">
            {/* Name */}
            <div className="grid gap-2">
              <Label htmlFor="edit-name">{t('editPipeline.name')}</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={t('editPipeline.namePlaceholder')}
                required
                disabled={loading}
              />
            </div>

            {/* Description */}
            <div className="grid gap-2">
              <Label htmlFor="edit-description">{t('editPipeline.descriptionLabel')}</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={t('editPipeline.descriptionPlaceholder')}
                rows={3}
                disabled={loading}
              />
            </div>

            {/* Pipeline Type */}
            <div className="grid gap-2">
              <Label htmlFor="edit-type">{t('editPipeline.pipelineType')}</Label>
              <Select
                value={formData.pipeline_type}
                onValueChange={(value: 'custom' | 'sales' | 'support' | 'marketing') =>
                  setFormData({ ...formData, pipeline_type: value })
                }
                disabled={loading}
              >
                <SelectTrigger id="edit-type">
                  <SelectValue placeholder={t('editPipeline.selectType')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">{t('editPipeline.types.custom')}</SelectItem>
                  <SelectItem value="sales">{t('editPipeline.types.sales')}</SelectItem>
                  <SelectItem value="support">{t('editPipeline.types.support')}</SelectItem>
                  <SelectItem value="marketing">{t('editPipeline.types.marketing')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Visibility */}
            <div className="grid gap-2">
              <Label htmlFor="edit-visibility">{t('editPipeline.visibility')}</Label>
              <Select
                value={formData.visibility}
                onValueChange={(value: 'private' | 'public' | 'team') =>
                  setFormData({ ...formData, visibility: value })
                }
                disabled={loading}
              >
                <SelectTrigger id="edit-visibility">
                  <SelectValue placeholder={t('editPipeline.selectVisibility')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">{t('editPipeline.visibilityOptions.private')}</SelectItem>
                  <SelectItem value="public">{t('editPipeline.visibilityOptions.public')}</SelectItem>
                  <SelectItem value="team">{t('editPipeline.visibilityOptions.team')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Team Selection - conditional on visibility === 'team' */}
            {formData.visibility === 'team' && (
              <div className="grid gap-2">
                <Label>{t('editPipeline.teamSelection.label')}</Label>
                {teamIds.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {teamIds.map(id => {
                      const team = teams.find(t => t.id === id);
                      return team ? (
                        <span key={id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground text-xs">
                          <Users className="h-3 w-3" />
                          {team.name}
                          <button type="button" onClick={() => setTeamIds(prev => prev.filter(tid => tid !== id))} className="hover:text-destructive">
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ) : null;
                    })}
                  </div>
                )}
                <div className="border rounded-lg max-h-36 overflow-y-auto">
                  {teamsLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  ) : teams.length === 0 ? (
                    <div className="text-center text-sm text-muted-foreground py-4">
                      {t('editPipeline.teamSelection.noTeams')}
                    </div>
                  ) : (
                    <div className="p-1.5 space-y-0.5">
                      {teams.map(team => (
                        <label key={team.id} className="flex items-center gap-2 p-1.5 hover:bg-muted/50 rounded cursor-pointer">
                          <input
                            type="checkbox"
                            checked={teamIds.includes(team.id)}
                            onChange={() => {
                              setTeamIds(prev =>
                                prev.includes(team.id) ? prev.filter(tid => tid !== team.id) : [...prev, team.id]
                              );
                            }}
                            disabled={loading}
                            className="rounded border-gray-300"
                          />
                          <span className="text-sm">{team.name}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
                {teamIds.length === 0 && (
                  <p className="text-xs text-destructive">{t('editPipeline.teamSelection.required')}</p>
                )}
              </div>
            )}

            {/* Active Status */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="edit-is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                disabled={loading}
                className="rounded border-gray-300"
              />
              <Label htmlFor="edit-is_active" className="cursor-pointer">
                {t('editPipeline.pipelineActive')}
              </Label>
            </div>
              </div>
            </TabsContent>

            <TabsContent value="attributes" className="py-4 overflow-y-auto flex-1">
              <div className="mb-4">
                <h3 className="text-lg font-semibold mb-2">{t('editPipeline.customAttributes')}</h3>
                <p className="text-sm text-muted-foreground">
                  {t('editPipeline.attributesDescription')}
                </p>
              </div>
              <PipelineCustomAttributes
                attributes={customAttributes}
                onAttributesChange={setCustomAttributes}
                disabled={loading}
                pipelineId={pipeline.id}
              />
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              {t('editPipeline.cancel')}
            </Button>
            <Button type="submit" disabled={loading || !formData.name?.trim() || (formData.visibility === 'team' && teamIds.length === 0)}>
              {loading ? t('editPipeline.saving') : t('editPipeline.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
