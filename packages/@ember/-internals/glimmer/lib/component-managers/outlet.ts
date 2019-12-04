import { ENV } from '@ember/-internals/environment';
import { guidFor } from '@ember/-internals/utils';
import { assert } from '@ember/debug';
import EngineInstance from '@ember/engine/instance';
import { _instrumentStart } from '@ember/instrumentation';
import { assign } from '@ember/polyfills';
import {
  Bounds,
  ComponentCapabilities,
  ComponentDefinition,
  Destroyable,
  ElementOperations,
  Option,
  VMArguments,
  WithDynamicTagName,
  WithJitStaticLayout,
 } from '@glimmer/interfaces';
 import { unwrapTemplate } from '@glimmer/opcode-compiler';
 import { ComponentRootReference, VersionedPathReference } from '@glimmer/reference';
import { EMPTY_ARGS } from '@glimmer/runtime';
import { CONSTANT_TAG, createTag, Tag } from '@glimmer/validator';

import { SimpleElement } from '@simple-dom/interface';
import { EmberVMEnvironment } from '../environment';
import { DynamicScope } from '../renderer';
import RuntimeResolver from '../resolver';
import { OwnedTemplate } from '../template';
import { OutletState } from '../utils/outlet';
import OutletView from '../views/outlet';
import AbstractManager from './abstract';

function instrumentationPayload(def: OutletDefinitionState) {
  return { object: `${def.name}:${def.outlet}` };
}

interface OutletInstanceState {
  self: VersionedPathReference<any | undefined>;
  environment: EmberVMEnvironment;
  outlet?: { name: string };
  engine?: { mountPoint: string };
  finalize: () => void;
}

export interface OutletDefinitionState {
  ref: VersionedPathReference<OutletState | undefined>;
  name: string;
  outlet: string;
  template: OwnedTemplate;
  controller: unknown;
  model: unknown;
}

const CAPABILITIES: ComponentCapabilities = {
  dynamicLayout: false,
  dynamicTag: false,
  prepareArgs: false,
  createArgs: ENV._DEBUG_RENDER_TREE,
  attributeHook: false,
  elementHook: false,
  createCaller: false,
  dynamicScope: true,
  updateHook: ENV._DEBUG_RENDER_TREE,
  createInstance: true,
  wrapped: false,
};

class OutletComponentManager extends AbstractManager<OutletInstanceState, OutletDefinitionState>
  implements
    WithJitStaticLayout<
      OutletInstanceState,
      OutletDefinitionState,
      RuntimeResolver
    > {
  create(
    environment: EmberVMEnvironment,
    definition: OutletDefinitionState,
    args: VMArguments,
    dynamicScope: DynamicScope
  ): OutletInstanceState {
    let parentStateRef = dynamicScope.outletState;
    let currentStateRef = definition.ref;

    dynamicScope.outletState = currentStateRef;

    let state: OutletInstanceState = {
      self: new ComponentRootReference(definition.controller, environment),
      environment,
      finalize: _instrumentStart('render.outlet', instrumentationPayload, definition),
    };

    if (ENV._DEBUG_RENDER_TREE) {
      state.outlet = { name: definition.outlet };

      environment.extra.debugRenderTree.create(state.outlet, {
        type: 'outlet',
        name: state.outlet.name,
        args: EMPTY_ARGS,
        instance: undefined,
        template: undefined,
      });

      let parentState = parentStateRef.value();
      let parentOwner = parentState && parentState.render && parentState.render.owner;
      let currentOwner = currentStateRef.value()!.render!.owner;

      if (parentOwner && parentOwner !== currentOwner) {
        let engine = currentOwner as EngineInstance;

        assert('invalid engine: missing mountPoint', typeof currentOwner.mountPoint === 'string');
        assert('invalid engine: missing routable', currentOwner.routable === true);

        let mountPoint = engine.mountPoint!;

        state.engine = { mountPoint };

        environment.extra.debugRenderTree.create(state.engine, {
          type: 'engine',
          name: mountPoint,
          args: EMPTY_ARGS,
          instance: engine,
          template: undefined,
        });
      }

      environment.extra.debugRenderTree.create(state, {
        type: 'route-template',
        name: definition.name,
        args: args.capture(),
        instance: definition.controller,
        template: definition.template,
      });
    }

    return state;
  }

  getJitStaticLayout({ template }: OutletDefinitionState, _resolver: RuntimeResolver) {
    // The router has already resolved the template
    return unwrapTemplate(template).asLayout();
  }

  getCapabilities(): ComponentCapabilities {
    return CAPABILITIES;
  }

  getSelf({ self }: OutletInstanceState) {
    return self;
  }

  getTag(): Tag {
    if (ENV._DEBUG_RENDER_TREE) {
      // returning a const tag skips the update hook (VM BUG?)
      return createTag();
    } else {
      // an outlet has no hooks
      return CONSTANT_TAG;
    }
  }

  didRenderLayout(state: OutletInstanceState, bounds: Bounds): void {
    state.finalize();

    if (ENV._DEBUG_RENDER_TREE) {
      state.environment.extra.debugRenderTree.didRender(state, bounds);

      if (state.engine) {
        state.environment.extra.debugRenderTree.didRender(state.engine, bounds);
      }

      state.environment.extra.debugRenderTree.didRender(state.outlet!, bounds);
    }
  }

  update(state: OutletInstanceState): void {
    if (ENV._DEBUG_RENDER_TREE) {
      state.environment.extra.debugRenderTree.update(state.outlet!);

      if (state.engine) {
        state.environment.extra.debugRenderTree.update(state.engine);
      }

      state.environment.extra.debugRenderTree.update(state);
    }
  }

  didUpdateLayout(state: OutletInstanceState, bounds: Bounds): void {
    if (ENV._DEBUG_RENDER_TREE) {
      state.environment.extra.debugRenderTree.didRender(state, bounds);

      if (state.engine) {
        state.environment.extra.debugRenderTree.didRender(state.engine, bounds);
      }

      state.environment.extra.debugRenderTree.didRender(state.outlet!, bounds);
    }
  }

  getDestructor(state: OutletInstanceState): Option<Destroyable> {
    if (ENV._DEBUG_RENDER_TREE) {
      return {
        destroy() {
          state.environment.extra.debugRenderTree.willDestroy(state);

          if (state.engine) {
            state.environment.extra.debugRenderTree.willDestroy(state.engine);
          }

          state.environment.extra.debugRenderTree.willDestroy(state.outlet!);
        },
      };
    } else {
      return null;
    }
  }
}

const OUTLET_MANAGER = new OutletComponentManager();

export class OutletComponentDefinition
  implements ComponentDefinition<OutletDefinitionState, OutletInstanceState, OutletComponentManager> {
  constructor(
    public state: OutletDefinitionState,
    public manager: OutletComponentManager = OUTLET_MANAGER
  ) {}
}

export function createRootOutlet(outletView: OutletView): OutletComponentDefinition {
  if (ENV._APPLICATION_TEMPLATE_WRAPPER) {
    const WRAPPED_CAPABILITIES = assign({}, CAPABILITIES, {
      dynamicTag: true,
      elementHook: true,
    });

    const WrappedOutletComponentManager = class extends OutletComponentManager
      implements WithDynamicTagName<OutletInstanceState> {
      getTagName(_component: OutletInstanceState) {
        return 'div';
      }

      getLayout(state: OutletDefinitionState) {
        // The router has already resolved the template
        return unwrapTemplate(state.template).asWrappedLayout();
      }

      getCapabilities(): ComponentCapabilities {
        return WRAPPED_CAPABILITIES;
      }

      didCreateElement(
        component: OutletInstanceState,
        element: SimpleElement,
        _operations: ElementOperations
      ): void {
        // to add GUID id and class
        element.setAttribute('class', 'ember-view');
        element.setAttribute('id', guidFor(component));
      }
    };

    const WRAPPED_OUTLET_MANAGER = new WrappedOutletComponentManager();

    return new OutletComponentDefinition(outletView.state, WRAPPED_OUTLET_MANAGER);
  } else {
    return new OutletComponentDefinition(outletView.state);
  }
}
