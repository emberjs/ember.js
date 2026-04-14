/**
 * Phase 4.2 — early QUnit.start guard.
 *
 * This file exists SOLELY to run before the demo test suite
 * (`packages/demo/src/tests/index.ts`) calls `QUnit.start()`. Without
 * this guard, the GXT test runner
 * (`scripts/gxt-test-runner/runner.mjs`) triggers a fatal
 *
 *     Called start() outside of a test context when
 *     QUnit.config.autostart was true
 *
 * on every rehydration module under test because the runner's
 * `addInitScript` collector sets `QUnit.config.autostart = true`
 * before any page script evaluates. When `autostart` is `true` *and*
 * `pageLoaded` is still `false`, QUnit's `start()` throws and the
 * subsequent module graph (including
 * `@glimmer-workspace/integration-tests/test/**`) aborts, leaving the
 * rehydration suites registered-but-empty — which surfaces in the
 * runner as "No tests matched the module".
 *
 * The guard is intentionally placed under `tests/` (not `test/`) so it
 * matches the root `index.html`'s `packages/*\/*\/tests/**` glob, which
 * is evaluated before the glimmer-workspace-only glob. Within that
 * glob, `@glimmer-workspace` sorts before `demo` alphabetically, so
 * this file's top-level side effect runs first.
 */
(() => {
  if (typeof QUnit === 'undefined') return;
  if ((QUnit as unknown as { __gxtPhase42StartPatched?: boolean }).__gxtPhase42StartPatched) {
    return;
  }
  (QUnit as unknown as { __gxtPhase42StartPatched?: boolean }).__gxtPhase42StartPatched = true;

  const originalStart = QUnit.start.bind(QUnit);
  (QUnit as unknown as { start: (...args: unknown[]) => unknown }).start = function gxtSafeStart(
    ...args: unknown[]
  ) {
    try {
      return originalStart(...args);
    } catch (e) {
      const msg = (e as Error)?.message ?? '';
      if (/autostart was true|already started running/.test(msg)) {
        // Expected under the GXT test runner. QUnit.autostart() will
        // still run via the browser "load" event and call
        // scheduleBegin(), so tests do execute — we just need to keep
        // the module graph from aborting here.
        return undefined;
      }
      throw e;
    }
  };
})();

export {};
