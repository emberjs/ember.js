import { set } from '@ember/-internals/metal';
import { Owner } from '@ember/-internals/owner';
import { assert, debugFreeze } from '@ember/debug';
import { ComponentCapabilities, Dict } from '@glimmer/interfaces';
import { CONSTANT_TAG, isConst, VersionedPathReference } from '@glimmer/reference';
import { Arguments, DynamicScope, Environment, PreparedArguments } from '@glimmer/runtime';
import { Destroyable } from '@glimmer/util';
import { RootReference } from '../utils/references';
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
};

export interface InputComponentState {
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
    _env: Environment,
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

    return { type, instance };
  }

  getSelf({ instance }: InputComponentState): VersionedPathReference {
    return new RootReference(instance);
  }

  getTag() {
    return CONSTANT_TAG;
  }

  update({ type, instance }: InputComponentState): void {
    set(instance, 'type', type.value());
  }

  getDestructor({ instance }: InputComponentState): Destroyable {
    return instance;
  }
}

export const InputComponentManagerFactory = (owner: Owner) => {
  return new InputComponentManager(owner);
};
