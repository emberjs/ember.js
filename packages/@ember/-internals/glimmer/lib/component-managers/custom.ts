import { ENV } from '@ember/-internals/environment';
import { CUSTOM_TAG_FOR } from '@ember/-internals/metal';
import { Factory } from '@ember/-internals/owner';
import { HAS_NATIVE_PROXY } from '@ember/-internals/utils';
import { assert } from '@ember/debug';
import { DEBUG } from '@glimmer/env';
import {
  Bounds,
  CapturedArguments,
  CapturedNamedArguments,
  ComponentCapabilities,
  ComponentDefinition,
  Destroyable,
  Dict,
  Option,
  VMArguments,
  WithJitStaticLayout,
} from '@glimmer/interfaces';
import { ComponentRootReference, PathReference } from '@glimmer/reference';
import { registerDestructor, reifyPositional } from '@glimmer/runtime';
import { unwrapTemplate } from '@glimmer/util';
import { track } from '@glimmer/validator';
import { EmberVMEnvironment } from '../environment';
import RuntimeResolver from '../resolver';
import { OwnedTemplate } from '../template';
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
  wrapped: false,
  willDestroy: false,
};

export interface OptionalCapabilities {
  '3.4': {
    asyncLifecycleCallbacks?: boolean;
    destructor?: boolean;
  };

  '3.13': {
    asyncLifecycleCallbacks?: boolean;
    destructor?: boolean;
    updateHook?: boolean;
  };
}

export function capabilities<Version extends keyof OptionalCapabilities>(
  managerAPI: Version,
  options: OptionalCapabilities[Version] = {}
): Capabilities {
  assert(
    'Invalid component manager compatibility specified',
    managerAPI === '3.4' || managerAPI === '3.13'
  );

  let updateHook = true;

  if (managerAPI === '3.13') {
    updateHook = Boolean((options as OptionalCapabilities['3.13']).updateHook);
  }

  return {
    asyncLifeCycleCallbacks: Boolean(options.asyncLifecycleCallbacks),
    destructor: Boolean(options.destructor),
    updateHook,
  };
}

export interface DefinitionState<ComponentInstance> {
  name: string;
  ComponentClass: Factory<ComponentInstance>;
  template: OwnedTemplate;
}

export interface Capabilities {
  asyncLifeCycleCallbacks: boolean;
  destructor: boolean;
  updateHook: boolean;
}

// TODO: export ICapturedArgumentsValue from glimmer and replace this
export interface Args {
  named: Dict<unknown>;
  positional: unknown[];
}

export interface ManagerDelegate<ComponentInstance> {
  capabilities: Capabilities;
  createComponent(factory: unknown, args: Args): ComponentInstance;
  getContext(instance: ComponentInstance): unknown;
}

export function hasAsyncLifeCycleCallbacks<ComponentInstance>(
  delegate: ManagerDelegate<ComponentInstance>
): delegate is ManagerDelegateWithAsyncLifeCycleCallbacks<ComponentInstance> {
  return delegate.capabilities.asyncLifeCycleCallbacks;
}

export interface ManagerDelegateWithAsyncLifeCycleCallbacks<ComponentInstance>
  extends ManagerDelegate<ComponentInstance> {
  didCreateComponent(instance: ComponentInstance): void;
}

export function hasUpdateHook<ComponentInstance>(
  delegate: ManagerDelegate<ComponentInstance>
): delegate is ManagerDelegateWithUpdateHook<ComponentInstance> {
  return delegate.capabilities.updateHook;
}

export interface ManagerDelegateWithUpdateHook<ComponentInstance>
  extends ManagerDelegate<ComponentInstance> {
  updateComponent(instance: ComponentInstance, args: Args): void;
}

export function hasAsyncUpdateHook<ComponentInstance>(
  delegate: ManagerDelegate<ComponentInstance>
): delegate is ManagerDelegateWithAsyncUpdateHook<ComponentInstance> {
  return hasAsyncLifeCycleCallbacks(delegate) && hasUpdateHook(delegate);
}

export interface ManagerDelegateWithAsyncUpdateHook<ComponentInstance>
  extends ManagerDelegateWithAsyncLifeCycleCallbacks<ComponentInstance>,
    ManagerDelegateWithUpdateHook<ComponentInstance> {
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
  positional: unknown[];
  named: Dict<unknown>;
}

let namedArgsProxyFor: (namedArgs: CapturedNamedArguments, debugName?: string) => Dict<unknown>;

if (HAS_NATIVE_PROXY) {
  namedArgsProxyFor = <NamedArgs extends CapturedNamedArguments>(
    namedArgs: NamedArgs,
    debugName?: string
  ) => {
    let getTag = (key: keyof Args) => track(() => namedArgs[key].value());

    let handler: ProxyHandler<{}> = {
      get(_target, prop) {
        let ref = namedArgs[prop as string];

        if (ref !== undefined) {
          return ref.value();
        } else if (prop === CUSTOM_TAG_FOR) {
          return getTag;
        }
      },

      has(_target, prop) {
        return namedArgs[prop as string] !== undefined;
      },

      ownKeys(_target) {
        return Object.keys(namedArgs);
      },

      getOwnPropertyDescriptor(_target, prop) {
        assert(
          'args proxies do not have real property descriptors, so you should never need to call getOwnPropertyDescriptor yourself. This code exists for enumerability, such as in for-in loops and Object.keys()',
          namedArgs[prop as string] !== undefined
        );

        return {
          enumerable: true,
          configurable: true,
        };
      },
    };

    if (DEBUG) {
      handler.set = function(_target, prop) {
        assert(
          `You attempted to set ${debugName}#${String(
            prop
          )} on a components arguments. Component arguments are immutable and cannot be updated directly, they always represent the values that are passed to your component. If you want to set default values, you should use a getter instead`
        );

        return false;
      };
    }

    return new Proxy({}, handler);
  };
} else {
  namedArgsProxyFor = <NamedArgs extends CapturedNamedArguments>(namedArgs: NamedArgs) => {
    let getTag = (key: keyof Args) => track(() => namedArgs[key].value());
    let proxy = {};

    Object.defineProperty(proxy, CUSTOM_TAG_FOR, {
      configurable: false,
      enumerable: false,
      value: getTag,
    });

    Object.keys(namedArgs).forEach(name => {
      Object.defineProperty(proxy, name, {
        enumerable: true,
        configurable: true,
        get() {
          return namedArgs[name].value();
        },
      });
    });

    return proxy;
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
    CustomComponentDefinitionState<ComponentInstance>
  >
  implements
    WithJitStaticLayout<
      CustomComponentState<ComponentInstance>,
      CustomComponentDefinitionState<ComponentInstance>,
      RuntimeResolver
    > {
  create(
    env: EmberVMEnvironment,
    definition: CustomComponentDefinitionState<ComponentInstance>,
    args: VMArguments
  ): CustomComponentState<ComponentInstance> {
    let { delegate } = definition;
    let capturedArgs = args.capture();
    let { named, positional } = capturedArgs;
    let ComponentClass = definition.ComponentClass.class;
    let namedArgsProxy = namedArgsProxyFor(named, DEBUG ? String(ComponentClass) : undefined);

    let component = delegate.createComponent(ComponentClass, {
      named: namedArgsProxy,
      positional: reifyPositional(positional),
    });

    let bucket = new CustomComponentState(delegate, component, capturedArgs, env, namedArgsProxy);

    if (ENV._DEBUG_RENDER_TREE) {
      env.extra.debugRenderTree.create(bucket, {
        type: 'component',
        name: definition.name,
        args: args.capture(),
        instance: component,
        template: definition.template,
      });

      registerDestructor(bucket, () => {
        env.extra.debugRenderTree.willDestroy(bucket);
      });
    }

    return bucket;
  }

  getDebugName({ name }: CustomComponentDefinitionState<ComponentInstance>) {
    return name;
  }

  update(bucket: CustomComponentState<ComponentInstance>) {
    if (ENV._DEBUG_RENDER_TREE) {
      bucket.env.extra.debugRenderTree.update(bucket);
    }

    if (hasUpdateHook(bucket.delegate)) {
      let { delegate, component, args, namedArgsProxy } = bucket;

      delegate.updateComponent(component, {
        named: namedArgsProxy,
        positional: reifyPositional(args.positional),
      });
    }
  }

  didCreate({ delegate, component }: CustomComponentState<ComponentInstance>) {
    if (hasAsyncLifeCycleCallbacks(delegate)) {
      delegate.didCreateComponent(component);
    }
  }

  didUpdate({ delegate, component }: CustomComponentState<ComponentInstance>) {
    if (hasAsyncUpdateHook(delegate)) {
      delegate.didUpdateComponent(component);
    }
  }

  getContext({ delegate, component }: CustomComponentState<ComponentInstance>) {
    delegate.getContext(component);
  }

  getSelf({
    delegate,
    component,
  }: CustomComponentState<ComponentInstance>): PathReference<unknown> {
    return new ComponentRootReference(delegate.getContext(component));
  }

  getDestroyable(bucket: CustomComponentState<ComponentInstance>): Option<Destroyable> {
    return bucket;
  }

  getCapabilities({
    delegate,
  }: CustomComponentDefinitionState<ComponentInstance>): ComponentCapabilities {
    return Object.assign({}, CAPABILITIES, {
      updateHook: ENV._DEBUG_RENDER_TREE || delegate.capabilities.updateHook,
    });
  }

  didRenderLayout(bucket: CustomComponentState<ComponentInstance>, bounds: Bounds) {
    if (ENV._DEBUG_RENDER_TREE) {
      bucket.env.extra.debugRenderTree.didRender(bucket, bounds);
    }
  }

  didUpdateLayout(bucket: CustomComponentState<ComponentInstance>, bounds: Bounds) {
    if (ENV._DEBUG_RENDER_TREE) {
      bucket.env.extra.debugRenderTree.didRender(bucket, bounds);
    }
  }

  getJitStaticLayout(state: DefinitionState<ComponentInstance>) {
    return unwrapTemplate(state.template).asLayout();
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
    public args: CapturedArguments,
    public env: EmberVMEnvironment,
    public namedArgsProxy: Args['named']
  ) {
    if (hasDestructors(delegate)) {
      registerDestructor(this, () => delegate.destroyComponent(component));
    }
  }
}

export interface CustomComponentDefinitionState<ComponentInstance>
  extends DefinitionState<ComponentInstance> {
  delegate: ManagerDelegate<ComponentInstance>;
}

export class CustomManagerDefinition<ComponentInstance> implements ComponentDefinition {
  public state: CustomComponentDefinitionState<ComponentInstance>;
  public manager: CustomComponentManager<
    ComponentInstance
  > = CUSTOM_COMPONENT_MANAGER as CustomComponentManager<ComponentInstance>;

  constructor(
    public name: string,
    public ComponentClass: Factory<ComponentInstance>,
    public delegate: ManagerDelegate<ComponentInstance>,
    public template: OwnedTemplate
  ) {
    this.state = {
      name,
      ComponentClass,
      template,
      delegate,
    };
  }
}
