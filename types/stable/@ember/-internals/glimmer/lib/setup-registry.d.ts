declare module '@ember/-internals/glimmer/lib/setup-registry' {
  import type { Registry } from '@ember/-internals/container';
  export function setupApplicationRegistry(registry: Registry): void;
  export function setupEngineRegistry(registry: Registry): void;
}
