import { useState, useEffect } from 'react';
import { Button, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Badge } from '@evoapi/design-system';
import { ArrowRight, ArrowLeft, Users, Plus, X, Tag as TagIcon, Target } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { contactsService } from '@/services/contacts';
import { segmentsService } from '@/services/segments/segmentsService';
import { labelsService } from '@/services/contacts/labelsService';
import type { Segment } from '@/types/analytics';
import type { Label as LabelType } from '@/types/settings';

type FilterType = 'segment' | 'tag';
type FilterOperator = 'include' | 'exclude';

interface FilterCondition {
  id: string; // unique ID for this filter condition
  type: FilterType;
  operator: FilterOperator;
  value: string; // segment_id or tag_id
}

interface Step2Props {
  data: {
    contact_selection: 'all' | 'segments' | 'tags' | '';
    segment_ids?: string[];
    tag_ids?: string[];
    estimated_contacts?: number;
  };
  onChange: (data: Partial<Step2Props['data']>) => void;
  onNext: () => void;
  onBack: () => void;
}

const Step2_Audience = ({ data, onChange, onNext, onBack }: Step2Props) => {
  const { t } = useLanguage('campaigns');
  const [totalContacts, setTotalContacts] = useState<number | null>(null);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [labels, setLabels] = useState<LabelType[]>([]);

  // Fetch all data when component mounts
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [contactsRes, segmentsRes, labelsRes] = await Promise.all([
          contactsService.getContacts({ page: 1, per_page: 1 }),
          segmentsService.getSegments({ limit: 1000 }),
          labelsService.getLabels(),
        ]);

        setTotalContacts(contactsRes.meta?.pagination?.total || 0);
        setSegments(segmentsRes.data || []);
        setLabels(labelsRes.data || []);
      } catch (error) {
        console.error('Error fetching audience data:', error);
        setTotalContacts(0);
        setSegments([]);
        setLabels([]);
      }
    };

    fetchData();
  }, []);

  const [useAllContacts, setUseAllContacts] = useState(data.contact_selection === 'all');
  const [filters, setFilters] = useState<FilterCondition[]>([]);
  const [newFilterType, setNewFilterType] = useState<FilterType>('segment');
  const [newFilterOperator, setNewFilterOperator] = useState<FilterOperator>('include');
  const [newFilterValue, setNewFilterValue] = useState<string>('');

  // Hydrate existing audience filters when editing a campaign.
  useEffect(() => {
    const selectedAll = data.contact_selection === 'all';
    setUseAllContacts(selectedAll);

    if (selectedAll) {
      setFilters([]);
      return;
    }

    const mapIdsToFilters = (
      ids: string[] | undefined,
      type: FilterType,
      startIndex: number,
    ): FilterCondition[] =>
      (ids || [])
        .filter(Boolean)
        .map((rawId, index) => {
          const isExcluded = rawId.startsWith('!');
          const value = isExcluded ? rawId.slice(1) : rawId;
          return {
            id: `hydrated_${type}_${startIndex + index}`,
            type,
            operator: isExcluded ? 'exclude' : 'include',
            value,
          } as FilterCondition;
        })
        .filter((filter) => !!filter.value);

    const hydratedSegmentFilters = mapIdsToFilters(data.segment_ids, 'segment', 0);
    const hydratedTagFilters = mapIdsToFilters(data.tag_ids, 'tag', hydratedSegmentFilters.length);
    setFilters([...hydratedSegmentFilters, ...hydratedTagFilters]);
  }, [data.contact_selection, data.segment_ids, data.tag_ids]);

  const addFilter = () => {
    if (!newFilterValue) return;

    const newFilter: FilterCondition = {
      id: `filter_${Date.now()}`,
      type: newFilterType,
      operator: newFilterOperator,
      value: newFilterValue,
    };

    const updatedFilters = [...filters, newFilter];
    setFilters(updatedFilters);

    // Update parent data
    updateParentData(updatedFilters);

    // Reset form
    setNewFilterValue('');
  };

  const removeFilter = (filterId: string) => {
    const updatedFilters = filters.filter(f => f.id !== filterId);
    setFilters(updatedFilters);
    updateParentData(updatedFilters);
  };

  const updateParentData = (currentFilters: FilterCondition[]) => {
    // Extract segment and tag IDs from filters
    const includedSegments = currentFilters
      .filter(f => f.type === 'segment' && f.operator === 'include')
      .map(f => f.value);

    const excludedSegments = currentFilters
      .filter(f => f.type === 'segment' && f.operator === 'exclude')
      .map(f => f.value);

    const includedTags = currentFilters
      .filter(f => f.type === 'tag' && f.operator === 'include')
      .map(f => f.value);

    const excludedTags = currentFilters
      .filter(f => f.type === 'tag' && f.operator === 'exclude')
      .map(f => f.value);

    // Calculate estimated contacts (simplified logic)
    let estimatedContacts = 0;
    if (useAllContacts) {
      estimatedContacts = totalContacts || 0;
    } else if (currentFilters.length > 0) {
      // Sum contacts from included filters
      includedSegments.forEach(segId => {
        const seg = segments.find(s => s.id === segId);
        if (seg) estimatedContacts += seg.contactsCount || 0;
      });
      includedTags.forEach(tagId => {
        const label = labels.find(l => l.id === tagId);
        // Labels don't have contact count in the API, estimate based on total
        if (label) estimatedContacts += Math.floor((totalContacts || 0) * 0.1);
      });
      // Subtract excluded (simplified)
      excludedSegments.forEach(segId => {
        const seg = segments.find(s => s.id === segId);
        if (seg) estimatedContacts = Math.max(0, estimatedContacts - (seg.contactsCount || 0) * 0.1);
      });
      excludedTags.forEach(tagId => {
        const label = labels.find(l => l.id === tagId);
        if (label) estimatedContacts = Math.max(0, estimatedContacts - Math.floor((totalContacts || 0) * 0.05));
      });
    }

    // Determine contact_selection based on filters
    let contactSelection: 'all' | 'segments' | 'tags' | '' = '';
    if (useAllContacts) {
      contactSelection = 'all';
    } else if (currentFilters.length > 0) {
      const hasSegments = currentFilters.some(f => f.type === 'segment');
      const hasTags = currentFilters.some(f => f.type === 'tag');
      if (hasSegments && hasTags) {
        contactSelection = 'segments'; // Mixed - use segments as primary
      } else if (hasSegments) {
        contactSelection = 'segments';
      } else if (hasTags) {
        contactSelection = 'tags';
      }
    }

    onChange({
      contact_selection: contactSelection,
      segment_ids: [...includedSegments, ...excludedSegments.map(id => `!${id}`)], // Prefix excluded with !
      tag_ids: [...includedTags, ...excludedTags.map(id => `!${id}`)], // Prefix excluded with !
    });
  };

  const handleToggleAllContacts = (checked: boolean) => {
    setUseAllContacts(checked);
    if (checked) {
      setFilters([]);
      onChange({
        contact_selection: 'all',
        segment_ids: [],
        tag_ids: [],
        estimated_contacts: totalContacts || 0,
      });
    } else {
      onChange({
        contact_selection: '',
        segment_ids: [],
        tag_ids: [],
        estimated_contacts: 0,
      });
    }
  };

  const getFilterLabel = (filter: FilterCondition) => {
    if (filter.type === 'segment') {
      const segment = segments.find(s => s.id === filter.value);
      return segment?.name || filter.value;
    } else {
      const label = labels.find(l => l.id === filter.value);
      return label?.title || filter.value;
    }
  };

  const getFilterIcon = (filter: FilterCondition) => {
    return filter.type === 'segment' ? <Target className="h-3 w-3" /> : <TagIcon className="h-3 w-3" />;
  };

  const handleNext = () => {
    if (useAllContacts || filters.length > 0) {
      onNext();
    }
  };

  const isValid = useAllContacts || filters.length > 0;

  return (
    <div className="flex flex-col max-w-4xl mx-auto py-6 px-6 h-full">
      <div className="flex-1 overflow-y-auto min-h-0 px-1">
        <div className="w-full space-y-6 max-w-2xl mx-auto pb-4">
          {/* Header */}
          <div>
            <h3 className="text-lg font-semibold mb-2">{t('wizard.step2.selectAudience')}</h3>
            <p className="text-sm text-muted-foreground">
              {t('wizard.step2.audienceDescription')}
            </p>
          </div>

          {/* All Contacts Toggle */}
          <div className="flex items-start space-x-3 p-4 border rounded-lg">
            <input
              type="checkbox"
              id="all-contacts"
              checked={useAllContacts}
              onChange={(e) => handleToggleAllContacts(e.target.checked)}
              className="mt-1"
            />
            <div className="flex-1">
              <Label htmlFor="all-contacts" className="text-base font-semibold cursor-pointer flex items-center gap-2">
                <Users className="h-4 w-4" />
                {t('wizard.step2.allContacts')}
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                {t('wizard.step2.allContactsDescription')}
              </p>
            </div>
          </div>

          {/* Filter Builder */}
          {!useAllContacts && (
            <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
              <Label className="text-base font-semibold">{t('wizard.step2.audienceFilters')}</Label>
              <p className="text-xs text-muted-foreground">
                {t('wizard.step2.audienceFiltersDescription')}
              </p>

              {/* Add Filter Form */}
              <div className="grid grid-cols-12 gap-2">
                {/* Operator */}
                <div className="col-span-3">
                  <Select value={newFilterOperator} onValueChange={(v) => setNewFilterOperator(v as FilterOperator)}>
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="include">{t('wizard.step2.include')}</SelectItem>
                      <SelectItem value="exclude">{t('wizard.step2.exclude')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Type */}
                <div className="col-span-3">
                  <Select value={newFilterType} onValueChange={(v) => { setNewFilterType(v as FilterType); setNewFilterValue(''); }}>
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="segment">{t('wizard.step2.segment')}</SelectItem>
                      <SelectItem value="tag">{t('wizard.step2.tag')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Value */}
                <div className="col-span-5">
                  <Select value={newFilterValue} onValueChange={setNewFilterValue}>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder={newFilterType === 'segment' ? t('wizard.step2.selectSegment') : t('wizard.step2.selectTag')} />
                    </SelectTrigger>
                    <SelectContent>
                      {newFilterType === 'segment' && segments.map(seg => (
                        <SelectItem key={seg.id} value={seg.id}>
                          {seg.name} ({(seg.contactsCount || 0).toLocaleString('pt-BR')})
                        </SelectItem>
                      ))}
                      {newFilterType === 'tag' && labels.map(label => (
                        <SelectItem key={label.id} value={label.id.toString()}>
                          <span className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: label.color }} />
                            {label.title}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Add Button */}
                <div className="col-span-1">
                  <Button
                    type="button"
                    size="icon"
                    onClick={addFilter}
                    disabled={!newFilterValue}
                    className="h-10 w-10"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Active Filters */}
              {filters.length > 0 && (
                <div className="space-y-2 pt-2">
                  <Label className="text-sm font-medium">{t('wizard.step2.activeFilters')} ({filters.length})</Label>
                  <div className="flex flex-wrap gap-2">
                    {filters.map(filter => (
                      <Badge
                        key={filter.id}
                        variant={filter.operator === 'include' ? 'default' : 'secondary'}
                        className="px-3 py-1.5 text-sm gap-2"
                      >
                        {getFilterIcon(filter)}
                        <span className="font-medium">
                          {filter.operator === 'include' ? t('wizard.step2.include') : t('wizard.step2.exclude')}:
                        </span>
                        <span>{getFilterLabel(filter)}</span>
                        <button
                          onClick={() => removeFilter(filter.id)}
                          className="ml-1 hover:bg-black/10 rounded-full p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {filters.length === 0 && (
                <div className="text-center py-6 text-sm text-muted-foreground">
                  {t('wizard.step2.noFiltersAdded')}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-between flex-shrink-0 pt-4 border-t mt-6">
        <Button variant="outline" className="px-6 gap-2" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
          {t('wizard.actions.back')}
        </Button>
        <Button className="px-6 gap-2" onClick={handleNext} disabled={!isValid}>
          {t('wizard.actions.continue')}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default Step2_Audience;
