import { ModifierManager, VMArguments } from '@glimmer/interfaces';
import { Reference } from '@glimmer/reference';
import { createUpdatableTag } from '@glimmer/validator';
import { SimpleElement } from '@simple-dom/interface';

interface OnModifierState {
  element: HTMLElement;
  nameRef: Reference<string>;
  listenerRef: Reference<EventListener>;
  name: string | null;
  listener: EventListener | null;
}

class OnModifierManager implements ModifierManager<OnModifierState, null> {
  create(element: SimpleElement, _: null, args: VMArguments) {
    return {
      element: element as HTMLElement,
      nameRef: args.positional.at(0) as Reference<string>,
      listenerRef: args.positional.at(1) as Reference<EventListener>,
      name: null,
      listener: null,
    };
  }

  getDebugName() {
    return 'on-modifier';
  }

  install(state: OnModifierState) {
    const name = state.nameRef.value();
    const listener = state.listenerRef.value();
    state.element.addEventListener(name, listener);
    state.listener = listener;
    state.name = name;
  }

  update(state: OnModifierState) {
    const element = state.element;
    const name = state.nameRef.value();
    const listener = state.listenerRef.value();
    if (name !== state.name || listener !== state.listener) {
      element.removeEventListener(state.name!, state.listener!);
      element.addEventListener(name, listener);
      state.name = name;
      state.listener = listener;
    }
  }

  getDestroyable(state: OnModifierState) {
    return state;
  }

  getTag() {
    return createUpdatableTag();
  }
}

const onModifier: ModifierManager<unknown, null> = new OnModifierManager();

export default onModifier;
