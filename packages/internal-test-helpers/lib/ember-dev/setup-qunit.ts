import { getDebugFunction, setDebugFunction } from '@ember/debug';

import { setupAssertionHelpers } from './assertion';
import { setupContainersCheck } from './containers';
import { setupDeprecationHelpers } from './deprecation';
import HooksCompat from './hooks-compat';
// @ts-ignore
import { setupNamespacesCheck } from './namespaces';
import { setupRunLoopCheck } from './run-loop';
import { DebugEnv } from './utils';
import { setupWarningHelpers } from './warning';

export default function setupQUnit({ runningProdBuild }: { runningProdBuild: boolean }) {
  let env = {
    runningProdBuild,
    getDebugFunction,
    setDebugFunction,
  } as DebugEnv;

  function setupAssert(hooks: NestedHooks) {
    setupContainersCheck(hooks);
    setupNamespacesCheck(hooks);
    setupRunLoopCheck(hooks);
    setupAssertionHelpers(hooks, env);
    setupDeprecationHelpers(hooks, env);
    setupWarningHelpers(hooks, env);
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
