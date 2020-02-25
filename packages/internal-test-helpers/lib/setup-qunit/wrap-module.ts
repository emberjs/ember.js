import { setupAssertionHelpers } from './module-hooks/assertion';
import { setupDeprecationHelpers } from './module-hooks/deprecation';
import { setupLeakContext } from './module-hooks/leak-context';
import { setupNamespacesCheck } from './module-hooks/namespaces';
import { setupObserversCheck } from './module-hooks/observers';
import { setupRunLoopCheck } from './module-hooks/run-loop';
import { DebugEnv } from './module-hooks/utils';
import { setupWarningHelpers } from './module-hooks/warning';

export type NestedCallback = (hooks: NestedHooks) => void;
export function wrapModule(module: QUnit['module'], env: DebugEnv): QUnit['module'] {
  return wrappedModule;

  function wrappedModule(this: QUnit, name: string, hooks?: Hooks, nested?: NestedCallback): void;
  function wrappedModule(name: string, nested?: NestedCallback): void;
  function wrappedModule(
    name: string,
    hooksOrNested?: Hooks | NestedCallback,
    maybeNested?: NestedCallback
  ): void {
    if (typeof hooksOrNested === 'function') {
      return module(name, wrapNested(hooksOrNested, env));
    }
    if (maybeNested !== undefined) {
      return module(name, hooksOrNested, wrapNested(maybeNested, env));
    }
    module(name);
  }
}

function wrapNested(
  nested: (hooks: NestedHooks) => void,
  env: DebugEnv
): (hooks: NestedHooks) => void {
  return hooks => {
    setupLeakContext(hooks);
    setupNamespacesCheck(hooks);
    setupObserversCheck(hooks);
    setupRunLoopCheck(hooks);
    setupAssertionHelpers(hooks, env);
    setupDeprecationHelpers(hooks, env);
    setupWarningHelpers(hooks, env);
    nested(hooks);
  };
}
