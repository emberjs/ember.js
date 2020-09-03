import { ModifierManager, VMArguments } from '@glimmer/interfaces';
import { Reference, valueForRef } from '@glimmer/reference';
import { cast } from '@glimmer/util';
import { createUpdatableTag } from '@glimmer/validator';
import { SimpleElement } from '@simple-dom/interface';

interface OnModifierState {
  element: SimpleElement;
  nameRef: Reference<string>;
  listenerRef: Reference<EventListener>;
  name: string | null;
  listener: EventListener | null;
}

class OnModifierManager implements ModifierManager<OnModifierState, null> {
  create(element: SimpleElement, _: null, args: VMArguments) {
    return {
      element,
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
    const name = valueForRef(state.nameRef);
    const listener = valueForRef(state.listenerRef);
    cast(state.element, 'ELEMENT').addEventListener(name, listener);
    state.listener = listener;
    state.name = name;
  }

  update(state: OnModifierState) {
    const element = cast(state.element, 'ELEMENT');
    const name = valueForRef(state.nameRef);
    const listener = valueForRef(state.listenerRef);
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
