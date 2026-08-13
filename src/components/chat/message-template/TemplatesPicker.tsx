import React, { useMemo, useState } from 'react';
import { Input } from '@evoapi/design-system/input';
import { Card } from '@evoapi/design-system/card';
import { Search } from 'lucide-react';
import type { MessageTemplate } from '@/types/channels/inbox';

import { useLanguage } from '@/hooks/useLanguage';
import {
  getStatusBadgeKey,
  hasUnsupportedFormat,
  isTemplateSendable,
} from './templateStatus';

interface TemplatesPickerProps {
  isWhatsAppCloud?: boolean;
  templates: MessageTemplate[];
  onSelect: (template: MessageTemplate) => void;
}

const getTemplateBody = (template: MessageTemplate): string => {
  if (template.content) {
    return template.content;
  }

  if (template.components) {
    if (Array.isArray(template.components)) {
      const bodyComponent = template.components.find(c => c.type === 'BODY');
      if (bodyComponent?.text) {
        return bodyComponent.text;
      }
    } else {
      const bodyComponent = template.components.body || template.components.BODY;
      if (bodyComponent?.text) {
        return bodyComponent.text;
      }
    }
  }

  return '';
};

const TemplatesPicker: React.FC<TemplatesPickerProps> = ({ isWhatsAppCloud, templates, onSelect }) => {
  const { t } = useLanguage('chat');
  const [searchQuery, setSearchQuery] = useState('');

  const visibleTemplates = useMemo(
    () =>
      isWhatsAppCloud
        ? templates.filter(template => !hasUnsupportedFormat(template))
        : templates,
    [templates, isWhatsAppCloud],
  );

  const filteredTemplates = useMemo(() => {
    if (!searchQuery.trim()) {
      return visibleTemplates;
    }

    const query = searchQuery.toLowerCase();
    return visibleTemplates.filter(template => {
      const nameMatch = template.name.toLowerCase().includes(query);
      const bodyMatch = getTemplateBody(template).toLowerCase().includes(query);
      return nameMatch || bodyMatch;
    });
  }, [visibleTemplates, searchQuery]);


  return (
    <div className="w-full">
      {/* Campo de busca */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder={t('messageTemplates.picker.searchPlaceholder')}
          className="pl-9 bg-muted/50 border-muted-foreground/20 focus:bg-background"
        />
      </div>

      {/* Lista de templates */}
      <Card className="max-h-[400px] overflow-y-auto border border-border">
        <div className="p-2 space-y-2">
          {filteredTemplates.length > 0 ? (
            filteredTemplates.map((template, index) => {
              const isEnabled = isWhatsAppCloud ? isTemplateSendable(template) : true;
              const badgeKey = isWhatsAppCloud ? getStatusBadgeKey(template) : null;
              const showBadge = badgeKey !== null && badgeKey !== 'approved';
              const templateBody = getTemplateBody(template);

              return (
                <div key={template.id || index}>
                  <button
                    type="button"
                    onClick={() => isEnabled && onSelect(template)}
                    disabled={!isEnabled}
                    title={
                      !isEnabled
                        ? t('messageTemplates.picker.status.disabledTooltip')
                        : undefined
                    }
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      isEnabled
                        ? 'hover:bg-accent cursor-pointer'
                        : 'opacity-60 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{template.name}</p>
                        {showBadge && (
                          <span className="inline-block px-2 py-0.5 text-xs rounded-md bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
                            {t(`messageTemplates.picker.status.${badgeKey}`)}
                          </span>
                        )}
                      </div>
                      <span className="inline-block px-2 py-1 text-xs bg-muted rounded-md">
                        {t('messageTemplates.picker.labels.language')}: {template.language}
                      </span>
                    </div>

                    <div className="flex flex-col gap-2">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-0.5">
                          {t('messageTemplates.picker.labels.category')}
                        </p>
                        <p className="text-xs">{template.category}</p>
                      </div>

                      {templateBody && (
                        <div className="mt-1 p-2.5 bg-muted/40 rounded-md border border-border/30">
                          <p className="text-[11px] font-medium text-muted-foreground mb-1">
                            {t('messageTemplates.picker.labels.templateBody')}
                          </p>
                          <p className="text-xs text-foreground/90 whitespace-pre-wrap break-words line-clamp-3 leading-relaxed">
                            {templateBody}
                          </p>
                        </div>
                      )}
                    </div>
                  </button>

                  {index < filteredTemplates.length - 1 && (
                    <div className="border-b border-border my-2 mx-3" />
                  )}
                </div>
              );
            })
          ) : (
            <div className="p-4 text-center text-sm text-muted-foreground">
              {t('messageTemplates.picker.noTemplatesFound')}{' '}
              {searchQuery && <strong>{searchQuery}</strong>}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default TemplatesPicker;
