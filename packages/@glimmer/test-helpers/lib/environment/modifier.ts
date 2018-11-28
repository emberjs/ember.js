import {
  ModifierManager,
  CapturedArguments,
  IDOMChanges,
  Arguments,
  DynamicScope,
} from '@glimmer/runtime';
import { Option, Simple } from '@glimmer/interfaces';
import { Tag, CONSTANT_TAG } from '@glimmer/reference';
import { Destroyable, Opaque, Dict } from '@glimmer/util';

export class InertModifierStateBucket {}

export class InertModifierDefinitionState {}

export class InertModifierManager
  implements ModifierManager<InertModifierStateBucket, InertModifierDefinitionState> {
  create(
    _element: Simple.Element,
    _state: InertModifierDefinitionState,
    _args: Arguments,
    _dynamicScope: DynamicScope,
    _dom: any
  ) {
    return new InertModifierStateBucket();
  }

  getTag(): Tag {
    return CONSTANT_TAG;
  }

  install() {}

  update() {}

  getDestructor(): Option<Destroyable> {
    return null;
  }
}

export class TestModifierDefinitionState {
  instance?: TestModifierInstance;
  constructor(Klass?: TestModifierConstructor) {
    if (Klass) {
      this.instance = new Klass();
    }
  }
}

export class TestModifier {
  constructor(
    public element: Simple.Element,
    public state: TestModifierDefinitionState,
    public args: CapturedArguments,
    public dom: IDOMChanges
  ) {}
}

export interface TestModifierConstructor {
  new (): TestModifierInstance;
}

export interface TestModifierInstance {
  element?: Simple.Element;
  didInsertElement(_params: Opaque[], _hash: Dict<Opaque>): void;
  didUpdate(_params: Opaque[], _hash: Dict<Opaque>): void;
  willDestroyElement(): void;
}

export class TestModifierManager
  implements ModifierManager<TestModifier, TestModifierDefinitionState> {
  public installedElements: Simple.Element[] = [];
  public updatedElements: Simple.Element[] = [];
  public destroyedModifiers: TestModifier[] = [];

  create(
    element: Simple.Element,
    state: TestModifierDefinitionState,
    args: Arguments,
    _dynamicScope: DynamicScope,
    dom: IDOMChanges
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
