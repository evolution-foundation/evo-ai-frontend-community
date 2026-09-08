declare module '@rails/actioncable' {
  export interface Consumer {
    subscriptions: {
      create(
        channel: string | object,
        callbacks?: {
          connected?: () => void;
          disconnected?: () => void;
          rejected?: () => void;
          received?: (data: unknown) => void;
        }
      ): Subscription;
    };
    disconnect(): void;
  }

  export interface Subscription {
    unsubscribe(): void;
    perform(action: string, data?: unknown): void;
    send(data: unknown): void;
  }

  export function createConsumer(url: string): Consumer;
}
