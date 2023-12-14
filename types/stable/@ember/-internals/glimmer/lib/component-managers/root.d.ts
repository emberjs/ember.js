declare module '@ember/-internals/glimmer/lib/component-managers/root' {
  import type {
    ComponentDefinition,
    Environment,
    InternalComponentCapabilities,
    Owner,
    VMArguments,
  } from '@glimmer/interfaces';
  import type { Nullable } from '@ember/-internals/utility-types';
  import type Component from '@ember/-internals/glimmer/lib/component';
  import type { DynamicScope } from '@ember/-internals/glimmer/lib/renderer';
  import ComponentStateBucket from '@ember/-internals/glimmer/lib/utils/curly-component-state-bucket';
  import CurlyComponentManager from '@ember/-internals/glimmer/lib/component-managers/curly';
  class RootComponentManager extends CurlyComponentManager {
    component: Component;
    constructor(component: Component);
    create(
      _owner: Owner,
      _state: unknown,
      _args: Nullable<VMArguments>,
      { isInteractive }: Environment,
      dynamicScope: DynamicScope
    ): ComponentStateBucket;
  }
  export const ROOT_CAPABILITIES: InternalComponentCapabilities;
  export class RootComponentDefinition implements ComponentDefinition {
    handle: number;
    resolvedName: string;
    state: object;
    manager: RootComponentManager;
    capabilities: import('@glimmer/interfaces').CapabilityMask;
    compilable: null;
    constructor(component: Component);
  }
  export {};
}
