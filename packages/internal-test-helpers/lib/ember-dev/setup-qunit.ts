import { getOnerror, setOnerror } from '@ember/-internals/error-handling';
import { DEBUG } from '@glimmer/env';
import { resetTracking } from '@glimmer/validator';

declare global {
  interface Assert {
    rejects(promise: Promise<any>, expected?: string | RegExp, message?: string): Promise<any>;

    throwsAssertion(block: () => any, expected?: string | RegExp, message?: string): any;
    rejectsAssertion(
      promise: Promise<any>,
      expected?: string | RegExp,
      message?: string
    ): Promise<any>;
  }
}

export default function setupQUnit() {
  QUnit.assert.rejects = async function (
    promise: Promise<any>,
    expected?: RegExp | string,
    message?: string
  ) {
    let error: unknown;
    let prevOnError = getOnerror();

    setOnerror((e: Error) => {
      error = e;
    });

    try {
      await promise;
    } catch (e) {
      error = e;
    }

    QUnit.assert.throws(
      () => {
        if (error) {
          throw error;
        }
      },
      expected,
      message
    );

    setOnerror(prevOnError);
  };

  QUnit.assert.throwsAssertion = function (
    block: () => any,
    expected?: string | RegExp,
    message?: string
  ) {
    if (!DEBUG) {
      QUnit.assert.ok(true, 'Assertions disabled in production builds.');
      return;
    }

    return QUnit.assert.throws(block, expected, message);
  };

  QUnit.assert.rejectsAssertion = async function (
    promise: Promise<any>,
    expected?: string | RegExp,
    message?: string
  ) {
    if (!DEBUG) {
      QUnit.assert.ok(true, 'Assertions disabled in production builds.');

      return promise;
    }

    await QUnit.assert.rejects(promise, expected, message);
  };
}

// since all of the glimmer-vm tests are synchronous, the QUnit UI never has a
// chance to rerender / update. This leads to a very long "white screen" when
// running the tests
//
// this adds a very small amount of async, just to allow the QUnit UI to
// rerender once per module completed
QUnit.moduleDone(
  () =>
    new Promise<void>((res) => {
      setTimeout(res, 0);
    })
);

QUnit.testStart(() => {
  resetTracking();
  // Defensive: clear any stale render errors leaked from a prior test. The
  // gxt-backend's `_renderErrors` queue is process-global. Most paths flush
  // or clear it (runAppend / runTask catches, flushRenderErrors), but a few
  // silent-capture sites (e.g. flushAfterInsertQueue, __gxtDestroyUnclaimed-
  // PoolEntries Phase 3, cumulative destroy-time captures) can enqueue an
  // error AFTER the test that produced it has already escaped its
  // synchronous throw via assert.throws. Without this guard, the next test
  // sees its first runTask/flushRenderErrors re-throw the stale error,
  // causing a "Died on test #N" cumulative-state failure that does not
  // reproduce in module isolation. Tests like
  // `Errors thrown during render: it can recover resets the transaction
  // when an error is thrown during initial render` are the canonical
  // victims of this leak.
  const clearRenderErrs = (globalThis as any).__gxtClearRenderErrors;
  if (typeof clearRenderErrs === 'function') clearRenderErrs();
});

const uiFlags = [
  {
    id: 'enable_internals_logging',
    label: 'Log Deep Internals',
    tooltip: 'Logs internals that are used in the development of the trace logs',
  },

  {
    id: 'enable_trace_logging',
    label: 'Trace Logs',
    tooltip: 'Trace logs emit information about the internal VM state',
  },

  {
    id: 'enable_subtle_logging',
    label: '+ Subtle',
    tooltip:
      'Subtle logs include unchanged information and other details not necessary for normal debugging',
  },

  {
    id: 'enable_trace_explanations',
    label: '+ Explanations',
    tooltip: 'Also explain the trace logs',
  },
];

for (let flag of uiFlags) {
  QUnit.config.urlConfig.push(flag);
}
