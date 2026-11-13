// The GXT parts of metal's `notifyPropertyChange` (property_events.ts) that use
// none of its state: the GXT re-render trigger, and the recompute of the
// dependent computed properties that the trigger runs. They are gxt-bridge
// compile-pipeline members (`triggerPropertyChange`, `recomputeDependents`);
// compile.ts imports this module, which installs them. property_events.ts
// keeps the rest of `notifyPropertyChange` (the CP invalidation marker, the
// dirty tags, the observers) and contributes `propertyChangesDeferred`.
import { peekMeta } from '@ember/-internals/meta/lib/meta';
import { warn } from '@ember/debug';
import { DEBUG } from '@glimmer/env';
import { getGxtRenderer, installCompilePipelinePart } from './gxt-bridge';

// The GXT re-render trigger of `notifyPropertyChange`, which calls it unless
// the object is initializing. `hasValueArg` is whether the public call passed
// `value` (its `arguments.length === 4`).
function triggerPropertyChange(
  obj: object,
  keyName: string,
  value: unknown,
  hasValueArg: boolean
): void {
  const _cp = getGxtRenderer()?.compilePipeline;
  const _triggerReRender = _cp?.triggerReRender;
  if (typeof _triggerReRender === 'function') {
    // Mark the trigger scope (`withInTriggerReRender`) so CP.get can
    // preserve classic "don't eagerly evaluate never-consumed CPs during a
    // change notification" semantics. (core.ts's lazy wrapper is only
    // installed for proxied CoreObjects, which misses plain
    // `class Foo { @computed ... }` cases.) If the helper is unavailable,
    // the trigger still marks the scope for its own body.
    //
    // Forward `value` when the caller passed it (as `notifyPropertyChange`
    // does to `PROPERTY_DID_CHANGE`) so the trigger can update the cell
    // without re-reading `obj[keyName]`.
    const _hasValueArg = hasValueArg;
    const _withIn = _cp?.withInTriggerReRender;
    if (_withIn) {
      _withIn(() => {
        if (_hasValueArg) {
          _triggerReRender(obj, keyName, value);
        } else {
          _triggerReRender(obj, keyName);
        }
      });
    } else {
      if (_hasValueArg) {
        _triggerReRender(obj, keyName, value);
      } else {
        _triggerReRender(obj, keyName);
      }
    }
  }
}

// GXT integration: recompute the computed properties whose dependent keys
// include `changedKey` and return `{ key, value }` pairs. The GXT re-render
// trigger calls this (as `compilePipeline.recomputeDependents`) after updating
// the primary cell, so derived computed properties are refreshed too. It
// respects metal's property-change batches (`propertyChangesDeferred`).
function _gxtRecomputeDependents(
  obj: object,
  changedKey: string
): Array<{ key: string; value: unknown }> {
  const results: Array<{ key: string; value: unknown }> = [];
  // Inside a `beginPropertyChanges`/`endPropertyChanges` batch, classic
  // Ember never evaluates dependent computed properties — it defers all
  // re-evaluation until the batch closes and observers flush. Mirror that
  // here: returning an empty results array tells the re-render trigger not
  // to eagerly update the dependent CPs' cells. GXT's own cell invalidation
  // still happens via `dirtyTagFor`,
  // so the next genuine read (observer callback, `get()`, render) will
  // lazily recompute through the CP descriptor with a fresh value.
  if (getGxtRenderer()?.compilePipeline.propertyChangesDeferred?.()) return results;
  const meta = peekMeta(obj);
  if (!meta) return results;
  // Aliases (`@alias`/`@readOnly`/`@oneWay`) declare their dependency via
  // `altKey` (chain-tags), NOT `_dependentKeys`, so the classic
  // `_dependentKeys` match below never fires for them — when the alias target
  // changes, the alias cell is never re-dirtied. The alias is therefore
  // recomputed here. Aliases have no user-getter side effects (they just read
  // the target), so eager re-evaluation is safe and the
  // `revisionFor === undefined` guard is bypassed for them.
  meta.forEachDescriptors((propKey: string, descriptor: any) => {
    if (!descriptor) return;
    let isAlias = false;
    let matches = false;
    const _altKey: string | undefined =
      typeof descriptor.altKey === 'string' ? descriptor.altKey : undefined;
    if (_altKey !== undefined) {
      // Alias: dependency is `altKey`. Match changedKey against it including
      // path-prefix relationships in either direction (set(obj,'a.b.c')
      // notifies 'a.b.c'; an alias on 'a.b.c' or any prefix should refire).
      if (
        _altKey === changedKey ||
        _altKey.startsWith(changedKey + '.') ||
        changedKey.startsWith(_altKey + '.')
      ) {
        matches = true;
        isAlias = true;
      }
    } else if (descriptor._dependentKeys) {
      const deps: string[] = descriptor._dependentKeys;
      // Check if changedKey matches any dependent key (including path prefixes)
      for (const dep of deps) {
        if (dep === changedKey || dep.startsWith(changedKey + '.')) {
          matches = true;
          break;
        }
      }
    }
    if (!matches) return;
    // Classic Ember semantics: a CP that has never been consumed
    // (no cached revision) should NOT be eagerly evaluated here.
    // Eager evaluation would (a) invoke user getters with side
    // effects prematurely and (b) propagate change events to async
    // observers that were registered on CPs the caller never read.
    // Wait for the next lazy read to recompute through the descriptor.
    // Aliases are exempt — they have no side-effecting user getter and
    // GXT reads them through cellFor (never through the descriptor's
    // revision tracking), so revisionFor is legitimately undefined.
    if (!isAlias && meta.revisionFor(propKey) === undefined) return;
    // Recompute using the descriptor's cache-aware `get(obj, keyName)`
    // method when available. Calling `_getter` directly bypasses the CP
    // cache path, which for user-defined getters with side effects (e.g.
    // `this.incCallCount++`) means the computed runs an extra time —
    // once here during notifyPropertyChange, and once more when the
    // caller later reads the property through the descriptor. Routing
    // through `descriptor.get` updates meta.valueFor/revisionFor so the
    // subsequent read is a cache hit with the freshly-computed value.
    try {
      let newValue: unknown;
      if (typeof descriptor.get === 'function' && descriptor.get.length >= 2) {
        newValue = descriptor.get(obj, propKey);
      } else if (typeof descriptor._getter === 'function') {
        newValue = descriptor._getter.call(obj, propKey);
      } else if (typeof descriptor.get === 'function') {
        newValue = descriptor.get(obj, propKey);
      }
      results.push({ key: propKey, value: newValue });
    } catch (error) {
      // An eager recompute Glimmer does not do (it reads a computed property
      // when something consumes it): the change dirties the property's tag,
      // so its next read recomputes it and throws to its reader. Reported in
      // DEBUG; the property's cell keeps its value.
      if (DEBUG) {
        warn(`recomputing \`${propKey}\` threw: ${String(error)}`, false, {
          id: 'ember-gxt.dropped-read',
        });
      }
    }
  });
  return results;
}

installCompilePipelinePart({
  triggerPropertyChange,
  recomputeDependents: _gxtRecomputeDependents,
});
