import { ModifierManager, VMArguments } from '@glimmer/interfaces';
import { VersionedReference } from '@glimmer/reference';
import { combine } from '@glimmer/validator';
import { SimpleElement } from '@simple-dom/interface';

interface OnModifierState {
  element: HTMLElement;
  nameRef: VersionedReference<string>;
  listenerRef: VersionedReference<EventListener>;
  name: string | null;
  listener: EventListener | null;
}

class OnModifierManager implements ModifierManager<OnModifierState, null> {
  create(element: SimpleElement, _: null, args: VMArguments) {
    return {
      element: element as HTMLElement,
      nameRef: args.positional.at(0) as VersionedReference<string>,
      listenerRef: args.positional.at(1) as VersionedReference<EventListener>,
      name: null,
      listener: null,
    };
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

  getTag(state: OnModifierState) {
    return combine([state.nameRef.tag, state.listenerRef.tag]);
  }
}

const onModifier: ModifierManager<unknown, null> = new OnModifierManager();

export default onModifier;
