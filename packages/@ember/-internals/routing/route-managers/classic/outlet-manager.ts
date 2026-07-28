import type { InternalOwner } from '@ember/-internals/owner';
import type { Nullable } from '@ember/-internals/utility-types';
import { assert } from '@ember/debug';
import type EngineInstance from '@ember/engine/instance';
import { _instrumentStart } from '@ember/instrumentation';
import type {
  CustomRenderNode,
  Destroyable,
  Environment,
  InternalComponentCapabilities,
  PreparedArguments,
  WithCreateInstance,
  WithCustomDebugRenderTree,
  WithPrepareArgs,
  WithSubOwner,
} from '@glimmer/interfaces';
import { DEBUG } from '@glimmer/env';
import { setInternalComponentManager } from '@glimmer/manager/lib/internal/api';
import type { Reference } from '@glimmer/reference/lib/reference';
import {
  createConstRef,
  createDebugAliasRef,
  UNDEFINED_REFERENCE,
  valueForRef,
} from '@glimmer/reference/lib/reference';
import { EMPTY_ARGS, EMPTY_POSITIONAL } from '@glimmer/runtime/lib/vm/arguments';

import type { DynamicScope } from '../../../glimmer/lib/renderer';
import type { OutletState, RenderState } from '../outlet-state';

export type RenderableState = RenderState & { invokable: object };

export function isRenderable(render: RenderState | undefined): render is RenderableState {
  return render?.invokable !== undefined;
}

function instrumentationPayload(def: OutletDefinitionState) {
  // "main" used to be the outlet name, keeping it around for compatibility
  return { object: `${def.name}:main` };
}

interface OutletInstanceState {
  owner: InternalOwner;
  engine?: {
    instance: EngineInstance;
    mountPoint: string;
  };
  finalize: () => void;
}

/** What route managers see of `OutletComponent`, via `produceContext`. */
export interface OutletDefinitionState {
  ref: Reference<OutletState | undefined>;
  name: string;
  controller?: unknown;
  wrapper?: object;
  invokable?: object;
  bucket?: object;
}

const CAPABILITIES: InternalComponentCapabilities = {
  dynamicLayout: false,
  dynamicTag: false,
  prepareArgs: true,
  createArgs: false,
  attributeHook: false,
  elementHook: false,
  createCaller: false,
  dynamicScope: true,
  updateHook: false,
  createInstance: true,
  wrapped: false,
  willDestroy: false,
  hasSubOwner: true,
};

class OutletComponentManager
  implements
    WithCreateInstance<OutletInstanceState, OutletComponent>,
    WithCustomDebugRenderTree<OutletInstanceState, OutletComponent>,
    WithPrepareArgs<OutletInstanceState, OutletComponent>,
    WithSubOwner<OutletInstanceState, OutletComponent>
{
  prepareArgs(definition: OutletComponent): PreparedArguments {
    return {
      positional: EMPTY_POSITIONAL,
      named: {
        Component: createConstRef(definition.invokable, '@Component'),
        wrapper: createConstRef(definition.wrapper, '@wrapper'),
        bucket: createConstRef(definition.bucket, '@bucket'),
        context: definition.context,
      },
    };
  }

  create(
    _owner: InternalOwner,
    definition: OutletComponent,
    _args: unknown,
    env: Environment,
    dynamicScope: DynamicScope
  ): OutletInstanceState {
    let parentStateRef = dynamicScope.get('outletState');
    let currentStateRef = definition.ref;

    // This is the actual primary responsibility of the outlet component –
    // it represents the switching from one route component/template into
    // the next. The rest only exists to support the debug render tree and
    // the old-school (and unreliable) instrumentation.
    dynamicScope.set('outletState', currentStateRef);

    let state: OutletInstanceState = {
      owner: definition.owner,
      finalize: _instrumentStart('render.outlet', instrumentationPayload, definition),
    };

    if (env.debugRenderTree !== undefined) {
      let parentState = valueForRef(parentStateRef);
      let parentOwner = parentState?.render?.owner;
      let currentState = valueForRef(currentStateRef);
      let currentOwner = currentState?.render?.owner;

      if (parentOwner && parentOwner !== currentOwner) {
        assert(
          'Expected currentOwner to be an EngineInstance',
          currentOwner != null && 'buildChildEngineInstance' in currentOwner
        );

        let engineInstance = currentOwner as EngineInstance;
        let { mountPoint } = engineInstance;

        if (mountPoint) {
          state.engine = {
            mountPoint,
            instance: engineInstance,
          };
        }
      }
    }

    return state;
  }

  // How a routable engine's subtree gets the engine instance rather than
  // inheriting the parent app's owner from the call site.
  getOwner(state: OutletInstanceState): InternalOwner {
    return state.owner;
  }

  getDebugName({ name }: OutletComponent): string {
    return `{{outlet}} for ${name}`;
  }

  getDebugCustomRenderTree(
    _definition: OutletComponent,
    state: OutletInstanceState
  ): CustomRenderNode[] {
    let nodes: CustomRenderNode[] = [];

    nodes.push({
      bucket: state,
      type: 'outlet',
      // "main" used to be the outlet name, keeping it around for compatibility
      name: 'main',
      args: EMPTY_ARGS,
      instance: undefined,
    });

    if (state.engine) {
      nodes.push({
        bucket: state.engine,
        type: 'engine',
        name: state.engine.mountPoint,
        args: EMPTY_ARGS,
        instance: state.engine.instance,
      });
    }

    return nodes;
  }

  getCapabilities(): InternalComponentCapabilities {
    return CAPABILITIES;
  }

  getSelf() {
    return UNDEFINED_REFERENCE;
  }

  didCreate() {}
  didUpdate() {}

  didRenderLayout(state: OutletInstanceState): void {
    state.finalize();
  }

  didUpdateLayout() {}

  getDestroyable(): Nullable<Destroyable> {
    return null;
  }
}

const OUTLET_MANAGER = /*@__PURE__*/ new OutletComponentManager();

/**
 * An `OutletComponent` *is* the outlet's definition state: the helper builds
 * one per render target and returns it directly, and the VM turns it into a
 * `ComponentDefinition` via the manager and template on the prototype below.
 */
export class OutletComponent implements OutletDefinitionState {
  readonly owner: InternalOwner;
  readonly context: Reference;

  constructor(
    private readonly render: RenderableState,
    readonly ref: Reference<OutletState | undefined>,
    callerOwner: InternalOwner
  ) {
    this.owner = render.owner ?? callerOwner;

    // Built here because `produceContext` is given the state it belongs to.
    let context = render.produceContext
      ? render.produceContext(ref, this, this)
      : createConstRef(undefined, '@context');

    this.context = DEBUG ? createDebugAliasRef!('@context', context) : context;
  }

  get name(): string {
    return this.render.name;
  }

  get controller(): unknown {
    return this.render.controller;
  }

  get wrapper(): object | undefined {
    return this.render.wrapper;
  }

  get invokable(): object {
    return this.render.invokable;
  }

  get bucket(): object | undefined {
    return this.render.bucket;
  }

  isStableFor(render: RenderableState): boolean {
    // The wrapper is module-stable, so identity is carried by the invokable.
    // `controller` is excluded: it can legitimately appear after the first
    // render (setupController runs in didEnter).
    if (this.wrapper !== undefined || render.wrapper !== undefined) {
      return this.wrapper === render.wrapper && this.invokable === render.invokable;
    }

    return this.invokable === render.invokable && this.controller === render.controller;
  }
}

setInternalComponentManager(OUTLET_MANAGER, OutletComponent.prototype);

// The layout is associated in `./outlet`: importing the helper here would make
// the two modules mutually dependent, and the build rejects cycles.
