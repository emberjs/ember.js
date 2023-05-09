import {
  type Dict,
  type Owner,
  type Template,
  type VMArguments,
  type WithCreateInstance,
} from '@glimmer/interfaces';
import { getComponentTemplate } from '@glimmer/manager';
import { createConstRef, type Reference } from '@glimmer/reference';
import { EMPTY_ARGS } from '@glimmer/runtime';

import { type ComponentArgs } from '../interfaces';
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
  hasSubOwner: false,
};

interface BasicState {
  self: Reference<unknown>;
  instance: object;
}

class BasicComponentManager
  implements WithCreateInstance<BasicState, new (args: Readonly<Dict<unknown>>) => object, Owner>
{
  create(
    _owner: Owner,
    Component: { new (args: ComponentArgs): object },
    args: VMArguments | null
  ) {
    const instance = new Component(argsProxy(args === null ? EMPTY_ARGS : args.capture()));
    const self = createConstRef(instance, 'this');
    return { instance, self };
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

  getStaticLayout(definition: object): Template {
    return getComponentTemplate(definition)!();
  }
}

const basicComponentManager = new BasicComponentManager();

export default basicComponentManager;
