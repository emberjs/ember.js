import type {
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
  InternalComponentCapabilities,
  InternalComponentManager,
  Nullable,
  Owner,
  VMArguments,
} from '@glimmer/interfaces';
import type { Reference } from '@glimmer/reference';
import { registerDestructor } from '@glimmer/destroyable';
import { createConstRef } from '@glimmer/reference';

import type { ManagerFactory } from './api';

import { argsProxyFor } from '../util/args-proxy';
import { buildCapabilities, FROM_CAPABILITIES } from '../util/capabilities';

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
  hasSubOwner: false,
};

export function componentCapabilities<Version extends keyof ComponentCapabilitiesVersions>(
  managerAPI: Version,
  options: ComponentCapabilitiesVersions[Version] = {}
): ComponentCapabilities {
  if (import.meta.env.DEV && managerAPI !== '3.13') {
    throw new Error('Invalid component manager compatibility specified');
  }

  let updateHook = Boolean((options as ComponentCapabilitiesVersions['3.13']).updateHook);

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
export class CustomComponentManager<O extends Owner, ComponentInstance>
  implements InternalComponentManager<CustomComponentState<ComponentInstance>>
{
  private componentManagerDelegates = new WeakMap<O, ComponentManager<ComponentInstance>>();

  constructor(private factory: ManagerFactory<O, ComponentManager<ComponentInstance>>) {}

  private getDelegateFor(owner: O) {
    let { componentManagerDelegates } = this;
    let delegate = componentManagerDelegates.get(owner);

    if (delegate === undefined) {
      let { factory } = this;
      delegate = factory(owner);

      if (import.meta.env.DEV && !FROM_CAPABILITIES!.has(delegate.capabilities)) {
        // TODO: This error message should make sense in both Ember and Glimmer https://github.com/glimmerjs/glimmer-vm/issues/1200
        throw new Error(
          `Custom component managers must have a \`capabilities\` property that is the result of calling the \`capabilities('3.13')\` (imported via \`import { capabilities } from '@ember/component';\`). Received: \`${JSON.stringify(
            delegate.capabilities
            // eslint-disable-next-line @typescript-eslint/no-base-to-string
          )}\` for: \`${delegate}\``
        );
      }

      componentManagerDelegates.set(owner, delegate);
    }

    return delegate;
  }

  create(
    owner: O,
    definition: ComponentDefinitionState,
    vmArgs: VMArguments
  ): CustomComponentState<ComponentInstance> {
    let delegate = this.getDelegateFor(owner);
    let args = argsProxyFor(vmArgs.capture(), 'component');

    let component: ComponentInstance = delegate.createComponent(definition, args);

    return new CustomComponentState(component, delegate, args);
  }

  getDebugName(definition: ComponentDefinitionState): string {
    // eslint-disable-next-line @typescript-eslint/no-base-to-string
    return typeof definition === 'function' ? definition.name : definition.toString();
  }

  update(bucket: CustomComponentState<ComponentInstance>): void {
    let { delegate } = bucket;
    if (hasUpdateHook(delegate)) {
      let { component, args } = bucket;

      delegate.updateComponent(component, args);
    }
  }

  didCreate({ component, delegate }: CustomComponentState<ComponentInstance>): void {
    if (hasAsyncLifeCycleCallbacks(delegate)) {
      delegate.didCreateComponent(component);
    }
  }

  didUpdate({ component, delegate }: CustomComponentState<ComponentInstance>): void {
    if (hasAsyncUpdateHook(delegate)) {
      delegate.didUpdateComponent(component);
    }
  }

  didRenderLayout(): void {}

  didUpdateLayout(): void {}

  getSelf({ component, delegate }: CustomComponentState<ComponentInstance>): Reference {
    return createConstRef(delegate.getContext(component), 'this');
  }

  getDestroyable(bucket: CustomComponentState<ComponentInstance>): Nullable<Destroyable> {
    const { delegate } = bucket;

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
    public delegate: ComponentManager<ComponentInstance>,
    public args: Arguments
  ) {}
}
