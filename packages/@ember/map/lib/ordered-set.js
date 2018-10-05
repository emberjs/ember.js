import { assert, deprecate } from '@ember/debug';
import { guidFor } from '@ember/-internals/utils';
import { copyNull } from './utils';
import { ORDERED_SET } from '@ember/deprecated-features';

/**
  This class is used internally by Ember and Ember Data.
  Please do not use it at this time. We plan to clean it up
  and add many tests soon.

  @class OrderedSet
  @namespace Ember
  @constructor
  @private
  @deprecated
*/
let __OrderedSet__, OrderedSet;
/**
 * This is exported so it can be used by the OrderedSet library.
 * This is private do not use it.
 @private
 */

if (ORDERED_SET) {
  __OrderedSet__ = class __OrderedSet__ {
    constructor() {
      this.clear();
    }
    /**
    @method create
    @static
    @return {Ember.OrderedSet}
    @private
  */
    static create() {
      let Constructor = this;
      return new Constructor();
    }

    /**
    @method clear
    @private
  */
    clear() {
      this.presenceSet = Object.create(null);
      this.list = [];
      this.size = 0;
    }

    /**
    @method add
    @param obj
    @param guid (optional, and for internal use)
    @return {Ember.OrderedSet}
    @private
  */
    add(obj, _guid) {
      let guid = _guid || guidFor(obj);
      let presenceSet = this.presenceSet;
      let list = this.list;

      if (presenceSet[guid] !== true) {
        presenceSet[guid] = true;
        this.size = list.push(obj);
      }

      return this;
    }

    /**
    @since 1.8.0
    @method delete
    @param obj
    @param _guid (optional and for internal use only)
    @return {Boolean}
    @private
  */
    delete(obj, _guid) {
      let guid = _guid || guidFor(obj);
      let presenceSet = this.presenceSet;
      let list = this.list;

      if (presenceSet[guid] === true) {
        delete presenceSet[guid];
        let index = list.indexOf(obj);
        if (index > -1) {
          list.splice(index, 1);
        }
        this.size = list.length;
        return true;
      } else {
        return false;
      }
    }

    /**
    @method isEmpty
    @return {Boolean}
    @private
  */
    isEmpty() {
      return this.size === 0;
    }

    /**
    @method has
    @param obj
    @return {Boolean}
    @private
  */
    has(obj) {
      if (this.size === 0) {
        return false;
      }

      let guid = guidFor(obj);
      let presenceSet = this.presenceSet;

      return presenceSet[guid] === true;
    }

    /**
    @method forEach
    @param {Function} fn
    @param self
    @private
  */
    forEach(fn /*, ...thisArg*/) {
      assert(`${Object.prototype.toString.call(fn)} is not a function`, typeof fn === 'function');

      if (this.size === 0) {
        return;
      }

      let list = this.list;

      if (arguments.length === 2) {
        for (let i = 0; i < list.length; i++) {
          fn.call(arguments[1], list[i]);
        }
      } else {
        for (let i = 0; i < list.length; i++) {
          fn(list[i]);
        }
      }
    }

    /**
    @method toArray
    @return {Array}
    @private
  */
    toArray() {
      return this.list.slice();
    }

    /**
    @method copy
    @return {Ember.OrderedSet}
    @private
  */
    copy() {
      let Constructor = this.constructor;
      let set = new Constructor();

      set.presenceSet = copyNull(this.presenceSet);
      set.list = this.toArray();
      set.size = this.size;

      return set;
    }
  };

  OrderedSet = class OrderedSet extends __OrderedSet__ {
    constructor() {
      super();
      deprecate('Use of @ember/OrderedSet is deprecated. Please use native `Map` instead', false, {
        id: 'ember-map-deprecation',
        until: '3.5.0',
      });
    }
  };
}

export { __OrderedSet__ };
export default OrderedSet;
