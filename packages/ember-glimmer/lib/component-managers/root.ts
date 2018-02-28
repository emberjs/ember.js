import { ComponentCapabilities } from '@glimmer/interfaces';
import {
  Arguments,
  ComponentDefinition
} from '@glimmer/runtime';
import { FACTORY_FOR } from 'container';
import { DEBUG } from 'ember-env-flags';
import { _instrumentStart } from 'ember-metal';
import { DIRTY_TAG } from '../component';
import Environment from '../environment';
import { DynamicScope } from '../renderer';
import RuntimeResolver from '../resolver';
import ComponentStateBucket, { Component } from '../utils/curly-component-state-bucket';
import CurlyComponentManager, {
  initialRenderInstrumentDetails,
  processComponentInitializationAssertions,
} from './curly';
import DefinitionState from './definition-state';

class RootComponentManager extends CurlyComponentManager {
  component: Component;

  constructor(component: Component) {
    super();
    this.component = component;
  }

  getLayout(_state: DefinitionState, resolver: RuntimeResolver) {
    const template = this.templateFor(this.component, resolver);
    const layout = template.asWrappedLayout();
    return {
      handle: layout.compile(),
      symbolTable: layout.symbolTable,
    };
  }

  create(environment: Environment,
         _state: DefinitionState,
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
  dynamicTag: true,
  prepareArgs: false,
  createArgs: false,
  attributeHook: true,
  elementHook: true
};

export class RootComponentDefinition implements ComponentDefinition {
  state: DefinitionState;
  manager: RootComponentManager;

  constructor(public component: Component) {
    let manager = new RootComponentManager(component);
    this.manager = manager;
    let factory = FACTORY_FOR.get(component);
    this.state = {
      name: factory.fullName.slice(10),
      capabilities: ROOT_CAPABILITIES,
      ComponentClass: factory,
      handle: null,
    };
  }

  getTag({ component }: ComponentStateBucket) {
    return component[DIRTY_TAG];
  }
}
