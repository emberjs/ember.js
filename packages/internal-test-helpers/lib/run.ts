import { next, run, _getCurrentRunLoop, _hasScheduledTimers } from '@ember/runloop';
import { destroy } from '@glimmer/destroyable';
import { flushRenderErrors } from '@glimmer/manager';

import { Promise } from 'rsvp';

export function runAppend(view: any): void {
  run(view, 'appendTo', document.getElementById('qunit-fixture'));
  // In GXT mode, flush pending DOM updates synchronously after append
  // so test assertions see the rendered DOM immediately
  const syncNow = (globalThis as any).__gxtSyncDomNow;
  if (typeof syncNow === 'function') {
    syncNow();
  }
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
  const result = run(callback);
  // In GXT mode, flush pending DOM updates synchronously after the task
  // so test assertions see the updated DOM immediately
  const syncNow = (globalThis as any).__gxtSyncDomNow;
  if (typeof syncNow === 'function') {
    syncNow();
  }
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
