/**
 * Shared utility functions for the GXT compat layer.
 */
import type { SimpleElement } from '@glimmer/interfaces';
import {
  requiresSanitization,
  sanitizeAttributeValue,
} from '@glimmer/runtime/lib/dom/sanitized-values';

/**
 * The value a dynamic attribute or property writes to `element`, with
 * Glimmer's URL sanitization (SafeDynamicAttribute / SafeDynamicProperty):
 * when the tag/attribute pair carries a URL (`requiresSanitization`), the value
 * goes through `sanitizeAttributeValue` — a `javascript:` / `vbscript:` URL (and
 * a `data:` URL where Glimmer checks one) gets the `unsafe:` prefix, a
 * SafeString's HTML is trusted, and any other value is stringified (`false`
 * becomes `"false"`; `null` / `undefined` are returned as they are). Any other
 * attribute returns `value` unchanged.
 *
 * Every compat path that writes a bound attribute itself, outside gxt's
 * `normalizeAttrValue` hook (which applies the same rules), calls this before
 * its own normalization, in development and production builds alike.
 */
export function sanitizedAttrValue(element: Element, name: string, value: unknown): unknown {
  return requiresSanitization(element.tagName, name)
    ? sanitizeAttributeValue(element as unknown as SimpleElement, name, value)
    : value;
}

/**
 * Whether a dynamic attribute value removes the attribute. This is the removal
 * half of Glimmer's `normalizeValue` (`@glimmer/runtime/lib/vm/attributes/
 * dynamic.ts`): `false`, `null`, `undefined`, a function and a value without a
 * `toString` method mean "no attribute", on the first write and on every
 * update. `""` keeps the attribute (`attr=""`). Both gxt `normalizeAttrValue`
 * host hooks (compat compile.ts, native/host-hooks.ts) use it on the attribute
 * side, so a hook result of `undefined` (gxt's remove sentinel) means the same
 * in both builds.
 */
export function removesAttribute(value: unknown): boolean {
  return (
    value === false ||
    value === null ||
    value === undefined ||
    typeof value === 'function' ||
    typeof (value as { toString?: unknown }).toString !== 'function'
  );
}

/** Convert PascalCase/camelCase to kebab-case without regex */
export function pascalToKebab(str: string): string {
  let result = '';
  for (let i = 0; i < str.length; i++) {
    const ch = str[i]!;
    if (ch >= 'A' && ch <= 'Z') {
      if (i > 0 && str[i - 1]! >= 'a' && str[i - 1]! <= 'z') result += '-';
      if (i > 0 && str[i - 1]! >= '0' && str[i - 1]! <= '9') result += '-';
      if (
        i > 0 &&
        str[i - 1]! >= 'A' &&
        str[i - 1]! <= 'Z' &&
        i + 1 < str.length &&
        str[i + 1]! >= 'a' &&
        str[i + 1]! <= 'z'
      )
        result += '-';
      result += ch.toLowerCase();
    } else {
      result += ch;
    }
  }
  return result;
}

/** Check if a string is all digits without regex */
export function isAllDigits(str: string): boolean {
  if (str.length === 0) return false;
  for (let i = 0; i < str.length; i++) {
    const c = str[i]!;
    if (c < '0' || c > '9') return false;
  }
  return true;
}

/** Check if a string contains any uppercase letter without regex */
export function hasUpperCase(str: string): boolean {
  for (let i = 0; i < str.length; i++) {
    const c = str[i]!;
    if (c >= 'A' && c <= 'Z') return true;
  }
  return false;
}

/** Dasherize a camelCase string without regex: 'fooBar' -> 'foo-bar'
 * Only inserts a dash when the previous char is a lowercase letter or digit,
 * matching the behavior of str.replace(/([a-z\d])([A-Z])/g, '$1-$2').toLowerCase()
 */
export function dasherize(str: string): string {
  let result = '';
  for (let i = 0; i < str.length; i++) {
    const ch = str[i]!;
    if (ch >= 'A' && ch <= 'Z') {
      if (i > 0) {
        const prev = str[i - 1]!;
        if ((prev >= 'a' && prev <= 'z') || (prev >= '0' && prev <= '9')) {
          result += '-';
        }
      }
      result += ch.toLowerCase();
    } else {
      result += ch;
    }
  }
  return result;
}

/** Split a string by whitespace, filtering empty entries, without regex */
export function splitWhitespace(str: string): string[] {
  const result: string[] = [];
  let current = '';
  for (let i = 0; i < str.length; i++) {
    const c = str[i]!;
    if (c === ' ' || c === '\t' || c === '\n' || c === '\r') {
      if (current.length > 0) {
        result.push(current);
        current = '';
      }
    } else {
      current += c;
    }
  }
  if (current.length > 0) {
    result.push(current);
  }
  return result;
}

/** Replace all occurrences of '::' with '/' without regex */
export function doubleColonToSlash(str: string): string {
  return str.split('::').join('/');
}

// Inline the style warning message to avoid importing @ember/-internals/views
// (which can cause circular dependency issues during module initialization).
export function constructStyleDeprecationMessage(affectedStyle: string): string {
  return (
    'Binding style attributes may introduce cross-site scripting vulnerabilities; ' +
    'please ensure that values being bound are properly escaped. For more information, ' +
    'including how to disable this warning, see ' +
    'https://deprecations.emberjs.com/v1.x/#toc_binding-style-attributes. ' +
    'Style affected: "' +
    affectedStyle +
    '"'
  );
}

// Helper to detect assertion-related throws that must escape catch blocks.
// The expectAssertion test helper throws a non-Error sentinel (BREAK = {})
// when a stubbed assert fires. Also re-throws actual Assertion Failed errors.
export function isAssertionLike(e: unknown): boolean {
  if (e instanceof Error) {
    return e.message?.includes('Assertion Failed') === true;
  }
  // Non-Error, non-null/undefined objects may be the BREAK sentinel from expectAssertion.
  if (e !== null && e !== undefined && typeof e === 'object') return true;
  return false;
}

/**
 * Install `value` at `globalThis[name]` behind a getter that ignores writes, so
 * a later `setupGlobalScope()` pass (GXT iterates its symbol table and writes
 * each symbol to globalThis) cannot clobber the Ember-patched version. The
 * descriptor is `configurable: true, enumerable: true`; on a defineProperty
 * failure it falls back to a direct assignment (installs `value` either way).
 *
 * Used by compile.ts for `$_if`, `$_eachSync`, `$_maybeModifier`,
 * `$_helperHelper`, `$__log` and `$__if`, and by manager.ts for its row-keying
 * `$_eachSync` wrapper. compile.ts's `$_inElement` and `$_c` traps differ and
 * stay inline: `$_inElement` is non-configurable and `$_c` is defined without
 * `enumerable`; neither falls back to an assignment.
 */
export function protectGlobal(name: string, value: unknown): void {
  const _g = globalThis as any;
  try {
    Object.defineProperty(_g, name, {
      get() {
        return value;
      },
      set(_v: any) {
        /* protect from setupGlobalScope overwrite */
      },
      configurable: true,
      enumerable: true,
    });
  } catch {
    _g[name] = value;
  }
}

const CAPABILITIES_VERSIONS = { component: '3.13', helper: '3.23', modifier: '3.22' } as const;

/**
 * The start of the error for a custom component, helper or modifier manager
 * whose `capabilities` did not come from that kind's `capabilities()`; callers
 * append what they received.
 */
export function capabilitiesErrorPrefix(kind: keyof typeof CAPABILITIES_VERSIONS): string {
  return (
    `Custom ${kind} managers must have a \`capabilities\` property that is the result of ` +
    `calling the \`capabilities('${CAPABILITIES_VERSIONS[kind]}')\` ` +
    `(imported via \`import { capabilities } from '@ember/${kind}';\`). `
  );
}

const PLAIN_HTML_TAG_RE = /^[a-z][a-z0-9]*$/;

/**
 * Whether the Ember `$_tag` wrappers can hand an element straight to GXT's
 * `$_tag` (`edp` is GXT's empty-props marker). True only when every scan the
 * wrappers do would be a no-op:
 * - a plain lowercase tag without a hyphen (a kebab tag could be a component
 *   or helper), so never a component, `@`/`this.` dynamic, `:` named-block or
 *   EmberHtmlRaw tag;
 * - no splat (`tagProps[3]`), so no `...attributes` merge or fw reorder;
 * - attrs (`tagProps[1]`): no function value (the slow path wraps attribute
 *   getters to normalize symbols and objects); a static `null` / `undefined`
 *   is fine, gxt does not write it;
 * - events (`tagProps[2]`): no TEXT_CONTENT entry (`'1'`), the only thing the
 *   SafeString text scan and the modifier/text reorder look at; listeners and
 *   ON_CREATED modifiers are applied by GXT either way;
 * - props (`tagProps[0]`): only the class slot (empty key), which GXT applies
 *   and the post-apply scan skips. A reactive `style` lands here under
 *   `'style'`, so it always takes the slow path.
 * compile.ts's wrapper also requires that no SVG/MathML namespace is active.
 */
export function isPlainHtmlTagFastPath(tag: unknown, tagProps: any, edp: unknown): boolean {
  if (typeof tag !== 'string' || !PLAIN_HTML_TAG_RE.test(tag)) return false;
  if (tagProps === edp || tagProps == null) return false;
  if (Array.isArray(tagProps[3])) return false;
  const attrs = tagProps[1];
  if (Array.isArray(attrs)) {
    for (let i = 0; i < attrs.length; i++) {
      const entry = attrs[i];
      if (!Array.isArray(entry) || entry.length < 2) return false;
      const v = entry[1];
      if (typeof v === 'function') return false;
    }
  } else if (attrs != null) {
    return false;
  }
  const events = tagProps[2];
  if (Array.isArray(events)) {
    for (let i = 0; i < events.length; i++) {
      const entry = events[i];
      if (Array.isArray(entry) && entry[0] === '1') return false;
    }
  } else if (events != null) {
    return false;
  }
  const props = tagProps[0];
  if (Array.isArray(props)) {
    for (let i = 0; i < props.length; i++) {
      const entry = props[i];
      if (!Array.isArray(entry) || entry[0] !== '') return false;
    }
  } else if (props != null) {
    return false;
  }
  return true;
}

/**
 * `(fn …)` helper values (compile.ts `$__fn_ember`).
 *
 * Glimmer's `fn` is one function per call site: its reference computes the
 * function once, and the function reads the callback and the partial arguments
 * when it is called. The compat compiler re-evaluates a call site's expression
 * on every read (`["@f", () => $__fn(() => this.greet, "x")]`), so each read
 * creates a new function. A component argument compares its value by
 * identity, so every read of such an argument was an argument change: it was
 * written back to the component, which scheduled the next read, and the
 * renderer never settled.
 *
 * A value records the callback it binds (`FN_HELPER_TARGET`) and calls through
 * a replaceable implementation (`FN_HELPER_CALL`). A reference that holds a
 * value keeps it when a later evaluation binds the same callback, and takes
 * that evaluation's implementation (`keepFnHelperValue`): the function stays
 * the same while the callback is the same, and a call still reads the current
 * callback and arguments of the latest evaluation.
 */
export const FN_HELPER_TARGET: unique symbol = Symbol('gxt fn helper target');
export const FN_HELPER_CALL: unique symbol = Symbol('gxt fn helper call');

/**
 * What a `(mut this.x)` cell writes: the context it was created in and the path.
 * A cell is created on each evaluation of its call site; two cells with the
 * same source are the same callback for `fn`.
 */
export const MUT_CELL_SOURCE: unique symbol = Symbol('gxt mut cell source');

export interface FnHelperValue {
  (...args: unknown[]): unknown;
  __isFnHelper: true;
  [FN_HELPER_TARGET]: unknown;
  [FN_HELPER_CALL]: (...args: unknown[]) => unknown;
}

export function createFnHelperValue(
  target: unknown,
  call: (...args: unknown[]) => unknown
): FnHelperValue {
  const value = function fnHelperValue(...args: unknown[]): unknown {
    return value[FN_HELPER_CALL](...args);
  } as FnHelperValue;
  value.__isFnHelper = true;
  value[FN_HELPER_TARGET] = target;
  value[FN_HELPER_CALL] = call;
  return value;
}

export function isFnHelperValue(value: unknown): value is FnHelperValue {
  return typeof value === 'function' && FN_HELPER_CALL in value;
}

function sameFnCallback(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  const sourceA = typeof a === 'function' ? (a as any)[MUT_CELL_SOURCE] : undefined;
  const sourceB = typeof b === 'function' ? (b as any)[MUT_CELL_SOURCE] : undefined;
  return (
    sourceA !== undefined &&
    sourceB !== undefined &&
    sourceA.ctx === sourceB.ctx &&
    sourceA.path === sourceB.path
  );
}

/**
 * The value a reference holds after reading `next` when it held `prev`: `prev`
 * when both are `(fn …)` values binding the same callback (`prev` then calls
 * through `next`'s implementation), otherwise `next`.
 */
export function keepFnHelperValue(prev: unknown, next: unknown): unknown {
  if (prev === next || !isFnHelperValue(prev) || !isFnHelperValue(next)) return next;
  if (!sameFnCallback(prev[FN_HELPER_TARGET], next[FN_HELPER_TARGET])) return next;
  prev[FN_HELPER_CALL] = next[FN_HELPER_CALL];
  return prev;
}
