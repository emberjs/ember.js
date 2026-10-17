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
       * After a run-loop helper: flush pending DOM updates synchronously (with
       * the managed-component counters reset), then clear the sync flags and
       * the interval budget so the 16ms fallback flusher does not sync again
       * with stale values. `clearTagsToRevalidate` also drops the tags queued
       * for revalidation (runTask).
       */
      syncAfterRun(clearTagsToRevalidate: boolean) {
        const pipeline = getGxtRenderer()?.compilePipeline;
        pipeline?.resetManagedComponentCounters?.();
        pipeline?.syncDomNow?.();
        pipeline?.setPendingSync?.(false);
        pipeline?.setPendingSyncFromPropertyChange?.(false);
        if (clearTagsToRevalidate) {
          // Written by gxt itself.
          const clearTags = (globalThis as any).__gxtClearTagsToRevalidate;
          if (typeof clearTags === 'function') clearTags();
        }
        pipeline?.resetIntervalBudget?.();
      },
    }
  : undefined;
