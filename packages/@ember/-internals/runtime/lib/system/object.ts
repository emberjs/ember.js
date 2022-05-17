/**
@module @ember/object
*/

import { getFactoryFor } from '@ember/-internals/container';
import { symbol } from '@ember/-internals/utils';
import { addListener } from '@ember/-internals/metal';
import CoreObject from '@ember/object/core';
import Observable from '../mixins/observable';
import { assert } from '@ember/debug';
import { DEBUG } from '@glimmer/env';

/**
  `EmberObject` is the main base class for all Ember objects. It is a subclass
  of `CoreObject` with the `Observable` mixin applied. For details,
  see the documentation for each of these.

  @class EmberObject
  @extends CoreObject
  @uses Observable
  @public
*/
interface EmberObject extends CoreObject, Observable {}
class EmberObject extends CoreObject.extend(Observable) {
  get _debugContainerKey() {
    let factory = getFactoryFor(this);
    return factory !== undefined && factory.fullName;
  }
}

export default EmberObject;

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface FrameworkObject extends EmberObject {}
let FrameworkObject = class FrameworkObject extends EmberObject {};

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
