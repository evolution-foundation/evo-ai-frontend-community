import { useEffect, useRef, useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@evoapi/design-system';
import GlobalMessageTemplateService from '@/services/messageTemplates/globalMessageTemplatesService';
import type { MessageTemplate } from '@/types';

interface GlobalTemplateSelectProps {
  /** Currently selected global template id (or null/undefined for none). */
  value?: string | null;
  onChange: (templateId: string) => void;
  placeholder?: string;
  /** Shown (disabled) when there are no global templates to pick. */
  emptyText?: string;
  disabled?: boolean;
}

/**
 * Lists GLOBAL (channel-less) message templates and emits the selected id.
 *
 * Consumes the flat `/message_templates` endpoint (no inbox_id) via
 * GlobalMessageTemplateService, so only channel-less templates appear — the
 * same catalog managed in Settings → Message Templates. Reusable wherever a
 * global template needs to be attached (greeting / out-of-office, and later
 * automation / chat). Fetches once on mount.
 */
export default function GlobalTemplateSelect({
  value,
  onChange,
  placeholder,
  emptyText,
  disabled = false,
}: GlobalTemplateSelectProps) {
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    (async () => {
      try {
        const response = await GlobalMessageTemplateService.getTemplates({
          per_page: 200,
          sort_by: 'name',
        });
        if (mounted.current) setTemplates(response.data ?? []);
      } catch {
        // No read permission or transient error: degrade to an empty list.
        if (mounted.current) setTemplates([]);
      } finally {
        if (mounted.current) setLoading(false);
      }
    })();
    return () => {
      mounted.current = false;
    };
  }, []);

  const isEmpty = !loading && templates.length === 0;

  return (
    <Select
      value={value ?? undefined}
      onValueChange={onChange}
      disabled={disabled || loading || isEmpty}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder={isEmpty ? emptyText : placeholder} />
      </SelectTrigger>
      <SelectContent>
        {templates.map(template => (
          <SelectItem key={template.id} value={String(template.id)}>
            {template.name}
            {template.language ? ` (${template.language})` : ''}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
