import type {
  Arguments,
  HelperCapabilities,
  HelperManager,
  ModifierManager,
  Owner,
} from '@glimmer/interfaces';
import { registerDestructor } from '@glimmer/destroyable';
import {
  helperCapabilities,
  modifierCapabilities,
  setComponentTemplate,
  setHelperManager,
  setModifierManager,
} from '@glimmer/manager';
import { setOwner } from '@glimmer/owner';
import { templateOnlyComponent } from '@glimmer/runtime';

import { createTemplate } from '../compile';

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

export interface DefineComponentOptions {
  // defaults to templateOnlyComponent
  definition?: object;

  // defaults to true when some scopeValues are passed and false otherwise
  strictMode?: boolean;
}

export function defineComponent(
  scopeValues: Record<string, unknown> | null,
  templateSource: string,
  options: DefineComponentOptions = {}
) {
  let strictMode: boolean;
  if (typeof options.strictMode === 'boolean') {
    strictMode = options.strictMode;
  } else {
    strictMode = scopeValues !== null;
  }

  let definition = options.definition ?? templateOnlyComponent();
  let templateFactory = createTemplate(templateSource, { strictMode }, scopeValues ?? {});
  setComponentTemplate(templateFactory, definition);
  return definition;
}

export function defineSimpleHelper<T extends Function>(helperFn: T): T {
  return setHelperManager(FUNCTIONAL_HELPER_MANAGER_FACTORY, helperFn);
}

export function defineSimpleModifier<T extends Function>(modifierFn: T): T {
  return setModifierManager(FUNCTIONAL_MODIFIER_MANAGER_FACTORY, modifierFn);
}

export class TestHelperManager {
  capabilities: HelperCapabilities = helperCapabilities('3.23', {
    hasValue: true,
    hasDestroyable: true,
  });

  constructor(public owner: Owner | undefined) {}

  createHelper(
    Helper: { new (owner: Owner | undefined, args: Arguments): TestHelper },
    args: Arguments
  ) {
    return new Helper(this.owner, args);
  }

  getValue(instance: TestHelper) {
    return instance.value();
  }

  getDestroyable(instance: TestHelper) {
    return instance;
  }

  getDebugName() {
    return 'TEST_HELPER';
  }
}

export abstract class TestHelper {
  constructor(
    owner: Owner,
    public args: Arguments
  ) {
    setOwner(this, owner);

    registerDestructor(this, () => this.willDestroy());
  }

  abstract value(): unknown;

  willDestroy() {}
}

setHelperManager((owner) => new TestHelperManager(owner), TestHelper);
