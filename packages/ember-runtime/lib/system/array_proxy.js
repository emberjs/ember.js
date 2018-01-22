/**
@module @ember/array
*/

import {
  get,
  computed,
  observer,
  alias
} from 'ember-metal';
import {
  isArray
} from '../utils';
import EmberObject from './object';
import MutableArray from '../mixins/mutable_array';
import {
  addArrayObserver,
  removeArrayObserver,
  objectAt
} from '../mixins/array';
import { assert } from 'ember-debug';

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

  @class ArrayProxy
  @extends EmberObject
  @uses MutableArray
  @public
*/
export default EmberObject.extend(MutableArray, {
  init() {
    this._super(...arguments);
    this._cache = null;
    this._dirtyStart = 0;
    this._arrangedContent = null;
    this._addArrangedContentArrayObsever();
  },

  willDestroy() {
    this._removeArrangedContentArrayObsever();
  },

  /**
    The content array. Must be an object that implements `Array` and/or
    `MutableArray.`

    @property content
    @type EmberArray
    @public
  */
  content: null,

  /**
   The array that the proxy pretends to be. In the default `ArrayProxy`
   implementation, this and `content` are the same. Subclasses of `ArrayProxy`
   can override this property to provide things like sorting and filtering.

   @property arrangedContent
   @public
  */
  arrangedContent: alias('content'),

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
  },

  replace(idx, amt, objects) {
    assert('Mutating an arranged ArrayProxy is not allowed', get(this, 'arrangedContent') === get(this, 'content') );
    this.replaceContent(idx, amt, objects);
  },

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
  },

  // Overriding objectAt is not supported.
  objectAt(idx) {
    this._sync();
    return this._cache[idx];
  },

  // Overriding length is not supported.
  length: computed(function() {
    this._sync();
    return this._cache.length;
  }),

  _arrangedContentDidChange: observer('arrangedContent', function() {
    let oldLength = this._cache === null ? 0 : this._cache.length;
    let arrangedContent = get(this, 'arrangedContent');
    let newLength = arrangedContent ? get(arrangedContent, 'length') : 0;

    this._removeArrangedContentArrayObsever();
    this.arrayContentWillChange(0, oldLength, newLength);
    this._dirtyStart = 0;
    this.arrayContentDidChange(0, oldLength, newLength);
    this._addArrangedContentArrayObsever();
  }),

  _addArrangedContentArrayObsever() {
    let arrangedContent = get(this, 'arrangedContent');

    if (arrangedContent) {
      assert('Can\'t set ArrayProxy\'s content to itself', arrangedContent !== this);
      assert(`ArrayProxy expects an Array or ArrayProxy, but you passed ${typeof arrangedContent}`,
        isArray(arrangedContent) || arrangedContent.isDestroyed);

      addArrayObserver(arrangedContent, this, {
        willChange: '_arrangedContentArrayWillChange',
        didChange: '_arrangedContentArrayDidChange'
      });

      this._arrangedContent = arrangedContent;
    }
  },

  _removeArrangedContentArrayObsever() {
    if (this._arrangedContent) {
      removeArrayObserver(this._arrangedContent, this, {
        willChange: '_arrangedContentArrayWillChange',
        didChange: '_arrangedContentArrayDidChange'
      });
    }
  },

  _arrangedContentArrayWillChange() {},

  _arrangedContentArrayDidChange(proxy, idx, removedCnt, addedCnt) {
    this.arrayContentWillChange(idx, removedCnt, addedCnt);

    if (this._dirtyStart === undefined) {
      this._dirtyStart = idx;
    } else {
      if (this._dirtyStart > idx) {
        this._dirtyStart = idx;
      }
    }

    this.arrayContentDidChange(idx, removedCnt, addedCnt);
  },

  _sync() {
    if (this._cache === null) {
      this._cache = [];
    }

    if (this._dirtyStart !== undefined) {
      let arrangedContent = get(this, 'arrangedContent');

      if (arrangedContent) {
        let length = get(arrangedContent, 'length');

        this._cache.length = length;

        for (let i = this._dirtyStart; i < length; i++) {
          this._cache[i] = this.objectAtContent(i);
        }
      } else {
        this._cache.length = 0;
      }

      this._dirtyStart = undefined;
    }
  }
});
