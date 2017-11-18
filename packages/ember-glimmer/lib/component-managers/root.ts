import { ComponentCapabilities } from '@glimmer/interfaces';
import {
  Arguments,
  ComponentDefinition
} from '@glimmer/runtime';
import { DEBUG } from 'ember-env-flags';
import {
  _instrumentStart,
  peekMeta,
} from 'ember-metal';
import Environment from '../environment';
import { DynamicScope } from '../renderer';
import ComponentStateBucket, { Component } from '../utils/curly-component-state-bucket';
import CurlyComponentManager, {
  initialRenderInstrumentDetails,
  processComponentInitializationAssertions,
} from './curly';
import DefintionState from './definition-state';

class RootComponentManager extends CurlyComponentManager {
  component: Component;

  constructor(component: Component) {
    super();
    this.component = component;
  }

  getLayout(...args: any[]) {
    console.log(...args);
  }

  create(environment: Environment,
         _state: DefintionState,
         _args: Arguments | null,
         dynamicScope: DynamicScope) {
    let component = this.component;

    if (DEBUG) {
      this._pushToDebugStack((component as any)._debugContainerKey, environment);
    }

    let finalizer = _instrumentStart('render.component', initialRenderInstrumentDetails, component);

    dynamicScope.view = component;

    // We usually do this in the `didCreateElement`, but that hook doesn't fire for tagless components
    if (component.tagName === '') {
      if (environment.isInteractive) {
        component.trigger('willRender');
      }

      component._transitionTo('hasElement');

      if (environment.isInteractive) {
        component.trigger('willInsertElement');
      }
    }

    if (DEBUG) {
      processComponentInitializationAssertions(component, {});
    }

    return new ComponentStateBucket(environment, component, null, finalizer);
  }
}

// ROOT is the top-level template it has nothing but one yield.
// it is supposed to have a dummy element
export const ROOT_CAPABILITIES: ComponentCapabilities = {
  dynamicLayout: false,
  dynamicTag: false,
  prepareArgs: false,
  createArgs: false,
  attributeHook: true,
  elementHook: true
};

export class RootComponentDefinition implements ComponentDefinition {
  state: DefintionState;
  manager: RootComponentManager;

  constructor(public component: Component) {
    let manager = new RootComponentManager(component);
    this.manager = manager;
    let factory = peekMeta(component)._factory;
    this.state = {
      name: factory.fullName,
      capabilities: ROOT_CAPABILITIES,
      ComponentClass: factory,
      handle: null,
    };
  }
}
