export { getCachedValueFor as cacheFor } from '@ember/-internals/metal';
export { guidFor } from '@ember/-internals/utils';

import { addListener } from '@ember/-internals/metal';
import { assert } from '@ember/debug';
import { symbol } from '@ember/-internals/utils';
import { DEBUG } from '@glimmer/env';
import EmberObject from '.';

// Here we have runtime shenanigans to add debug-only errors to the class in dev
// builds. Those runtime shenanigans produce the need for type-level shenanigans
// to match: if we just assign without an explicit type annotation on the `let`
// binding below for `FrameworkObject`, TS gets stuck because this creates
// `FrameworkObject` with a class expression (rather than the usual class
// declaration form). That in turn means TS needs to be able to fully name the
// type produced by the class expression, which includes the `OWNER` symbol from
// `@glimmer/owner`.
//
// By explicitly giving the declaration a type when assigning it the class
// expression, instead of relying on inference, TS no longer needs to name the
// `OWNER` property key from the super class, eliminating the private name
// shenanigans.

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface FrameworkObject extends EmberObject {}
let FrameworkObject: typeof EmberObject = class FrameworkObject extends EmberObject {};

if (DEBUG) {
  const INIT_WAS_CALLED = Symbol('INIT_WAS_CALLED');
  let ASSERT_INIT_WAS_CALLED = symbol('ASSERT_INIT_WAS_CALLED');

  FrameworkObject = class DebugFrameworkObject extends EmberObject {
    [INIT_WAS_CALLED] = false;

    init(properties: object | undefined) {
      super.init(properties);
      this[INIT_WAS_CALLED] = true;
    }

    [ASSERT_INIT_WAS_CALLED]() {
      assert(
        `You must call \`super.init(...arguments);\` or \`this._super(...arguments)\` when overriding \`init\` on a framework object. Please update ${this} to call \`super.init(...arguments);\` from \`init\` when using native classes or \`this._super(...arguments)\` when using \`EmberObject.extend()\`.`,
        this[INIT_WAS_CALLED]
      );
    }
  };

  addListener(FrameworkObject.prototype, 'init', null, ASSERT_INIT_WAS_CALLED);
}

export { FrameworkObject };
