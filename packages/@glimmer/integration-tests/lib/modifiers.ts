import { SimpleElement } from '@simple-dom/interface';
import {
  Dict,
  Option,
  ModifierManager,
  GlimmerTreeChanges,
  Destroyable,
  DynamicScope,
  VMArguments,
  CapturedArguments,
} from '@glimmer/interfaces';
import { UpdatableTag, createUpdatableTag } from '@glimmer/validator';
import { registerDestructor } from '@glimmer/runtime';

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
  implements ModifierManager<TestModifier, TestModifierDefinitionState> {
  create(
    element: SimpleElement,
    state: TestModifierDefinitionState,
    args: VMArguments,
    _dynamicScope: DynamicScope,
    dom: GlimmerTreeChanges
  ) {
    let instance = state.Klass ? new state.Klass() : undefined;
    return new TestModifier(element, instance, args.capture(), dom);
  }

  getTag({ tag }: TestModifier): UpdatableTag {
    return tag;
  }

  getDebugName() {
    return '<unknown>';
  }

  install({ element, args, instance }: TestModifier) {
    // Do this eagerly to ensure they are tracked
    let positional = args.positional.value();
    let named = args.named.value();

    if (instance && instance.didInsertElement) {
      instance.element = element;
      instance.didInsertElement(positional, named);
    }

    if (instance && instance.willDestroyElement) {
      registerDestructor(instance, () => instance!.willDestroyElement!(), true);
    }
  }

  update({ args, instance }: TestModifier) {
    // Do this eagerly to ensure they are tracked
    let positional = args.positional.value();
    let named = args.named.value();

    if (instance && instance.didUpdate) {
      instance.didUpdate(positional, named);
    }
  }

  getDestroyable(modifier: TestModifier): Option<Destroyable> {
    return modifier.instance || null;
  }
}

export class TestModifier {
  public tag = createUpdatableTag();

  constructor(
    public element: SimpleElement,
    public instance: TestModifierInstance | undefined,
    public args: CapturedArguments,
    public dom: GlimmerTreeChanges
  ) {}
}
