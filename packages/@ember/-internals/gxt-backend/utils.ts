/**
 * Shared utility functions for the GXT compat layer.
 */
import type { SimpleElement } from '@glimmer/interfaces';
import { normalizeStringValue } from '@glimmer/runtime/lib/dom/normalize';
import { normalizeProperty } from '@glimmer/runtime/lib/dom/props';
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

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

/**
 * The property through which Glimmer sets a bound attribute `name` of
 * `element`, or `null` when Glimmer sets it as an attribute
 * (`dynamicAttribute`, `@glimmer/runtime/lib/vm/attributes/dynamic.ts`): an
 * attribute of an HTML element that `normalizeProperty` maps to a property of
 * the element (`name` of a `<button>`, `id`, `title`, `selected` of an
 * `<option>`), except `style` and the attributes the DOM properties of which
 * cannot be set (`form`, `list`). Every attribute of an SVG element is an
 * attribute.
 */
export function boundAttributeProperty(element: Element, name: string): string | null {
  if (element.namespaceURI === SVG_NAMESPACE) return null;
  const { normalized, type } = normalizeProperty(element as unknown as SimpleElement, name);
  return type === 'prop' ? normalized : null;
}

/**
 * The text gxt writes for the attribute `name` of `element` at its attribute
 * write seam (the attribute side of both builds' `normalizeAttrValue` host
 * hooks, for the first write and every update), or `undefined` to remove the
 * attribute, by Glimmer's rules:
 * - `null` and `undefined` remove it;
 * - text is the attribute's text. A static attribute is text, which Glimmer
 *   sets as it is, and so is the text of a bound attribute that gxt writes as
 *   an attribute when Glimmer sets a property reflecting it (`id`, `title`);
 * - any other value of an attribute Glimmer sets through a property
 *   (`boundAttributeProperty`) is assigned to the property, as Glimmer's
 *   DefaultDynamicProperty assigns it, and the attribute is what the property
 *   reflects: `name={{false}}` on a `<button>` is `name="false"`;
 * - any other value of an attribute is Glimmer's `normalizeValue`: a value
 *   that removes the attribute (`removesAttribute`: `false`, a function, an
 *   object without `toString`) removes it, `true` is `""`, and anything else is
 *   its string (the HTML of a SafeString).
 */
export function attributeText(element: Element, name: string, value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'string') return value;
  const property = boundAttributeProperty(element, name);
  if (property !== null) {
    (element as unknown as Record<string, unknown>)[property] = value;
    return element.getAttribute(name) ?? undefined;
  }
  if (removesAttribute(value)) return undefined;
  return value === true ? '' : String(value);
}

/**
 * gxt `$_tag` props with the element's classes as ONE `class` attribute,
 * merged as Glimmer merges them (compat build only).
 *
 * The compat gxt runtime applies `class` through the `className` property
 * (only EMBER_NATIVE builds apply it as an attribute). A property cannot
 * remove the attribute: `class={{false}}` rendered `class="false"`, a null one
 * `class=""`, and merged classes kept stray spaces or a literal "null".
 * Glimmer treats `class` as an attribute (`normalizeProperty` never maps it to
 * a property), and merges an element's classes in `mergeClasses`:
 * - one class is its value as it is, which the `normalizeAttrValue` hook
 *   normalizes like any attribute (false, null and undefined remove it,
 *   `true` is `class=""`);
 * - several classes (the element's own and those `...attributes` forwards)
 *   that are all static strings are joined with a space (`allStringClasses`);
 * - otherwise they are `createClassListRef`: each part through
 *   `normalizeStringValue`, empty parts skipped, joined with a space, and
 *   null (no attribute) when nothing is left.
 * The parts are in source order, as Glimmer concatenates them: the element's
 * own classes come before the forwarded ones (`fw[0]` class slots, then a
 * `class` attribute forwarded in `fw[1]`, which the inner `$_tag` wrapper's
 * by-name component path forwards there), unless the compiler's
 * `__splatLocal__` marker says the element's class is written after
 * `...attributes` (`__class__`). compile.ts's runtime-template wrapper strips
 * the marker and has already moved the element's own classes into `fw[0]`, in
 * order.
 */
export function classAsAttribute(tagProps: any, edp: unknown): any {
  if (tagProps === edp || tagProps == null) return tagProps;
  const own = tagProps[0];
  const fw = tagProps[3];
  const fwProps = Array.isArray(fw) ? fw[0] : undefined;
  const fwAttrs = Array.isArray(fw) ? fw[1] : undefined;
  const parts: unknown[] = [];
  const ownFirst = Array.isArray(fw) && !splatLocalNames(tagProps).has(CLASS_AFTER_SPLAT);
  if (ownFirst) collectEntries(own, '', parts);
  collectEntries(fwProps, '', parts);
  collectEntries(fwAttrs, 'class', parts);
  if (!ownFirst) collectEntries(own, '', parts);
  if (parts.length === 0) return tagProps;
  const value = parts.length === 1 ? parts[0] : mergeClassParts(parts);
  const attrs = Array.isArray(tagProps[1])
    ? [...tagProps[1], ['class', value]]
    : [['class', value]];
  const result: any[] = [withoutKey(own, ''), attrs, tagProps[2]];
  if (tagProps.length > 3) {
    result[3] = Array.isArray(fw)
      ? [withoutKey(fwProps, ''), withoutKey(fwAttrs, 'class'), fw[2]]
      : fw;
  }
  return result;
}

// gxt brands a class that declares a class-body `<template>` with this own
// static property (gxt `CLASS_BODY_TEMPLATE`, a registry symbol).
const CLASS_BODY_TEMPLATE = Symbol.for('gxt-class-body-template');

/**
 * Which template of a component class's chain is the nearest, as Glimmer
 * renders it: `'registered'` when the first class (from `definition` up) that
 * has a template has a registered one (`hasOwnRegistration`), `'class-body'`
 * when it declares a class-body `<template>`. `undefined` when no class in the
 * chain carries gxt's class-body brand (the declaring class is then unknown:
 * the caller falls back to the instance's own `[$template]` field). A class
 * with both prefers its registration.
 */
export function nearestTemplateKind(
  definition: object,
  hasOwnRegistration: (klass: object) => boolean
): 'registered' | 'class-body' | undefined {
  let first: 'registered' | 'class-body' | undefined;
  let branded = false;
  let pointer: any = definition;
  while (pointer && pointer !== Function.prototype && pointer !== Object.prototype) {
    const brand = Object.prototype.hasOwnProperty.call(pointer, CLASS_BODY_TEMPLATE);
    if (brand) branded = true;
    if (first === undefined) {
      if (hasOwnRegistration(pointer)) first = 'registered';
      else if (brand) first = 'class-body';
    }
    pointer = Object.getPrototypeOf(pointer);
  }
  return branded ? first : undefined;
}

/** The compiler's marker listing what an element writes after `...attributes`. */
export const SPLAT_LOCAL_MARKER = '__splatLocal__';
/** The marker's entry for a `class` written after `...attributes`. */
export const CLASS_AFTER_SPLAT = '__class__';

/**
 * The names the `__splatLocal__` marker of gxt `$_tag` props lists (the
 * attributes an element writes after `...attributes`, and `__class__`), empty
 * when there is no marker. The compiler emits it in the props or the attrs.
 */
export function splatLocalNames(tagProps: any): Set<string> {
  const names = new Set<string>();
  for (const pos of [0, 1]) {
    const entries = tagProps?.[pos];
    if (!Array.isArray(entries)) continue;
    for (const entry of entries) {
      if (!Array.isArray(entry) || entry[0] !== SPLAT_LOCAL_MARKER) continue;
      const value = typeof entry[1] === 'function' ? entry[1]() : entry[1];
      for (const name of String(value ?? '').split(',')) if (name) names.add(name);
    }
  }
  return names;
}

function collectEntries(entries: unknown, key: string, into: unknown[]): void {
  if (!Array.isArray(entries)) return;
  for (const entry of entries) {
    if (Array.isArray(entry) && entry[0] === key) into.push(entry[1]);
  }
}

function withoutKey(entries: unknown, key: string): unknown {
  if (!Array.isArray(entries)) return entries;
  return entries.filter((entry) => !Array.isArray(entry) || entry[0] !== key);
}

function mergeClassParts(parts: unknown[]): unknown {
  if (parts.every((part) => typeof part === 'string')) return parts.join(' ');
  return () => {
    let merged = '';
    for (const part of parts) {
      // A bound part is a gxt getter (possibly returning another getter).
      let value = part;
      while (typeof value === 'function') value = (value as () => unknown)();
      const name = normalizeStringValue(value);
      if (name !== '') merged = merged === '' ? name : `${merged} ${name}`;
    }
    return merged === '' ? null : merged;
  };
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

/**
 * A trusting `style` value: `style={{{value}}}`, which Glimmer compiles to a
 * trusting dynamic attribute (`TrustingDynamicAttr`). Its only difference from
 * `style={{value}}` is that the style-binding XSS warning does not fire. Every
 * compat `style` write skips that warning for a value with `toHTML()` (as for
 * an htmlSafe string) and writes the HTML string it returns.
 */
class TrustedStyleValue {
  constructor(private readonly html: string) {}

  toHTML(): string {
    return this.html;
  }

  toString(): string {
    return this.html;
  }
}

/**
 * The value of a trusting `style={{{value}}}` binding (the `__gxtTrustedStyle`
 * built-in helper the triple-mustache AST transform emits). A value that
 * removes the attribute (see `removesAttribute`) and a value that already has
 * `toHTML()` are returned as they are; anything else becomes its string, as
 * Glimmer's `normalizeValue` gives it (`true` is `""`), marked as trusted.
 */
export function trustedStyleValue(value: unknown): unknown {
  if (removesAttribute(value)) return value;
  if (typeof value === 'object' && typeof (value as { toHTML?: unknown }).toHTML === 'function') {
    return value;
  }
  return new TrustedStyleValue(value === true ? '' : String(value));
}

/**
 * An entry of a `{{#each-in}}` (`gxtEntriesOf`): the key or property name `k`,
 * the value `v`, and `key`, the key of its row in the list.
 */
export interface EachInEntry {
  k: unknown;
  v: unknown;
  key?: unknown;
}

// The identity of a `null` value, as Glimmer keys it (`IDENTITY`).
const EACH_IN_NULL_IDENTITY = {};
// The row keys of object values, by the occurrence of the value in one pass.
const EACH_IN_OBJECT_KEYS = new WeakMap<object, object[]>();

/**
 * Gives each entry of a `{{#each-in}}` the key of its row, as Glimmer keys
 * an each-in list (`makeKeyFor` of @glimmer/reference iterable.ts over the
 * each-in iterator, whose memo is the entry's key or property name):
 * - `@identity` (the default): the value, a `null` value one identity;
 * - `@key`: the key or property name;
 * - `@index`: the key or property name as a string (so all the object keys
 *   of a Map collide);
 * - a path: the property at that path of the value.
 * A key that an earlier entry of the pass has is made unique by its
 * occurrence, as `uniqueKeyFor` does. The list keys its rows by the `key`
 * property (`key="key"`), which holds an object for an object key and a
 * string for a primitive one, so the list compares neither by `String()`.
 */
export function keyEachInEntries(entries: EachInEntry[], keyOption: unknown): EachInEntry[] {
  const option =
    typeof keyOption === 'function' && !keyOption.prototype
      ? (keyOption as () => unknown)()
      : keyOption;
  const path = option === undefined || option === null ? '@identity' : String(option);
  if (path[0] === '@' && path !== '@identity' && path !== '@key' && path !== '@index') {
    throw new Error(`invalid keypath: '${path}', valid keys: @index, @identity, or a path`);
  }
  const occurrences = new Map<unknown, number>();
  for (const entry of entries) {
    let raw: unknown;
    if (path === '@identity') {
      raw = entry.v === null ? EACH_IN_NULL_IDENTITY : entry.v;
    } else if (path === '@key') {
      raw = entry.k;
    } else if (path === '@index') {
      raw = String(entry.k);
    } else {
      raw = valueAtPath(entry.v, path);
    }
    const count = occurrences.get(raw) ?? 0;
    occurrences.set(raw, count + 1);
    entry.key = rowKey(raw, count);
  }
  return entries;
}

function valueAtPath(value: unknown, path: string): unknown {
  let current: any = value;
  for (const part of path.split('.')) {
    if (current === null || current === undefined) return current;
    current = current[part];
  }
  return current;
}

function rowKey(raw: unknown, count: number): unknown {
  if (raw !== null && (typeof raw === 'object' || typeof raw === 'function')) {
    let keys = EACH_IN_OBJECT_KEYS.get(raw);
    if (keys === undefined) EACH_IN_OBJECT_KEYS.set(raw, (keys = []));
    let key = keys[count];
    if (key === undefined) keys[count] = key = {};
    return key;
  }
  return `${typeof raw}:${String(raw)}#${count}`;
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

/**
 * Install `value` at `globalThis[name]` behind a getter that ignores writes, so
 * a later `setupGlobalScope()` pass (GXT iterates its symbol table and writes
 * each symbol to globalThis) cannot clobber the Ember-patched version. The
 * descriptor is `configurable: true, enumerable: true`. Every name it protects
 * is configurable (gxt's `setupGlobalScope` assigns them, or an earlier
 * `protectGlobal` defined them), so redefining it cannot fail.
 *
 * Used by compile.ts for `$_if`, `$_eachSync`, `$_maybeModifier`,
 * `$_helperHelper`, `$__log` and `$__if`, and by manager.ts for its row-keying
 * `$_eachSync` wrapper. compile.ts's `$_inElement` and `$_c` traps differ and
 * stay inline: `$_inElement` is non-configurable and `$_c` is defined without
 * `enumerable`.
 */
export function protectGlobal(name: string, value: unknown): void {
  Object.defineProperty(globalThis, name, {
    get() {
      return value;
    },
    set(_v: any) {
      /* protect from setupGlobalScope overwrite */
    },
    configurable: true,
    enumerable: true,
  });
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

/**
 * Whether the string tag of a compiled element may name a component (or a
 * helper) that the Ember `$_tag` wrappers resolve by name. Glimmer invokes a
 * tag as a component only when it starts with an uppercase letter (or is a
 * path, which reaches the wrappers as `this.…` / `:…` / `@…`): a lowercase
 * tag with a dash (`<x-foo>`) is a custom element, even when a component of
 * that name exists. The exceptions are the lowercase names gxt's compat
 * compiler gives component tags: `<LinkTo>` → `link-to`, `<Foo::Bar>` →
 * `foo--bar`, and the legacy `curly-c-` prefix.
 */
export function tagMayNameComponent(tag: string): boolean {
  const first = tag[0];
  if (first === undefined) return false;
  if (first === first.toUpperCase()) return true;
  return tag === 'link-to' || tag.includes('--') || tag.startsWith('curly-c-');
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
 * - props (`tagProps[0]`): only the class slot (empty key), which the inner
 *   wrapper hands to GXT as the `class` attribute (`classAsAttribute`) on
 *   both paths and the post-apply scan skips. A reactive `style` lands here
 *   under `'style'`, so it always takes the slow path.
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
 * that evaluation's implementation (`keepArgValue`): the function stays
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

/**
 * The value a component argument holds: a `(mut x)` cell or a `(readonly x)`
 * marker passed as an argument stands for its value, as Glimmer's args proxy
 * reads an argument reference through `valueForRef`.
 */
export function argumentValue(value: unknown): unknown {
  if (value !== null && (typeof value === 'object' || typeof value === 'function')) {
    const marked = value as { __isMutCell?: unknown; __isReadonly?: unknown };
    if (marked.__isMutCell === true) return (value as { value: unknown }).value;
    if (marked.__isReadonly === true) {
      return (value as { __readonlyValue: unknown }).__readonlyValue;
    }
  }
  return value;
}

// Depth of the argument-reference reads in progress (`readArgumentReference`).
let argumentReferenceReads = 0;

/**
 * Runs `read`, an `@name` read of a template, so that it returns the
 * argument's reference instead of its value: what the invocation passed for
 * the argument (a `(mut x)` cell or a `(readonly x)` marker as it is), read
 * through the components that pass it on (`@other={{@name}}`), as a Glimmer
 * argument is the invocation's reference. `(mut @name)` writes through it.
 */
export function readArgumentReference<T>(read: () => T): T {
  argumentReferenceReads++;
  try {
    return read();
  } finally {
    argumentReferenceReads--;
  }
}

/** Whether an argument read is a `readArgumentReference` read. */
export function isReadingArgumentReference(): boolean {
  return argumentReferenceReads > 0;
}

// The mutable sources of the arguments of the component a render context
// renders (`__mutArgSources` of a curried component's invocation), by render
// context, for the contexts that are not classic component instances (those
// carry them as `__mutArgSources`).
const mutArgumentSourcesByContext = new WeakMap<object, Record<string, unknown>>();

export function setMutArgumentSources(context: object, sources: unknown): void {
  if (sources !== null && typeof sources === 'object') {
    mutArgumentSourcesByContext.set(context, sources as Record<string, unknown>);
  } else {
    mutArgumentSourcesByContext.delete(context);
  }
}

export function mutArgumentSources(context: unknown): Record<string, unknown> | undefined {
  return context !== null && typeof context === 'object'
    ? mutArgumentSourcesByContext.get(context)
    : undefined;
}

// The render contexts (`this`) of template-only components: Glimmer renders
// those with no self (`null`), which `{{debugger}}`'s callback distinguishes.
const templateOnlySelves = new WeakSet<object>();

/** Mark `context` as the render context of a template-only component. */
export function markTemplateOnlySelf(context: object): void {
  templateOnlySelves.add(context);
}

/** Whether `context` renders a template-only component (Glimmer's self: `null`). */
export function isTemplateOnlySelf(context: unknown): boolean {
  return typeof context === 'object' && context !== null && templateOnlySelves.has(context);
}

/**
 * The source text of a helper / modifier call site's path arguments (gxt's
 * EMBER_ARG_LABELS compile flag, on in DEBUG builds; gxt's `ArgLabels`):
 * `positional[i]` for the i-th argument (`null` when it is not a path),
 * `named[key]` for a named one. They are the debug labels of the argument
 * references, as Glimmer labels a path reference with its path (`this.foo`).
 */
export interface GxtArgLabels {
  readonly positional?: readonly (string | null)[];
  readonly named?: Readonly<Record<string, string>>;
}

/** The debug label of a modifier's i-th positional argument reference. */
export function positionalArgLabel(labels: GxtArgLabels | undefined, index: number): string {
  return labels?.positional?.[index] ?? 'modifier-arg';
}

/** The debug label of a modifier's named argument reference. */
export function namedArgLabel(labels: GxtArgLabels | undefined, key: string): string {
  return labels?.named?.[key] ?? key;
}

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
 * Curried modifier values (`(modifier …)`, ember-gxt-wrappers.ts
 * `$_modifierHelper_ember`).
 *
 * Glimmer's curry reference (`createCurryRef`) returns the same curried value
 * while the definition it curries stays the same, and the curried arguments are
 * references that the modifier reads when it installs or updates. The compat
 * compiler re-evaluates the call on every read, so each read curried a new
 * modifier, and an argument holding one changed on every read: the sync wrote
 * it back to the component, the modifier on the element updated, and the next
 * sync read a new value again, so the renderer never settled.
 *
 * A value records the definition it curries (`CURRIED_MODIFIER_DEFINITION`)
 * and installs through a replaceable implementation
 * (`CURRIED_MODIFIER_INSTALL`). A reference that holds a value keeps it when a
 * later evaluation curries the same definition, and takes that evaluation's
 * implementation (`keepArgValue`): the curried modifier stays the same while
 * its definition is the same, and an install reads the arguments of the latest
 * evaluation.
 */
export const CURRIED_MODIFIER_DEFINITION: unique symbol = Symbol('gxt curried modifier definition');
export const CURRIED_MODIFIER_INSTALL: unique symbol = Symbol('gxt curried modifier install');

type CurriedModifierInstall = (
  element: HTMLElement,
  params: unknown[],
  hash: Record<string, unknown>
) => unknown;

export interface CurriedModifierValue {
  (element: HTMLElement, params: unknown[], hash: Record<string, unknown>): unknown;
  __isCurriedModifier: true;
  [CURRIED_MODIFIER_DEFINITION]: unknown;
  [CURRIED_MODIFIER_INSTALL]: CurriedModifierInstall;
}

export function createCurriedModifierValue(
  definition: unknown,
  install: CurriedModifierInstall
): CurriedModifierValue {
  const value = function curriedModifier(
    element: HTMLElement,
    params: unknown[],
    hash: Record<string, unknown>
  ): unknown {
    return value[CURRIED_MODIFIER_INSTALL](element, params, hash);
  } as CurriedModifierValue;
  value.__isCurriedModifier = true;
  value[CURRIED_MODIFIER_DEFINITION] = definition;
  value[CURRIED_MODIFIER_INSTALL] = install;
  return value;
}

function isCurriedModifierValue(value: unknown): value is CurriedModifierValue {
  return typeof value === 'function' && CURRIED_MODIFIER_INSTALL in value;
}

/**
 * The value a reference holds after reading `next` when it held `prev`: `prev`
 * when both are values of one call site that stand for the same thing (two
 * `(fn …)` values binding the same callback, or two curried modifiers of the
 * same definition), and `prev` then runs `next`'s implementation; otherwise
 * `next`.
 */
export function keepArgValue(prev: unknown, next: unknown): unknown {
  if (prev === next) return next;
  if (isFnHelperValue(prev) && isFnHelperValue(next)) {
    if (!sameFnCallback(prev[FN_HELPER_TARGET], next[FN_HELPER_TARGET])) return next;
    prev[FN_HELPER_CALL] = next[FN_HELPER_CALL];
    return prev;
  }
  if (isCurriedModifierValue(prev) && isCurriedModifierValue(next)) {
    if (!Object.is(prev[CURRIED_MODIFIER_DEFINITION], next[CURRIED_MODIFIER_DEFINITION])) {
      return next;
    }
    prev[CURRIED_MODIFIER_INSTALL] = next[CURRIED_MODIFIER_INSTALL];
    return prev;
  }
  return next;
}
