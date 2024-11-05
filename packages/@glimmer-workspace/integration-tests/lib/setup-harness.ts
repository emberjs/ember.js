/* eslint-disable no-console */
import type { Expand } from '@glimmer/interfaces';
import { debug } from '@glimmer/validator';
import { autoRegister } from 'js-reporters';
import { default as QUnit } from 'qunit';

export async function setupQunit() {
  const qunitLib: QUnit = await import('qunit');
  await import('qunit/qunit/qunit.css');

  const testing = Testing.withConfig(
    {
      id: 'smoke_tests',
      label: 'Smoke Tests',
      tooltip: 'Enable Smoke Tests',
    },
    {
      id: 'ci',
      label: 'CI Mode',
      tooltip:
        'CI mode emits tap output and makes tests run faster by sacrificing UI responsiveness',
    },
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
    }
  );

  const runner = autoRegister();

  testing.begin(() => {
    if (testing.config.ci) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const tap = qunitLib.reporters.tap;
      tap.init(runner, { log: console.info });
    }
  });

  await Promise.resolve();

  const qunitDiv = document.createElement('div');
  qunitDiv.id = 'qunit';
  const qunitFixtureDiv = document.createElement('div');
  qunitFixtureDiv.id = 'qunit-fixture';

  document.body.append(qunitDiv, qunitFixtureDiv);

  console.log(`[HARNESS] ci=${hasFlag('ci')}`);

  testing.testStart(() => {
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
    qunitLib.testDone(async () => {
      let gap = performance.now() - start;
      if (gap > 200) {
        await pause();
        start = performance.now();
      }
    });

    qunitLib.moduleDone(pause);
  }

  qunitLib.done(() => {
    console.log('[HARNESS] done');
  });

  return {
    smokeTest: hasFlag('smoke_test'),
  };
}

class Testing<Q extends typeof QUnit> {
  static withConfig<const C extends readonly UrlConfig[]>(...configs: C): Testing<WithConfig<C>> {
    return new Testing(withConfig(...configs));
  }

  readonly #qunit: Q;

  constructor(qunit: Q) {
    this.#qunit = qunit;
  }

  get config(): Q['config'] {
    return this.#qunit.config;
  }

  readonly begin = (begin: (details: QUnit.BeginDetails) => void | Promise<void>): void => {
    this.#qunit.begin(begin);
  };

  readonly testStart = (
    callback: (details: QUnit.TestStartDetails) => void | Promise<void>
  ): void => {
    this.#qunit.testStart(callback);
  };
}

function hasFlag(flag: string): boolean {
  return hasSpecificFlag(flag);
}

function hasSpecificFlag(flag: string): boolean {
  let location = typeof window !== 'undefined' && window.location;
  return location && new RegExp(`[?&]${flag}`).test(location.search);
}

// eslint-disable-next-line unused-imports/no-unused-vars
function getSpecificFlag(flag: string): string | undefined {
  let location = typeof window !== 'undefined' && window.location;
  if (!location) {
    return undefined;
  }

  const matches = new RegExp(`[?&]${flag}=([^&]*)`).exec(location.search);
  return matches ? matches[1] : undefined;
}

interface UrlConfig {
  id: string;
  label?: string | undefined;
  tooltip?: string | undefined;
  value?: string | string[] | { [key: string]: string } | undefined;
}

type WithConfig<C extends readonly UrlConfig[]> = typeof QUnit & {
  config: QUnit['config'] & {
    [P in C[number]['id']]: string | undefined;
  };
};

function withConfig<const C extends readonly UrlConfig[]>(...configs: C): Expand<WithConfig<C>> {
  for (let config of configs) {
    QUnit.config.urlConfig.push(config);
  }

  const index = QUnit.config.urlConfig.findIndex((c) => c.id === 'noglobals');
  if (index !== -1) {
    QUnit.config.urlConfig.splice(index, 1);
  }

  return QUnit as any;
}
