import { leakTracker } from '@ember/debug';

export function setupLeakContext(hooks: NestedHooks) {
  if (leakTracker === undefined) return;
  const { setContext } = leakTracker;
  hooks.beforeEach(function() {
    const {
      testName,
      testId,
      module: { name: moduleName },
    } = QUnit.config.current;
    setContext({ moduleName, testName, testId });
  });
}
