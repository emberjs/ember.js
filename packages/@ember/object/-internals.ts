export { getCachedValueFor as cacheFor } from '@ember/-internals/metal/lib/computed_cache';
export { guidFor } from '@ember/-internals/utils/lib/guid';

import { addListener } from '@ember/-internals/metal/lib/events';
import { assert } from '@ember/debug';
import { DEBUG } from '@glimmer/env';
import EmberObject from '.';

// Here we have runtime shenanigans to add debug-only errors to the class in dev builds.
// Those runtime shenanigans need matching type-level shenanigans.
// The `let` binding below creates `FrameworkObject` with a class expression,
// not the usual class declaration form.
// Without an explicit type annotation on that binding, TS gets stuck.
// TS would need to fully name the type produced by the class expression,
// and that type includes the `OWNER` symbol from `@glimmer/owner`.
//
// So we give the declaration an explicit type when assigning it the class expression,
// instead of relying on inference.
// Then TS does not need to name the `OWNER` property key from the super class,
// which avoids the private name shenanigans.

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface FrameworkObject extends EmberObject {}
let FrameworkObject: typeof EmberObject = class FrameworkObject extends EmberObject {};

if (DEBUG) {
  const INIT_WAS_CALLED = Symbol('INIT_WAS_CALLED');
  let ASSERT_INIT_WAS_CALLED = Symbol('ASSERT_INIT_WAS_CALLED');

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
