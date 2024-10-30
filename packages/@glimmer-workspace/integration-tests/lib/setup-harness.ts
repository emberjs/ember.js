/* eslint-disable no-console */
import { debug } from '@glimmer/validator';
import { autoRegister } from 'js-reporters';

export async function setupQunit() {
  const qunit = await import('qunit');
  await import('qunit/qunit/qunit.css');

  const runner = autoRegister();
  // @ts-expect-error qunit types don't expose "reporters"
  const tap = qunit.reporters.tap;
  tap.init(runner, { log: console.info });

  QUnit.config.urlConfig.push({
    id: 'smoke_tests',
    label: 'Enable Smoke Tests',
    tooltip: 'Enable Smoke Tests',
  });

  QUnit.config.urlConfig.push({
    id: 'ci',
    label: 'Enable CI Mode',
    tooltip: 'CI mode makes tests run faster by sacrificing UI responsiveness',
  });

  QUnit.config.urlConfig.push({
    id: 'enable_local_should_log',
    label: 'Trace Logging',
    tooltip: 'Enable LOCAL_SHOULD_LOG (extra debug logging info)',
  });

  QUnit.config.urlConfig.push({
    id: 'disable_local_debug',
    label: 'Disable Debug Assertions',
    tooltip: 'Disable LOCAL_DEBUG (debug assertions)',
  });

  await Promise.resolve();

  const qunitDiv = document.createElement('div');
  qunitDiv.id = 'qunit';
  const qunitFixtureDiv = document.createElement('div');
  qunitFixtureDiv.id = 'qunit-fixture';

  document.body.append(qunitDiv, qunitFixtureDiv);

  console.log(`[HARNESS] ci=${hasFlag('ci')}`);

  QUnit.testStart(() => {
    debug.resetTrackingTransaction?.();
  });

  if (!hasFlag('ci')) {
    // since all of our tests are synchronous, the QUnit
    // UI never has a chance to rerender / update. This
    // leads to a very long "white screen" when running
    // the tests
    //
    // this adds a very small amount of async, just to allow
    // the QUnit UI to rerender once per module completed
    const pause = () =>
      new Promise<void>((res) => {
        setTimeout(res, 1);
      });

    let start = performance.now();
    qunit.testDone(async () => {
      let gap = performance.now() - start;
      if (gap > 200) {
        await pause();
        start = performance.now();
      }
    });

    qunit.moduleDone(pause);
  }

  // @ts-expect-error missing in types, does exist: https://api.qunitjs.com/callbacks/QUnit.on/#the-testend-event
  QUnit.on('testEnd', (testEnd) => {
    if (testEnd.status === 'failed') {
      testEnd.errors.forEach((assertion: any) => {
        console.error(assertion.stack);
        // message: speedometer
        // actual: 75
        // expected: 88
        // stack: at dmc.test.js:12
      });
    }
  });

  qunit.done(({ failed }) => {
    if (failed > 0) {
      console.log('[HARNESS] fail');
    } else {
      console.log('[HARNESS] done');
    }
  });

  return {
    smokeTest: hasFlag('smoke_test'),
  };
}

function hasFlag(flag: string): boolean {
  let location = typeof window !== 'undefined' && window.location;
  return location && new RegExp(`[?&]${flag}`).test(location.search);
}
