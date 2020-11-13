import { Factory } from '@ember/-internals/owner';
import { assert } from '@ember/debug';
import {
  Arguments,
  ComponentCapabilities,
  ComponentCapabilitiesVersions,
  ComponentDefinition,
  ComponentManager,
  ComponentManagerWithAsyncLifeCycleCallbacks,
  ComponentManagerWithAsyncUpdateHook,
  ComponentManagerWithDestructors,
  ComponentManagerWithUpdateHook,
  Destroyable,
  Environment,
  InternalComponentCapabilities,
  Option,
  Template,
  VMArguments,
  WithStaticLayout,
} from '@glimmer/interfaces';
import { createConstRef, Reference } from '@glimmer/reference';
import {
  BaseInternalComponentManager,
  buildCapabilities,
  registerDestructor,
} from '@glimmer/runtime';
import { argsProxyFor } from '../utils/args-proxy';

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
  wrapped: false,
  willDestroy: false,
};

export function capabilities<Version extends keyof ComponentCapabilitiesVersions>(
  managerAPI: Version,
  options: ComponentCapabilitiesVersions[Version] = {}
): ComponentCapabilities {
  assert(
    'Invalid component manager compatibility specified',
    managerAPI === '3.4' || managerAPI === '3.13'
  );

  let updateHook = true;

  if (managerAPI === '3.13') {
    updateHook = Boolean((options as ComponentCapabilitiesVersions['3.13']).updateHook);
  }

  return buildCapabilities({
    asyncLifeCycleCallbacks: Boolean(options.asyncLifecycleCallbacks),
    destructor: Boolean(options.destructor),
    updateHook,
  });
}

export interface DefinitionState<ComponentInstance> {
  name: string;
  ComponentClass: Factory<ComponentInstance>;
  template: Template;
}

export function hasAsyncLifeCycleCallbacks<ComponentInstance>(
  delegate: ComponentManager<ComponentInstance>
): delegate is ComponentManagerWithAsyncLifeCycleCallbacks<ComponentInstance> {
  return delegate.capabilities.asyncLifeCycleCallbacks;
}

export function hasUpdateHook<ComponentInstance>(
  delegate: ComponentManager<ComponentInstance>
): delegate is ComponentManagerWithUpdateHook<ComponentInstance> {
  return delegate.capabilities.updateHook;
}

export function hasAsyncUpdateHook<ComponentInstance>(
  delegate: ComponentManager<ComponentInstance>
): delegate is ComponentManagerWithAsyncUpdateHook<ComponentInstance> {
  return hasAsyncLifeCycleCallbacks(delegate) && hasUpdateHook(delegate);
}

export function hasDestructors<ComponentInstance>(
  delegate: ComponentManager<ComponentInstance>
): delegate is ComponentManagerWithDestructors<ComponentInstance> {
  return delegate.capabilities.destructor;
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
  extends BaseInternalComponentManager<
    CustomComponentState<ComponentInstance>,
    CustomComponentDefinitionState<ComponentInstance>
  >
  implements
    WithStaticLayout<
      CustomComponentState<ComponentInstance>,
      CustomComponentDefinitionState<ComponentInstance>
    > {
  create(
    env: Environment,
    definition: CustomComponentDefinitionState<ComponentInstance>,
    vmArgs: VMArguments
  ): CustomComponentState<ComponentInstance> {
    let { delegate } = definition;
    let args = argsProxyFor(vmArgs.capture(), 'component');

    let component = delegate.createComponent(definition.ComponentClass.class!, args);

    let bucket = new CustomComponentState(delegate, component, args, env);

    return bucket;
  }

  getDebugName({ name }: CustomComponentDefinitionState<ComponentInstance>): string {
    return name;
  }

  update(bucket: CustomComponentState<ComponentInstance>): void {
    if (hasUpdateHook(bucket.delegate)) {
      let { delegate, component, args } = bucket;

      delegate.updateComponent(component, args);
    }
  }

  didCreate({ delegate, component }: CustomComponentState<ComponentInstance>): void {
    if (hasAsyncLifeCycleCallbacks(delegate)) {
      delegate.didCreateComponent(component);
    }
  }

  didUpdate({ delegate, component }: CustomComponentState<ComponentInstance>): void {
    if (hasAsyncUpdateHook(delegate)) {
      delegate.didUpdateComponent(component);
    }
  }

  didRenderLayout(): void {}

  didUpdateLayout(): void {}

  getSelf({ delegate, component }: CustomComponentState<ComponentInstance>): Reference {
    return createConstRef(delegate.getContext(component), 'this');
  }

  getDestroyable(bucket: CustomComponentState<ComponentInstance>): Option<Destroyable> {
    return bucket;
  }

  getCapabilities(): InternalComponentCapabilities {
    return CAPABILITIES;
  }

  getStaticLayout(state: DefinitionState<ComponentInstance>): Template {
    return state.template;
  }
}
const CUSTOM_COMPONENT_MANAGER = new CustomComponentManager();

/**
 * Stores internal state about a component instance after it's been created.
 */
export class CustomComponentState<ComponentInstance> {
  constructor(
    public delegate: ComponentManager<ComponentInstance>,
    public component: ComponentInstance,
    public args: Arguments,
    public env: Environment
  ) {
    if (hasDestructors(delegate)) {
      registerDestructor(this, () => delegate.destroyComponent(component));
    }
  }
}

export interface CustomComponentDefinitionState<ComponentInstance>
  extends DefinitionState<ComponentInstance> {
  delegate: ComponentManager<ComponentInstance>;
}

export class CustomManagerDefinition<ComponentInstance> implements ComponentDefinition {
  public state: CustomComponentDefinitionState<ComponentInstance>;
  public manager: CustomComponentManager<
    ComponentInstance
  > = CUSTOM_COMPONENT_MANAGER as CustomComponentManager<ComponentInstance>;

  constructor(
    public name: string,
    public ComponentClass: Factory<ComponentInstance>,
    public delegate: ComponentManager<ComponentInstance>,
    public template: Template
  ) {
    this.state = {
      name,
      ComponentClass,
      template,
      delegate,
    };
  }
}
