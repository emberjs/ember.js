/**
@module @ember/object/observable
*/
import { peekMeta } from '@ember/-internals/meta';
import { hasListeners, beginPropertyChanges, notifyPropertyChange, endPropertyChanges, addObserver, removeObserver } from '@ember/-internals/metal';
import { get, set, getProperties, setProperties } from '@ember/object';
import Mixin from '@ember/object/mixin';
import { assert } from '@ember/debug';
const Observable = Mixin.create({
  get(keyName) {
    return get(this, keyName);
  },
  getProperties(...args) {
    return getProperties(this, ...args);
  },
  set(keyName, value) {
    return set(this, keyName, value);
  },
  setProperties(hash) {
    return setProperties(this, hash);
  },
  /**
    Begins a grouping of property changes.
       You can use this method to group property changes so that notifications
    will not be sent until the changes are finished. If you plan to make a
    large number of changes to an object at one time, you should call this
    method at the beginning of the changes to begin deferring change
    notifications. When you are done making changes, call
    `endPropertyChanges()` to deliver the deferred change notifications and end
    deferring.
       @method beginPropertyChanges
    @return {Observable}
    @private
  */
  beginPropertyChanges() {
    beginPropertyChanges();
    return this;
  },
  /**
    Ends a grouping of property changes.
       You can use this method to group property changes so that notifications
    will not be sent until the changes are finished. If you plan to make a
    large number of changes to an object at one time, you should call
    `beginPropertyChanges()` at the beginning of the changes to defer change
    notifications. When you are done making changes, call this method to
    deliver the deferred change notifications and end deferring.
       @method endPropertyChanges
    @return {Observable}
    @private
  */
  endPropertyChanges() {
    endPropertyChanges();
    return this;
  },
  notifyPropertyChange(keyName) {
    notifyPropertyChange(this, keyName);
    return this;
  },
  addObserver(key, target, method, sync) {
    addObserver(this, key, target, method, sync);
    return this;
  },
  removeObserver(key, target, method, sync) {
    removeObserver(this, key, target, method, sync);
    return this;
  },
  /**
    Returns `true` if the object currently has observers registered for a
    particular key. You can use this method to potentially defer performing
    an expensive action until someone begins observing a particular property
    on the object.
       @method hasObserverFor
    @param {String} key Key to check
    @return {Boolean}
    @private
  */
  hasObserverFor(key) {
    return hasListeners(this, `${key}:change`);
  },
  incrementProperty(keyName, increment = 1) {
    assert('Must pass a numeric value to incrementProperty', !isNaN(parseFloat(String(increment))) && isFinite(increment));
    return set(this, keyName, (parseFloat(get(this, keyName)) || 0) + increment);
  },
  decrementProperty(keyName, decrement = 1) {
    assert('Must pass a numeric value to decrementProperty', (typeof decrement === 'number' || !isNaN(parseFloat(decrement))) && isFinite(decrement));
    return set(this, keyName, (get(this, keyName) || 0) - decrement);
  },
  toggleProperty(keyName) {
    return set(this, keyName, !get(this, keyName));
  },
  cacheFor(keyName) {
    let meta = peekMeta(this);
    return meta !== null ? meta.valueFor(keyName) : undefined;
  }
});
export default Observable;