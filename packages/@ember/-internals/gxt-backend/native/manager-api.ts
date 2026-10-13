// gxt NATIVE layer — alias target for `@glimmer/manager` and every deep path
// (`lib/internal/api`, `lib/public/{api,component,helper,modifier,template}`,
// `lib/util/args-proxy`).
//
// The registries (internal + public managers, component templates, custom tag
// functions) and the capability builders are real: they are plain WeakMaps with
// Glimmer's prototype-chain lookup, and classic modules call them at MODULE EVAL
// (InternalComponent's `opaquify`, the `element`/`unique-id` internal helpers,
// `on`, @glimmer/component's setComponentManager). The manager PROTOCOLS live
// in the native `$_MANAGERS` slots (managers.ts, helper-manager.ts,
// modifier-manager.ts) that gxt's `_component` / `$_maybeHelper` /
// `$_maybeModifier` consult. `Custom*Manager` here only records the public
// manager factory.
import { DEBUG } from '@glimmer/env';
import { isTemplateFn } from '@lifeart/gxt';
import { NULL_REFERENCE } from './reference';
import { TemplateOnlyComponentDefinition } from './template-only';
import type { Tag } from './validator';

// ---------------------------------------------------------------- internal api
const COMPONENT_MANAGERS = new WeakMap<object, unknown>();
const HELPER_MANAGERS = new WeakMap<object, unknown>();
const MODIFIER_MANAGERS = new WeakMap<object, unknown>();

const getPrototypeOf = Object.getPrototypeOf;

function setManager<T extends object>(map: WeakMap<object, unknown>, manager: unknown, obj: T): T {
  if (DEBUG && !(obj !== null && (typeof obj === 'object' || typeof obj === 'function'))) {
    throw new Error(`Attempted to set a manager on a non-object value: ${String(obj)}`);
  }
  if (DEBUG && map.has(obj)) {
    // Glimmer's message (manager/lib/internal/api.ts); the value label never
    // throws (a null-prototype object has no toString).
    const label =
      (typeof obj === 'function' && (obj as { name?: string }).name) ||
      Object.prototype.toString.call(obj);
    throw new Error(
      `Attempted to set the same type of manager multiple times on a value. You can only associate one manager of each type with a given value. Value was ${label}`
    );
  }
  map.set(obj, manager);
  return obj;
}

function getManager(map: WeakMap<object, unknown>, obj: object): unknown {
  let pointer: object | null = obj;
  while (pointer !== undefined && pointer !== null) {
    const manager = map.get(pointer);
    if (manager !== undefined) return manager;
    pointer = getPrototypeOf(pointer) as object | null;
  }
  return undefined;
}

export function setInternalComponentManager<T extends object>(manager: unknown, definition: T): T {
  return setManager(COMPONENT_MANAGERS, manager, definition);
}
export function getInternalComponentManager(definition: object, _isOptional?: boolean): any {
  return getManager(COMPONENT_MANAGERS, definition);
}
// Glimmer's TEMPLATE_ONLY_COMPONENT_MANAGER, registered on the `templateOnly()`
// definition class as Glimmer does (@glimmer/runtime/lib/component/
// template-only.ts): `getInternalComponentManager(templateOnly())` is this
// manager. The native renderer draws template-only definitions itself
// (managers.ts); this is the manager protocol a caller can observe.
const TEMPLATE_ONLY_CAPABILITIES = {
  dynamicLayout: false,
  dynamicTag: false,
  prepareArgs: false,
  createArgs: false,
  attributeHook: false,
  elementHook: false,
  createCaller: false,
  dynamicScope: false,
  updateHook: false,
  createInstance: false,
  wrapped: false,
  willDestroy: false,
  hasSubOwner: false,
};
export const TEMPLATE_ONLY_COMPONENT_MANAGER = {
  getCapabilities: () => TEMPLATE_ONLY_CAPABILITIES,
  getDebugName: ({ name }: TemplateOnlyComponentDefinition) => name,
  getSelf: () => NULL_REFERENCE,
  getDestroyable: () => null,
};
COMPONENT_MANAGERS.set(TemplateOnlyComponentDefinition.prototype, TEMPLATE_ONLY_COMPONENT_MANAGER);
// A gxt template function (the compiled `<template>` of a template-only
// `.gjs`/`.gts`, e.g. a route template) IS a component in the native build —
// gxt renders it directly, the way Glimmer's TEMPLATE_ONLY_COMPONENT_MANAGER
// marks `templateOnly()` definitions. route.ts (`buildRenderState`) relies on
// this to keep such a template UNINVOKED instead of calling it as
// `factory(owner)`. The gxt compiler brands template functions under
// NATIVE_FLAGS.EMBER_NATIVE (`$_tpl`), so this is an exact check — a
// TemplateFactory or a plain function is not a template function. A
// `templateOnly()` definition has TEMPLATE_ONLY_COMPONENT_MANAGER (above).
export function hasInternalComponentManager(definition: object): boolean {
  return getManager(COMPONENT_MANAGERS, definition) !== undefined || isTemplateFn(definition);
}

export function setInternalHelperManager<T extends object>(manager: unknown, definition: T): T {
  return setManager(HELPER_MANAGERS, manager, definition);
}
// Functions are the "default" helper (RFC 756): a plain function without a
// registered manager is driven by the function helper manager (Glimmer parity:
// `getInternalHelperManager(fn)` returns DEFAULT_MANAGER — `invokeHelper` with a
// plain function relies on it).
export function getInternalHelperManager(definition: object, _isOptional?: boolean): any {
  const manager = getManager(HELPER_MANAGERS, definition);
  if (manager === undefined && typeof definition === 'function') return DEFAULT_HELPER_MANAGER;
  return manager;
}
export function hasInternalHelperManager(definition: object): boolean {
  return getManager(HELPER_MANAGERS, definition) !== undefined;
}

export function setInternalModifierManager<T extends object>(manager: unknown, definition: T): T {
  return setManager(MODIFIER_MANAGERS, manager, definition);
}
export function getInternalModifierManager(definition: object, _isOptional?: boolean): any {
  return getManager(MODIFIER_MANAGERS, definition);
}
export function hasInternalModifierManager(definition: object): boolean {
  return getManager(MODIFIER_MANAGERS, definition) !== undefined;
}

// ---------------------------------------------------------------- public api
type ManagerFactory = (owner: object) => unknown;

// Records of a public custom manager registration. The native `$_MANAGERS`
// tables (native/managers.ts, helper-manager.ts, modifier-manager.ts) drive the
// 3.13 / 3.23 / 3.22 protocols on the delegate `getDelegateFor(owner)` returns —
// one delegate per (manager, owner), created by `factory(owner)` (Glimmer
// parity, incl. a separate delegate for an `undefined` owner).
const NO_OWNER = {};

class CustomManagerRecord<D> {
  #delegates = new WeakMap<object, D>();
  constructor(readonly factory: ManagerFactory) {}

  getDelegateFor(owner: object | undefined): D {
    const key = owner ?? NO_OWNER;
    let delegate = this.#delegates.get(key);
    if (delegate === undefined) {
      delegate = this.factory(owner as object) as D;
      this.#delegates.set(key, delegate);
    }
    return delegate;
  }
}

export class CustomComponentManager extends CustomManagerRecord<{ capabilities: object }> {
  override getDelegateFor(owner: object | undefined): { capabilities: object } {
    const delegate = super.getDelegateFor(owner);
    if (DEBUG && !FROM_CAPABILITIES!.has(delegate.capabilities)) {
      throw new Error(
        `Custom component managers must have a \`capabilities\` property that is the result of calling the \`capabilities('3.13')\` (imported via \`import { capabilities } from '@ember/component';\`). Received: \`${JSON.stringify(delegate.capabilities)}\` for: \`${String(delegate)}\``
      );
    }
    return delegate;
  }
}
export class CustomHelperManager extends CustomManagerRecord<HelperDelegate> {
  override getDelegateFor(owner: object | undefined): HelperDelegate {
    const delegate = super.getDelegateFor(owner);
    if (DEBUG && !FROM_CAPABILITIES!.has(delegate.capabilities)) {
      throw new Error(
        `Custom helper managers must have a \`capabilities\` property that is the result of calling the \`capabilities('3.23')\` (imported via \`import { capabilities } from '@ember/helper';\`). Received: \`${JSON.stringify(delegate.capabilities)}\` for: \`${String(delegate)}\``
      );
    }
    return delegate;
  }
}
export class CustomModifierManager extends CustomManagerRecord<ModifierDelegate> {
  override getDelegateFor(owner: object | undefined): ModifierDelegate {
    const delegate = super.getDelegateFor(owner);
    if (DEBUG && !FROM_CAPABILITIES!.has(delegate.capabilities)) {
      throw new Error(
        `Custom modifier managers must have a \`capabilities\` property that is the result of calling the \`capabilities('3.22')\` (imported via \`import { capabilities } from '@ember/modifier';\`). Received: \`${JSON.stringify(delegate.capabilities)}\` for: \`${String(delegate)}\``
      );
    }
    return delegate;
  }
}

/** Arguments handed to custom managers (lazy args proxies, native/args.ts). */
interface ManagerArgs {
  positional: readonly unknown[];
  named: Record<string, unknown>;
}

/** A public helper manager delegate (capabilities 3.23). */
export interface HelperDelegate {
  capabilities: { hasValue: boolean; hasDestroyable: boolean; hasScheduledEffect?: boolean };
  createHelper(definition: object, args: ManagerArgs): unknown;
  getValue?(bucket: unknown): unknown;
  getDestroyable?(bucket: unknown): object | null;
  getDebugName?(definition: object): string;
}

/** A public modifier manager delegate (capabilities 3.22). */
export interface ModifierDelegate {
  capabilities: { disableAutoTracking?: boolean };
  createModifier(definition: object, args: ManagerArgs): unknown;
  installModifier(instance: unknown, element: Element, args: ManagerArgs): void;
  updateModifier(instance: unknown, args: ManagerArgs): void;
  destroyModifier(instance: unknown, args: ManagerArgs): void;
}

// Ember's default (function) helper manager (Glimmer FunctionHelperManager):
// positional arguments, plus the named arguments as a trailing argument when
// there are any.
class FunctionHelperManager implements HelperDelegate {
  capabilities = buildCapabilities({
    hasValue: true,
    hasDestroyable: false,
    hasScheduledEffect: false,
  });

  createHelper(fn: object, args: ManagerArgs): { fn: object; args: ManagerArgs } {
    return { fn, args };
  }

  getValue({ fn, args }: { fn: (...a: unknown[]) => unknown; args: ManagerArgs }): unknown {
    if (Object.keys(args.named).length > 0) {
      return fn(...args.positional, args.named);
    }
    return fn(...args.positional);
  }

  getDebugName(fn: { name?: string }): string {
    return fn.name ? `(helper function ${fn.name})` : '(anonymous helper function)';
  }
}

let FUNCTION_HELPER_MANAGER: FunctionHelperManager | undefined;
export const DEFAULT_HELPER_MANAGER = new CustomHelperManager(
  () => (FUNCTION_HELPER_MANAGER ??= new FunctionHelperManager())
);

export function setComponentManager<T extends object>(factory: ManagerFactory, obj: T): T {
  return setInternalComponentManager(new CustomComponentManager(factory), obj);
}
export function setHelperManager<T extends object>(factory: ManagerFactory, obj: T): T {
  return setInternalHelperManager(new CustomHelperManager(factory), obj);
}
export function setModifierManager<T extends object>(factory: ManagerFactory, obj: T): T {
  return setInternalModifierManager(new CustomModifierManager(factory), obj);
}

// ---------------------------------------------------------------- capabilities
export const FROM_CAPABILITIES: WeakSet<object> | undefined = DEBUG ? new WeakSet() : undefined;

export function buildCapabilities<T extends object>(capabilities: T): T {
  if (DEBUG) {
    (FROM_CAPABILITIES as WeakSet<object>).add(capabilities);
    Object.freeze(capabilities);
  }
  return capabilities;
}

export function componentCapabilities(
  managerAPI: string,
  options: { asyncLifecycleCallbacks?: boolean; destructor?: boolean; updateHook?: boolean } = {}
) {
  if (DEBUG && managerAPI !== '3.13') {
    throw new Error('Invalid component manager compatibility specified');
  }
  return buildCapabilities({
    asyncLifeCycleCallbacks: Boolean(options.asyncLifecycleCallbacks),
    destructor: Boolean(options.destructor),
    updateHook: Boolean(options.updateHook),
  });
}

export function helperCapabilities(
  managerAPI: string,
  options: { hasValue?: boolean; hasDestroyable?: boolean; hasScheduledEffect?: boolean } = {}
) {
  if (DEBUG && managerAPI !== '3.23') {
    throw new Error(
      `Invalid helper manager compatibility specified; you specified ${managerAPI}, but only '3.23' is supported.`
    );
  }
  if (
    DEBUG &&
    (!(options.hasValue || options.hasScheduledEffect) ||
      (options.hasValue && options.hasScheduledEffect))
  ) {
    throw new Error(
      'You must pass either the `hasValue` OR the `hasScheduledEffect` capability when defining a helper manager. Passing neither, or both, is not permitted.'
    );
  }
  if (DEBUG && options.hasScheduledEffect) {
    throw new Error(
      'The `hasScheduledEffect` capability has not yet been implemented for helper managers. Please pass `hasValue` instead'
    );
  }
  return buildCapabilities({
    hasValue: Boolean(options.hasValue),
    hasDestroyable: Boolean(options.hasDestroyable),
    hasScheduledEffect: Boolean(options.hasScheduledEffect),
  });
}

export function hasValue(manager: { capabilities: { hasValue: boolean } }): boolean {
  return manager.capabilities.hasValue;
}
export function hasDestroyable(manager: { capabilities: { hasDestroyable: boolean } }): boolean {
  return manager.capabilities.hasDestroyable;
}

export function modifierCapabilities(
  managerAPI: string,
  optionalFeatures: { disableAutoTracking?: boolean } = {}
) {
  if (DEBUG && managerAPI !== '3.22') {
    throw new Error(
      `Invalid modifier manager compatibility specified; you specified ${managerAPI}, but only '3.22' is supported.`
    );
  }
  return buildCapabilities({ disableAutoTracking: Boolean(optionalFeatures.disableAutoTracking) });
}

// ---------------------------------------------------------------- templates
const TEMPLATES = new WeakMap<object, unknown>();

export function setComponentTemplate<T extends object>(factory: unknown, obj: T): T {
  if (DEBUG && !(obj !== null && (typeof obj === 'object' || typeof obj === 'function'))) {
    throw new Error(`Cannot call \`setComponentTemplate\` on \`${String(obj)}\``);
  }
  if (DEBUG && TEMPLATES.has(obj)) {
    throw new Error(
      `Cannot call \`setComponentTemplate\` multiple times on the same class (\`${String(obj)}\`)`
    );
  }
  TEMPLATES.set(obj, factory);
  return obj;
}

/** The template registered on `obj` itself (no prototype-chain walk). */
export function getOwnComponentTemplate(obj: object): unknown {
  return TEMPLATES.get(obj);
}

export function getComponentTemplate(obj: object): any {
  let pointer: object | null = obj;
  while (pointer !== null) {
    const template = TEMPLATES.get(pointer);
    if (template !== undefined) return template;
    pointer = getPrototypeOf(pointer) as object | null;
  }
  return undefined;
}

// VM capability bitmask checks (`@glimmer/manager` surface; pure functions).
export function hasCapability(capabilities: number, capability: number): boolean {
  return !!(capabilities & capability);
}
export function managerHasCapability(
  _manager: unknown,
  capabilities: number,
  capability: number
): boolean {
  return !!(capabilities & capability);
}

// ---------------------------------------------------------------- custom tags
// Proxy objects (ArrayProxy / ObjectProxy) register a per-key tag function that
// metal's tagForProperty consults.
const CUSTOM_TAG_FOR = new WeakMap<object, (obj: object, key: string) => Tag>();

export function getCustomTagFor(obj: object): ((obj: object, key: string) => Tag) | undefined {
  return CUSTOM_TAG_FOR.get(obj);
}
export function setCustomTagFor(obj: object, customTagFn: (obj: object, key: string) => Tag): void {
  CUSTOM_TAG_FOR.set(obj, customTagFn);
}
