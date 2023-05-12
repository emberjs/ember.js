import type {
  CapturedArguments,
  InternalModifierManager,
  Owner,
  SimpleElement,
} from "@glimmer/interfaces";
import { type Reference, valueForRef } from '@glimmer/reference';
import { castToBrowser } from '@glimmer/util';
import { createUpdatableTag } from '@glimmer/validator';

interface OnModifierState {
  element: SimpleElement;
  nameRef: Reference<string>;
  listenerRef: Reference<EventListener>;
  name: string | null;
  listener: EventListener | null;
}

class OnModifierManager implements InternalModifierManager<OnModifierState, object> {
  create(_owner: Owner, element: SimpleElement, _: {}, args: CapturedArguments) {
    return {
      element,
      nameRef: args.positional[0] as Reference<string>,
      listenerRef: args.positional[1] as Reference<EventListener>,
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
    castToBrowser(state.element, 'ELEMENT').addEventListener(name, listener);
    state.listener = listener;
    state.name = name;
  }

  update(state: OnModifierState) {
    const element = castToBrowser(state.element, 'ELEMENT');
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

const onModifier: InternalModifierManager<unknown, object> = new OnModifierManager();

export default onModifier;
