import { SimpleElement } from '@simple-dom/interface';
import {
  Dict,
  ModifierManager,
  GlimmerTreeChanges,
  Destroyable,
  DynamicScope,
  VMArguments,
  CapturedArguments,
} from '@glimmer/interfaces';
import { Tag } from '@glimmer/reference';

export interface TestModifierConstructor {
  new (): TestModifierInstance;
}

export interface TestModifierInstance {
  element?: SimpleElement;
  didInsertElement(_params: unknown[], _hash: Dict<unknown>): void;
  didUpdate(_params: unknown[], _hash: Dict<unknown>): void;
  willDestroyElement(): void;
}

export class TestModifierDefinitionState {
  instance?: TestModifierInstance;
  constructor(Klass?: TestModifierConstructor) {
    if (Klass) {
      this.instance = new Klass();
    }
  }
}

export class TestModifierManager
  implements ModifierManager<TestModifier, TestModifierDefinitionState> {
  public installedElements: SimpleElement[] = [];
  public updatedElements: SimpleElement[] = [];
  public destroyedModifiers: TestModifier[] = [];

  create(
    element: SimpleElement,
    state: TestModifierDefinitionState,
    args: VMArguments,
    _dynamicScope: DynamicScope,
    dom: GlimmerTreeChanges
  ) {
    return new TestModifier(element, state, args.capture(), dom);
  }

  getTag({ args: { tag } }: TestModifier): Tag {
    return tag;
  }

  install({ element, args, dom, state }: TestModifier) {
    this.installedElements.push(element);
    let firstParam = args.positional.at(0);
    let param = firstParam !== undefined && firstParam.value();
    dom.setAttribute(element, 'data-modifier', `installed - ${param}`);

    if (state.instance && state.instance.didInsertElement) {
      state.instance.element = element;
      state.instance.didInsertElement(args.positional.value(), args.named.value());
    }

    return;
  }

  update({ element, args, dom, state }: TestModifier) {
    this.updatedElements.push(element);
    let firstParam = args.positional.at(0);
    let param = firstParam !== undefined && firstParam.value();
    dom.setAttribute(element, 'data-modifier', `updated - ${param}`);

    if (state.instance && state.instance.didUpdate) {
      state.instance.didUpdate(args.positional.value(), args.named.value());
    }

    return;
  }

  getDestructor(modifier: TestModifier): Destroyable {
    return {
      destroy: () => {
        this.destroyedModifiers.push(modifier);
        let { element, dom, state } = modifier;
        if (state.instance && state.instance.willDestroyElement) {
          state.instance.willDestroyElement();
        }
        dom.removeAttribute(element, 'data-modifier');
      },
    };
  }
}

export class TestModifier {
  constructor(
    public element: SimpleElement,
    public state: TestModifierDefinitionState,
    public args: CapturedArguments,
    public dom: GlimmerTreeChanges
  ) {}
}
