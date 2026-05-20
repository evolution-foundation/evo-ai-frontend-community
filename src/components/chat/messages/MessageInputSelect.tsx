import React from 'react';
import { List } from 'lucide-react';

interface SelectItem {
  title: string;
  value: string;
}

interface MessageInputSelectProps {
  content?: string;
  contentAttributes?: Record<string, unknown>;
}

const MessageInputSelect: React.FC<MessageInputSelectProps> = ({
  content,
  contentAttributes,
}) => {
  const items: SelectItem[] = Array.isArray(contentAttributes?.items)
    ? (contentAttributes.items as SelectItem[]).filter(
        (item) => item && typeof item.title === 'string',
      )
    : [];

  if (items.length === 0) {
    return <p className="text-sm">{content || ''}</p>;
  }

  const isButtons = items.length <= 3;

  return (
    <div className="space-y-2">
      {content && (
        <p className="text-sm">{content}</p>
      )}

      {isButtons ? (
        <div className="flex flex-wrap gap-1.5 mt-1">
          {items.map((item, index) => (
            <span
              key={item.value || index}
              className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium
                bg-white/20 text-inherit border border-white/30 backdrop-blur-sm"
            >
              {item.title}
            </span>
          ))}
        </div>
      ) : (
        <div className="mt-1 rounded-lg border border-white/20 overflow-hidden backdrop-blur-sm"
          style={{ maxWidth: 'min(280px, calc(100vw - 120px))' }}
        >
          <div className="flex items-center gap-2 px-3 py-2 bg-white/10 border-b border-white/20">
            <List className="h-3.5 w-3.5 opacity-70" />
            <span className="text-xs font-medium opacity-70">Menu</span>
          </div>
          <div className="divide-y divide-white/10">
            {items.map((item, index) => (
              <div
                key={item.value || index}
                className="px-3 py-2 text-sm"
              >
                {item.title}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MessageInputSelect;
