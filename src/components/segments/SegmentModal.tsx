import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
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
  RadioGroup,
  RadioGroupItem,
} from '@evoapi/design-system';
import { Plus } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { 
  Segment, 
  SegmentFormData, 
  SegmentDefinition,
  SegmentNodeUnion,
  DEFAULT_SEGMENT_DEFINITION,
  UserPropertyNode,
} from '@/types/analytics';
import SegmentConditionEditor from './SegmentConditionEditor';

interface SegmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  segment?: Segment;
  isNew: boolean;
  loading: boolean;
  onSubmit: (data: SegmentFormData) => void;
}


export default function SegmentModal({
  open,
  onOpenChange,
  segment,
  isNew,
  loading,
  onSubmit,
}: SegmentModalProps) {
  const { t } = useLanguage('segments');
  const [formData, setFormData] = useState<SegmentFormData>({
    name: '',
    definition: DEFAULT_SEGMENT_DEFINITION,
    status: 'running',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [definitionType, setDefinitionType] = useState<'Everyone' | 'And' | 'Or'>('Everyone');
  const [nodes, setNodes] = useState<SegmentNodeUnion[]>([]);

  useEffect(() => {
    if (segment && !isNew) {
      setFormData({
        name: segment.name,
        definition: segment.definition,
        status: segment.status,
      });
      setDefinitionType(segment.definition.entryNode.type as 'Everyone' | 'And' | 'Or');
      setNodes(segment.definition.nodes || []);
    } else {
      setFormData({
        name: '',
        definition: DEFAULT_SEGMENT_DEFINITION,
        status: 'running',
      });
      setDefinitionType('Everyone');
      setNodes([]);
    }
    setErrors({});
  }, [segment, isNew, open]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = t('modal.validation.nameRequired');
    }

    if (formData.name.trim().length < 2) {
      newErrors.name = t('modal.validation.nameMinLength');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // Build the segment definition based on current state
    const definition: SegmentDefinition = {
      nodes: nodes,
      entryNode: {
        id: 'entry',
        type: definitionType,
        children: definitionType === 'Everyone' ? undefined : nodes.map(n => n.id),
      },
    };

    onSubmit({
      ...formData,
      definition,
    });
  };

  const handleInputChange = (field: keyof SegmentFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: '',
      }));
    }
  };

  const handleDefinitionTypeChange = (value: 'Everyone' | 'And' | 'Or') => {
    setDefinitionType(value);
    if (value === 'Everyone') {
      setNodes([]);
    }
  };

  const addCondition = () => {
    const newNode: UserPropertyNode = {
      id: uuidv4(),
      type: 'UserProperty',
      path: '',
      operator: {
        type: 'Equals',
        value: '',
      },
    };
    setNodes([...nodes, newNode]);
  };

  const updateCondition = (index: number, node: SegmentNodeUnion) => {
    const updated = [...nodes];
    updated[index] = node;
    setNodes(updated);
  };

  const removeCondition = (index: number) => {
    setNodes(nodes.filter((_, i) => i !== index));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {isNew ? t('modal.createTitle') : t('modal.editTitle')}
            </DialogTitle>
            <DialogDescription>
              {isNew
                ? t('modal.createDescription')
                : t('modal.editDescription')}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-4 max-h-[60vh] overflow-y-auto">
            {/* Nome do Segmento */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <Label htmlFor="name" className="text-sm font-medium mb-2">
                {t('modal.segmentName')} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                placeholder={t('modal.segmentNamePlaceholder')}
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && (
                <span className="text-sm text-red-500 mt-1">{errors.name}</span>
              )}
            </div>

            {/* Tipo de Combinação */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <Label className="text-sm font-medium mb-3">{t('modal.combinationType')}</Label>
              <RadioGroup value={definitionType} onValueChange={handleDefinitionTypeChange}>
                <div className="flex items-center space-x-2 mb-2">
                  <RadioGroupItem value="Everyone" id="everyone" />
                  <label htmlFor="everyone" className="text-sm cursor-pointer">
                    {t('modal.combinationTypes.everyone')}
                  </label>
                </div>
                <div className="flex items-center space-x-2 mb-2">
                  <RadioGroupItem value="And" id="and" />
                  <label htmlFor="and" className="text-sm cursor-pointer">
                    {t('modal.combinationTypes.and')}
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Or" id="or" />
                  <label htmlFor="or" className="text-sm cursor-pointer">
                    {t('modal.combinationTypes.or')}
                  </label>
                </div>
              </RadioGroup>
            </div>

            {/* Mensagem para Everyone */}
            {definitionType === 'Everyone' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-blue-900 mb-1">
                  {t('modal.universalSegment.title')}
                </h4>
                <p className="text-sm text-blue-700">
                  {t('modal.universalSegment.description')}
                </p>
              </div>
            )}

            {/* Lista de Condições */}
            {definitionType !== 'Everyone' && (
              <div className="space-y-4">
                <Label className="text-sm font-medium">
                  {t('modal.segmentConditions')}
                </Label>
                
                {nodes.map((node, index) => (
                  <SegmentConditionEditor
                    key={node.id}
                    condition={node}
                    index={index}
                    onUpdate={updateCondition}
                    onRemove={removeCondition}
                  />
                ))}

                <Button
                  type="button"
                  variant="outline"
                  onClick={addCondition}
                  className="w-full border-dashed"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {t('modal.addCondition')}
                </Button>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              {t('modal.cancel')}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {isNew ? t('modal.creating') : t('modal.saving')}
                </>
              ) : (
                isNew ? t('modal.createButton') : t('modal.saveButton')
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
