declare module '@ember/-internals/glimmer/lib/utils/bindings' {
  import type { ElementOperations } from '@glimmer/interfaces';
  import type { Reference } from '@glimmer/reference';
  import type Component from '@ember/-internals/glimmer/lib/component';
  export function parseAttributeBinding(microsyntax: string): [string, string, boolean];
  export function installAttributeBinding(
    component: Component,
    rootRef: Reference<Component>,
    parsed: [string, string, boolean],
    operations: ElementOperations
  ): void;
  export function createClassNameBindingRef(
    rootRef: Reference<Component>,
    microsyntax: string,
    operations: ElementOperations
  ): void;
  export function createSimpleClassNameBindingRef(
    inner: Reference,
    path?: string
  ): Reference<string | null>;
  export function createColonClassNameBindingRef(
    inner: Reference,
    truthy: string,
    falsy: string | undefined
  ): Reference<string | undefined>;
}
