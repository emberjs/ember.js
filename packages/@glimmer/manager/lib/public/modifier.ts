import type {
  Arguments,
  CapturedArguments,
  InternalModifierManager,
  ModifierCapabilities,
  ModifierCapabilitiesVersions,
  ModifierManager,
  Owner,
  SimpleElement,
  UpdatableTag,
} from '@glimmer/interfaces';
import { registerDestructor } from '@glimmer/destroyable';
import { valueForRef } from '@glimmer/reference';
import { castToBrowser, dict } from '@glimmer/util';
import { createUpdatableTag, untrack } from '@glimmer/validator';

import type { ManagerFactory } from '.';

import { argsProxyFor } from '../util/args-proxy';
import { buildCapabilities, FROM_CAPABILITIES } from '../util/capabilities';

export function modifierCapabilities<Version extends keyof ModifierCapabilitiesVersions>(
  managerAPI: Version,
  optionalFeatures: ModifierCapabilitiesVersions[Version] = {}
): ModifierCapabilities {
  if (import.meta.env.DEV && managerAPI !== '3.22') {
    throw new Error('Invalid modifier manager compatibility specified');
  }

  return buildCapabilities({
    disableAutoTracking: Boolean(optionalFeatures.disableAutoTracking),
  });
}

export interface CustomModifierState<ModifierInstance> {
  tag: UpdatableTag;
  element: SimpleElement;
  modifier: ModifierInstance;
  delegate: ModifierManager<ModifierInstance>;
  args: Arguments;
  debugName?: string;
}

/**
  The CustomModifierManager allows addons to provide custom modifier
  implementations that integrate seamlessly into Ember. This is accomplished
  through a delegate, registered with the custom modifier manager, which
  implements a set of hooks that determine modifier behavior.
  To create a custom modifier manager, instantiate a new CustomModifierManager
  class and pass the delegate as the first argument:

  ```js
  let manager = new CustomModifierManager({
    // ...delegate implementation...
  });
  ```

  ## Delegate Hooks

  Throughout the lifecycle of a modifier, the modifier manager will invoke
  delegate hooks that are responsible for surfacing those lifecycle changes to
  the end developer.
  * `createModifier()` - invoked when a new instance of a modifier should be created
  * `installModifier()` - invoked when the modifier is installed on the element
  * `updateModifier()` - invoked when the arguments passed to a modifier change
  * `destroyModifier()` - invoked when the modifier is about to be destroyed
*/
export class CustomModifierManager<O extends Owner, ModifierInstance>
  implements InternalModifierManager<CustomModifierState<ModifierInstance>>
{
  private componentManagerDelegates = new WeakMap<O, ModifierManager<ModifierInstance>>();

  constructor(private factory: ManagerFactory<O, ModifierManager<ModifierInstance>>) {}

  private getDelegateFor(owner: O) {
    let { componentManagerDelegates } = this;
    let delegate = componentManagerDelegates.get(owner);

    if (delegate === undefined) {
      let { factory } = this;
      delegate = factory(owner);

      if (import.meta.env.DEV && !FROM_CAPABILITIES!.has(delegate.capabilities)) {
        // TODO: This error message should make sense in both Ember and Glimmer https://github.com/glimmerjs/glimmer-vm/issues/1200
        throw new Error(
          `Custom modifier managers must have a \`capabilities\` property that is the result of calling the \`capabilities('3.22')\` (imported via \`import { capabilities } from '@ember/modifier';\`). Received: \`${JSON.stringify(
            delegate.capabilities
            // eslint-disable-next-line @typescript-eslint/no-base-to-string
          )}\` for: \`${delegate}\``
        );
      }

      componentManagerDelegates.set(owner, delegate);
    }

    return delegate;
  }

  create(owner: O, element: SimpleElement, definition: object, capturedArgs: CapturedArguments) {
    let delegate = this.getDelegateFor(owner);

    let args = argsProxyFor(capturedArgs, 'modifier');
    let instance: ModifierInstance = delegate.createModifier(definition, args);

    let tag = createUpdatableTag();
    let state: CustomModifierState<ModifierInstance>;

    state = {
      tag,
      element,
      delegate,
      args,
      modifier: instance,
    };

    registerDestructor(state, () => delegate.destroyModifier(instance, args));

    return state;
  }

  getDebugName(definition: object) {
    if (typeof definition === 'function') {
      return definition.name || definition.toString();
    } else {
      return '<unknown>';
    }
  }

  getDebugInstance({ modifier }: CustomModifierState<ModifierInstance>) {
    return modifier;
  }

  getTag({ tag }: CustomModifierState<ModifierInstance>) {
    return tag;
  }

  install({ element, args, modifier, delegate }: CustomModifierState<ModifierInstance>) {
    let { capabilities } = delegate;

    if (capabilities.disableAutoTracking === true) {
      untrack(() => delegate.installModifier(modifier, castToBrowser(element, 'ELEMENT'), args));
    } else {
      delegate.installModifier(modifier, castToBrowser(element, 'ELEMENT'), args);
    }
  }

  update({ args, modifier, delegate }: CustomModifierState<ModifierInstance>) {
    let { capabilities } = delegate;

    if (capabilities.disableAutoTracking === true) {
      untrack(() => delegate.updateModifier(modifier, args));
    } else {
      delegate.updateModifier(modifier, args);
    }
  }

  getDestroyable(state: CustomModifierState<ModifierInstance>) {
    return state;
  }
}

export function reifyArgs({ named, positional }: CapturedArguments): {
  named: Record<string, unknown>;
  positional: unknown[];
} {
  let reifiedNamed = dict();

  for (const [key, value] of Object.entries(named)) {
    reifiedNamed[key] = valueForRef(value);
  }

  let reifiedPositional = positional.map(valueForRef);

  return {
    named: reifiedNamed,
    positional: reifiedPositional,
  };
}
