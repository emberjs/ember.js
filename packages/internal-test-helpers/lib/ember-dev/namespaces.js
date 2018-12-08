import { run } from '@ember/runloop';
import { NAMESPACES, NAMESPACES_BY_ID } from '@ember/-internals/metal';

export default class NamespacesAssert {
  constructor(env) {
    this.env = env;
  }

  reset() {}

  inject() {}

  assert() {
    let { assert } = QUnit.config.current;

    if (NAMESPACES.length > 0) {
      assert.ok(false, 'Should not have any NAMESPACES after tests');
      run(() => {
        let namespaces = NAMESPACES.slice();
        for (let i = 0; i < namespaces.length; i++) {
          namespaces[i].destroy();
        }
      });
    }
    let keys = Object.keys(NAMESPACES_BY_ID);
    if (keys.length > 0) {
      assert.ok(false, 'Should not have any NAMESPACES_BY_ID after tests');
      for (let i = 0; i < keys.length; i++) {
        delete NAMESPACES_BY_ID[keys[i]];
      }
    }
  }

  restore() {}
}
