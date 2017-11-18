import {
  VMHandle
} from '@glimmer/interfaces';
import {
  Arguments,
  ComponentDefinition
} from '@glimmer/runtime';
import {
  Option
} from '@glimmer/util';
import { DEBUG } from 'ember-env-flags';
import {
  _instrumentStart,
} from 'ember-metal';
import Environment from '../environment';
import { DynamicScope } from '../renderer';
import ComponentStateBucket, { Component } from '../utils/curly-component-state-bucket';
import CurlyComponentManager, {
  initialRenderInstrumentDetails,
  processComponentInitializationAssertions,
} from './curly';
import DefintionState, { CAPABILITIES } from './definition-state';

class RootComponentManager extends CurlyComponentManager {
  component: Component;

  constructor(component: Component) {
    super();
    this.component = component;
  }

  create(environment: Environment,
         _: DefintionState,
         args: Arguments,
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

    return new ComponentStateBucket(environment, component, args.named.capture(), finalizer);
  }
}

export class RootComponentDefinition implements ComponentDefinition {
  public state: DefintionState;

  constructor(name: string, public manager: RootComponentManager, ComponentClass: any, handle: Option<VMHandle>) {
    this.state = {
      name,
      ComponentClass,
      handle,
      capabilities: CAPABILITIES
    };
  }
}
