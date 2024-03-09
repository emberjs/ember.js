import type {
  CapturedArguments,
  Destroyable,
  Dict,
  InternalModifierManager,
  Nullable,
  Owner,
  SimpleElement,
} from '@glimmer/interfaces';
import type { UpdatableTag } from '@glimmer/validator';
import { registerDestructor } from '@glimmer/destroyable';
import { reifyNamed, reifyPositional } from '@glimmer/runtime';
import { createUpdatableTag } from '@glimmer/validator';

export interface TestModifierConstructor {
  new (): TestModifierInstance;
}

export interface TestModifierInstance {
  element?: SimpleElement;
  didInsertElement?(_params: unknown[], _hash: Dict<unknown>): void;
  didUpdate?(_params: unknown[], _hash: Dict<unknown>): void;
  willDestroyElement?(): void;
}

export class TestModifierDefinitionState {
  constructor(public Klass?: TestModifierConstructor) {}
}

export class TestModifierManager
  implements InternalModifierManager<TestModifier, TestModifierDefinitionState>
{
  create(
    _owner: Owner,
    element: SimpleElement,
    state: TestModifierDefinitionState,
    args: CapturedArguments
  ) {
    let instance = state.Klass ? new state.Klass() : undefined;
    return new TestModifier(element, instance, args);
  }

  getTag({ tag }: TestModifier): UpdatableTag {
    return tag;
  }

  getDebugName({ Klass }: TestModifierDefinitionState) {
    return Klass?.name || '<unknown>';
  }

  getDebugInstance({ instance }: TestModifier) {
    return instance;
  }

  install({ element, args, instance }: TestModifier) {
    // Do this eagerly to ensure they are tracked
    let positional = reifyPositional(args.positional);
    let named = reifyNamed(args.named);

    if (instance && instance.didInsertElement) {
      instance.element = element;
      instance.didInsertElement(positional, named);
    }

    if (instance && instance.willDestroyElement) {
      registerDestructor(instance, () => instance.willDestroyElement!(), true);
    }
  }

  update({ args, instance }: TestModifier) {
    // Do this eagerly to ensure they are tracked
    let positional = reifyPositional(args.positional);
    let named = reifyNamed(args.named);

    if (instance && instance.didUpdate) {
      instance.didUpdate(positional, named);
    }
  }

  getDestroyable(modifier: TestModifier): Nullable<Destroyable> {
    return modifier.instance || null;
  }
}

export class TestModifier {
  public tag = createUpdatableTag();

  constructor(
    public element: SimpleElement,
    public instance: TestModifierInstance | undefined,
    public args: CapturedArguments
  ) {}
}
