/**
@module @ember/array/proxy
*/
import { objectAt, alias, PROPERTY_DID_CHANGE, addArrayObserver, removeArrayObserver, replace, arrayContentDidChange, arrayContentWillChange, tagForProperty } from '@ember/-internals/metal';
import { get } from '@ember/object';
import { isObject } from '@ember/-internals/utils';
import EmberObject from '@ember/object';
import EmberArray from '@ember/array';
import MutableArray from '@ember/array/mutable';
import { assert } from '@ember/debug';
import { setCustomTagFor } from '@glimmer/manager';
import { combine, consumeTag, validateTag, valueForTag, tagFor } from '@glimmer/validator';
function isMutable(obj) {
  return Array.isArray(obj) || typeof obj.replace === 'function';
}
const ARRAY_OBSERVER_MAPPING = {
  willChange: '_arrangedContentArrayWillChange',
  didChange: '_arrangedContentArrayDidChange'
};
function customTagForArrayProxy(proxy, key) {
  assert('[BUG] Expected a proxy', proxy instanceof ArrayProxy);
  if (key === '[]') {
    proxy._revalidate();
    return proxy._arrTag;
  } else if (key === 'length') {
    proxy._revalidate();
    return proxy._lengthTag;
  }
  return tagFor(proxy, key);
}
class ArrayProxy extends EmberObject {
  constructor() {
    super(...arguments);
    /*
      `this._objectsDirtyIndex` determines which indexes in the `this._objects`
      cache are dirty.
             If `this._objectsDirtyIndex === -1` then no indexes are dirty.
      Otherwise, an index `i` is dirty if `i >= this._objectsDirtyIndex`.
             Calling `objectAt` with a dirty index will cause the `this._objects`
      cache to be recomputed.
    */
    /** @internal */
    this._objectsDirtyIndex = 0;
    /** @internal */
    this._objects = null;
    /** @internal */
    this._lengthDirty = true;
    /** @internal */
    this._length = 0;
    /** @internal */
    this._arrangedContent = null;
    /** @internal */
    this._arrangedContentIsUpdating = false;
    /** @internal */
    this._arrangedContentTag = null;
    /** @internal */
    this._arrangedContentRevision = null;
    /** @internal */
    this._lengthTag = null;
    /** @internal */
    this._arrTag = null;
  }
  init(props) {
    super.init(props);
    setCustomTagFor(this, customTagForArrayProxy);
  }
  [PROPERTY_DID_CHANGE]() {
    this._revalidate();
  }
  willDestroy() {
    this._removeArrangedContentArrayObserver();
  }
  objectAtContent(idx) {
    let arrangedContent = get(this, 'arrangedContent');
    assert('[BUG] Called objectAtContent without content', arrangedContent);
    return objectAt(arrangedContent, idx);
  }
  // See additional docs for `replace` from `MutableArray`:
  // https://api.emberjs.com/ember/release/classes/MutableArray/methods/replace?anchor=replace
  replace(idx, amt, objects) {
    assert('Mutating an arranged ArrayProxy is not allowed', get(this, 'arrangedContent') === get(this, 'content'));
    this.replaceContent(idx, amt, objects);
  }
  replaceContent(idx, amt, objects) {
    let content = get(this, 'content');
    assert('[BUG] Called replaceContent without content', content);
    assert('Mutating a non-mutable array is not allowed', isMutable(content));
    replace(content, idx, amt, objects);
  }
  // Overriding objectAt is not supported.
  objectAt(idx) {
    this._revalidate();
    if (this._objects === null) {
      this._objects = [];
    }
    if (this._objectsDirtyIndex !== -1 && idx >= this._objectsDirtyIndex) {
      let arrangedContent = get(this, 'arrangedContent');
      if (arrangedContent) {
        let length = this._objects.length = get(arrangedContent, 'length');
        for (let i = this._objectsDirtyIndex; i < length; i++) {
          // SAFETY: This is expected to only ever return an instance of T. In other words, there should
          // be no gaps in the array. Unfortunately, we can't actually assert for it since T could include
          // any types, including null or undefined.
          this._objects[i] = this.objectAtContent(i);
        }
      } else {
        this._objects.length = 0;
      }
      this._objectsDirtyIndex = -1;
    }
    return this._objects[idx];
  }
  // Overriding length is not supported.
  get length() {
    this._revalidate();
    if (this._lengthDirty) {
      let arrangedContent = get(this, 'arrangedContent');
      this._length = arrangedContent ? get(arrangedContent, 'length') : 0;
      this._lengthDirty = false;
    }
    assert('[BUG] _lengthTag is not set', this._lengthTag);
    consumeTag(this._lengthTag);
    return this._length;
  }
  set length(value) {
    let length = this.length;
    let removedCount = length - value;
    let added;
    if (removedCount === 0) {
      return;
    } else if (removedCount < 0) {
      added = new Array(-removedCount);
      removedCount = 0;
    }
    let content = get(this, 'content');
    if (content) {
      assert('Mutating a non-mutable array is not allowed', isMutable(content));
      replace(content, value, removedCount, added);
      this._invalidate();
    }
  }
  _updateArrangedContentArray(arrangedContent) {
    let oldLength = this._objects === null ? 0 : this._objects.length;
    let newLength = arrangedContent ? get(arrangedContent, 'length') : 0;
    this._removeArrangedContentArrayObserver();
    arrayContentWillChange(this, 0, oldLength, newLength);
    this._invalidate();
    arrayContentDidChange(this, 0, oldLength, newLength, false);
    this._addArrangedContentArrayObserver(arrangedContent);
  }
  _addArrangedContentArrayObserver(arrangedContent) {
    if (arrangedContent && !arrangedContent.isDestroyed) {
      assert("Can't set ArrayProxy's content to itself", arrangedContent !== this);
      assert(`ArrayProxy expects a native Array, EmberArray, or ArrayProxy, but you passed ${typeof arrangedContent}`, function (arr) {
        return Array.isArray(arr) || EmberArray.detect(arr);
      }(arrangedContent));
      assert('ArrayProxy expected its contents to not be destroyed', !arrangedContent.isDestroyed);
      addArrayObserver(arrangedContent, this, ARRAY_OBSERVER_MAPPING);
      this._arrangedContent = arrangedContent;
    }
  }
  _removeArrangedContentArrayObserver() {
    if (this._arrangedContent) {
      removeArrayObserver(this._arrangedContent, this, ARRAY_OBSERVER_MAPPING);
    }
  }
  _arrangedContentArrayWillChange() {}
  _arrangedContentArrayDidChange(_proxy, idx, removedCnt, addedCnt) {
    arrayContentWillChange(this, idx, removedCnt, addedCnt);
    let dirtyIndex = idx;
    if (dirtyIndex < 0) {
      let length = get(this._arrangedContent, 'length');
      dirtyIndex += length + removedCnt - addedCnt;
    }
    if (this._objectsDirtyIndex === -1 || this._objectsDirtyIndex > dirtyIndex) {
      this._objectsDirtyIndex = dirtyIndex;
    }
    this._lengthDirty = true;
    arrayContentDidChange(this, idx, removedCnt, addedCnt, false);
  }
  _invalidate() {
    this._objectsDirtyIndex = 0;
    this._lengthDirty = true;
  }
  _revalidate() {
    if (this._arrangedContentIsUpdating === true) return;
    if (this._arrangedContentTag === null || !validateTag(this._arrangedContentTag, this._arrangedContentRevision)) {
      let arrangedContent = this.get('arrangedContent');
      if (this._arrangedContentTag === null) {
        // This is the first time the proxy has been setup, only add the observer
        // don't trigger any events
        this._addArrangedContentArrayObserver(arrangedContent);
      } else {
        this._arrangedContentIsUpdating = true;
        this._updateArrangedContentArray(arrangedContent);
        this._arrangedContentIsUpdating = false;
      }
      let arrangedContentTag = this._arrangedContentTag = tagFor(this, 'arrangedContent');
      this._arrangedContentRevision = valueForTag(this._arrangedContentTag);
      if (isObject(arrangedContent)) {
        this._lengthTag = combine([arrangedContentTag, tagForProperty(arrangedContent, 'length')]);
        this._arrTag = combine([arrangedContentTag, tagForProperty(arrangedContent, '[]')]);
      } else {
        this._lengthTag = this._arrTag = arrangedContentTag;
      }
    }
  }
}
ArrayProxy.reopen(MutableArray, {
  arrangedContent: alias('content')
});
export default ArrayProxy;