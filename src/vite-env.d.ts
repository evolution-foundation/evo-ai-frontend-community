/// <reference types="vite/client" />

declare const __APP_VERSION__: string;

declare module '*.json' {
  const value: Record<string, unknown>;
  export default value;
}
