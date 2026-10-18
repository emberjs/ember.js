// gxt NATIVE layer — alias target for the `@glimmer/runtime` deep imports that
// classic Ember's public modules re-export:
//   `@glimmer/runtime/lib/helpers/*`        (@ember/helper)
//   `@glimmer/runtime/lib/modifiers/on`     (@ember/modifier `on`)
//   `@glimmer/runtime/lib/component/template-only` (@ember/component/template-only)
//
// The helpers keep Glimmer's own split:
//   - `hash`, `array`, `concat`, `get`, `fn`, `and`, `or` are INTERNAL helpers
//     (`internalHelper`: a `(capturedArgs, owner) => Reference` function set as
//     the internal helper manager of a `{}` definition), ported verbatim onto the
//     native references (native/reference.ts: compute refs are native
//     `createCache`s). native/helper-manager.ts builds one reference per
//     argument for them, once per call site.
//   - `eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `not` are PLAIN functions driven by
//     the default (function) helper manager.
//   - `invokeHelper` is Glimmer's (createCache + destroyable association).
//   - `on` is a native internal modifier (native/modifier-manager.ts drives
//     create / install / update / destroy): add/removeEventListener, re-adding
//     the listener only when the event name, the handler identity or an option
//     changes; `once` / `passive` / `capture`; Glimmer's argument asserts.
import { DEBUG } from '@glimmer/env';
import { getOwner } from '@ember/-internals/owner';
import { get as emberGet } from '@ember/-internals/metal/lib/property_get';
import toBool from '@ember/-internals/glimmer/lib/utils/to-bool';
import { unwrapArg, type Arguments, type ArgsSource } from './args';
import {
  associateDestroyableChild,
  isDestroyed,
  isDestroying,
  registerDestructor,
} from './destroyable';
import {
  getInternalHelperManager,
  hasDestroyable,
  hasValue,
  setInternalHelperManager,
  setInternalModifierManager,
  type CustomHelperManager,
  type HelperDelegate,
} from './manager-api';
import { createComputeRef, UNDEFINED_REFERENCE, valueForRef, type Reference } from './reference';
import { createCache, getValue, type Cache } from './validator';

export { TemplateOnlyComponentDefinition, templateOnlyComponent } from './template-only';
// `{{debugger}}`'s callback (`@glimmer/runtime`'s `setDebuggerCallback` /
// `resetDebuggerCallback`): Glimmer's own module, which has no VM dependency;
// the native `debugger` host hook (native/install.ts) calls it.
export {
  type DebugCallback,
  getDebuggerCallback,
  resetDebuggerCallback,
  setDebuggerCallback,
} from '@glimmer/runtime/lib/debugger-callback';

/** Glimmer CapturedArguments over native references. */
export interface CapturedArguments {
  positional: Reference<any>[];
  named: Record<string, Reference<any>>;
}

export type InternalHelper = ((
  args: CapturedArguments,
  owner: object | undefined
) => Reference<any>) & {
  /**
   * A direct form (native/helper-manager.ts): the helper's value for a call
   * site, computed ONCE from the call site's literal-or-thunk arguments with
   * no reference per argument. Only for a helper whose value never changes
   * and consumes nothing: `fn`.
   */
  valueForCallSite?: (source: ArgsSource) => unknown;
};

function internalHelper(
  helper: InternalHelper,
  valueForCallSite?: (source: ArgsSource) => unknown
): object {
  if (valueForCallSite !== undefined) helper.valueForCallSite = valueForCallSite;
  return setInternalHelperManager(helper, {});
}

const reifyPositional = (positional: Reference[]): unknown[] => positional.map(valueForRef);

// Built for DEV messages only: the `this` of functions called by `fn` / `on`.
function buildUntouchableThis(source: string): object | null {
  if (!DEBUG) return null;
  const assertOnProperty = (property: PropertyKey): never => {
    const access =
      typeof property === 'symbol' || typeof property === 'number'
        ? `[${String(property)}]`
        : `.${property}`;
    throw new Error(
      `You accessed \`this${access}\` from a function passed to the ${source}, but the function itself was not bound to a valid \`this\` context. Consider updating to use a bound function (for instance, use an arrow function, \`() => {}\`).`
    );
  };
  return new Proxy(
    {},
    {
      get: (_t, p) => assertOnProperty(p),
      set: (_t, p) => assertOnProperty(p),
      has: (_t, p) => assertOnProperty(p),
    }
  );
}

// ---------------------------------------------------------------- internal helpers
export const hash = /*#__PURE__*/ internalHelper(({ named }) => {
  const ref = createComputeRef(
    () => {
      const out: Record<string, unknown> = {};
      for (const key of Object.keys(named)) out[key] = valueForRef(named[key]!);
      return out;
    },
    null,
    'hash'
  );
  ref.children = new Map(Object.entries(named));
  return ref;
});

export const array = /*#__PURE__*/ internalHelper(({ positional }) =>
  createComputeRef(() => reifyPositional(positional), null, 'array')
);

const normalizeTextValue = (value: unknown): string =>
  value === null ||
  value === undefined ||
  typeof (value as { toString?: unknown }).toString !== 'function'
    ? ''
    : String(value);

export const concat = /*#__PURE__*/ internalHelper(({ positional }) =>
  createComputeRef(
    () => reifyPositional(positional).map(normalizeTextValue).join(''),
    null,
    'concat'
  )
);

const isDict = (value: unknown): value is object =>
  value !== null && (typeof value === 'object' || typeof value === 'function');

export const get = /*#__PURE__*/ internalHelper(({ positional }) => {
  const sourceRef: Reference<any> = positional[0] ?? UNDEFINED_REFERENCE;
  const pathRef: Reference<any> = positional[1] ?? UNDEFINED_REFERENCE;
  return createComputeRef(
    () => {
      const source = valueForRef(sourceRef);
      if (isDict(source)) return emberGet(source, String(valueForRef(pathRef)));
      return undefined;
    },
    null,
    'get'
  );
});

const fnContext = buildUntouchableThis('`fn` helper');

function assertCallbackIsFn(callback: unknown, debugLabel: string | undefined): void {
  if (typeof callback !== 'function') {
    throw new Error(
      `You must pass a function as the \`fn\` helper's first argument, you passed ${String(
        callback
      )}. While rendering:\n\n${debugLabel}`
    );
  }
}

function callFn(callback: unknown, args: unknown[], invocationArgs: unknown[]): unknown {
  return (callback as (...a: unknown[]) => unknown).call(fnContext, ...args, ...invocationArgs);
}

// The returned function reads the CURRENT arguments when it is invoked, and the
// reference itself consumes nothing — so its identity is stable across renders
// (an `{{on}}` handler built with `fn` is never re-attached by a re-render).
//
// Direct form (a compiler-emitted call site, native/helper-manager.ts): the
// same function over the call site's literal-or-thunk arguments, which it
// reads when invoked — no compute reference per argument. The assertion names
// the callback by its source path (the call site's labels, DEBUG builds), as
// Glimmer's does by its reference's label; `undefined` without one.
function fnForCallSite(source: ArgsSource): unknown {
  if (DEBUG) {
    assertCallbackIsFn(
      unwrapArg(source.positional[0]),
      source.labels?.positional?.[0] ?? undefined
    );
  }
  // a regular function: never mistaken for a compiler getter by gxt
  return function fnHelper(...invocationArgs: unknown[]): unknown {
    const positional = source.positional;
    const callback = unwrapArg(positional[0]);
    if (DEBUG) assertCallbackIsFn(callback, source.labels?.positional?.[0] ?? undefined);
    const args: unknown[] = [];
    for (let i = 1; i < positional.length; i++) args.push(unwrapArg(positional[i]));
    return callFn(callback, args, invocationArgs);
  };
}

export const fn = /*#__PURE__*/ internalHelper(({ positional }) => {
  const callbackRef = positional[0];
  if (DEBUG) {
    assertCallbackIsFn(callbackRef && valueForRef(callbackRef), callbackRef?.debugLabel);
  }
  return createComputeRef(
    () =>
      // a regular function: never mistaken for a compiler getter by gxt
      function fnHelper(...invocationArgs: unknown[]): unknown {
        const [callback, ...args] = reifyPositional(positional);
        if (DEBUG) assertCallbackIsFn(callback, callbackRef?.debugLabel);
        return callFn(callback, args, invocationArgs);
      },
    null,
    'fn'
  );
}, fnForCallSite);

export const and = /*#__PURE__*/ internalHelper(({ positional }) => {
  if (DEBUG && positional.length < 2) {
    throw new Error(`\`and\` expects at least two arguments, but received ${positional.length}.`);
  }
  return createComputeRef(
    () => {
      let last: unknown;
      for (const arg of positional) {
        last = valueForRef(arg);
        if (!toBool(last)) return last;
      }
      return last;
    },
    null,
    'and'
  );
});

export const or = /*#__PURE__*/ internalHelper(({ positional }) => {
  if (DEBUG && positional.length < 2) {
    throw new Error(`\`or\` expects at least two arguments, but received ${positional.length}.`);
  }
  return createComputeRef(
    () => {
      let last: unknown;
      for (const arg of positional) {
        last = valueForRef(arg);
        if (toBool(last)) return last;
      }
      return last;
    },
    null,
    'or'
  );
});

// ---------------------------------------------------------------- plain helpers
function expectTwo(name: string, count: number): void {
  if (count !== 2) {
    throw new Error(`\`${name}\` expects exactly two arguments, but received ${count}.`);
  }
}

export function eq(left: unknown, right: unknown): boolean {
  if (DEBUG) expectTwo('eq', arguments.length);
  return left === right;
}
export function neq(left: unknown, right: unknown): boolean {
  if (DEBUG) expectTwo('neq', arguments.length);
  return left !== right;
}
export function gt(left: unknown, right: unknown): boolean {
  if (DEBUG) expectTwo('gt', arguments.length);
  return (left as number) > (right as number);
}
export function gte(left: unknown, right: unknown): boolean {
  if (DEBUG) expectTwo('gte', arguments.length);
  return (left as number) >= (right as number);
}
export function lt(left: unknown, right: unknown): boolean {
  if (DEBUG) expectTwo('lt', arguments.length);
  return (left as number) < (right as number);
}
export function lte(left: unknown, right: unknown): boolean {
  if (DEBUG) expectTwo('lte', arguments.length);
  return (left as number) <= (right as number);
}
export const not = (...args: unknown[]): boolean => {
  if (DEBUG && args.length !== 1) {
    throw new Error(`\`not\` expects exactly one argument, but received ${args.length}.`);
  }
  return !toBool(args[0]);
};

/**
 * Ember's built-in keyword helpers by name: an UNBOUND keyword in a strict
 * template (Ember auto-imports them) that gxt does not compile natively arrives
 * at `$_maybeHelper` as a string (native/helper-manager.ts).
 */
export const KEYWORD_HELPERS: Readonly<Record<string, object>> = {
  neq,
  gt,
  gte,
  lt,
  lte,
  concat,
  get,
};

// ---------------------------------------------------------------- invokeHelper
const EMPTY_ARGS: Partial<Arguments> = Object.freeze({
  named: Object.freeze({}) as Record<string, unknown>,
  positional: Object.freeze([]) as unknown as unknown[],
});
const EMPTY_NAMED = EMPTY_ARGS.named!;
const EMPTY_POSITIONAL = EMPTY_ARGS.positional!;

class SimpleArgsProxy {
  readonly #argsCache: Cache<Partial<Arguments>>;

  constructor(
    context: object,
    computeArgs: (context: object) => Partial<Arguments> = () => EMPTY_ARGS
  ) {
    this.#argsCache = createCache(() => computeArgs(context));
    if (DEBUG) Object.freeze(this);
  }

  get named(): Record<string, unknown> {
    return getValue(this.#argsCache)!.named || EMPTY_NAMED;
  }

  get positional(): readonly unknown[] {
    return getValue(this.#argsCache)!.positional || EMPTY_POSITIONAL;
  }
}

/** `@ember/helper` invokeHelper (Glimmer `@glimmer/runtime/lib/helpers/invoke`). */
export function invokeHelper(
  context: object,
  definition: object,
  computeArgs?: (context: object) => Partial<Arguments>
): Cache {
  if (DEBUG && (typeof context !== 'object' || context === null)) {
    throw new Error(
      `Expected a context object to be passed as the first parameter to invokeHelper, got ${String(context)}`
    );
  }
  const owner = getOwner(context);
  const internalManager = getInternalHelperManager(definition) as
    | CustomHelperManager
    | InternalHelper
    | undefined;
  if (DEBUG && typeof internalManager === 'function') {
    throw new Error(
      'Found a helper manager, but it was an internal built-in helper manager. `invokeHelper` does not support internal helpers yet.'
    );
  }
  if (internalManager === undefined) {
    throw new Error(
      `Attempted to load a helper, but there wasn't a helper manager associated with the definition. The definition was: ${String(definition)}`
    );
  }
  const manager = (internalManager as CustomHelperManager).getDelegateFor(owner) as HelperDelegate;
  const args = new SimpleArgsProxy(context, computeArgs);
  const bucket = manager.createHelper(definition, args as unknown as Arguments);

  if (!hasValue(manager)) {
    throw new Error('TODO: unreachable, to be implemented with hasScheduledEffect');
  }
  const cache: Cache = createCache(() => {
    if (DEBUG && (isDestroying(cache) || isDestroyed(cache))) {
      throw new Error(
        `You attempted to get the value of a helper after the helper was destroyed, which is not allowed`
      );
    }
    return manager.getValue!(bucket);
  });
  associateDestroyableChild(context, cache);

  if (hasDestroyable(manager)) {
    const destroyable = manager.getDestroyable!(bucket);
    if (destroyable !== null && destroyable !== undefined)
      associateDestroyableChild(cache, destroyable);
  }
  return cache;
}

// ---------------------------------------------------------------- {{on}}
const onContext = buildUntouchableThis('`on` modifier');

interface Listener {
  eventName: string;
  callback: EventListener;
  userProvidedCallback: EventListener;
  once: boolean | undefined;
  passive: boolean | undefined;
  capture: boolean | undefined;
  options: AddEventListenerOptions | undefined;
}

let adds = 0;
let removes = 0;

function addListener(
  element: Element,
  eventName: string,
  callback: EventListener,
  options?: AddEventListenerOptions
): void {
  adds++;
  element.addEventListener(eventName, callback, options);
}

function removeListener(
  element: Element,
  eventName: string,
  callback: EventListener,
  options?: AddEventListenerOptions
): void {
  removes++;
  element.removeEventListener(eventName, callback, options);
}

const hasOwn = Object.prototype.hasOwnProperty;

/** A named literal-or-thunk argument's value; `undefined` when not passed. */
function namedArg(named: ArgsSource['named'], key: string): unknown {
  return hasOwn.call(named, key) ? unwrapArg(named[key]) : undefined;
}

function checkBooleanOption(name: string, value: unknown): boolean | undefined {
  if (DEBUG && value !== undefined && typeof value !== 'boolean') {
    throw new Error(
      `You must pass a boolean or undefined as the \`${name}\` argument to the \`on\` modifier; you passed ${String(value)}.`
    );
  }
  return value as boolean | undefined;
}

class OnModifierState {
  listener: Listener | null = null;

  constructor(
    readonly element: Element,
    /** The call site's literal-or-thunk arguments (read when installed / updated). */
    readonly source: ArgsSource
  ) {
    registerDestructor(this, () => {
      const { listener } = this;
      if (listener !== null) {
        removeListener(this.element, listener.eventName, listener.callback, listener.options);
      }
    });
  }

  /** (Re-)attach the listener when its inputs changed (Glimmer `updateListener`). */
  updateListener(): void {
    const { element, source, listener } = this;
    const { positional, named } = source;
    let selector = '';
    if (DEBUG) {
      selector =
        element.tagName.toLowerCase() +
        (element.id ? `#${element.id}` : '') +
        Array.from(element.classList)
          .map((c) => `.${c}`)
          .join('');
    }

    const eventName = unwrapArg(positional[0]) as string;
    if (DEBUG && (typeof eventName !== 'string' || !eventName)) {
      throw new Error(
        `You must pass a valid DOM event name as the first argument to the \`on\` modifier on ${selector}`
      );
    }
    const userProvidedCallback = unwrapArg(positional[1]) as EventListener;
    if (DEBUG && typeof userProvidedCallback !== 'function') {
      throw new Error(
        `You must pass a function as the second argument to the \`on\` modifier; you passed ${
          userProvidedCallback === null ? 'null' : typeof userProvidedCallback
        }. While rendering:\n\n${source.labels?.positional?.[1] ?? '(unknown)'} on ${selector}`
      );
    }
    if (DEBUG && positional.length !== 2) {
      throw new Error(
        `You can only pass two positional arguments (event name and callback) to the \`on\` modifier, but you provided ${positional.length}. Consider using the \`fn\` helper to provide additional arguments to the \`on\` callback on ${selector}`
      );
    }

    let once: boolean | undefined;
    let passive: boolean | undefined;
    let capture: boolean | undefined;
    if (DEBUG) {
      // reify every named argument (Glimmer reads them all in DEV)
      const extra = Object.keys(named).filter(
        (key) => key !== 'once' && key !== 'passive' && key !== 'capture'
      );
      once = checkBooleanOption('once', namedArg(named, 'once'));
      passive = checkBooleanOption('passive', namedArg(named, 'passive'));
      capture = checkBooleanOption('capture', namedArg(named, 'capture'));
      for (const key of extra) void unwrapArg(named[key]);
      if (extra.length > 0) {
        throw new Error(
          `You can only \`once\`, \`passive\` or \`capture\` named arguments to the \`on\` modifier, but you provided ${extra.join(
            ', '
          )} on ${selector}`
        );
      }
    } else {
      once = namedArg(named, 'once') as boolean | undefined;
      passive = namedArg(named, 'passive') as boolean | undefined;
      capture = namedArg(named, 'capture') as boolean | undefined;
    }

    const shouldUpdate =
      listener === null ||
      eventName !== listener.eventName ||
      userProvidedCallback !== listener.userProvidedCallback ||
      once !== listener.once ||
      passive !== listener.passive ||
      capture !== listener.capture;
    if (!shouldUpdate) return;

    // both `true` and `false` have a meaning (chromium 770208)
    const options =
      once !== undefined || passive !== undefined || capture !== undefined
        ? { once, passive, capture }
        : undefined;

    let callback = userProvidedCallback;
    if (DEBUG) {
      callback = userProvidedCallback.bind(onContext);
      if (passive) {
        const passiveCallback = callback;
        callback = (event: Event) => {
          event.preventDefault = () => {
            throw new Error(
              `You marked this listener as 'passive', meaning that you must not call 'event.preventDefault()': \n\n${
                userProvidedCallback.name || `{anonymous function}`
              }`
            );
          };
          return passiveCallback(event);
        };
      }
    }

    this.listener = { eventName, callback, userProvidedCallback, once, passive, capture, options };
    if (listener !== null) {
      removeListener(element, listener.eventName, listener.callback, listener.options);
    }
    addListener(element, eventName, callback, options);
  }
}

/** The native internal modifier manager protocol (native/modifier-manager.ts). */
export interface InternalModifierManager<S extends object = object> {
  /** `source`: the call site's literal-or-thunk arguments (no args proxies, no owner). */
  create(element: Element, definition: object, source: ArgsSource): S;
  install(state: S): void;
  update(state: S): void;
  getDestroyable(state: S): object;
  getDebugName(): string;
}

class OnModifierManager implements InternalModifierManager<OnModifierState> {
  getDebugName(): string {
    return 'on';
  }

  get counters(): { adds: number; removes: number } {
    return { adds, removes };
  }

  create(element: Element, _definition: object, source: ArgsSource): OnModifierState {
    return new OnModifierState(element, source);
  }

  install(state: OnModifierState): void {
    state.updateListener();
  }

  update(state: OnModifierState): void {
    state.updateListener();
  }

  getDestroyable(state: OnModifierState): OnModifierState {
    return state;
  }
}

export const on = /*#__PURE__*/ setInternalModifierManager(new OnModifierManager(), {});
