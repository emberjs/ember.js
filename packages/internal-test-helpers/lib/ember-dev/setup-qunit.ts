import { getDebugFunction, setDebugFunction } from '@ember/debug';

// @ts-ignore
import { setupContainersCheck } from './containers';
import HooksCompat from './hooks-compat';
// @ts-ignore
import EmberDevTestHelperAssert from './index';
// @ts-ignore
import { setupNamespacesCheck } from './namespaces';
// @ts-ignore
import { setupRunLoopCheck } from './run-loop';

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

  function setupAssert(hooks: NestedHooks) {
    setupContainersCheck(hooks);
    setupNamespacesCheck(hooks);
    setupRunLoopCheck(hooks);

    hooks.beforeEach(function() {
      assertion.reset();
      assertion.inject();
    });

    hooks.afterEach(function() {
      assertion.assert();
      assertion.restore();
    });
  }

  let originalModule = QUnit.module;

  QUnit.module = function(name: string, _options: any) {
    if (typeof _options === 'function') {
      let callback = _options;

      return originalModule(name, function(hooks) {
        setupAssert(hooks);

        callback(hooks);
      });
    }

    let options = _options || {};
    let originalSetup = options.setup || options.beforeEach || function() {};
    let originalTeardown = options.teardown || options.afterEach || function() {};

    delete options.setup;
    delete options.teardown;

    let hooks = new HooksCompat();
    setupAssert(hooks);

    options.beforeEach = function() {
      hooks.runBeforeEach(QUnit.config.current.assert);

      return originalSetup.apply(this, arguments);
    };

    options.afterEach = function() {
      let result = originalTeardown.apply(this, arguments);

      hooks.runAfterEach(QUnit.config.current.assert);

      return result;
    };

    return originalModule(name, options);
  };
}
