import { _resetRenderers } from '@ember/-internals/glimmer';
import { getDebugFunction, leakTracker, setDebugFunction } from '@ember/debug';
import { setupAssert } from './assert';
import { createConsoleReport } from './console-report';
import { wrapModule } from './wrap-module';
import { wrapSkip } from './wrap-skip';

declare global {
  interface QUnit {
    urlParams: any;
  }
}

const TEST_REGEXP = /[_-]test$/;

export interface Delegate {
  moduleNames(): string[];
  loadModule(name: string): void;
  params: {
    package?: string;
    skipPackage?: string;
    forceskip?: boolean;
  };
}

export interface Adapter {
  setupAssert(assert: Assert): void;
  wrapSkip(skip: QUnit['skip']): QUnit['skip'];
  wrapModule(skip: QUnit['module']): QUnit['module'];
  isRunning(): boolean;
  onBegin(): void;
  onTestDone(details: { failed: number }): void;
  onDone(results: { runtime: number }): void;
  loadTests(): void;
  leakTest?: (assert: Assert) => void;
}

export default function createAdapter({ loadModule, moduleNames, params }: Delegate): Adapter {
  const packageRegexp = buildPackageRegex(params.package);
  const skipPackageRegexp = buildPackageRegex(params.skipPackage);
  const reporter = createConsoleReport();
  let testsRunning = false;

  let leakTest: ((assert: Assert) => Promise<void>) | undefined;
  if (leakTracker !== undefined) {
    const { leaks } = leakTracker;
    leakTest = assert => {
      // TODO figure out why we need this
      // why do we leak renderers?
      _resetRenderers();
      [
        'UserInterface',
        'expectAssertion',
        'ignoreAssertion',
        'expectNoDeprecation',
        'expectDeprecation',
        'expectDeprecationAsync',
        'ignoreDeprecation',
        'expectNoWarning',
        'expectWarning',
        'ignoreWarning',
      ].forEach(key => {
        delete self[key];
      });
      return Promise.resolve()
        .then(leaks)
        .then(leaked => {
          assert.deepEqual(
            leaked.map(
              ({ moduleName, testName, testId }) => `${moduleName} ${testName} testId=${testId}`
            ),
            []
          );
        });
    };
  }
  return {
    setupAssert,
    wrapSkip(skip) {
      return wrapSkip(skip, params.forceskip);
    },
    wrapModule(module) {
      return wrapModule(module, {
        getDebugFunction,
        setDebugFunction,
      });
    },
    isRunning() {
      return testsRunning;
    },
    onBegin() {
      testsRunning = true;
      reporter.begin();
    },
    onTestDone({ failed }) {
      reporter.testDone(failed > 0);
    },
    onDone({ runtime }) {
      reporter.done(runtime);
    },
    loadTests() {
      moduleNames()
        .filter(moduleName => {
          if (packageRegexp !== undefined && !packageRegexp.test(moduleName)) {
            return false;
          }
          if (skipPackageRegexp !== undefined && skipPackageRegexp.test(moduleName)) {
            return false;
          }
          return TEST_REGEXP.test(moduleName);
        })
        .forEach(moduleName => loadModule(moduleName));
    },
    leakTest,
  };
}

function buildPackageRegex(packages?: string) {
  return packages ? new RegExp('^(' + packages.split(',').join('|') + ')/') : undefined;
}
