/**
@module @ember/object
*/

import { getFactoryFor } from '@ember/-internals/container';
import { symbol } from '@ember/-internals/utils';
import { addListener } from '@ember/-internals/metal';
import CoreObject from './core_object';
import Observable from '../mixins/observable';
import { assert, deprecate } from '@ember/debug';
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
export default class EmberObject extends CoreObject {
  get _debugContainerKey() {
    let factory = getFactoryFor(this);
    return factory !== undefined && factory.fullName;
  }
}

Observable.apply(EmberObject.prototype);

export let FrameworkObject;

FrameworkObject = class FrameworkObject extends CoreObject {
  get _debugContainerKey() {
    let factory = getFactoryFor(this);
    return factory !== undefined && factory.fullName;
  }
};

Observable.apply(FrameworkObject.prototype);

if (DEBUG) {
  let INIT_WAS_CALLED = symbol('INIT_WAS_CALLED');
  let WILL_DESTROY_WAS_CALLED = symbol('WILL_DESTROY_WAS_CALLED');
  let ASSERT_INIT_WAS_CALLED = symbol('ASSERT_INIT_WAS_CALLED');
  let DEPRECATE_WILL_DESTROY_WAS_CALLED = symbol('DEPRECATE_WILL_DESTROY_WAS_CALLED');

  FrameworkObject = class DebugFrameworkObject extends EmberObject {
    init() {
      super.init(...arguments);
      this[INIT_WAS_CALLED] = true;
    }

    willDestroy() {
      super.willDestroy(...arguments);
      this[WILL_DESTROY_WAS_CALLED] = true;
    }

    [ASSERT_INIT_WAS_CALLED]() {
      assert(
        `You must call \`super.init(...arguments);\` or \`this._super(...arguments)\` when overriding \`init\` on a framework object. Please update ${this} to call \`super.init(...arguments);\` from \`init\` when using native classes or \`this._super(...arguments)\` when using \`EmberObject.extend()\`.`,
        this[INIT_WAS_CALLED]
      );
    }

    [DEPRECATE_WILL_DESTROY_WAS_CALLED]() {
      deprecate(
        `You must call \`super.willDestroy(...arguments);\` or \`this._super(...arguments)\` when overriding \`willDestroy\` on a framework object. Please update ${this} to call \`super.willDestroy(...arguments);\` from \`willDestroy\` when using native classes or \`this._super(...arguments)\` when using \`EmberObject.extend()\`.`,
        this[WILL_DESTROY_WAS_CALLED],
        {
          id: 'component.will-destroy.super',
          until: '4.0.0',
          for: 'ember-source',
          since: { enabled: '3.27.0' },
        }
      );
    }
  };

  addListener(FrameworkObject.prototype, 'init', null, ASSERT_INIT_WAS_CALLED);
  addListener(FrameworkObject.prototype, 'willDestroy', null, DEPRECATE_WILL_DESTROY_WAS_CALLED);
}
