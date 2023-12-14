declare module '@ember/-internals/glimmer/lib/component-managers/outlet' {
  import type { InternalOwner } from '@ember/-internals/owner';
  import EngineInstance from '@ember/engine/instance';
  import type {
    CapturedArguments,
    CompilableProgram,
    ComponentDefinition,
    CapabilityMask,
    CustomRenderNode,
    Destroyable,
    Environment,
    InternalComponentCapabilities,
    Template,
    VMArguments,
    WithCreateInstance,
    WithCustomDebugRenderTree,
  } from '@glimmer/interfaces';
  import type { Nullable } from '@ember/-internals/utility-types';
  import type { Reference } from '@glimmer/reference';
  import type { DynamicScope } from '@ember/-internals/glimmer/lib/renderer';
  import type { OutletState } from '@ember/-internals/glimmer/lib/utils/outlet';
  import type OutletView from '@ember/-internals/glimmer/lib/views/outlet';
  interface OutletInstanceState {
    self: Reference;
    outletBucket?: {};
    engineBucket?: {
      mountPoint: string;
    };
    engine?: EngineInstance;
    finalize: () => void;
  }
  export interface OutletDefinitionState {
    ref: Reference<OutletState | undefined>;
    name: string;
    template: Template;
    controller: unknown;
    model: unknown;
  }
  class OutletComponentManager
    implements
      WithCreateInstance<OutletInstanceState>,
      WithCustomDebugRenderTree<OutletInstanceState, OutletDefinitionState>
  {
    create(
      _owner: InternalOwner,
      definition: OutletDefinitionState,
      _args: VMArguments,
      env: Environment,
      dynamicScope: DynamicScope
    ): OutletInstanceState;
    getDebugName({ name }: OutletDefinitionState): string;
    getDebugCustomRenderTree(
      definition: OutletDefinitionState,
      state: OutletInstanceState,
      args: CapturedArguments
    ): CustomRenderNode[];
    getCapabilities(): InternalComponentCapabilities;
    getSelf({ self }: OutletInstanceState): Reference<unknown>;
    didCreate(): void;
    didUpdate(): void;
    didRenderLayout(state: OutletInstanceState): void;
    didUpdateLayout(): void;
    getDestroyable(): Nullable<Destroyable>;
  }
  export class OutletComponentDefinition
    implements
      ComponentDefinition<OutletDefinitionState, OutletInstanceState, OutletComponentManager>
  {
    state: OutletDefinitionState;
    manager: OutletComponentManager;
    handle: number;
    resolvedName: string;
    compilable: CompilableProgram;
    capabilities: CapabilityMask;
    constructor(state: OutletDefinitionState, manager?: OutletComponentManager);
  }
  export function createRootOutlet(outletView: OutletView): OutletComponentDefinition;
  export {};
}
