import { next, run, _getCurrentRunLoop, _hasScheduledTimers } from '@ember/runloop';
import { destroy } from '@glimmer/destroyable';
import { flushRenderErrors } from '@glimmer/manager';

import { Promise } from 'rsvp';

export function runAppend(view: any): void {
  // Suppress the runloop onEnd sync during initial render. The runloop's onEnd
  // hook calls __gxtSyncDomNow when __gxtPendingSync is true. During initial
  // render, property change notifications from component init set
  // __gxtPendingSync=true, causing gxtSyncDom to re-evaluate each-formulas
  // with stale values (e.g., returning [] instead of the actual collection).
  // Using __gxtRunTaskActive tells onEnd to skip the sync.
  (globalThis as any).__gxtRunTaskActive = true;
  try {
    run(view, 'appendTo', document.getElementById('qunit-fixture'));
  } finally {
    (globalThis as any).__gxtRunTaskActive = false;
  }
  // After the initial render, reset property change flags. Property changes
  // during init are artifacts, not user-initiated changes.
  (globalThis as any).__gxtPendingSyncFromPropertyChange = false;
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
  (globalThis as any).__gxtPendingSync = false;
  (globalThis as any).__gxtPendingSyncFromPropertyChange = false;
  // Reset interval sync budget after an explicit sync
  const resetBudget = (globalThis as any).__gxtResetIntervalBudget;
  if (typeof resetBudget === 'function') resetBudget();
  // Re-throw any errors captured during rendering (e.g., component-not-found)
  flushRenderErrors();
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
        } catch { /* ignore */ }
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
  (globalThis as any).__gxtRunTaskActive = true;
  let result: ReturnType<F>;
  try {
    result = run(callback);
  } finally {
    (globalThis as any).__gxtRunTaskActive = false;
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
  (globalThis as any).__gxtPendingSync = false;
  (globalThis as any).__gxtPendingSyncFromPropertyChange = false;
  // Also clear tagsToRevalidate to prevent stale cells from re-evaluating
  const clearTags = (globalThis as any).__gxtClearTagsToRevalidate;
  if (typeof clearTags === 'function') clearTags();
  // Reset interval sync budget after an explicit runTask sync
  const resetBudget = (globalThis as any).__gxtResetIntervalBudget;
  if (typeof resetBudget === 'function') resetBudget();
  // Re-throw any errors captured during rendering/destruction
  flushRenderErrors();
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
