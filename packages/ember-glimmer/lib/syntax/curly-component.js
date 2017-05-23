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
import ComponentStateBucket from './component-state-bucket';
import CurlyComponentManager from '../component-managers/curly';

export function validatePositionalParameters(named, positional, positionalParamsDefinition) {
  if (DEBUG) {
    if (!named || !positional || !positional.length) {
      return;
    }

    let paramType = typeof positionalParamsDefinition;

    if (paramType === 'string') {
      assert(`You cannot specify positional parameters and the hash argument \`${positionalParamsDefinition}\`.`, !named.has(positionalParamsDefinition));
    } else {
      if (positional.length < positionalParamsDefinition.length) {
        positionalParamsDefinition = positionalParamsDefinition.slice(0, positional.length);
      }

      for (let i = 0; i < positionalParamsDefinition.length; i++) {
        let name = positionalParamsDefinition[i];

        assert(
          `You cannot specify both a positional param (at position ${i}) and the hash argument \`${name}\`.`,
          !named.has(name)
        );
      }
    }
  }
}

export function processComponentInitializationAssertions(component, props) {
  assert(`classNameBindings must not have spaces in them: ${component.toString()}`, (() => {
    let { classNameBindings } = component;
    for (let i = 0; i < classNameBindings.length; i++) {
      let binding = classNameBindings[i];
      if (binding.split(' ').length > 1) {
        return false;
      }
    }
    return true;
  })());

  assert('You cannot use `classNameBindings` on a tag-less component: ' + component.toString(), (() => {
    let { classNameBindings, tagName } = component;
    return tagName !== '' || !classNameBindings || classNameBindings.length === 0;
  })());

  assert('You cannot use `elementId` on a tag-less component: ' + component.toString(), (() => {
    let { elementId, tagName } = component;
    return tagName !== '' || props.id === elementId || (!elementId && elementId !== '');
  })());

  assert('You cannot use `attributeBindings` on a tag-less component: ' + component.toString(), (() => {
    let { attributeBindings, tagName } = component;
    return tagName !== '' || !attributeBindings || attributeBindings.length === 0;
  })());
}

export function initialRenderInstrumentDetails(component) {
  return component.instrumentDetails({ initialRender: true });
}

export function rerenderInstrumentDetails(component) {
  return component.instrumentDetails({ initialRender: false });
}

class TopComponentManager extends CurlyComponentManager {
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

const MANAGER = new CurlyComponentManager();

export class CurlyComponentDefinition extends ComponentDefinition {
  constructor(name, ComponentClass, template, args, customManager) {
    super(name, customManager || MANAGER, ComponentClass);
    this.template = template;
    this.args = args;
  }
}

const ROOT_MANAGER = new TopComponentManager();

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
