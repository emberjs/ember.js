declare module '@ember/-internals/glimmer/lib/utils/bindings' {
  import type { ElementOperations } from '@glimmer/interfaces';
  import type { Reactive } from '@glimmer/reference';
  import type Component from '@ember/-internals/glimmer/lib/component';
  export function parseAttributeBinding(microsyntax: string): [string, string, boolean];
  export function installAttributeBinding(
    component: Component,
    rootRef: Reactive<Component>,
    parsed: [string, string, boolean],
    operations: ElementOperations
  ): void;
  export function createClassNameBindingRef(
    rootRef: Reactive<Component>,
    microsyntax: string,
    operations: ElementOperations
  ): void;
  export function createSimpleClassNameBindingRef(
    inner: Reactive,
    path?: string
  ): import('@glimmer/interfaces').ReactiveFormula<string | null>;
  export function createColonClassNameBindingRef(
    inner: Reactive,
    truthy: string,
    falsy: string | undefined
  ): import('@glimmer/interfaces').ReactiveFormula<string | undefined>;
}
