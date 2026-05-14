import { next, run, _getCurrentRunLoop, _hasScheduledTimers } from '@ember/runloop';
import { destroy } from '@glimmer/destroyable';
// (Cluster B slice 6) Bridge reader for `resetIntervalBudget`.
import { getGxtRenderer } from '@ember/-internals/gxt-backend/gxt-bridge';

import { Promise } from 'rsvp';

export function runAppend(view: any): void {
  // Suppress the runloop onEnd sync during initial render. The runloop's onEnd
  // hook calls __gxtSyncDomNow when __gxtPendingSync is true. During initial
  // render, property change notifications from component init set
  // __gxtPendingSync=true, causing gxtSyncDom to re-evaluate each-formulas
  // with stale values (e.g., returning [] instead of the actual collection).
  // Slice-38 (Cluster B): `__gxtRunTaskActive` canonical state migrated to
  // module-local `_gxtRunTaskActiveFlag` in `compile.ts`. Test-helper
  // writer-contract — routes through the bridge setter (reuses slice-36/37
  // test-helper-bridge-writer pattern). See `setRunTaskActive` doc in
  // gxt-bridge.ts.
  getGxtRenderer()?.compilePipeline.setRunTaskActive?.(true);
  try {
    run(view, 'appendTo', document.getElementById('qunit-fixture'));
  } catch (e) {
    // The run() threw — this means a render error escaped without being
    // consumed by flushRenderErrors() at the end of this function. The
    // gxt-backend catch path (manager.ts:8993, captureRenderError + rethrow)
    // captures a duplicate copy into _renderErrors before the error bubbles
    // out. That stale copy would otherwise re-throw during the NEXT
    // runTask()/runAppend() flushRenderErrors call, breaking error-recovery
    // tests like `Errors thrown during render: it can recover resets the
    // transaction when an error is thrown during initial render` whose
    // sequence is:
    //   1. assert.throws(() => render(...))   // user observes the throw
    //   2. runTask(() => set(switch, false))  // BUG: re-throws stale copy
    // Clear the queue so the user-observed error is the only one surfaced.
    const clearErrors = (globalThis as any).__gxtClearRenderErrors;
    if (typeof clearErrors === 'function') clearErrors();
    throw e;
  } finally {
    // Slice-38 (Cluster B): see comment above; routes through bridge setter.
    getGxtRenderer()?.compilePipeline.setRunTaskActive?.(false);
  }
  // Preserve __gxtPendingSyncFromPropertyChange ONLY if a property change
  // originated from a `schedule('afterRender', cb)` callback (the classic
  // `afterRender set` pattern, where `didInsertElement` queues a set that
  // must re-render the DOM before the test assertion). Otherwise, reset the
  // flag to its previous "init artifacts don't trigger a full sync" behavior
  // so tests like Textarea (which set internal bindings during init) don't
  // regress.
  // Slice-40 (Cluster B): `__gxtAfterRenderPropertyChange` canonical state
  // migrated to module-local `_gxtAfterRenderPropertyChangeFlag` in
  // `compile.ts`. Test-helper reader+clearer-contract — routes through the
  // bridge getter+setter (load-order-safe optional chain — by the time
  // `runAppend` fires, compile.ts's `installCompilePipelinePart` has run
  // and both methods are installed). See `getAfterRenderPropertyChange` /
  // `setAfterRenderPropertyChange` doc in gxt-bridge.ts.
  const _cpAR = getGxtRenderer()?.compilePipeline;
  const afterRenderChanged = Boolean(_cpAR?.getAfterRenderPropertyChange?.());
  _cpAR?.setAfterRenderPropertyChange?.(false);
  if (!afterRenderChanged) {
    // Slice-36 (Cluster B): `__gxtPendingSyncFromPropertyChange` canonical
    // state migrated to module-local `_gxtPendingSyncFromPropertyChangeFlag`
    // in `compile.ts`. Test-helper writer-contract — routes through the
    // bridge setter (load-order-safe optional chain — by the time
    // `runAppend` fires, compile.ts's `installCompilePipelinePart` has
    // run and the setter is installed). See `setPendingSyncFromPropertyChange`
    // doc in gxt-bridge.ts. This is the first slice to route test-helper
    // writers through the bridge — establishes the pattern that flag 1
    // (`__gxtPendingSync`) will reuse in slice 37.
    getGxtRenderer()?.compilePipeline.setPendingSyncFromPropertyChange?.(false);
  }
  // In GXT mode, flush pending DOM updates synchronously after append
  // so test assertions see the rendered DOM immediately
  const resetMC2 = (globalThis as any).__resetManagedComponentCounters;
  if (typeof resetMC2 === 'function') resetMC2();
  const syncNow = (globalThis as any).__gxtSyncDomNow;
  if (typeof syncNow === 'function') {
    syncNow();
  }
  // After sync, clear any pending sync flags that were set during the sync
  // itself (e.g., from syncAll triggering property changes). This prevents
  // the setInterval(16ms) fallback from firing another sync that would
  // re-evaluate each-formulas with stale values.
  // Slice-37 (Cluster B): `__gxtPendingSync` canonical state migrated to
  // module-local `_gxtPendingSyncFlag` in `compile.ts`. Test-helper
  // writer-contract — routes through the bridge setter (reuses slice-36
  // test-helper-bridge-writer pattern). See `setPendingSync` doc in
  // gxt-bridge.ts.
  const _cpRA = getGxtRenderer()?.compilePipeline;
  _cpRA?.setPendingSync?.(false);
  // Slice-36 (Cluster B): `__gxtPendingSyncFromPropertyChange` canonical
  // state migrated to module-local `_gxtPendingSyncFromPropertyChangeFlag`
  // in `compile.ts`. Test-helper writer-contract — routes through the
  // bridge setter.
  _cpRA?.setPendingSyncFromPropertyChange?.(false);
  // Reset interval sync budget after an explicit sync
  _cpRA?.resetIntervalBudget?.();
  // Phase 3 step 7: the post-render flushRenderErrors() call was deleted.
  // Init-phase render errors now propagate synchronously through renderer.ts's
  // template.render() try/catch (Option C2, Phase 3 step 5). Lifecycle errors
  // queued by flushAfterInsertQueue / triggerLifecycleHook are flushed by
  // renderer.ts's own flushRenderErrors at line ~858 BEFORE control returns
  // to us here. The QUnit testStart drain (setup-qunit.ts:91-108) sweeps any
  // leftover Pattern-2 captures between tests.
}

export function runDestroy(toDestroy: any): void {
  if (toDestroy) {
    try {
      run(destroy, toDestroy);
    } catch (e: any) {
      // Swallow "already destroyed" errors during test cleanup
      if (e && e.message && e.message.includes('after the owner has been destroyed')) {
        return;
      }
      throw e;
    }
    // In GXT mode, also destroy tracked helper instances when a component is destroyed.
    // Class-based helpers need proper destroy lifecycle (willDestroy, destroy).
    const helperInstances = (globalThis as any).__gxtHelperInstances;
    if (Array.isArray(helperInstances) && helperInstances.length > 0) {
      for (const inst of helperInstances) {
        try {
          if (typeof inst.destroy === 'function' && !inst.isDestroyed && !inst.isDestroying) {
            inst.destroy();
          }
        } catch {
          /* ignore */
        }
      }
      helperInstances.length = 0;
    }
    // Also clear the helper instance cache
    const clearCache = (globalThis as any).__gxtClearHelperCache;
    if (typeof clearCache === 'function') {
      clearCache();
    }
  }
}

export function runTask<F extends () => any>(callback: F): ReturnType<F> {
  // Mark that we're inside runTask so the runloop's onEnd hook doesn't
  // double-sync GXT DOM (runTask has its own explicit sync below).
  // Slice-38 (Cluster B): `__gxtRunTaskActive` canonical state migrated to
  // module-local `_gxtRunTaskActiveFlag` in `compile.ts`. Test-helper
  // writer-contract — routes through the bridge setter (reuses slice-36/37
  // test-helper-bridge-writer pattern). See `setRunTaskActive` doc in
  // gxt-bridge.ts.
  getGxtRenderer()?.compilePipeline.setRunTaskActive?.(true);
  let result: ReturnType<F>;
  try {
    result = run(callback);
  } catch (e) {
    // run() threw — same race as runAppend (see comment above): the
    // captured duplicate in _renderErrors would re-throw on the next
    // runTask() call. The user-visible throw is already escaping; clear
    // the duplicate so error-recovery tests can proceed cleanly.
    const clearErrors = (globalThis as any).__gxtClearRenderErrors;
    if (typeof clearErrors === 'function') clearErrors();
    throw e;
  } finally {
    // Slice-38 (Cluster B): see comment above; routes through bridge setter.
    getGxtRenderer()?.compilePipeline.setRunTaskActive?.(false);
  }
  // In GXT mode, flush pending DOM updates synchronously after the task
  // so test assertions see the updated DOM immediately
  // Advance managed-component generation so slot counters reset
  const resetMC = (globalThis as any).__resetManagedComponentCounters;
  if (typeof resetMC === 'function') resetMC();
  const syncNow = (globalThis as any).__gxtSyncDomNow;
  if (typeof syncNow === 'function') {
    syncNow();
  }
  // After the sync, clear any pending flags to prevent the setInterval(16ms)
  // fallback from firing another sync that could produce incorrect DOM.
  // The explicit sync above already handled all pending updates.
  // Slice-37 (Cluster B): `__gxtPendingSync` canonical state migrated to
  // module-local `_gxtPendingSyncFlag` in `compile.ts`. Test-helper
  // writer-contract — routes through the bridge setter.
  const _cpRT = getGxtRenderer()?.compilePipeline;
  _cpRT?.setPendingSync?.(false);
  // Slice-36 (Cluster B): `__gxtPendingSyncFromPropertyChange` canonical
  // state migrated to module-local `_gxtPendingSyncFromPropertyChangeFlag`
  // in `compile.ts`. Test-helper writer-contract — routes through the
  // bridge setter.
  _cpRT?.setPendingSyncFromPropertyChange?.(false);
  // Also clear tagsToRevalidate to prevent stale cells from re-evaluating
  const clearTags = (globalThis as any).__gxtClearTagsToRevalidate;
  if (typeof clearTags === 'function') clearTags();
  // Reset interval sync budget after an explicit runTask sync
  _cpRT?.resetIntervalBudget?.();
  // Phase 3 step 8: the runTask post-task flushRenderErrors() call was
  // deleted. Destroy-during-runTask errors used to require this drain
  // because __gxtDestroyUnclaimedPoolEntries Phase 3 captured throws into
  // _renderErrors without re-throwing. Now Phase 3 throws the first error
  // directly (manager.ts:~4250), which propagates through __gxtSyncDomNow's
  // __gxtDeferredSyncError re-throw (compile.ts:~5737) and escapes the
  // syncNow() call above naturally. No flush needed.
  return result;
}

export function runTaskNext(): Promise<void> {
  return new Promise((resolve) => {
    return next(resolve);
  });
}

// TODO: Find a better name 😎
export function runLoopSettled(event?: any): Promise<void> {
  return new Promise(function (resolve) {
    // Every 5ms, poll for the async thing to have finished
    let watcher = setInterval(() => {
      // If there are scheduled timers or we are inside of a run loop, keep polling
      if (_hasScheduledTimers() || _getCurrentRunLoop()) {
        return;
      }

      // Stop polling
      clearInterval(watcher);

      // Synchronously resolve the promise
      resolve(event);
    }, 5);
  });
}
