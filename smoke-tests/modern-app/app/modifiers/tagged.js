// ember-modifier-style function-based modifier built directly on the public
// setModifierManager + capabilities('3.22') API (what ember-modifier's
// `modifier()` does under the hood).
import { setModifierManager, capabilities } from '@ember/modifier';

class FunctionModifierManager {
  capabilities = capabilities('3.22');

  createModifier(fn) {
    return { fn, element: null, teardown: undefined };
  }

  installModifier(state, element, args) {
    state.element = element;
    state.teardown = state.fn(element, args.positional, args.named);
  }

  updateModifier(state, args) {
    if (typeof state.teardown === 'function') state.teardown();
    state.teardown = state.fn(state.element, args.positional, args.named);
  }

  destroyModifier(state) {
    if (typeof state.teardown === 'function') state.teardown();
  }
}

const MANAGER = new FunctionModifierManager();

export function modifier(fn) {
  return setModifierManager(() => MANAGER, fn);
}

export const tagged = modifier((element, [label]) => {
  element.setAttribute('data-tagged', String(label));
});
