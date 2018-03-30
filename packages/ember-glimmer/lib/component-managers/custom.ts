import { ComponentCapabilities, Opaque, Option } from '@glimmer/interfaces';
import { PathReference, Tag } from '@glimmer/reference';
import { Arguments, Bounds, CapturedNamedArguments, PrimitiveReference } from '@glimmer/runtime';
import { Destroyable } from '@glimmer/util';

import { addChildView } from 'ember-views';

import Environment from '../environment';
import { DynamicScope, Renderer } from '../renderer';
import { RootReference } from '../utils/references';
import AbstractComponentManager from './abstract';
import DefinitionState from './definition-state';

export interface CustomComponentManagerDelegate<T> {
  version: 'string';
  create(options: { ComponentClass: T; args: {} }): T;
  getContext(instance: T): Opaque;
  update(instance: T, args: {}): void;
  destroy?(instance: T): void;
  didCreate?(instance: T): void;
  didUpdate?(instance: T): void;
  getView?(instance: T): any;
}

export interface ComponentArguments<T = {}> {
  positional: Opaque[];
  named: T;
}

/**
  The CustomComponentManager allows addons to provide custom component
  implementations that integrate seamlessly into Ember. This is accomplished
  through a delegate, registered with the custom component manager, which
  implements a set of hooks that determine component behavior.

  To create a custom component manager, instantiate a new CustomComponentManager
  class and pass the delegate as the first argument:

  ```js
  let manager = new CustomComponentManager({
    // ...delegate implementation...
  });
  ```

  ## Delegate Hooks

  Throughout the lifecycle of a component, the component manager will invoke
  delegate hooks that are responsible for surfacing those lifecycle changes to
  the end developer.

  * `create()` - invoked when a new instance of a component should be created
  * `update()` - invoked when the arguments passed to a component change
  * `getContext()` - returns the object that should be
*/
export default class CustomComponentManager<T> extends AbstractComponentManager<
  CustomComponentState<T> | null,
  DefinitionState
> {
  constructor(private delegate: CustomComponentManagerDelegate<T>) {
    super();
  }

  create(
    _env: Environment,
    definition: DefinitionState,
    args: Arguments,
    dynamicScope: DynamicScope
  ): CustomComponentState<T> {
    const { delegate } = this;
    const capturedArgs = args.named.capture();

    const component = delegate.create({
      args: capturedArgs.value(),
      ComponentClass: (definition.ComponentClass as any) as T,
    });

    const { view: parentView } = dynamicScope;

    if (parentView !== null && parentView !== undefined) {
      addChildView(parentView, component);
    }

    dynamicScope.view = component;

    return new CustomComponentState(delegate, component, capturedArgs);
  }

  update({ component, args }: CustomComponentState<T>) {
    this.delegate.update(component, args.value());
  }

  didUpdate({ component }: CustomComponentState<T>) {
    if (typeof this.delegate.didUpdate === 'function') {
      this.delegate.didUpdate(component);
    }
  }

  getContext(component: T) {
    this.delegate.getContext(component);
  }

  getLayout(state: DefinitionState) {
    return {
      handle: state.template.asLayout().compile(),
      symbolTable: state.symbolTable,
    };
  }

  getSelf({
    component,
  }: CustomComponentState<T>): PrimitiveReference<null> | PathReference<Opaque> {
    const context = this.delegate.getContext(component);
    return new RootReference(context);
  }

  getDestructor(state: CustomComponentState<T>): Option<Destroyable> {
    return state;
  }

  getCapabilities(_state: DefinitionState): ComponentCapabilities {
    return {
      dynamicLayout: false,
      dynamicTag: false,
      prepareArgs: false,
      createArgs: true,
      attributeHook: false,
      elementHook: false,
      createCaller: false,
      dynamicScope: true,
      updateHook: true,
      createInstance: true,
    };
  }

  getTag({ args }: CustomComponentState<T>): Tag {
    return args.tag;
  }

  didRenderLayout({ component }: CustomComponentState<T>, _bounds: Bounds) {
    const renderer = getRenderer(component);
    renderer.register(component);
    if (typeof this.delegate.didCreate === 'function') {
      this.delegate.didCreate(component);
    }
  }
}

/**
 * Stores internal state about a component instance after it's been created.
 */
export class CustomComponentState<T> {
  constructor(
    public delegate: CustomComponentManagerDelegate<T>,
    public component: T,
    public args: CapturedNamedArguments
  ) {}

  destroy() {
    const { delegate, component } = this;

    let renderer = getRenderer(component);
    renderer.unregister(component);

    if (delegate.destroy) {
      delegate.destroy(component);
    }
  }
}

function getRenderer(component: {}): Renderer {
  let renderer = component['renderer'];
  if (!renderer) {
    throw new Error(`missing renderer for component ${component}`);
  }
  return renderer as Renderer;
}
