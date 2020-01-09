import { Factory } from '@ember/-internals/owner';
import { getDebugName } from '@ember/-internals/utils';
import { assert, deprecate } from '@ember/debug';
import { DEBUG } from '@glimmer/env';
import { CapturedArguments, Dict, ModifierManager, VMArguments } from '@glimmer/interfaces';
import {
  combine,
  CONSTANT_TAG,
  createUpdatableTag,
  Tag,
  track,
  untrack,
  update,
} from '@glimmer/validator';
import { SimpleElement } from '@simple-dom/interface';
import debugRenderMessage from '../utils/debug-render-message';

export interface CustomModifierDefinitionState<ModifierInstance> {
  ModifierClass: Factory<ModifierInstance>;
  name: string;
  delegate: ModifierManagerDelegate<ModifierInstance>;
}

export interface OptionalCapabilities {
  disableAutoTracking?: boolean;
}

export interface Capabilities {
  disableAutoTracking: boolean;
}

export function capabilities(
  managerAPI: string,
  optionalFeatures: OptionalCapabilities = {}
): Capabilities {
  if (managerAPI !== '3.13') {
    managerAPI = '3.13';

    deprecate(
      'Modifier manager capabilities now require you to pass a valid version when being generated. Valid versions include: 3.13',
      false,
      {
        until: '3.17.0',
        id: 'implicit-modifier-manager-capabilities',
      }
    );
  }

  assert('Invalid modifier manager compatibility specified', managerAPI === '3.13');

  return {
    disableAutoTracking: Boolean(optionalFeatures.disableAutoTracking),
  };
}

export class CustomModifierDefinition<ModifierInstance> {
  public state: CustomModifierDefinitionState<ModifierInstance>;
  public manager: ModifierManager<unknown | null, CustomModifierDefinitionState<ModifierInstance>>;

  constructor(
    public name: string,
    public ModifierClass: Factory<ModifierInstance>,
    public delegate: ModifierManagerDelegate<ModifierInstance>,
    isInteractive: boolean
  ) {
    this.state = {
      ModifierClass,
      name,
      delegate,
    };

    this.manager = isInteractive
      ? CUSTOM_INTERACTIVE_MODIFIER_MANAGER
      : CUSTOM_NON_INTERACTIVE_MODIFIER_MANAGER;
  }
}

export class CustomModifierState<ModifierInstance> {
  public tag = createUpdatableTag();

  constructor(
    public element: SimpleElement,
    public delegate: ModifierManagerDelegate<ModifierInstance>,
    public modifier: ModifierInstance,
    public args: CapturedArguments
  ) {}

  destroy() {
    const { delegate, modifier, args } = this;
    delegate.destroyModifier(modifier, args.value());
  }
}

// TODO: export ICapturedArgumentsValue from glimmer and replace this
export interface Args {
  named: Dict<unknown>;
  positional: unknown[];
}

export interface ModifierManagerDelegate<ModifierInstance> {
  capabilities: Capabilities;
  createModifier(factory: unknown, args: Args): ModifierInstance;
  installModifier(instance: ModifierInstance, element: SimpleElement, args: Args): void;
  updateModifier(instance: ModifierInstance, args: Args): void;
  destroyModifier(instance: ModifierInstance, args: Args): void;
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
class InteractiveCustomModifierManager<ModifierInstance>
  implements
    ModifierManager<
      CustomModifierState<ModifierInstance>,
      CustomModifierDefinitionState<ModifierInstance>
    > {
  create(
    element: SimpleElement,
    definition: CustomModifierDefinitionState<ModifierInstance>,
    args: VMArguments
  ) {
    let { delegate, ModifierClass } = definition;
    const capturedArgs = args.capture();

    let instance = definition.delegate.createModifier(ModifierClass, capturedArgs.value());

    if (delegate.capabilities === undefined) {
      delegate.capabilities = capabilities('3.13');

      deprecate(
        'Custom modifier managers must define their capabilities using the capabilities() helper function',
        false,
        {
          until: '3.17.0',
          id: 'implicit-modifier-manager-capabilities',
        }
      );
    }

    return new CustomModifierState(element, delegate, instance, capturedArgs);
  }

  getTag({ args, tag }: CustomModifierState<ModifierInstance>): Tag {
    return combine([tag, args.tag]);
  }

  install(state: CustomModifierState<ModifierInstance>) {
    let { element, args, delegate, modifier, tag } = state;
    let { capabilities } = delegate;

    if (capabilities.disableAutoTracking === true) {
      untrack(() => delegate.installModifier(modifier, element, args.value()));
    } else {
      let combinedTrackingTag = track(
        () => delegate.installModifier(modifier, element, args.value()),
        DEBUG && debugRenderMessage!(`(instance of a \`${getDebugName!(modifier)}\` modifier)`)
      );

      update(tag, combinedTrackingTag);
    }
  }

  update(state: CustomModifierState<ModifierInstance>) {
    let { args, delegate, modifier, tag } = state;
    let { capabilities } = delegate;

    if (capabilities.disableAutoTracking === true) {
      untrack(() => delegate.updateModifier(modifier, args.value()));
    } else {
      let combinedTrackingTag = track(
        () => delegate.updateModifier(modifier, args.value()),
        DEBUG && debugRenderMessage!(`(instance of a \`${getDebugName!(modifier)}\` modifier)`)
      );
      update(tag, combinedTrackingTag);
    }
  }

  getDestructor(state: CustomModifierState<ModifierInstance>) {
    return state;
  }
}

class NonInteractiveCustomModifierManager<ModifierInstance>
  implements ModifierManager<null, CustomModifierDefinitionState<ModifierInstance>> {
  create() {
    return null;
  }

  getTag(): Tag {
    return CONSTANT_TAG;
  }

  install() {}

  update() {}

  getDestructor() {
    return null;
  }
}

const CUSTOM_INTERACTIVE_MODIFIER_MANAGER = new InteractiveCustomModifierManager();
const CUSTOM_NON_INTERACTIVE_MODIFIER_MANAGER = new NonInteractiveCustomModifierManager();
