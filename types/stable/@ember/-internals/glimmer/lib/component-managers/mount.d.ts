declare module '@ember/-internals/glimmer/lib/component-managers/mount' {
  import type { InternalOwner } from '@ember/-internals/owner';
  import EngineInstance from '@ember/engine/instance';
  import type {
    CapturedArguments,
    ComponentDefinition,
    CustomRenderNode,
    Destroyable,
    Environment,
    InternalComponentCapabilities,
    VMArguments,
    WithCreateInstance,
    WithCustomDebugRenderTree,
    WithDynamicLayout,
    WithSubOwner,
  } from '@glimmer/interfaces';
  import type { Nullable } from '@ember/-internals/utility-types';
  import type { Reference } from '@glimmer/reference';
  import type RuntimeResolver from '@ember/-internals/glimmer/lib/resolver';
  interface EngineState {
    engine: EngineInstance;
    controller: any;
    self: Reference;
    modelRef?: Reference;
  }
  interface EngineDefinitionState {
    name: string;
  }
  class MountManager
    implements
      WithCreateInstance<EngineState>,
      WithDynamicLayout<EngineState, RuntimeResolver>,
      WithCustomDebugRenderTree<EngineState, EngineDefinitionState>,
      WithSubOwner<EngineState>
  {
    getDynamicLayout(state: EngineState): import('@glimmer/interfaces').CompilableProgram;
    getCapabilities(): InternalComponentCapabilities;
    getOwner(state: EngineState): EngineInstance;
    create(
      owner: InternalOwner,
      { name }: EngineDefinitionState,
      args: VMArguments,
      env: Environment
    ): EngineState;
    getDebugName({ name }: EngineDefinitionState): string;
    getDebugCustomRenderTree(
      definition: EngineDefinitionState,
      state: EngineState,
      args: CapturedArguments,
      templateModuleName?: string
    ): CustomRenderNode[];
    getSelf({ self }: EngineState): Reference;
    getDestroyable(bucket: EngineState): Nullable<Destroyable>;
    didCreate(): void;
    didUpdate(): void;
    didRenderLayout(): void;
    didUpdateLayout(): void;
    update(bucket: EngineState): void;
  }
  export class MountDefinition implements ComponentDefinition {
    resolvedName: string;
    handle: number;
    state: EngineDefinitionState;
    manager: MountManager;
    compilable: null;
    capabilities: import('@glimmer/interfaces').CapabilityMask;
    constructor(resolvedName: string);
  }
  export {};
}
