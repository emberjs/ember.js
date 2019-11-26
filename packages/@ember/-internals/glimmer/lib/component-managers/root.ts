import { FACTORY_FOR } from '@ember/-internals/container';
import { ENV } from '@ember/-internals/environment';
import { Factory } from '@ember/-internals/owner';
import { _instrumentStart } from '@ember/instrumentation';
import { DEBUG } from '@glimmer/env';
import {
  ComponentCapabilities,
  ComponentDefinition,
  Option,
  VMArguments,
} from '@glimmer/interfaces';
import { unwrapTemplate } from '@glimmer/opcode-compiler';
import { EMPTY_ARGS } from '@glimmer/runtime';
import { DIRTY_TAG } from '../component';
import { EmberVMEnvironment } from '../environment';
import { DynamicScope } from '../renderer';
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

  getJitStaticLayout(_state: DefinitionState) {
    const template = this.templateFor(this.component);
    return unwrapTemplate(template).asWrappedLayout();
  }

  create(
    environment: EmberVMEnvironment,
    state: DefinitionState,
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
      finalizer,
      hasWrappedElement
    );

    if (ENV._DEBUG_RENDER_TREE) {
      environment.extra.debugRenderTree.create(bucket, {
        type: 'component',
        name: state.name,
        args: EMPTY_ARGS,
        instance: component,
        template: state.template!,
      });
    }

    return bucket;
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
  elementHook: true,
  createCaller: true,
  dynamicScope: true,
  updateHook: true,
  createInstance: true,
  wrapped: true,
};

export class RootComponentDefinition implements ComponentDefinition {
  state: DefinitionState;
  manager: RootComponentManager;

  constructor(public component: Component) {
    let manager = new RootComponentManager(component);
    this.manager = manager;
    let factory = FACTORY_FOR.get(component);
    this.state = {
      name: factory!.fullName.slice(10),
      capabilities: ROOT_CAPABILITIES,
      ComponentClass: factory as Factory<any, any>,
    };
  }

  getTag({ component }: ComponentStateBucket) {
    return component[DIRTY_TAG];
  }
}
