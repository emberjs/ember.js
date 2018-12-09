import { getDebugFunction, setDebugFunction } from '@ember/debug';

// @ts-ignore
import EmberDevTestHelperAssert from './index';

export interface Assertion {
  reset(): void;
  inject(): void;
  assert(): void;
  restore(): void;
}

export default function setupQUnit({ runningProdBuild }: { runningProdBuild: boolean }) {
  let assertion = new EmberDevTestHelperAssert({
    runningProdBuild,
    getDebugFunction,
    setDebugFunction,
  });

  let originalModule = QUnit.module;

  QUnit.module = function(name: string, _options: any) {
    if (typeof _options === 'function') {
      let callback = _options;

      return originalModule(name, function(hooks) {
        hooks.beforeEach(function() {
          assertion.reset();
          assertion.inject();
        });

        hooks.afterEach(function() {
          assertion.assert();
          assertion.restore();
        });

        callback(hooks);
      });
    }

    let options = _options || {};
    let originalSetup = options.setup || options.beforeEach || function() {};
    let originalTeardown = options.teardown || options.afterEach || function() {};

    delete options.setup;
    delete options.teardown;

    options.beforeEach = function() {
      assertion.reset();
      assertion.inject();

      return originalSetup.apply(this, arguments);
    };

    options.afterEach = function() {
      let result = originalTeardown.apply(this, arguments);

      assertion.assert();
      assertion.restore();

      return result;
    };

    return originalModule(name, options);
  };
}
