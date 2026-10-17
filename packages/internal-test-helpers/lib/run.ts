import { next, run, _getCurrentRunLoop, _hasScheduledTimers } from '@ember/runloop';
import { destroy } from '@glimmer/destroyable';
import { getGxtRenderer } from '@ember/-internals/gxt-backend/gxt-bridge';
import { gxtHarness } from './gxt-harness';

import { Promise } from 'rsvp';

export function runAppend(view: any): void {
  if (__GXT_MODE__) {
    gxtRunAppend(view);
    return;
  }
  run(view, 'appendTo', document.getElementById('qunit-fixture'));
}

// GXT: `runAppend` that suppresses the end-of-loop DOM sync during the initial
// render and syncs explicitly afterwards.
function gxtRunAppend(view: any): void {
  // Suppress the run loop's end-of-loop GXT DOM sync during initial render.
  // Property changes from component init mark a sync as pending, and syncing
  // mid-render would re-evaluate each-formulas with stale values (e.g. `[]`
  // instead of the actual collection). We sync explicitly below instead.
  getGxtRenderer()?.compilePipeline.setRunTaskActive?.(true);
  try {
    run(view, 'appendTo', document.getElementById('qunit-fixture'));
  } catch (e) {
    // gxt-backend captures a copy of a render error into its render-error
    // queue before rethrowing it. The caller already observes this throw, so
    // drop the queued copy; otherwise the next runTask() would rethrow it
    // and break error-recovery tests (`assert.throws(() => render(...))`
    // followed by `runTask(...)`).
    getGxtRenderer()?.compilePipeline.clearRenderErrors?.();
    throw e;
  } finally {
    getGxtRenderer()?.compilePipeline.setRunTaskActive?.(false);
  }
  // Keep the "pending sync from property change" flag only if the change came
  // from a `schedule('afterRender', cb)` callback (e.g. `didInsertElement`
  // queueing a `set` that must re-render before the test asserts). Property
  // changes made during init (e.g. Textarea's internal bindings) must not
  // trigger a full sync.
  const _cpAR = getGxtRenderer()?.compilePipeline;
  const afterRenderChanged = Boolean(_cpAR?.getAfterRenderPropertyChange?.());
  _cpAR?.setAfterRenderPropertyChange?.(false);
  if (!afterRenderChanged) {
    getGxtRenderer()?.compilePipeline.setPendingSyncFromPropertyChange?.(false);
  }
  // Flush pending DOM updates synchronously so test assertions see the
  // rendered DOM immediately; the flags set during that sync are cleared so a
  // fallback sync does not re-evaluate each-formulas with stale values.
  gxtHarness!.syncAfterRun(false);
  // Render errors are rethrown by the renderer within the render cycle that
  // produced them, so no flush is needed here.
}

export function runDestroy(toDestroy: any): void {
  if (toDestroy) {
    if (__GXT_MODE__) {
      gxtRunDestroy(toDestroy);
      return;
    }
    run(destroy, toDestroy);
  }
}

// GXT: `runDestroy` that tolerates "already destroyed" teardown errors and also
// destroys the class-based helper instances GXT tracks.
function gxtRunDestroy(toDestroy: any): void {
  try {
    run(destroy, toDestroy);
  } catch (e: any) {
    // Swallow "already destroyed" errors during test cleanup
    if (e && e.message && e.message.includes('after the owner has been destroyed')) {
      return;
    }
    throw e;
  }
  // In GXT mode, also destroy tracked class-based helper instances so their
  // `willDestroy` / `destroy` lifecycle runs. What a helper's `destroy` throws
  // fails the teardown, as an error of a helper's destruction does in Glimmer:
  // the first one is thrown once every other helper is destroyed and the
  // helper bookkeeping cleared.
  let failed = false;
  let failure: unknown;
  const helperInstances = getGxtRenderer()?.compilePipeline.getHelperInstances?.();
  if (Array.isArray(helperInstances) && helperInstances.length > 0) {
    for (const inst of helperInstances) {
      if (typeof inst.destroy === 'function' && !inst.isDestroyed && !inst.isDestroying) {
        try {
          inst.destroy();
        } catch (error) {
          if (!failed) {
            failed = true;
            failure = error;
          }
        }
      }
    }
    helperInstances.length = 0;
  }
  // Also clear the helper instance cache
  getGxtRenderer()?.compilePipeline.clearHelperCache?.();
  if (failed) throw failure;
}

export function runTask<F extends () => any>(callback: F): ReturnType<F> {
  if (__GXT_MODE__) {
    return gxtRunTask(callback);
  }
  return run(callback);
}

// GXT: `runTask` that syncs the GXT DOM explicitly after the task.
function gxtRunTask<F extends () => any>(callback: F): ReturnType<F> {
  // Mark that we're inside runTask so the run loop's end hook doesn't
  // double-sync the GXT DOM (runTask has its own explicit sync below).
  getGxtRenderer()?.compilePipeline.setRunTaskActive?.(true);
  let result: ReturnType<F>;
  try {
    result = run(callback);
  } catch (e) {
    // Drop the queued copy of the escaping error (see runAppend).
    getGxtRenderer()?.compilePipeline.clearRenderErrors?.();
    throw e;
  } finally {
    getGxtRenderer()?.compilePipeline.setRunTaskActive?.(false);
  }
  // Flush pending DOM updates synchronously so test assertions see the
  // updated DOM immediately, then clear the sync state (including the tags
  // queued for revalidation, so stale cells do not re-evaluate).
  gxtHarness!.syncAfterRun(true);
  // Errors thrown while destroying components during the sync are rethrown
  // by `syncDomNow()` above, so no render-error flush is needed here.
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
