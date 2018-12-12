import { getDebugFunction, setDebugFunction } from '@ember/debug';

import { setupAssertionHelpers } from './assertion';
import { setupContainersCheck } from './containers';
import { setupDeprecationHelpers } from './deprecation';
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

  let originalModule = QUnit.module;

  QUnit.module = function(name: string, callback: any) {
    return originalModule(name, function(hooks) {
      setupContainersCheck(hooks);
      setupNamespacesCheck(hooks);
      setupRunLoopCheck(hooks);
      setupAssertionHelpers(hooks, env);
      setupDeprecationHelpers(hooks, env);
      setupWarningHelpers(hooks, env);

      callback(hooks);
    });
  };
}
