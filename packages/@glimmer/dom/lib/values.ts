import { getPath as globalGetPath, getProp, toBool } from '@glimmer/global-context';
import { createCache, getValue } from '@glimmer/validator/lib/tracking';

import type { Ctx, Thunk } from './core';

/**
 * Property lookup, with the same semantics as a path in a template
 * (null-safe, and consumes tags for classic `set()`-style properties).
 */
export function get(obj: unknown, ...keys: string[]): unknown {
  for (let key of keys) {
    if (obj === null || obj === undefined) return undefined;
    obj = getProp(obj, key);
  }
  return obj;
}

/**
 * `(get obj "a.b")`
 */
export function getPath(obj: unknown, path: unknown): unknown {
  if (obj === null || obj === undefined || path === null || path === undefined) return undefined;
  // eslint-disable-next-line @typescript-eslint/no-base-to-string -- same as the `get` helper
  return globalGetPath(obj, String(path));
}

/**
 * Template truthiness (empty arrays are falsy, etc).
 */
export function bool(value: unknown): boolean {
  return toBool(value);
}

function isEmpty(value: unknown): boolean {
  return (
    value === null ||
    value === undefined ||
    typeof (value as { toString?: unknown }).toString !== 'function'
  );
}

/**
 * Normalize a value for use as text (or within a concatenated attribute).
 */
export function str(value: unknown): string {
  return isEmpty(value) ? '' : String(value);
}

export function and(...values: Thunk[]): unknown {
  let last: unknown;
  for (let value of values) {
    last = value();
    if (!toBool(last)) return last;
  }
  return last;
}

export function or(...values: Thunk[]): unknown {
  let last: unknown;
  for (let value of values) {
    last = value();
    if (toBool(last)) return last;
  }
  return last;
}

/**
 * A cached thunk, used for `{{#let}}` bindings.
 */
export function memo<T>(fn: Thunk<T>): Thunk<T> {
  let cache = createCache(fn);
  return () => getValue(cache) as T;
}

export function log(...values: unknown[]): undefined {
  // eslint-disable-next-line no-console
  console.log(...values);
  return undefined;
}

/**
 * Backs `{{#each-in}}`: produces `[key, value]` pairs.
 */
export function entries(obj: unknown): Array<[string, unknown]> {
  if (obj === null || obj === undefined) return [];
  if (obj instanceof Map) return Array.from(obj.entries() as Iterable<[string, unknown]>);
  return Object.keys(obj).map((key) => [key, get(obj, key)]);
}

export function hasBlock(ctx: Ctx, name = 'default'): boolean {
  return Boolean(ctx.blocks?.[name]);
}

export function hasBlockParams(ctx: Ctx, name = 'default'): boolean {
  let block = ctx.blocks?.[name];
  // block functions are `(b, ...params)`
  return block ? block.length > 1 : false;
}
