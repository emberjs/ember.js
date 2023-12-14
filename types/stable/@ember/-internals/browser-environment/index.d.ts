declare module '@ember/-internals/browser-environment' {
  export { default as hasDOM } from '@ember/-internals/browser-environment/lib/has-dom';
  export const window: (Window & typeof globalThis) | null;
  export const location: Location | null;
  export const history: History | null;
  export const userAgent: string;
  export const isChrome: boolean;
  export const isFirefox: boolean;
}
