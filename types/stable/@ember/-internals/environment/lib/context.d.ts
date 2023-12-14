declare module '@ember/-internals/environment/lib/context' {
  export interface GlobalContext {
    imports: object;
    exports: object;
    lookup: Record<string, unknown>;
  }
  export const context: GlobalContext;
  export function getLookup(): Record<string, unknown>;
  export function setLookup(value: Record<string, unknown>): void;
}
