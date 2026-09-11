/* eslint-disable @typescript-eslint/no-explicit-any */
import { createConsumer, Consumer, Subscription } from '@rails/actioncable';

export interface CableOptions {
  cableUrl?: string; // optional custom cable URL, defaults to VITE_API_URL + /cable
  // Lets the server route the stream to the widget's account before the contact lookup.
  websiteToken?: string;
}

// VITE_API_URL may be absolute (standalone) or a path under the current origin
// (embedded host); a bare path would throw in `new URL`.
export function resolveCableUrl(apiUrl: string | undefined, origin: string): string {
  const base = new URL(apiUrl || '/', origin);
  const path = base.pathname.replace(/\/+$/, '');
  return `${base.origin}${path}/cable`;
}

export interface CableHandlers {
  onMessage?: (payload: any) => void;
  onPresence?: (payload: any) => void;
  onDisconnect?: () => void;
}

export class WidgetCable {
  private consumer: Consumer;
  private subscription?: Subscription;
  private handlers: CableHandlers;

  constructor(pubsubToken: string, handlers: CableHandlers = {}, opts: CableOptions = {}) {
    const cableUrl = opts.cableUrl || resolveCableUrl(import.meta.env.VITE_API_URL, window.location.origin);
    this.consumer = createConsumer(cableUrl);
    this.handlers = handlers;

    this.subscription = this.consumer.subscriptions.create(
      {
        channel: 'RoomChannel',
        pubsub_token: pubsubToken,
        ...(opts.websiteToken ? { website_token: opts.websiteToken } : {}),
      },
      {
        received: (msg: any) => {
          if (!msg) return;
          if (msg.event === 'presence.update') {
            this.handlers.onPresence?.(msg.data);
          } else {
            this.handlers.onMessage?.(msg);
          }
        },
        disconnected: () => {
          this.handlers.onDisconnect?.();
        },
      },
    );
  }

  send(data: any) {
    if (this.subscription) {
      this.subscription.send(data);
    }
  }

  disconnect() {
    try {
      this.consumer.disconnect();
    } catch { /* empty */ }
  }
}
