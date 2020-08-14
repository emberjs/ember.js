import { ENV } from '@ember/-internals/environment';
import { set } from '@ember/-internals/metal';
import { Owner } from '@ember/-internals/owner';
import { assert, debugFreeze } from '@ember/debug';
import {
  Bounds,
  ComponentCapabilities,
  Destroyable,
  Dict,
  DynamicScope,
  PreparedArguments,
  VMArguments,
} from '@glimmer/interfaces';
import { createConstRef, isConstRef, Reference, valueForRef } from '@glimmer/reference';
import { registerDestructor } from '@glimmer/runtime';
import { EmberVMEnvironment } from '../environment';
import InternalComponentManager, { InternalDefinitionState } from './internal';

const CAPABILITIES: ComponentCapabilities = {
  dynamicLayout: false,
  dynamicTag: false,
  prepareArgs: true,
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

export interface InputComponentState {
  env: EmberVMEnvironment;
  type: Reference;
  instance: Destroyable;
}

const EMPTY_POSITIONAL_ARGS: Reference[] = [];

debugFreeze(EMPTY_POSITIONAL_ARGS);

export default class InputComponentManager extends InternalComponentManager<InputComponentState> {
  getCapabilities(): ComponentCapabilities {
    return CAPABILITIES;
  }

  prepareArgs(_state: InternalDefinitionState, args: VMArguments): PreparedArguments {
    assert(
      'The `<Input />` component does not take any positional arguments',
      args.positional.length === 0
    );

    let __ARGS__: Dict<Reference> = args.named.capture();

    return {
      positional: EMPTY_POSITIONAL_ARGS,
      named: {
        __ARGS__: createConstRef(__ARGS__, 'args'),
        type: args.named.get('type'),
      },
    };
  }

  create(
    env: EmberVMEnvironment,
    { ComponentClass, layout }: InternalDefinitionState,
    args: VMArguments,
    _dynamicScope: DynamicScope,
    caller: Reference
  ): InputComponentState {
    assert('caller must be const', isConstRef(caller));

    let type = args.named.get('type');

    let instance = ComponentClass.create({
      caller: valueForRef(caller),
      type: valueForRef(type),
    });

    let state = { env, type, instance };

    if (ENV._DEBUG_RENDER_TREE) {
      env.extra.debugRenderTree.create(state, {
        type: 'component',
        name: 'input',
        args: args.capture(),
        instance,
        template: layout,
      });

      registerDestructor(instance, () => env.extra.debugRenderTree.willDestroy(state));
    }

    return state;
  }

  getDebugName() {
    return 'input';
  }

  getSelf({ instance }: InputComponentState): Reference {
    return createConstRef(instance, 'this');
  }

  didRenderLayout(state: InputComponentState, bounds: Bounds): void {
    if (ENV._DEBUG_RENDER_TREE) {
      state.env.extra.debugRenderTree.didRender(state, bounds);
    }
  }

  update(state: InputComponentState): void {
    set(state.instance, 'type', valueForRef(state.type));

    if (ENV._DEBUG_RENDER_TREE) {
      state.env.extra.debugRenderTree.update(state);
    }
  }

  didUpdateLayout(state: InputComponentState, bounds: Bounds): void {
    if (ENV._DEBUG_RENDER_TREE) {
      state.env.extra.debugRenderTree.didRender(state, bounds);
    }
  }

  getDestroyable(state: InputComponentState): Destroyable {
    return state.instance;
  }
}

export const InputComponentManagerFactory = (owner: Owner) => {
  return new InputComponentManager(owner);
};
