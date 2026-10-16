/**
 * Symbol identity of the GXT-backed `@glimmer/component` sibling.
 *
 * Proves the reactive fork is CLOSED on the GXT side: the `Tag`-related
 * symbols (`createTag`, `CURRENT_TAG`) and the cache primitives reachable
 * "through `@glimmer/component-gxt`" are IDENTITY-EQUAL (`===`) to the ones
 * the `@ember/-internals/gxt-backend` validator shim exposes, and its
 * `@tracked` / `@cached` decorators are metal's (what `@glimmer/tracking`
 * re-exports) — i.e. the sibling package is built against the SAME
 * reactive-runtime module instances the rest of the GXT build uses, not a
 * second copy.
 *
 * The last case demonstrates the fork this package exists to close: the
 * classic `@glimmer/validator` copy (left un-aliased here, standing in for the
 * second runtime an un-swapped npm `@glimmer/component` would import) is a
 * DIFFERENT object, which is exactly the symbol-identity duplication this
 * package avoids.
 *
 * This vitest suite (like gxt-backend's __tests__/utils.test.ts) ran through
 * the removed packages/demo workspace's vitest config; no workspace installs
 * vitest now, so it has no runner until one is wired up.
 *
 * That config aliased `@glimmer/component-gxt[/reactive]` and the
 * `@ember/-internals/*` modules it re-exports to their source files — the
 * same alias contract `rollup.config.mjs` applies for the GXT build — while
 * deliberately leaving `@glimmer/validator` resolving to the classic workspace
 * package so the fork is observable.
 *
 * Out of scope for this lightweight test: `getCustomTagFor` (lives in the
 * heavyweight `@glimmer/manager` shim, which transitively imports Ember's
 * renderer graph and does not load in a plain node/jsdom test env) and `Tag`
 * (a TypeScript interface, not a runtime value).
 */
import { describe, it, expect } from 'vitest';

// (A) Through the sibling package's reactive surface.
import {
  createTag as pkgCreateTag,
  CURRENT_TAG as pkgCURRENT_TAG,
  tracked as pkgTracked,
  cached as pkgCached,
  createCache as pkgCreateCache,
  getValue as pkgGetValue,
} from '@glimmer/component-gxt/reactive';

// (B) Through the validator shim and metal directly.
import {
  createTag as shimCreateTag,
  CURRENT_TAG as shimCURRENT_TAG,
  createCache as shimCreateCache,
  getValue as shimGetValue,
} from '@ember/-internals/gxt-backend/validator';
import { tracked as metalTracked } from '@ember/-internals/metal/lib/tracked';
import { cached as metalCached } from '@ember/-internals/metal/lib/cached';

// (C) The classic, npm-shaped @glimmer/validator copy — NOT aliased to the
// shim, so it stands in for the second runtime copy.
import {
  createTag as classicCreateTag,
  CURRENT_TAG as classicCURRENT_TAG,
} from '@glimmer/validator';

describe('@glimmer/component-gxt reactive identity', () => {
  it('createTag is identity-equal through the package and through the shim', () => {
    expect(typeof pkgCreateTag).toBe('function');
    expect(pkgCreateTag).toBe(shimCreateTag);
  });

  it('CURRENT_TAG is identity-equal through the package and through the shim', () => {
    expect(pkgCURRENT_TAG).toBeDefined();
    expect(pkgCURRENT_TAG).toBe(shimCURRENT_TAG);
  });

  it('@tracked / @cached / cache primitives are identity-equal', () => {
    expect(typeof pkgTracked).toBe('function');
    expect(pkgTracked).toBe(metalTracked);
    expect(pkgCached).toBe(metalCached);
    expect(pkgCreateCache).toBe(shimCreateCache);
    expect(pkgGetValue).toBe(shimGetValue);
  });

  it('demonstrates the fork it closes: package symbols are NOT the classic @glimmer/validator copies', () => {
    expect(typeof classicCreateTag).toBe('function');
    expect(pkgCreateTag).not.toBe(classicCreateTag);
    expect(pkgCURRENT_TAG).not.toBe(classicCURRENT_TAG);
  });
});
