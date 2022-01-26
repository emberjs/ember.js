import { NAMESPACES, NAMESPACES_BY_ID } from '@ember/-internals/metal';
import { run } from '@ember/runloop';

export function setupNamespacesCheck(hooks: NestedHooks): void {
  hooks.afterEach(function () {
    let { assert } = QUnit.config.current;

    if (NAMESPACES.length > 0) {
      assert.ok(false, 'Should not have any NAMESPACES after tests');
      run(() => {
        let namespaces = NAMESPACES.slice();
        for (let namespace of namespaces) {
          namespace.destroy();
        }
      });
    }
    let keys = Object.keys(NAMESPACES_BY_ID);
    if (keys.length > 0) {
      assert.ok(false, 'Should not have any NAMESPACES_BY_ID after tests');
      for (let key of keys) {
        delete NAMESPACES_BY_ID[key];
      }
    }
  });
}
