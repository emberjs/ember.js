import { ENV } from '@ember/-internals/environment';
import { set } from '@ember/-internals/metal';
import { Owner } from '@ember/-internals/owner';
import { assert, debugFreeze } from '@ember/debug';
import {
  ComponentCapabilities,
  Dict,
  DynamicScope,
  VMArguments as Arguments,
  Bounds,
  PreparedArguments,
  Destroyable,
} from '@glimmer/interfaces';
import { VersionedPathReference } from '@glimmer/reference';
import { CONSTANT_TAG, isConst } from '@glimmer/validator';
import Environment from '../environment';
import { RootReference } from '../utils/references';
import InternalComponentManager, { InternalDefinitionState } from './internal';
import { createTag } from '@glimmer/validator';

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
};

export interface InputComponentState {
  env: Environment;
  type: VersionedPathReference;
  instance: Destroyable;
}

const EMPTY_POSITIONAL_ARGS: VersionedPathReference[] = [];

debugFreeze(EMPTY_POSITIONAL_ARGS);

export default class InputComponentManager extends InternalComponentManager<InputComponentState> {
  getCapabilities(): ComponentCapabilities {
    return CAPABILITIES;
  }

  prepareArgs(_state: InternalDefinitionState, args: Arguments): PreparedArguments {
    assert(
      'The `<Input />` component does not take any positional arguments',
      args.positional.length === 0
    );

    let __ARGS__: Dict<VersionedPathReference> = args.named.capture().map;

    return {
      positional: EMPTY_POSITIONAL_ARGS,
      named: {
        __ARGS__: new RootReference(__ARGS__),
        type: args.named.get('type'),
      },
    };
  }

  create(
    env: Environment,
    { ComponentClass }: InternalDefinitionState,
    args: Arguments,
    _dynamicScope: DynamicScope,
    caller: VersionedPathReference
  ): InputComponentState {
    assert('caller must be const', isConst(caller));

    let type = args.named.get('type');

    let instance = ComponentClass.create({
      caller: caller.value(),
      type: type.value(),
    });

    let state = { env, type, instance };

    if (ENV._DEBUG_RENDER_TREE) {
      env.debugRenderTree.create(state, {
        type: 'component',
        name: 'input',
        args: args.capture(),
        instance,
      });
    }

    return state;
  }

  getSelf({ instance }: InputComponentState): VersionedPathReference {
    return new RootReference(instance);
  }

  getTag() {
    if (ENV._DEBUG_RENDER_TREE) {
      // returning a const tag skips the update hook (VM BUG?)
      return createTag();
    } else {
      // an outlet has no hooks
      return CONSTANT_TAG;
    }
  }

  didRenderLayout(state: InputComponentState, bounds: Bounds): void {
    if (ENV._DEBUG_RENDER_TREE) {
      state.env.debugRenderTree.didRender(state, bounds);
    }
  }

  update(state: InputComponentState): void {
    set(state.instance, 'type', state.type.value());

    if (ENV._DEBUG_RENDER_TREE) {
      state.env.debugRenderTree.update(state);
    }
  }

  didUpdateLayout(state: InputComponentState, bounds: Bounds): void {
    if (ENV._DEBUG_RENDER_TREE) {
      state.env.debugRenderTree.didRender(state, bounds);
    }
  }

  getDestructor(state: InputComponentState): Destroyable {
    if (ENV._DEBUG_RENDER_TREE) {
      return {
        destroy() {
          state.env.debugRenderTree.willDestroy(state);
          state.instance.destroy();
        },
      };
    } else {
      return state.instance;
    }
  }
}

export const InputComponentManagerFactory = (owner: Owner) => {
  return new InputComponentManager(owner);
};
