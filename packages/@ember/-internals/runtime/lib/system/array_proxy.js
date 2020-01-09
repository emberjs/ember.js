/**
@module @ember/array
*/

import {
  get,
  objectAt,
  alias,
  PROPERTY_DID_CHANGE,
  addArrayObserver,
  removeArrayObserver,
  replace,
  getChainTagsForKey,
} from '@ember/-internals/metal';
import EmberObject from './object';
import { isArray, MutableArray } from '../mixins/array';
import { assert } from '@ember/debug';
import { combine, validate, value } from '@glimmer/validator';

const ARRAY_OBSERVER_MAPPING = {
  willChange: '_arrangedContentArrayWillChange',
  didChange: '_arrangedContentArrayDidChange',
};

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
export default class ArrayProxy extends EmberObject {
  init() {
    super.init(...arguments);

    /*
      `this._objectsDirtyIndex` determines which indexes in the `this._objects`
      cache are dirty.

      If `this._objectsDirtyIndex === -1` then no indexes are dirty.
      Otherwise, an index `i` is dirty if `i >= this._objectsDirtyIndex`.

      Calling `objectAt` with a dirty index will cause the `this._objects`
      cache to be recomputed.
    */
    this._objectsDirtyIndex = 0;
    this._objects = null;

    this._lengthDirty = true;
    this._length = 0;

    this._arrangedContent = null;

    this._arrangedContentIsUpdating = false;
    this._arrangedContentTag = combine(getChainTagsForKey(this, 'arrangedContent'));
    this._arrangedContentRevision = value(this._arrangedContentTag);

    this._addArrangedContentArrayObserver();
  }

  willDestroy() {
    this._removeArrangedContentArrayObserver();
  }

  /**
    The content array. Must be an object that implements `Array` and/or
    `MutableArray.`

    @property content
    @type EmberArray
    @public
  */

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
  objectAtContent(idx) {
    return objectAt(get(this, 'arrangedContent'), idx);
  }

  // See additional docs for `replace` from `MutableArray`:
  // https://api.emberjs.com/ember/release/classes/MutableArray/methods/replace?anchor=replace
  replace(idx, amt, objects) {
    assert(
      'Mutating an arranged ArrayProxy is not allowed',
      get(this, 'arrangedContent') === get(this, 'content')
    );
    this.replaceContent(idx, amt, objects);
  }

  /**
    Should actually replace the specified objects on the content array.
    You can override this method in subclasses to transform the content item
    into something new.

    This method will only be called if content is non-`null`.

    @method replaceContent
    @param {Number} idx The starting index
    @param {Number} amt The number of items to remove from the content.
    @param {EmberArray} objects Optional array of objects to insert or null if no
      objects.
    @return {void}
    @public
  */
  replaceContent(idx, amt, objects) {
    get(this, 'content').replace(idx, amt, objects);
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
        let length = (this._objects.length = get(arrangedContent, 'length'));

        for (let i = this._objectsDirtyIndex; i < length; i++) {
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
      replace(content, value, removedCount, added);

      this._invalidate();
    }
  }

  [PROPERTY_DID_CHANGE]() {
    this._revalidate();
  }

  _updateArrangedContentArray() {
    let oldLength = this._objects === null ? 0 : this._objects.length;
    let arrangedContent = get(this, 'arrangedContent');
    let newLength = arrangedContent ? get(arrangedContent, 'length') : 0;

    this._removeArrangedContentArrayObserver();
    this.arrayContentWillChange(0, oldLength, newLength);

    this._invalidate();

    this.arrayContentDidChange(0, oldLength, newLength);
    this._addArrangedContentArrayObserver();
  }

  _addArrangedContentArrayObserver() {
    let arrangedContent = get(this, 'arrangedContent');
    if (arrangedContent && !arrangedContent.isDestroyed) {
      assert("Can't set ArrayProxy's content to itself", arrangedContent !== this);
      assert(
        `ArrayProxy expects an Array or ArrayProxy, but you passed ${typeof arrangedContent}`,
        isArray(arrangedContent) || arrangedContent.isDestroyed
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

  _arrangedContentArrayDidChange(proxy, idx, removedCnt, addedCnt) {
    this.arrayContentWillChange(idx, removedCnt, addedCnt);

    let dirtyIndex = idx;
    if (dirtyIndex < 0) {
      let length = get(this._arrangedContent, 'length');
      dirtyIndex += length + removedCnt - addedCnt;
    }

    if (this._objectsDirtyIndex === -1 || this._objectsDirtyIndex > dirtyIndex) {
      this._objectsDirtyIndex = dirtyIndex;
    }

    this._lengthDirty = true;

    this.arrayContentDidChange(idx, removedCnt, addedCnt);
  }

  _invalidate() {
    this._objectsDirtyIndex = 0;
    this._lengthDirty = true;
  }

  _revalidate() {
    if (
      !this._arrangedContentIsUpdating &&
      !validate(this._arrangedContentTag, this._arrangedContentRevision)
    ) {
      this._arrangedContentIsUpdating = true;
      this._updateArrangedContentArray();
      this._arrangedContentIsUpdating = false;

      this._arrangedContentTag = combine(getChainTagsForKey(this, 'arrangedContent'));
      this._arrangedContentRevision = value(this._arrangedContentTag);
    }
  }
}

ArrayProxy.reopen(MutableArray, {
  /**
    The array that the proxy pretends to be. In the default `ArrayProxy`
    implementation, this and `content` are the same. Subclasses of `ArrayProxy`
    can override this property to provide things like sorting and filtering.

    @property arrangedContent
    @public
  */
  arrangedContent: alias('content'),
});
