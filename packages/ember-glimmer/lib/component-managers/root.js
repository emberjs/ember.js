import {
  ComponentDefinition
} from '@glimmer/runtime';
import {
  get,
  _instrumentStart
} from 'ember-metal';
import {
  assert
} from 'ember-debug';
import { DEBUG } from 'ember-env-flags';
import ComponentStateBucket from '../utils/curly-component-state-bucket';
import CurlyComponentManager, {
  initialRenderInstrumentDetails,
  rerenderInstrumentDetails,
  validatePositionalParameters,
  processComponentInitializationAssertions
} from './curly';

class RootComponentManager extends CurlyComponentManager {
  create(environment, definition, args, dynamicScope, currentScope, hasBlock) {
    let component = definition.ComponentClass.create();

    if (DEBUG) {
      this._pushToDebugStack(component._debugContainerKey, environment)
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

export class RootComponentDefinition extends ComponentDefinition {
  constructor(instance) {
    super('-root', ROOT_MANAGER, {
      class: instance.constructor,
      create() {
        return instance;
      }
    });
    this.template = undefined;
    this.args = undefined;
  }
}
