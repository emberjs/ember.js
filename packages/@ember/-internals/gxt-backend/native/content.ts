// gxt NATIVE layer — Glimmer content semantics gxt asks the host about
// (registered as gxt host hooks by native/install.ts):
//
//   classifyContent  what a content-position `{{value}}` IS: trusted HTML
//                    (SafeString — Glimmer's `isSafeString`: a `toHTML`
//                    method), a component (a definition with a component
//                    manager, `templateOnly()`, a curried component) or a
//                    helper (an explicit helper manager, a curried helper).
//                    Text and DOM nodes gxt recognizes itself; plain functions
//                    keep gxt's call semantics.
//   eachInEntries    `{{#each-in}}` entries with Glimmer's `toEachInIterator`
//                    rules (utils/iterator.ts): arrays / plain objects by own
//                    keys (consuming each key's tag + an array value's `[]`
//                    tag), native iterables of pairs (Maps), forEach-ables —
//                    plus the object tag (`-each-in` helper parity:
//                    `set(obj, 'newKey', v)` re-iterates).
//   assert           gxt's host-parity runtime checks (in-element destination /
//                    insertBefore) through `@ember/debug`.
//   getProp          template property reads: Glimmer's global-context getProp
//                    plus the iteration tag of an Ember array value (below).
import { assert } from '@ember/debug';
import { _getProp, get, tagForObject, tagForProperty } from '@ember/-internals/metal';
import { isEmberArray } from '@ember/array/-internals';
import { isProxy } from '@ember/-internals/utils';
import { consumeTag, isTracking, tagFor } from '@glimmer/validator';
import { CURRIED_COMPONENT, CURRIED_HELPER, getCurried } from '@lifeart/gxt';
import { getInternalComponentManager, hasInternalHelperManager } from './manager-api';
import { TemplateOnlyComponentDefinition } from './template-only';

export function classifyContent(value: unknown): 'html' | 'component' | 'helper' | undefined {
  if (value === null || value === undefined) return undefined;
  const type = typeof value;
  if (type !== 'object' && type !== 'function') return undefined;
  if (typeof (value as { toHTML?: unknown }).toHTML === 'function') return 'html';
  const curried = getCurried(value);
  if (curried !== undefined) {
    if (curried.kind === CURRIED_COMPONENT) return 'component';
    if (curried.kind === CURRIED_HELPER) return 'helper';
    return undefined;
  }
  if (value instanceof TemplateOnlyComponentDefinition) return 'component';
  if (getInternalComponentManager(value as object) !== undefined) return 'component';
  if (hasInternalHelperManager(value as object)) return 'helper';
  return undefined;
}

type Pair = [unknown, unknown];

function fromIndexable(obj: Record<string, unknown>): Pair[] {
  const tracking = isTracking();
  const out: Pair[] = [];
  for (const key of Object.keys(obj)) {
    const value = obj[key];
    if (tracking) {
      consumeTag(tagFor(obj, key));
      if (Array.isArray(value)) consumeTag(tagFor(value, '[]'));
    }
    out.push([key, value]);
  }
  return out;
}

export function eachInEntries(source: object): Pair[] {
  consumeTag(tagForObject(source));
  let obj = source;
  if (isProxy(obj)) {
    // `-each-in` unwraps an ObjectProxy to its content (legacy-tolerated).
    const content = get(obj, 'content');
    if (content === null || typeof content !== 'object') return [];
    obj = content as object;
  }
  if (Array.isArray(obj)) return fromIndexable(obj as unknown as Record<string, unknown>);
  if (typeof (obj as { [Symbol.iterator]?: unknown })[Symbol.iterator] === 'function') {
    const out: Pair[] = [];
    for (const entry of obj as Iterable<Pair>) out.push([entry[0], entry[1]]);
    return out;
  }
  const forEach = (obj as { forEach?: unknown }).forEach;
  if (typeof forEach === 'function') {
    const keys: unknown[] = [];
    const values: unknown[] = [];
    let isMapLike = false;
    // Not an arrow: `arguments.length` tells a (value, key) forEach from a
    // (value) one (Glimmer ObjectIterator.fromForEachable).
    forEach.call(obj, function (value: unknown, key: unknown) {
      isMapLike = isMapLike || arguments.length >= 2;
      if (isMapLike) keys.push(key);
      values.push(value);
    });
    return values.map((value, i): Pair => [isMapLike ? keys[i] : i, value]);
  }
  return fromIndexable(obj as Record<string, unknown>);
}

// Template property reads (every member segment of a `this.*` / `@arg.*` /
// block-param path). Metal's `_getProp` is Glimmer's global-context getProp:
// it consumes tagFor(obj, key), plus the plain `[]` tag of an array value.
//
// An Ember array that is not a native array (an ArrayProxy) also has a custom
// `[]` tag that follows its `content` / `arrangedContent`. Glimmer consumes
// that tag when `{{#each}}` iterates the value through `length` /
// `objectAt`, which also sets the proxy up (`_revalidate`). gxt's `{{#each}}`
// reads the proxy's `content` directly instead, so nothing consumed it: a
// proxy whose `content` was replaced after the first render, such as a
// PromiseArray that resolves, never re-rendered. Consume it here, in the read
// that produced the value.
export function getProp(obj: object, key: string): unknown {
  const value = _getProp(obj, key);
  if (isTracking() && !Array.isArray(value) && isEmberArray(value)) {
    consumeTag(tagForProperty(value, '[]'));
  }
  return value;
}

export function hostAssert(message: string): void {
  assert(message, false);
}
