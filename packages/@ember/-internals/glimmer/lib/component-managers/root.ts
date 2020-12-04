import { getFactoryFor } from '@ember/-internals/container';
import { _instrumentStart } from '@ember/instrumentation';
import { DEBUG } from '@glimmer/env';
import {
  ComponentDefinition,
  Environment,
  InternalComponentCapabilities,
  Option,
  VMArguments,
} from '@glimmer/interfaces';
import { capabilityFlagsFrom } from '@glimmer/manager';
import { CONSTANT_TAG, consumeTag } from '@glimmer/validator';
import { DynamicScope } from '../renderer';
import ComponentStateBucket, { Component } from '../utils/curly-component-state-bucket';
import CurlyComponentManager, {
  DIRTY_TAG,
  initialRenderInstrumentDetails,
  processComponentInitializationAssertions,
} from './curly';

class RootComponentManager extends CurlyComponentManager {
  component: Component;

  constructor(component: Component) {
    super();
    this.component = component;
  }

  create(
    environment: Environment,
    _state: unknown,
    _args: Option<VMArguments>,
    dynamicScope: DynamicScope
  ) {
    let component = this.component;

    let finalizer = _instrumentStart('render.component', initialRenderInstrumentDetails, component);

    dynamicScope.view = component;

    let hasWrappedElement = component.tagName !== '';

    // We usually do this in the `didCreateElement`, but that hook doesn't fire for tagless components
    if (!hasWrappedElement) {
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

    let bucket = new ComponentStateBucket(
      environment,
      component,
      null,
      CONSTANT_TAG,
      finalizer,
      hasWrappedElement
    );

    consumeTag(component[DIRTY_TAG]);

    return bucket;
  }
}

// ROOT is the top-level template it has nothing but one yield.
// it is supposed to have a dummy element
export const ROOT_CAPABILITIES: InternalComponentCapabilities = {
  dynamicLayout: true,
  dynamicTag: true,
  prepareArgs: false,
  createArgs: false,
  attributeHook: true,
  elementHook: true,
  createCaller: true,
  dynamicScope: true,
  updateHook: true,
  createInstance: true,
  wrapped: true,
  willDestroy: false,
};

export class RootComponentDefinition implements ComponentDefinition {
  // handle is not used by this custom definition
  handle = -1;

  resolvedName = '-top-level';
  state: object;
  manager: RootComponentManager;
  capabilities = capabilityFlagsFrom(ROOT_CAPABILITIES);
  compilable = null;

  constructor(component: Component) {
    this.manager = new RootComponentManager(component);
    this.state = getFactoryFor(component);
  }
}
