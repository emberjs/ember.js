import {
  VMHandle
} from '@glimmer/interfaces';
import {
  Arguments,
  ComponentDefinition
} from '@glimmer/runtime';
import {
  Option, Opaque
} from '@glimmer/util';
import { DEBUG } from 'ember-env-flags';
import {
  _instrumentStart,
} from 'ember-metal';
import ComponentStateBucket from '../utils/curly-component-state-bucket';
import CurlyComponentManager, {
  initialRenderInstrumentDetails,
  processComponentInitializationAssertions,
} from './curly';
import { DynamicScope, View } from '../renderer';
import Environment from '../environment';
import DefintionState, { CAPABILITIES } from './definition-state';

class RootComponentManager extends CurlyComponentManager {
  component: View;

  constructor(component: View) {
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
  public manager: RootComponentManager;

  constructor(name: string, _manager: RootComponentManager, ComponentClass: any, handle: Option<VMHandle>) {
    this.state = {
      name,
      ComponentClass,
      handle,
      capabilities: CAPABILITIES
    }
  }
}
