var _a;
export { getCachedValueFor as cacheFor } from '@ember/-internals/metal';
export { guidFor } from '@ember/-internals/utils';
import { addListener } from '@ember/-internals/metal';
import { assert } from '@ember/debug';
import { symbol } from '@ember/-internals/utils';
import { DEBUG } from '@glimmer/env';
import EmberObject from '.';
let FrameworkObject = class FrameworkObject extends EmberObject {};
if (DEBUG) {
  const INIT_WAS_CALLED = Symbol('INIT_WAS_CALLED');
  let ASSERT_INIT_WAS_CALLED = symbol('ASSERT_INIT_WAS_CALLED');
  FrameworkObject = class DebugFrameworkObject extends EmberObject {
    constructor() {
      super(...arguments);
      this[_a] = false;
    }
    init(properties) {
      super.init(properties);
      this[INIT_WAS_CALLED] = true;
    }
    [(_a = INIT_WAS_CALLED, ASSERT_INIT_WAS_CALLED)]() {
      assert(`You must call \`super.init(...arguments);\` or \`this._super(...arguments)\` when overriding \`init\` on a framework object. Please update ${this} to call \`super.init(...arguments);\` from \`init\` when using native classes or \`this._super(...arguments)\` when using \`EmberObject.extend()\`.`, this[INIT_WAS_CALLED]);
    }
  };
  addListener(FrameworkObject.prototype, 'init', null, ASSERT_INIT_WAS_CALLED);
}
export { FrameworkObject };