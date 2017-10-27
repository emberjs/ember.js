import {
  Arguments,
  ComponentDefinition
} from '@glimmer/runtime';
import { DEBUG } from 'ember-env-flags';
import {
  _instrumentStart,
} from 'ember-metal';
import ComponentStateBucket from '../utils/curly-component-state-bucket';
import CurlyComponentManager, {
  initialRenderInstrumentDetails,
  processComponentInitializationAssertions,
  CurlyComponentDefinition
} from './curly';
import { DynamicScope } from '../renderer';
import Environment from '../environment';

class RootComponentManager extends CurlyComponentManager {
  create(environment: Environment, definition: CurlyComponentDefinition, args: Arguments, dynamicScope: DynamicScope) {
    let component = definition.ComponentClass.create();

    if (DEBUG) {
      this._pushToDebugStack(component._debugContainerKey, environment);
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

const ROOT_MANAGER = new RootComponentManager();

export class RootComponentDefinition extends ComponentDefinition<ComponentStateBucket> {
  public template: any;
  public args: any;
  constructor(instance: ComponentStateBucket) {
    super('-root', ROOT_MANAGER, {
      class: instance.constructor,
      create() {
        return instance;
      },
    });
    this.template = undefined;
    this.args = undefined;
  }
}
