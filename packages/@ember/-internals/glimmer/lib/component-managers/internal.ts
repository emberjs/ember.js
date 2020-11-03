import { Owner } from '@ember/-internals/owner';
import { assert } from '@ember/debug';
import {
  ComponentCapabilities,
  ComponentDefinition,
  Destroyable,
  DynamicScope,
  Environment,
  Template,
  VMArguments,
  WithStaticLayout,
} from '@glimmer/interfaces';
import { createConstRef, isConstRef, Reference, valueForRef } from '@glimmer/reference';
import { _WeakSet } from '@glimmer/util';
import InternalComponent from '../components/internal';
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
  updateHook: false,
  createInstance: true,
  wrapped: false,
  willDestroy: false,
};

export interface InternalDefinitionState {
  ComponentClass: typeof InternalComponent;
  layout: Template;
}

export interface InternalComponentState {
  env: Environment;
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
  implements WithStaticLayout<InternalComponentState, InternalDefinitionState> {
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
    env: Environment,
    { ComponentClass }: InternalDefinitionState,
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

    return state;
  }

  getDebugName(): string {
    return this.name;
  }

  getSelf({ instance }: InternalComponentState): Reference {
    return createConstRef(instance, 'this');
  }

  didCreate(): void {}

  didUpdate(): void {}

  didRenderLayout(): void {}

  didUpdateLayout(): void {}

  getDestroyable(state: InternalComponentState): Destroyable {
    return state.instance;
  }

  getStaticLayout({ layout: template }: InternalDefinitionState): Template {
    return template;
  }
}
