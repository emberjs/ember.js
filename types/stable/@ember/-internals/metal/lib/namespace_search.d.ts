declare module '@ember/-internals/metal/lib/namespace_search' {
  export interface Namespace {
    isNamespace: true;
    destroy(): void;
  }
  export const NAMESPACES: Namespace[];
  export const NAMESPACES_BY_ID: {
    [name: string]: Namespace;
  };
  export function addNamespace(namespace: Namespace): void;
  export function removeNamespace(namespace: Namespace): void;
  export function findNamespaces(): void;
  export function findNamespace(name: string): Namespace | undefined;
  export function processNamespace(namespace: Namespace): void;
  export function processAllNamespaces(): void;
  export function isSearchDisabled(): boolean;
  export function setSearchDisabled(flag: boolean): void;
  export function setUnprocessedMixins(): void;
}
