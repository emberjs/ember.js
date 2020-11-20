import { DEBUG } from '@glimmer/env';
import {
  Arguments,
  ComponentCapabilities,
  ComponentCapabilitiesVersions,
  ComponentDefinitionState,
  ComponentManager,
  ComponentManagerWithAsyncLifeCycleCallbacks,
  ComponentManagerWithAsyncUpdateHook,
  ComponentManagerWithDestructors,
  ComponentManagerWithUpdateHook,
  Destroyable,
  Environment,
  InternalComponentCapabilities,
  InternalComponentManager,
  Option,
  VMArguments,
} from '@glimmer/interfaces';
import { createConstRef, Reference } from '@glimmer/reference';
import { registerDestructor } from '@glimmer/destroyable';
import { deprecateMutationsInTrackingTransaction } from '@glimmer/validator';
import { buildCapabilities } from '../util/capabilities';
import { argsProxyFor } from '../util/args-proxy';

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

export function componentCapabilities<Version extends keyof ComponentCapabilitiesVersions>(
  managerAPI: Version,
  options: ComponentCapabilitiesVersions[Version] = {}
): ComponentCapabilities {
  if (DEBUG && managerAPI !== '3.4' && managerAPI !== '3.13') {
    throw new Error('Invalid component manager compatibility specified');
  }

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
export class CustomComponentManager<ComponentInstance>
  implements InternalComponentManager<CustomComponentState<ComponentInstance>> {
  constructor(private delegate: ComponentManager<ComponentInstance>) {}

  create(
    env: Environment,
    definition: ComponentDefinitionState,
    vmArgs: VMArguments
  ): CustomComponentState<ComponentInstance> {
    let { delegate } = this;
    let args = argsProxyFor(vmArgs.capture(), 'component');

    let component: ComponentInstance;

    if (DEBUG && deprecateMutationsInTrackingTransaction !== undefined) {
      deprecateMutationsInTrackingTransaction(() => {
        component = delegate.createComponent(definition, args);
      });
    } else {
      component = delegate.createComponent(definition, args);
    }

    return new CustomComponentState(component!, args, env);
  }

  getDebugName(definition: ComponentDefinitionState): string {
    return typeof definition === 'function' ? definition.name : definition.toString();
  }

  update(bucket: CustomComponentState<ComponentInstance>): void {
    let { delegate } = this;
    if (hasUpdateHook(delegate)) {
      let { component, args } = bucket;

      delegate.updateComponent(component, args);
    }
  }

  didCreate({ component }: CustomComponentState<ComponentInstance>): void {
    let { delegate } = this;

    if (hasAsyncLifeCycleCallbacks(delegate)) {
      delegate.didCreateComponent(component);
    }
  }

  didUpdate({ component }: CustomComponentState<ComponentInstance>): void {
    let { delegate } = this;

    if (hasAsyncUpdateHook(delegate)) {
      delegate.didUpdateComponent(component);
    }
  }

  didRenderLayout(): void {}

  didUpdateLayout(): void {}

  getSelf({ component }: CustomComponentState<ComponentInstance>): Reference {
    return createConstRef(this.delegate.getContext(component), 'this');
  }

  getDestroyable(bucket: CustomComponentState<ComponentInstance>): Option<Destroyable> {
    const { delegate } = this;

    if (hasDestructors(delegate)) {
      const { component } = bucket;

      registerDestructor(bucket, () => delegate.destroyComponent(component));
      return bucket;
    }

    return null;
  }

  getCapabilities(): InternalComponentCapabilities {
    return CAPABILITIES;
  }
}

/**
 * Stores internal state about a component instance after it's been created.
 */
export class CustomComponentState<ComponentInstance> {
  constructor(
    public component: ComponentInstance,
    public args: Arguments,
    public env: Environment
  ) {}
}
