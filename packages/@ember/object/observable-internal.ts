/**
@module @ember/object/observable
*/

import { peekMeta } from '@ember/-internals/meta/lib/meta';
import { hasListeners } from '@ember/-internals/metal/lib/events';
import {
  beginPropertyChanges,
  notifyPropertyChange,
  endPropertyChanges,
} from '@ember/-internals/metal/lib/property_events';
import { addObserver, removeObserver } from '@ember/-internals/metal/lib/observer';
import { get } from '@ember/-internals/metal/lib/property_get';
import { set } from '@ember/-internals/metal/lib/property_set';
import getProperties from '@ember/-internals/metal/lib/get_properties';
import setProperties from '@ember/-internals/metal/lib/set_properties';

import { InternalMixin } from '@ember/object/mixin-internal';
import { assert } from '@ember/debug';

export type ObserverMethod<Target, Sender> =
  | keyof Target
  | ((this: Target, sender: Sender, key: string, value: any, rev: number) => void);

/**
  The internal counterpart to the public `Observable` mixin. Ember's own
  internals apply this so that they do not trigger the deprecation that the
  public mixin emits. The public API documentation lives on the public copy.

  @internal
*/
interface InternalObservable {
  get<K extends keyof this>(key: K): this[K];
  get(key: string): unknown;

  getProperties<L extends Array<keyof this>>(list: L): { [Key in L[number]]: this[Key] };
  getProperties<L extends Array<keyof this>>(...list: L): { [Key in L[number]]: this[Key] };
  getProperties<L extends string[]>(list: L): { [Key in L[number]]: unknown };
  getProperties<L extends string[]>(...list: L): { [Key in L[number]]: unknown };

  // NOT TYPE SAFE!
  set<K extends keyof this, T extends this[K]>(key: K, value: T): T;
  set<T>(key: string, value: T): T;

  // NOT TYPE SAFE!
  setProperties<K extends keyof this, P extends { [Key in K]: this[Key] }>(hash: P): P;
  setProperties<T extends Record<string, unknown>>(hash: T): T;

  notifyPropertyChange(keyName: string): this;

  addObserver<Target>(key: keyof this, target: Target, method: ObserverMethod<Target, this>): this;
  addObserver(key: keyof this, method: ObserverMethod<this, this>): this;

  removeObserver<Target>(
    key: keyof this,
    target: Target,
    method: ObserverMethod<Target, this>
  ): this;
  removeObserver(key: keyof this, method: ObserverMethod<this, this>): this;

  // NOT TYPE SAFE!
  incrementProperty(keyName: keyof this, increment?: number): number;

  // NOT TYPE SAFE!
  decrementProperty(keyName: keyof this, decrement?: number): number;

  // NOT TYPE SAFE!
  toggleProperty(keyName: keyof this): boolean;

  cacheFor<K extends keyof this>(key: K): unknown;
}
const InternalObservable = InternalMixin.create({
  get(keyName: string) {
    return get(this, keyName);
  },

  getProperties(...args: string[]) {
    return getProperties(this, ...args);
  },

  set(keyName: string, value: unknown) {
    return set(this, keyName, value);
  },

  setProperties(hash: object) {
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

  notifyPropertyChange(keyName: string) {
    notifyPropertyChange(this, keyName);
    return this;
  },

  addObserver(
    key: string,
    target: object | Function | null,
    method?: string | Function,
    sync?: boolean
  ) {
    addObserver(this, key, target, method, sync);
    return this;
  },

  removeObserver(
    key: string,
    target: object | Function | null,
    method?: string | Function,
    sync?: boolean
  ) {
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
  hasObserverFor(key: string) {
    return hasListeners(this, `${key}:change`);
  },

  incrementProperty(keyName: string, increment = 1) {
    assert(
      'Must pass a numeric value to incrementProperty',
      !isNaN(parseFloat(String(increment))) && isFinite(increment)
    );
    return set(this, keyName, (parseFloat(get(this, keyName)) || 0) + increment);
  },

  decrementProperty(keyName: string, decrement = 1) {
    assert(
      'Must pass a numeric value to decrementProperty',
      (typeof decrement === 'number' || !isNaN(parseFloat(decrement))) && isFinite(decrement)
    );
    return set(this, keyName, (get(this, keyName) || 0) - decrement);
  },

  toggleProperty(keyName: string) {
    return set(this, keyName, !get(this, keyName));
  },

  cacheFor(keyName: string) {
    let meta = peekMeta(this);
    return meta !== null ? meta.valueFor(keyName) : undefined;
  },
});

export default InternalObservable;
