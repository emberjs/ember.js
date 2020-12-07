import { templateOnlyComponent } from '@glimmer/runtime';
import {
  setHelperManager,
  helperCapabilities,
  setComponentTemplate,
  modifierCapabilities,
  setModifierManager,
} from '@glimmer/manager';

import { createTemplate } from '../compile';

import { Arguments, HelperManager, ModifierManager } from '@glimmer/interfaces';
import { SimpleElement } from '@simple-dom/interface';

interface SimpleHelperState {
  fn: (...args: unknown[]) => unknown;
  args: Arguments;
}

class FunctionalHelperManager implements HelperManager<SimpleHelperState> {
  capabilities = helperCapabilities('3.23', {
    hasValue: true,
  });

  createHelper(fn: () => unknown, args: Arguments) {
    return { fn, args };
  }

  getValue({ fn, args }: SimpleHelperState) {
    return fn(...args.positional);
  }

  getDebugName(fn: Function) {
    return fn.name || '(anonymous function)';
  }
}

const FUNCTIONAL_HELPER_MANAGER = new FunctionalHelperManager();
const FUNCTIONAL_HELPER_MANAGER_FACTORY = () => FUNCTIONAL_HELPER_MANAGER;

type SimpleModifierFn = (...args: unknown[]) => (() => void) | undefined;

interface SimpleModifierState {
  fn: SimpleModifierFn;
  args: Arguments;
  element: SimpleElement | undefined;
  destructor: (() => void) | undefined;
}

class FunctionalModifierManager implements ModifierManager<SimpleModifierState> {
  capabilities = modifierCapabilities('3.22');

  createModifier(fn: SimpleModifierFn, args: Arguments) {
    return { fn, args, element: undefined, destructor: undefined };
  }

  installModifier(state: SimpleModifierState, element: SimpleElement) {
    state.element = element;
    this.setupModifier(state);
  }

  updateModifier(state: SimpleModifierState) {
    this.destroyModifier(state);
    this.setupModifier(state);
  }

  setupModifier(state: SimpleModifierState) {
    let { fn, args, element } = state;

    state.destructor = fn(element, args.positional, args.named);
  }

  destroyModifier(state: SimpleModifierState) {
    if (typeof state.destructor === 'function') {
      state.destructor();
    }
  }

  getDebugName(fn: Function) {
    return fn.name || '(anonymous function)';
  }
}

const FUNCTIONAL_MODIFIER_MANAGER = new FunctionalModifierManager();
const FUNCTIONAL_MODIFIER_MANAGER_FACTORY = () => FUNCTIONAL_MODIFIER_MANAGER;

export function defineComponent(
  scopeValues: Record<string, unknown> | null,
  templateSource: string,
  definition: object = templateOnlyComponent()
) {
  let templateFactory = createTemplate(
    templateSource,
    { strictMode: scopeValues !== null },
    scopeValues ?? {}
  );

  setComponentTemplate(templateFactory, definition);

  return definition;
}

export function defineSimpleHelper<T extends Function>(helperFn: T): T {
  return setHelperManager(FUNCTIONAL_HELPER_MANAGER_FACTORY, helperFn);
}

export function defineSimpleModifier<T extends Function>(modifierFn: T): T {
  return setModifierManager(FUNCTIONAL_MODIFIER_MANAGER_FACTORY, modifierFn);
}
