import type { ModifierDefinitionState } from '@glimmer/interfaces';
import { array } from '@glimmer/runtime/lib/helpers/array';
import { concat } from '@glimmer/runtime/lib/helpers/concat';
import { fn } from '@glimmer/runtime/lib/helpers/fn';
import { get } from '@glimmer/runtime/lib/helpers/get';
import { hash } from '@glimmer/runtime/lib/helpers/hash';
import { on } from '@glimmer/runtime/lib/modifiers/on';
import {
  BUILTIN_HELPERS,
  BUILTIN_KEYWORD_HELPERS,
  BUILTIN_KEYWORD_MODIFIERS,
  BUILTIN_MODIFIERS,
  registerResolver,
} from './builtins-registry';
import ResolverImpl from './resolver';
import { default as disallowDynamicResolution } from './helpers/-disallow-dynamic-resolution';
import { default as inElementNullCheckHelper } from './helpers/-in-element-null-check';
import { default as normalizeClassHelper } from './helpers/-normalize-class';
import { default as resolve } from './helpers/-resolve';
import { default as trackArray } from './helpers/-track-array';
import { default as eachIn } from './helpers/each-in';
import { default as mut } from './helpers/mut';
import { default as readonly } from './helpers/readonly';
import { default as unbound } from './helpers/unbound';
import { default as uniqueId } from './helpers/unique-id';

const KEYWORD_HELPERS: Record<string, object> = {
  mut,
  readonly,
  unbound,
  '-hash': hash,
  '-each-in': eachIn,
  '-normalize-class': normalizeClassHelper,
  '-resolve': resolve,
  '-track-array': trackArray,
  '-in-el-null': inElementNullCheckHelper,
};

const HELPERS: Record<string, object> = {
  ...KEYWORD_HELPERS,
  array,
  concat,
  fn,
  get,
  hash,
  'unique-id': uniqueId,
  // In prod builds, this is a no-op helper and is unused in practice. We shouldn't need
  // to add it at all, but the current test build doesn't produce a "prod compiler", so
  // we ended up running the debug-build for the template compliler in prod tests. Once
  // that is fixed, this can be conditionally included only in DEBUG. For now, this
  // allows the test to work and does not really harm anything, since it's just a no-op
  // pass-through helper. Keeping it inside the object literal (rather than a top-level
  // conditional assignment) keeps this module free of top-level side effects so that
  // consumers that never resolve anything dynamically can tree-shake the whole table.
  '-disallow-dynamic-resolution': disallowDynamicResolution,
};

// With the implementation of RFC #1006(https://rfcs.emberjs.com/id/1006-deprecate-action-template-helper), the `action` modifer was removed. It was the
// only built-in keyword modifier, so this object is currently empty.
const KEYWORD_MODIFIERS: Record<string, ModifierDefinitionState> = {};

const MODIFIERS: Record<string, object> = {
  ...KEYWORD_MODIFIERS,
  on,
};

let filled = false;

/**
 * Fills the resolver's built-in tables. Call it from any code path that
 * resolves helpers or modifiers by name.
 */
export function ensureBuiltins(): void {
  if (filled) return;
  filled = true;

  Object.assign(BUILTIN_KEYWORD_HELPERS, KEYWORD_HELPERS);
  Object.assign(BUILTIN_HELPERS, HELPERS);
  Object.assign(BUILTIN_KEYWORD_MODIFIERS, KEYWORD_MODIFIERS);
  Object.assign(BUILTIN_MODIFIERS, MODIFIERS);
  registerResolver(new ResolverImpl());
}
