import {
  helperCapabilities,
  modifierCapabilities,
  setComponentTemplate,
  setHelperManager,
  setModifierManager,
} from '@glimmer/manager';
import { templateOnlyComponent } from '@glimmer/runtime';

import type {
  Arguments,
  ComponentDefinitionState,
  HelperManager,
  ModifierManager,
} from '@glimmer/interfaces';
import compile from './compile';

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
  element: Element | undefined;
  destructor: (() => void) | undefined;
}

class FunctionalModifierManager implements ModifierManager<SimpleModifierState> {
  capabilities = modifierCapabilities('3.22');

  createModifier(fn: SimpleModifierFn, args: Arguments) {
    return { fn, args, element: undefined, destructor: undefined };
  }

  installModifier(state: SimpleModifierState, element: Element) {
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

/**
 * The signature of this test helper is closer to the signature of the
 * `template()` function in `@ember/template-compiler`. It can express the same
 * functionality as {@linkcode defineComponent}, but most tests still use
 * `defineComponent`. Migrating tests from {@linkcode defineComponent} is
 * straightforward, and there's no *semantic* reason not to do so.
 */
export function defComponent(
  templateSource: string,
  options?: {
    component?: object | undefined;
    scope?: Record<string, unknown> | undefined;
  }
) {
  let definition = options?.component ?? templateOnlyComponent();
  let scopeValues = options?.scope ?? null;

  return defineComponent(scopeValues, templateSource, definition);
}

export function defineComponent(
  scopeValues: Record<string, unknown> | null,
  templateSource: string,
  definition: object = templateOnlyComponent()
): ComponentDefinitionState {
  let templateFactory = compile(
    templateSource,
    { strictMode: scopeValues !== null },
    scopeValues ?? {}
  );

  setComponentTemplate(templateFactory, definition);

  return definition;
}

export function defineSimpleHelper<T extends (...args: unknown[]) => unknown>(helperFn: T): T {
  return setHelperManager(FUNCTIONAL_HELPER_MANAGER_FACTORY, helperFn);
}

export function defineSimpleModifier<T extends (element: Element, ...args: any[]) => any>(
  modifierFn: T
): T {
  return setModifierManager(FUNCTIONAL_MODIFIER_MANAGER_FACTORY, modifierFn);
}
