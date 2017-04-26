/**
@module ember
@submodule ember-runtime
*/

import { peekFactoryManager } from 'container';
import { symbol } from 'ember-utils';
import { on, descriptor } from 'ember-metal';
import CoreObject from './core_object';
import Observable from '../mixins/observable';
import { assert } from 'ember-debug';
import { DEBUG } from 'ember-env-flags';

let DEBUG_CONTAINER_KEY_OVERRIDE = symbol('DEBUG_CONTAINER_KEY_OVERRIDE');

/**
  `Ember.Object` is the main base class for all Ember objects. It is a subclass
  of `Ember.CoreObject` with the `Ember.Observable` mixin applied. For details,
  see the documentation for each of these.

  @class Object
  @namespace Ember
  @extends Ember.CoreObject
  @uses Ember.Observable
  @public
*/
const EmberObject = CoreObject.extend(Observable, {
  _debugContainerKey: descriptor({
    get() {
      if (this[DEBUG_CONTAINER_KEY_OVERRIDE]) {
        return this[DEBUG_CONTAINER_KEY_OVERRIDE];
      }

      let factoryManager = peekFactoryManager(this);
      return factoryManager && factoryManager.fullName;
    },

    set(value) {
      this[DEBUG_CONTAINER_KEY_OVERRIDE] = value;
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
