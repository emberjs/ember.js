import type { Arguments, Dict, ModifierManager, SimpleElement } from '@glimmer/interfaces';
import { modifierCapabilities, setModifierManager } from '@glimmer/manager';

export interface TestModifierConstructor {
  new (): TestModifierInstance;
}

export interface TestModifierInstance {
  element?: SimpleElement;
  didInsertElement?(_params: unknown[], _hash: Dict): void;
  didUpdate?(_params: unknown[], _hash: Dict): void;
  willDestroyElement?(): void;
}

// The definition is a function so the public manager's default debug name
// (`definition.name`) is the legacy class's name.
type TestModifierDefinition = (() => void) & { Klass?: TestModifierConstructor };

/**
 * A public-API (`setModifierManager`, 3.22 capabilities) manager that maps the
 * legacy hook names used by these tests onto the public lifecycle:
 * `didInsertElement` -> `installModifier`, `didUpdate` -> `updateModifier`,
 * `willDestroyElement` -> `destroyModifier`.
 */
class TestModifierManager implements ModifierManager<TestModifierInstance> {
  capabilities = modifierCapabilities('3.22');

  // The modifier instance is the manager's state, so it is also what the debug
  // render tree reports as the modifier's instance.
  createModifier(definition: TestModifierDefinition): TestModifierInstance {
    return definition.Klass ? new definition.Klass() : {};
  }

  installModifier(instance: TestModifierInstance, element: Element, args: Arguments) {
    // Read eagerly so the args are tracked
    let positional = [...args.positional];
    let named = { ...args.named };

    if (instance.didInsertElement) {
      instance.element = element as unknown as SimpleElement;
      instance.didInsertElement(positional, named);
    }
  }

  updateModifier(instance: TestModifierInstance, args: Arguments) {
    let positional = [...args.positional];
    let named = { ...args.named };

    if (instance.didUpdate) {
      instance.didUpdate(positional, named);
    }
  }

  destroyModifier(instance: TestModifierInstance) {
    if (instance.willDestroyElement) {
      instance.willDestroyElement();
    }
  }
}

const TEST_MODIFIER_MANAGER = new TestModifierManager();

/** Wrap a legacy-hook class as a public-manager modifier definition. */
export function defineTestModifier(Klass?: TestModifierConstructor): object {
  let definition: TestModifierDefinition = () => {};
  Object.defineProperty(definition, 'name', { value: Klass?.name || '<unknown>' });
  definition.Klass = Klass;
  return setModifierManager(() => TEST_MODIFIER_MANAGER, definition);
}
