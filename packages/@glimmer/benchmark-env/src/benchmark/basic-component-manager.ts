import { WithCreateInstance, Environment, Dict, VMArguments } from '@glimmer/interfaces';
import { ComponentRootReference } from '@glimmer/reference';
import { EMPTY_ARGS } from '@glimmer/runtime';
import { ComponentArgs } from '../interfaces';
import argsProxy from './args-proxy';

const BASIC_COMPONENT_CAPABILITIES = {
  dynamicLayout: false,
  dynamicTag: false,
  prepareArgs: false,
  createArgs: true,
  attributeHook: false,
  elementHook: false,
  dynamicScope: false,
  createCaller: false,
  updateHook: false,
  createInstance: true,
  wrapped: false,
  willDestroy: false,
};

interface BasicState {
  env: Environment;
  self: ComponentRootReference<unknown>;
  instance: object;
}

class BasicComponentManager
  implements
    WithCreateInstance<BasicState, Environment, new (args: Readonly<Dict<unknown>>) => object> {
  create(
    env: Environment,
    Component: new (args: ComponentArgs) => object,
    args: VMArguments | null
  ) {
    const instance = new Component(argsProxy(args === null ? EMPTY_ARGS : args.capture()));
    const self = new ComponentRootReference(instance);
    return { env, instance, self };
  }

  getDebugName() {
    return 'basic-benchmark-component';
  }

  didCreate() {
    //
  }

  didRenderLayout() {
    //
  }

  didUpdate() {
    //
  }

  didUpdateLayout() {
    //
  }

  getCapabilities() {
    return BASIC_COMPONENT_CAPABILITIES;
  }

  getSelf(state: BasicState) {
    return state.self;
  }

  getDestroyable(state: BasicState) {
    return state.instance;
  }
}

const basicComponentManager = new BasicComponentManager();

export default basicComponentManager;
