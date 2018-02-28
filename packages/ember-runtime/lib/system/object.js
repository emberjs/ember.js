/**
@module @ember/object
*/

import { FACTORY_FOR } from 'container';
import { symbol, OWNER } from 'ember-utils';
import { on, descriptor } from 'ember-metal';
import CoreObject from './core_object';
import Observable from '../mixins/observable';
import { assert } from 'ember-debug';
import { DEBUG } from 'ember-env-flags';

let OVERRIDE_OWNER = symbol('OVERRIDE_OWNER');

/**
  `EmberObject` is the main base class for all Ember objects. It is a subclass
  of `CoreObject` with the `Observable` mixin applied. For details,
  see the documentation for each of these.

  @class EmberObject
  @extends CoreObject
  @uses Observable
  @public
*/
const EmberObject = CoreObject.extend(Observable, {
  _debugContainerKey: descriptor({
    enumerable: false,
    get() {
      let factory = FACTORY_FOR.get(this);

      return factory !== undefined && factory.fullName;
    }
  }),

  [OWNER]: descriptor({
    enumerable: false,
    get() {
      if (this[OVERRIDE_OWNER]) {
        return this[OVERRIDE_OWNER];
      }

      let factory = FACTORY_FOR.get(this);

      return factory !== undefined && factory.owner;
    },

    // we need a setter here largely to support
    // folks calling `owner.ownerInjection()` API
    set(value) {
      this[OVERRIDE_OWNER] = value;
    }
  })
});

EmberObject.toString = () => 'Ember.Object';

export let FrameworkObject = EmberObject;

if (DEBUG) {
  let INIT_WAS_CALLED = symbol('INIT_WAS_CALLED');
  let ASSERT_INIT_WAS_CALLED = symbol('ASSERT_INIT_WAS_CALLED');

  FrameworkObject = EmberObject.extend({
    init() {
      this._super(...arguments);
      this[INIT_WAS_CALLED] = true;
    },

    [ASSERT_INIT_WAS_CALLED]: on('init', function() {
      assert(
        `You must call \`this._super(...arguments);\` when overriding \`init\` on a framework object. Please update ${this} to call \`this._super(...arguments);\` from \`init\`.`,
        this[INIT_WAS_CALLED]
      );
    })
  });
}

export default EmberObject;
