import { ENV } from '@ember/-internals/environment';
import { Owner } from '@ember/-internals/owner';
import { assert } from '@ember/debug';
import {
  Bounds,
  ComponentCapabilities,
  ComponentDefinition,
  Destroyable,
  DynamicScope,
  Template,
  VMArguments,
  WithStaticLayout,
} from '@glimmer/interfaces';
import { createConstRef, isConstRef, Reference, valueForRef } from '@glimmer/reference';
import { registerDestructor } from '@glimmer/runtime';
import { _WeakSet, unwrapTemplate } from '@glimmer/util';
import InternalComponent from '../components/internal';
import { EmberVMEnvironment } from '../environment';
import RuntimeResolver from '../resolver';
import AbstractComponentManager from './abstract';

const CAPABILITIES: ComponentCapabilities = {
  dynamicLayout: false,
  dynamicTag: false,
  prepareArgs: false,
  createArgs: true,
  attributeHook: false,
  elementHook: false,
  createCaller: true,
  dynamicScope: false,
  updateHook: true,
  createInstance: true,
  wrapped: false,
  willDestroy: false,
};

export interface InternalDefinitionState {
  ComponentClass: typeof InternalComponent;
  layout: Template;
}

export interface InternalComponentState {
  env: EmberVMEnvironment;
  instance: Destroyable;
}

export class InternalComponentDefinition
  implements ComponentDefinition<InternalDefinitionState, InternalComponentState, InternalManager> {
  public state: InternalDefinitionState;

  constructor(
    public manager: InternalManager,
    ComponentClass: typeof InternalComponent,
    layout: Template
  ) {
    this.state = { ComponentClass, layout };
  }
}

const INTERNAL_MANAGERS = new _WeakSet();

export function isInternalManager(manager: object): manager is InternalManager {
  return INTERNAL_MANAGERS.has(manager);
}

export default class InternalManager
  extends AbstractComponentManager<InternalComponentState, InternalDefinitionState>
  implements WithStaticLayout<InternalComponentState, InternalDefinitionState, RuntimeResolver> {
  static for(name: string): (owner: Owner) => InternalManager {
    return (owner: Owner) => new InternalManager(owner, name);
  }

  constructor(private owner: Owner, private name: string) {
    super();
    INTERNAL_MANAGERS.add(this);
  }

  getCapabilities(): ComponentCapabilities {
    return CAPABILITIES;
  }

  create(
    env: EmberVMEnvironment,
    { ComponentClass, layout }: InternalDefinitionState,
    args: VMArguments,
    _dynamicScope: DynamicScope,
    caller: Reference
  ): InternalComponentState {
    assert('caller must be const', isConstRef(caller));

    assert(
      `The ${this.name} component does not take any positional arguments`,
      args.positional.length === 0
    );

    let instance = new ComponentClass(this.owner, args.named.capture(), valueForRef(caller));

    let state = { env, instance };

    if (ENV._DEBUG_RENDER_TREE) {
      env.extra.debugRenderTree.create(state, {
        type: 'component',
        name: this.getDebugName(),
        args: args.capture(),
        instance,
        template: layout,
      });

      registerDestructor(instance, () => env.extra.debugRenderTree.willDestroy(state));
    }

    return state;
  }

  getDebugName(): string {
    return this.name;
  }

  getSelf({ instance }: InternalComponentState): Reference {
    return createConstRef(instance, 'this');
  }

  didRenderLayout(state: InternalComponentState, bounds: Bounds): void {
    if (ENV._DEBUG_RENDER_TREE) {
      state.env.extra.debugRenderTree.didRender(state, bounds);
    }
  }

  update(state: InternalComponentState): void {
    if (ENV._DEBUG_RENDER_TREE) {
      state.env.extra.debugRenderTree.update(state);
    }
  }

  didUpdateLayout(state: InternalComponentState, bounds: Bounds): void {
    if (ENV._DEBUG_RENDER_TREE) {
      state.env.extra.debugRenderTree.didRender(state, bounds);
    }
  }

  getDestroyable(state: InternalComponentState): Destroyable {
    return state.instance;
  }

  getStaticLayout({ layout: template }: InternalDefinitionState) {
    return unwrapTemplate(template).asLayout();
  }
}
