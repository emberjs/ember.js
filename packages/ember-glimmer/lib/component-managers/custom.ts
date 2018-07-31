import { assert } from '@ember/debug';
import {
  ComponentCapabilities,
  Dict,
  Opaque,
  Option,
  ProgramSymbolTable,
} from '@glimmer/interfaces';
import { PathReference, Tag } from '@glimmer/reference';
import {
  Arguments,
  Bounds as VMBounds,
  CapturedArguments,
  ComponentDefinition,
  Invocation,
  PrimitiveReference,
  WithStaticLayout,
} from '@glimmer/runtime';
import { Destroyable } from '@glimmer/util';
import { Factory } from 'ember-owner';
import { OwnedTemplateMeta } from 'ember-views';

import Environment from '../environment';
import RuntimeResolver from '../resolver';
import { OwnedTemplate } from '../template';
import { RootReference } from '../utils/references';
import AbstractComponentManager from './abstract';

const CAPABILITIES = {
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

export interface OptionalCapabilities {
  asyncLifecycleCallbacks?: boolean;
  destructor?: boolean;
}

export function capabilities(managerAPI: '3.4', options: OptionalCapabilities = {}): Capabilities {
  assert('Invalid component manager compatibility specified', managerAPI === '3.4');

  return {
    asyncLifeCycleCallbacks: !!options.asyncLifecycleCallbacks,
    destructor: !!options.destructor,
  };
}

class Bounds {
  constructor(private _bounds: VMBounds) {}

  get firstNode(): Node {
    return this._bounds.firstNode() as Node;
  }

  get lastNode(): Node {
    return this._bounds.lastNode() as Node;
  }
}

export interface DefinitionState<ComponentInstance> {
  name: string;
  ComponentClass: Factory<ComponentInstance>;
  symbolTable: ProgramSymbolTable;
  template?: any;
}

export interface Capabilities {
  asyncLifeCycleCallbacks: boolean;
  destructor: boolean;
}

export interface CustomComponentManagerArgs {
  named: Dict<Opaque>;
  positional: Opaque[];
}

export interface ManagerDelegate<ComponentInstance> {
  capabilities: Capabilities;
  didRenderLayout(instance: ComponentInstance, bounds: Bounds): void;
  createComponent(factory: Opaque, args: CustomComponentManagerArgs): ComponentInstance;
  updateComponent(instance: ComponentInstance, args: CustomComponentManagerArgs): void;
  getContext(instance: ComponentInstance): Opaque;
}

export function hasAsyncLifeCycleCallbacks<ComponentInstance>(
  delegate: ManagerDelegate<ComponentInstance>
): delegate is ManagerDelegateWithAsyncLifeCycleCallbacks<ComponentInstance> {
  return delegate.capabilities.asyncLifeCycleCallbacks;
}

export interface ManagerDelegateWithAsyncLifeCycleCallbacks<ComponentInstance>
  extends ManagerDelegate<ComponentInstance> {
  didCreateComponent(instance: ComponentInstance): void;
  didUpdateComponent(instance: ComponentInstance): void;
}

export function hasDestructors<ComponentInstance>(
  delegate: ManagerDelegate<ComponentInstance>
): delegate is ManagerDelegateWithDestructors<ComponentInstance> {
  return delegate.capabilities.destructor;
}

export interface ManagerDelegateWithDestructors<ComponentInstance>
  extends ManagerDelegate<ComponentInstance> {
  destroyComponent(instance: ComponentInstance): void;
}

export interface ComponentArguments {
  positional: Opaque[];
  named: Dict<Opaque>;
}

function valueForCapturedArgs(args: CapturedArguments): CustomComponentManagerArgs {
  return {
    named: args.named.value(),
    positional: args.positional.value(),
  };
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
export default class CustomComponentManager<ComponentInstance>
  extends AbstractComponentManager<
    CustomComponentState<ComponentInstance>,
    DefinitionState<ComponentInstance>
  >
  implements
    WithStaticLayout<
      CustomComponentState<ComponentInstance>,
      DefinitionState<ComponentInstance>,
      OwnedTemplateMeta,
      RuntimeResolver
    > {
  create(
    _env: Environment,
    definition: CustomComponentDefinitionState<ComponentInstance>,
    args: Arguments
  ): CustomComponentState<ComponentInstance> {
    const { delegate } = definition;
    const capturedArgs = args.capture();

    let invocationArgs = valueForCapturedArgs(capturedArgs);
    const component = delegate.createComponent(definition.ComponentClass, invocationArgs);

    return new CustomComponentState(delegate, component, capturedArgs);
  }

  update({ delegate, component, args }: CustomComponentState<ComponentInstance>) {
    delegate.updateComponent(component, valueForCapturedArgs(args));
  }

  didCreate({ delegate, component }: CustomComponentState<ComponentInstance>) {
    if (hasAsyncLifeCycleCallbacks(delegate)) {
      delegate.didCreateComponent(component);
    }
  }

  didUpdate({ delegate, component }: CustomComponentState<ComponentInstance>) {
    if (hasAsyncLifeCycleCallbacks(delegate)) {
      delegate.didUpdateComponent(component);
    }
  }

  getContext({ delegate, component }: CustomComponentState<ComponentInstance>) {
    delegate.getContext(component);
  }

  getSelf({
    delegate,
    component,
  }: CustomComponentState<ComponentInstance>): PrimitiveReference<null> | PathReference<Opaque> {
    const context = delegate.getContext(component);

    return new RootReference(context);
  }

  getDestructor(state: CustomComponentState<ComponentInstance>): Option<Destroyable> {
    if (hasDestructors(state.delegate)) {
      return state;
    } else {
      return null;
    }
  }

  getCapabilities(): ComponentCapabilities {
    return CAPABILITIES;
  }

  getTag({ args }: CustomComponentState<ComponentInstance>): Tag {
    return args.tag;
  }

  didRenderLayout(state: CustomComponentState<ComponentInstance>, bounds: VMBounds) {
    state.delegate.didRenderLayout(state.component, new Bounds(bounds));
  }

  getLayout(state: DefinitionState<ComponentInstance>): Invocation {
    return {
      handle: state.template.asLayout().compile(),
      symbolTable: state.symbolTable!,
    };
  }
}
const CUSTOM_COMPONENT_MANAGER = new CustomComponentManager();

/**
 * Stores internal state about a component instance after it's been created.
 */
export class CustomComponentState<ComponentInstance> {
  constructor(
    public delegate: ManagerDelegate<ComponentInstance>,
    public component: ComponentInstance,
    public args: CapturedArguments
  ) {}

  destroy() {
    const { delegate, component } = this;

    if (hasDestructors(delegate)) {
      delegate.destroyComponent(component);
    }
  }
}

export interface CustomComponentDefinitionState<ComponentInstance>
  extends DefinitionState<ComponentInstance> {
  delegate: ManagerDelegate<ComponentInstance>;
}

export class CustomManagerDefinition<ComponentInstance> implements ComponentDefinition {
  public state: CustomComponentDefinitionState<ComponentInstance>;
  public symbolTable: ProgramSymbolTable;
  public manager: CustomComponentManager<
    ComponentInstance
  > = CUSTOM_COMPONENT_MANAGER as CustomComponentManager<ComponentInstance>;

  constructor(
    public name: string,
    public ComponentClass: Factory<ComponentInstance>,
    public delegate: ManagerDelegate<ComponentInstance>,
    public template: OwnedTemplate
  ) {
    const layout = template.asLayout();
    const symbolTable = layout.symbolTable;
    this.symbolTable = symbolTable;

    this.state = {
      name,
      ComponentClass,
      template,
      symbolTable,
      delegate,
    };
  }
}
