import { run } from '@ember/runloop';
import {
  getGxtRenderer,
  getAmbientOwner,
  setAmbientOwner,
} from '@ember/-internals/gxt-backend/gxt-bridge';

/**
 * The GXT steps of the test cases' teardown and of the run helpers, shared by
 * the test-case classes and `run.ts`; `undefined` in classic builds. A
 * module-level value instead of bridge calls inside the test-case methods:
 * rollup keeps every binding a test-case method refers to (the classes escape
 * into `moduleFor`), even from a folded `__GXT_MODE__` branch, which would keep
 * gxt-backend in the classic test build.
 */
export const gxtHarness = __GXT_MODE__
  ? {
      /** Destroy the tracked component instances (fires their teardown hooks). */
      cleanupActiveComponents() {
        getGxtRenderer()?.compilePipeline.cleanupActiveComponents?.();
      },

      /**
       * Destroy the custom modifiers still alive after the components were
       * torn down, so `destroyModifier` fires during teardown as in the
       * Glimmer VM (which destroys modifiers synchronously with their
       * element): first the queued destroys, then every remaining active
       * instance, each exactly once. Also drops an ambient owner that is
       * being destroyed, so the next test does not see it.
       */
      teardownModifiers() {
        // What a `destroyModifier` throws fails the teardown, as an error of a
        // modifier's destruction does in Glimmer: the first one is thrown once
        // every other modifier is destroyed and the ambient owner reset.
        let failed = false;
        let failure: unknown;
        const destroyModifier = (manager: any, instance: any): void => {
          try {
            manager.destroyModifier(instance);
          } catch (error) {
            if (!failed) {
              failed = true;
              failure = error;
            }
          }
        };
        const pendingDestroys = getGxtRenderer()?.compilePipeline.getPendingModifierDestroys?.();
        if (pendingDestroys && pendingDestroys.length > 0) {
          const toFlush = pendingDestroys.splice(0) as any[];
          for (const entry of toFlush) {
            if (!entry.cached.pendingDestroy) continue;
            if (
              entry.isCustom &&
              entry.cached.manager?.destroyModifier &&
              !entry.cached.instance?.__gxtModDestroyed
            ) {
              destroyModifier(entry.cached.manager, entry.cached.instance);
              if (entry.cached.instance) entry.cached.instance.__gxtModDestroyed = true;
            }
            // Modifier destroyables are already cleaned up by gxt-backend's
            // own teardown path.
            const elCache = entry.cache?.get(entry.element);
            if (elCache) {
              elCache.delete(entry.modKey);
              if (elCache.size === 0) entry.cache.delete(entry.element);
            }
          }
        }
        // Also destroy any custom modifiers that are still active (their
        // formula destructors might not have fired during cleanup).
        const modMgr = getGxtRenderer()?.compilePipeline.getManagers?.()?.modifier;
        if (modMgr?._updatedInstances) {
          for (const inst of modMgr._updatedInstances) {
            if (inst?.__gxtModManager?.destroyModifier && !inst.__gxtModDestroyed) {
              destroyModifier(inst.__gxtModManager, inst);
              inst.__gxtModDestroyed = true;
            }
          }
          modMgr._updatedInstances.clear();
        }

        if (getAmbientOwner()?.isDestroyed || getAmbientOwner()?.isDestroying) {
          setAmbientOwner(null);
        }
        if (failed) throw failure;
      },

      /** Clear the pending-sync flags so a sync does not leak into the next test. */
      resetSyncFlags() {
        const pipeline = getGxtRenderer()?.compilePipeline;
        pipeline?.setPendingSync?.(false);
        pipeline?.setPendingSyncFromPropertyChange?.(false);
      },

      /**
       * Drop queued render errors. Errors such as backtracking assertions are
       * caught by `assert.rejectsAssertion` but also queued by gxt-backend, and
       * the queued copy would otherwise rethrow later.
       */
      clearRenderErrors() {
        getGxtRenderer()?.compilePipeline.clearRenderErrors?.();
      },

      /**
       * Run `render`, the initial render of a test (`runAppend`'s `appendTo`,
       * a rendering test case's root render), in a run loop, and return what
       * it returns. The run loop's end-of-loop DOM sync is suppressed during
       * the render, and the DOM is synced explicitly after it.
       */
      runRender<T>(render: () => T): T {
        // Suppress the run loop's end-of-loop GXT DOM sync during initial render.
        // Property changes from component init mark a sync as pending, and syncing
        // mid-render would re-evaluate each-formulas with stale values (e.g. `[]`
        // instead of the actual collection). We sync explicitly below instead.
        getGxtRenderer()?.compilePipeline.setRunTaskActive?.(true);
        let result: T;
        try {
          result = run(render);
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
        return result;
      },

      /**
       * After a run-loop helper: flush pending DOM updates synchronously (with
       * the managed-component counters reset), then clear the sync flags and
       * the interval budget so the 16ms fallback flusher does not sync again
       * with stale values. `clearTagsToRevalidate` also drops the tags queued
       * for revalidation (runTask).
       */
      syncAfterRun(clearTagsToRevalidate: boolean) {
        const pipeline = getGxtRenderer()?.compilePipeline;
        pipeline?.resetManagedComponentCounters?.();
        // What the sync throws (an error of the update it renders) reaches the
        // caller of the helper, after the sync state is cleared.
        try {
          pipeline?.syncDomNow?.();
        } finally {
          pipeline?.setPendingSync?.(false);
          pipeline?.setPendingSyncFromPropertyChange?.(false);
          if (clearTagsToRevalidate) {
            // Written by gxt itself.
            const clearTags = (globalThis as any).__gxtClearTagsToRevalidate;
            if (typeof clearTags === 'function') clearTags();
          }
          pipeline?.resetIntervalBudget?.();
        }
      },
    }
  : undefined;
