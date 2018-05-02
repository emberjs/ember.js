import { run } from '@ember/runloop';
import { NAMESPACES } from 'ember-metal';

function NamespacesAssert(env) {
  this.env = env;
}

NamespacesAssert.prototype = {
  reset: function() {},
  inject: function() {},
  assert: function() {
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
  },
  restore: function() {},
};

export default NamespacesAssert;
