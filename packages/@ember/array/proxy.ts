/**
@module @ember/array/proxy
*/

import {
  objectAt,
  alias,
  PROPERTY_DID_CHANGE,
  addArrayObserver,
  removeArrayObserver,
  replace,
  arrayContentDidChange,
  arrayContentWillChange,
  tagForProperty,
} from '@ember/-internals/metal';
import { get } from '@ember/object';
import type { PropertyDidChange } from '@ember/-internals/metal';
import { isObject } from '@ember/-internals/utils';
import EmberObject from '@ember/object';
import EmberArray, { type NativeArray } from '@ember/array';
import MutableArray from '@ember/array/mutable';
import { assert } from '@ember/debug';
import { setCustomTagFor } from '@glimmer/manager';
import {
  combine,
  consumeTag,
  validateTag,
  valueForTag,
  tagFor,
  type Tag,
  type Revision,
} from '@glimmer/validator';

function isMutable<T>(obj: T[] | EmberArray<T>): obj is T[] | MutableArray<T> {
  return Array.isArray(obj) || typeof (obj as MutableArray<T>).replace === 'function';
}

const ARRAY_OBSERVER_MAPPING = {
  willChange: '_arrangedContentArrayWillChange',
  didChange: '_arrangedContentArrayDidChange',
};

function customTagForArrayProxy(proxy: object, key: string) {
  assert('[BUG] Expected a proxy', proxy instanceof ArrayProxy);

  if (key === '[]') {
    proxy._revalidate();

    return proxy._arrTag!;
  } else if (key === 'length') {
    proxy._revalidate();

    return proxy._lengthTag!;
  }

  return tagFor(proxy, key);
}

/**
  An ArrayProxy wraps any other object that implements `Array` and/or
  `MutableArray,` forwarding all requests. This makes it very useful for
  a number of binding use cases or other cases where being able to swap
  out the underlying array is useful.

  A simple example of usage:

  ```javascript
  import { A } from '@ember/array';
  import ArrayProxy from '@ember/array/proxy';

  let pets = ['dog', 'cat', 'fish'];
  let ap = ArrayProxy.create({ content: A(pets) });

  ap.get('firstObject');                        // 'dog'
  ap.set('content', ['amoeba', 'paramecium']);
  ap.get('firstObject');                        // 'amoeba'
  ```

  This class can also be useful as a layer to transform the contents of
  an array, as they are accessed. This can be done by overriding
  `objectAtContent`:

  ```javascript
  import { A } from '@ember/array';
  import ArrayProxy from '@ember/array/proxy';

  let pets = ['dog', 'cat', 'fish'];
  let ap = ArrayProxy.create({
      content: A(pets),
      objectAtContent: function(idx) {
          return this.get('content').objectAt(idx).toUpperCase();
      }
  });

  ap.get('firstObject'); // . 'DOG'
  ```

  When overriding this class, it is important to place the call to
  `_super` *after* setting `content` so the internal observers have
  a chance to fire properly:

  ```javascript
  import { A } from '@ember/array';
  import ArrayProxy from '@ember/array/proxy';

  export default ArrayProxy.extend({
    init() {
      this.set('content', A(['dog', 'cat', 'fish']));
      this._super(...arguments);
    }
  });
  ```

  @class ArrayProxy
  @extends EmberObject
  @uses MutableArray
  @public
*/
interface ArrayProxy<T> extends MutableArray<T> {
  /**
    The content array. Must be an object that implements `Array` and/or
    `MutableArray.`

    @property content
    @type EmberArray
    @public
  */
  content: T[] | EmberArray<T> | NativeArray<T> | null;
  /**
    The array that the proxy pretends to be. In the default `ArrayProxy`
    implementation, this and `content` are the same. Subclasses of `ArrayProxy`
    can override this property to provide things like sorting and filtering.

    @property arrangedContent
    @public
  */
  arrangedContent: EmberArray<T> | null;
  /**
    Should actually retrieve the object at the specified index from the
    content. You can override this method in subclasses to transform the
    content item to something new.

    This method will only be called if content is non-`null`.

    @method objectAtContent
    @param {Number} idx The index to retrieve.
    @return {Object} the value or undefined if none found
    @public
  */
  objectAtContent(idx: number): T | undefined;
  /**
    Should actually replace the specified objects on the content array.
    You can override this method in subclasses to transform the content item
    into something new.

    This method will only be called if content is non-`null`.

    @method replaceContent
    @param {Number} idx The starting index
    @param {Number} amt The number of items to remove from the content.
    @param {Array} objects Optional array of objects to insert.
    @return {void}
    @public
  */
  replaceContent(idx: number, amt: number, objects?: T[]): void;

  create(init: { content: Array<T> }): ArrayProxy<T>;
}
class ArrayProxy<T> extends EmberObject implements PropertyDidChange {
  /*
    `this._objectsDirtyIndex` determines which indexes in the `this._objects`
    cache are dirty.

    If `this._objectsDirtyIndex === -1` then no indexes are dirty.
    Otherwise, an index `i` is dirty if `i >= this._objectsDirtyIndex`.

    Calling `objectAt` with a dirty index will cause the `this._objects`
    cache to be recomputed.
  */
  /** @internal */
  _objectsDirtyIndex = 0;
  /** @internal */
  _objects: null | T[] = null;

  /** @internal */
  _lengthDirty = true;
  /** @internal */
  _length = 0;

  /** @internal */
  _arrangedContent: EmberArray<T> | null = null;
  /** @internal */
  _arrangedContentIsUpdating = false;
  /** @internal */
  _arrangedContentTag: Tag | null = null;
  /** @internal */
  _arrangedContentRevision: Revision | null = null;
  /** @internal */
  _lengthTag: Tag | null = null;
  /** @internal */
  _arrTag: Tag | null = null;

  init(props: object | undefined) {
    super.init(props);

    setCustomTagFor(this, customTagForArrayProxy);
  }

  [PROPERTY_DID_CHANGE]() {
    this._revalidate();
  }

  willDestroy() {
    this._removeArrangedContentArrayObserver();
  }

  declare content: T[] | EmberArray<T> | NativeArray<T> | null;

  declare arrangedContent: EmberArray<T> | null;

  objectAtContent(idx: number) {
    let arrangedContent = get(this, 'arrangedContent');
    assert('[BUG] Called objectAtContent without content', arrangedContent);
    return objectAt<T>(arrangedContent, idx);
  }

  // See additional docs for `replace` from `MutableArray`:
  // https://api.emberjs.com/ember/release/classes/MutableArray/methods/replace?anchor=replace
  replace(idx: number, amt: number, objects?: T[]) {
    assert(
      'Mutating an arranged ArrayProxy is not allowed',
      get(this, 'arrangedContent') === get(this, 'content')
    );
    this.replaceContent(idx, amt, objects);
  }

  replaceContent(idx: number, amt: number, objects?: T[]) {
    let content = get(this, 'content');
    assert('[BUG] Called replaceContent without content', content);
    assert('Mutating a non-mutable array is not allowed', isMutable(content));
    replace<T>(content, idx, amt, objects);
  }

  // Overriding objectAt is not supported.
  objectAt(idx: number) {
    this._revalidate();

    if (this._objects === null) {
      this._objects = [];
    }

    if (this._objectsDirtyIndex !== -1 && idx >= this._objectsDirtyIndex) {
      let arrangedContent = get(this, 'arrangedContent');
      if (arrangedContent) {
        let length = (this._objects.length = get(arrangedContent, 'length'));

        for (let i = this._objectsDirtyIndex; i < length; i++) {
          // SAFETY: This is expected to only ever return an instance of T. In other words, there should
          // be no gaps in the array. Unfortunately, we can't actually assert for it since T could include
          // any types, including null or undefined.
          this._objects[i] = this.objectAtContent(i)!;
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
    let added: T[] | undefined;

    if (removedCount === 0) {
      return;
    } else if (removedCount < 0) {
      added = new Array(-removedCount);
      removedCount = 0;
    }

    let content = get(this, 'content');
    if (content) {
      assert('Mutating a non-mutable array is not allowed', isMutable(content));
      replace<T>(content, value, removedCount, added);

      this._invalidate();
    }
  }

  _updateArrangedContentArray(arrangedContent: EmberArray<T> | null) {
    let oldLength = this._objects === null ? 0 : this._objects.length;
    let newLength = arrangedContent ? get(arrangedContent, 'length') : 0;

    this._removeArrangedContentArrayObserver();
    arrayContentWillChange(this, 0, oldLength, newLength);

    this._invalidate();

    arrayContentDidChange(this, 0, oldLength, newLength, false);
    this._addArrangedContentArrayObserver(arrangedContent);
  }

  _addArrangedContentArrayObserver(arrangedContent: EmberArray<T> | null) {
    if (arrangedContent && !(arrangedContent as any).isDestroyed) {
      assert("Can't set ArrayProxy's content to itself", arrangedContent !== this);
      assert(
        `ArrayProxy expects a native Array, EmberArray, or ArrayProxy, but you passed ${typeof arrangedContent}`,
        (function (arr: unknown): arr is EmberArray<unknown> {
          return Array.isArray(arr) || EmberArray.detect(arr);
        })(arrangedContent)
      );
      assert(
        'ArrayProxy expected its contents to not be destroyed',
        !(arrangedContent as any).isDestroyed
      );

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

  _arrangedContentArrayDidChange(
    _proxy: unknown,
    idx: number,
    removedCnt: number,
    addedCnt: number
  ) {
    arrayContentWillChange(this, idx, removedCnt, addedCnt);

    let dirtyIndex = idx;
    if (dirtyIndex < 0) {
      let length = get(this._arrangedContent!, 'length');
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

    if (
      this._arrangedContentTag === null ||
      !validateTag(this._arrangedContentTag, this._arrangedContentRevision!)
    ) {
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

      let arrangedContentTag = (this._arrangedContentTag = tagFor(this, 'arrangedContent'));
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
  arrangedContent: alias('content'),
});

export default ArrayProxy;
