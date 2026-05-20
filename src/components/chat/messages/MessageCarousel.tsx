import React, { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CardAction {
  text: string;
  type: string;
  payload?: string;
  uri?: string;
}

interface CardItem {
  title: string;
  description?: string;
  media_url?: string;
  actions?: CardAction[];
}

interface MessageCarouselProps {
  content?: string;
  contentAttributes?: Record<string, unknown>;
}

const CARD_WIDTH = 220;
const CARD_GAP = 8;

const MessageCarousel: React.FC<MessageCarouselProps> = ({
  content,
  contentAttributes,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const items: CardItem[] = Array.isArray(contentAttributes?.items)
    ? (contentAttributes.items as CardItem[]).filter(
        (item) => item && typeof item.title === 'string',
      )
    : [];

  if (items.length === 0) {
    return <p className="text-sm">{content || ''}</p>;
  }

  const updateScrollState = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  };

  const scroll = (direction: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    const distance = CARD_WIDTH + CARD_GAP;
    el.scrollBy({ left: direction === 'left' ? -distance : distance, behavior: 'smooth' });
  };

  const showArrows = items.length > 1;

  return (
    <div className="space-y-2">
      {content && <p className="text-sm">{content}</p>}

      <div className="relative">
        {/* Scroll arrows */}
        {showArrows && canScrollLeft && (
          <button
            onClick={() => scroll('left')}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-6 h-6 flex items-center justify-center
              rounded-full bg-black/40 text-white/90 backdrop-blur-sm hover:bg-black/60 transition-colors"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
        )}
        {showArrows && canScrollRight && (
          <button
            onClick={() => scroll('right')}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-6 h-6 flex items-center justify-center
              rounded-full bg-black/40 text-white/90 backdrop-blur-sm hover:bg-black/60 transition-colors"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        )}

        {/* Cards container */}
        <div
          ref={scrollRef}
          onScroll={updateScrollState}
          className="flex gap-2 overflow-x-auto scrollbar-hide snap-x snap-mandatory"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {items.map((card, index) => (
            <div
              key={index}
              className="snap-start shrink-0 rounded-lg border border-white/20 overflow-hidden backdrop-blur-sm bg-white/5"
              style={{ width: CARD_WIDTH }}
            >
              {/* Card image */}
              {card.media_url && (
                <div className="w-full h-28 overflow-hidden bg-black/20">
                  <img
                    src={card.media_url}
                    alt={card.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
              )}

              {/* Card body */}
              <div className="p-2.5 space-y-1">
                <p className="text-sm font-medium leading-tight line-clamp-2">{card.title}</p>
                {card.description && (
                  <p className="text-xs opacity-70 leading-snug line-clamp-3">{card.description}</p>
                )}
              </div>

              {/* Card buttons */}
              {card.actions && card.actions.length > 0 && (
                <div className="border-t border-white/10 divide-y divide-white/10">
                  {card.actions.map((action, actionIdx) => (
                    <div
                      key={actionIdx}
                      className="px-2.5 py-1.5 text-xs text-center opacity-80"
                    >
                      {action.text}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MessageCarousel;
