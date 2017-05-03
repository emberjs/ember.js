import {
  get,
  computed,
  _beforeObserver,
  observer,
  beginPropertyChanges,
  endPropertyChanges,
  alias
} from 'ember-metal';
import {
  isArray
} from '../utils';
import EmberObject from './object';
import MutableArray from '../mixins/mutable_array';
import Enumerable from '../mixins/enumerable';
import {
  addArrayObserver,
  removeArrayObserver,
  objectAt
} from '../mixins/array';
import { assert, Error as EmberError } from 'ember-debug';

/**
@module ember
@submodule ember-runtime
*/

const OUT_OF_RANGE_EXCEPTION = 'Index out of range';
const EMPTY = [];

function K() { return this; }


/**
  An ArrayProxy wraps any other object that implements `Ember.Array` and/or
  `Ember.MutableArray,` forwarding all requests. This makes it very useful for
  a number of binding use cases or other cases where being able to swap
  out the underlying array is useful.

  A simple example of usage:

  ```javascript
  let pets = ['dog', 'cat', 'fish'];
  let ap = Ember.ArrayProxy.create({ content: Ember.A(pets) });

  ap.get('firstObject');                        // 'dog'
  ap.set('content', ['amoeba', 'paramecium']);
  ap.get('firstObject');                        // 'amoeba'
  ```

  This class can also be useful as a layer to transform the contents of
  an array, as they are accessed. This can be done by overriding
  `objectAtContent`:

  ```javascript
  let pets = ['dog', 'cat', 'fish'];
  let ap = Ember.ArrayProxy.create({
      content: Ember.A(pets),
      objectAtContent: function(idx) {
          return this.get('content').objectAt(idx).toUpperCase();
      }
  });

  ap.get('firstObject'); // . 'DOG'
  ```

  @class ArrayProxy
  @namespace Ember
  @extends Ember.Object
  @uses Ember.MutableArray
  @public
*/
export default EmberObject.extend(MutableArray, {

  /**
    The content array. Must be an object that implements `Ember.Array` and/or
    `Ember.MutableArray.`

    @property content
    @type Ember.Array
    @private
  */
  content: Ember.A(),

  /**
   The array that the proxy pretends to be. In the default `ArrayProxy`
   implementation, this and `content` are the same. Subclasses of `ArrayProxy`
   can override this property to provide things like sorting and filtering.

   @property arrangedContent
   @private
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

  /**
    Should actually replace the specified objects on the content array.
    You can override this method in subclasses to transform the content item
    into something new.

    This method will only be called if content is non-`null`.

    @method replaceContent
    @param {Number} idx The starting index
    @param {Number} amt The number of items to remove from the content.
    @param {Array} objects Optional array of objects to insert or null if no
      objects.
    @return {void}
    @private
  */
  replaceContent(idx, amt, objects) {
    get(this, 'content').replace(idx, amt, objects);
  },

  /**
    Invoked when the content property is about to change. Notifies observers that the
    entire array content will change.

    @private
    @method _contentWillChange
  */
  _contentWillChange: _beforeObserver('content', function() {
    this._teardownContent();
  }),

  _teardownContent() {
    let content = get(this, 'content');

    if (content) {
      removeArrayObserver(content, this, {
        willChange: 'contentArrayWillChange',
        didChange: 'contentArrayDidChange'
      });
    }
  },

  /**
    Override to implement content array `willChange` observer.

    @method contentArrayWillChange

    @param {Ember.Array} contentArray the content array
    @param {Number} start starting index of the change
    @param {Number} removeCount count of items removed
    @param {Number} addCount count of items added
    @private
  */
  contentArrayWillChange: K,
  /**
    Override to implement content array `didChange` observer.

    @method contentArrayDidChange

    @param {Ember.Array} contentArray the content array
    @param {Number} start starting index of the change
    @param {Number} removeCount count of items removed
    @param {Number} addCount count of items added
    @private
  */
  contentArrayDidChange: K,

  /**
    Invoked when the content property changes. Notifies observers that the
    entire array content has changed.

    @private
    @method _contentDidChange
  */
  _contentDidChange: observer('content', function() {
    let content = get(this, 'content');

    assert('Can\'t set ArrayProxy\'s content to itself', content !== this);

    this._setupContent();
  }),

  _setupContent() {
    let content = get(this, 'content');

    if (content) {
      assert(`ArrayProxy expects an Array or Ember.ArrayProxy, but you passed ${typeof content}`, isArray(content) || content.isDestroyed);

      addArrayObserver(content, this, {
        willChange: 'contentArrayWillChange',
        didChange: 'contentArrayDidChange'
      });
    }
  },

  _arrangedContentWillChange: _beforeObserver('arrangedContent', function() {
    let arrangedContent = get(this, 'arrangedContent');
    let len = arrangedContent ? get(arrangedContent, 'length') : 0;

    this.arrangedContentArrayWillChange(this, 0, len, undefined);
    this.arrangedContentWillChange(this);

    this._teardownArrangedContent(arrangedContent);
  }),

  _arrangedContentDidChange: observer('arrangedContent', function() {
    let arrangedContent = get(this, 'arrangedContent');
    let len = arrangedContent ? get(arrangedContent, 'length') : 0;

    assert('Can\'t set ArrayProxy\'s content to itself', arrangedContent !== this);

    this._setupArrangedContent();

    this.arrangedContentDidChange(this);
    this.arrangedContentArrayDidChange(this, 0, undefined, len);
  }),

  _setupArrangedContent() {
    let arrangedContent = get(this, 'arrangedContent');

    if (arrangedContent) {
      assert(`ArrayProxy expects an Array or Ember.ArrayProxy, but you passed ${typeof arrangedContent}`,
        isArray(arrangedContent) || arrangedContent.isDestroyed);

      addArrayObserver(arrangedContent, this, {
        willChange: 'arrangedContentArrayWillChange',
        didChange: 'arrangedContentArrayDidChange'
      });
    }
  },

  _teardownArrangedContent() {
    let arrangedContent = get(this, 'arrangedContent');

    if (arrangedContent) {
      removeArrayObserver(arrangedContent, this, {
        willChange: 'arrangedContentArrayWillChange',
        didChange: 'arrangedContentArrayDidChange'
      });
    }
  },

  arrangedContentWillChange: K,
  arrangedContentDidChange: K,

  objectAt(idx) {
    return get(this, 'content') && this.objectAtContent(idx);
  },

  length: computed(function() {
    let arrangedContent = get(this, 'arrangedContent');
    return arrangedContent ? get(arrangedContent, 'length') : 0;
    // No dependencies since Enumerable notifies length of change
  }),

  _replace(idx, amt, objects) {
    let content = get(this, 'content');
    assert(`The content property of ${this.constructor} should be set before modifying it`, content);
    if (content) {
      this.replaceContent(idx, amt, objects);
    }

    return this;
  },

  replace() {
    if (get(this, 'arrangedContent') === get(this, 'content')) {
      this._replace(...arguments);
    } else {
      throw new EmberError('Using replace on an arranged ArrayProxy is not allowed.');
    }
  },

  _insertAt(idx, object) {
    if (idx > get(this, 'content.length')) {
      throw new EmberError(OUT_OF_RANGE_EXCEPTION);
    }

    this._replace(idx, 0, [object]);
    return this;
  },

  insertAt(idx, object) {
    if (get(this, 'arrangedContent') === get(this, 'content')) {
      return this._insertAt(idx, object);
    } else {
      throw new EmberError('Using insertAt on an arranged ArrayProxy is not allowed.');
    }
  },

  removeAt(start, len) {
    if ('number' === typeof start) {
      let content = get(this, 'content');
      let arrangedContent = get(this, 'arrangedContent');
      let indices = [];

      if ((start < 0) || (start >= get(this, 'length'))) {
        throw new EmberError(OUT_OF_RANGE_EXCEPTION);
      }

      if (len === undefined) {
        len = 1;
      }

      // Get a list of indices in original content to remove
      for (let i = start; i < start + len; i++) {
        // Use arrangedContent here so we avoid confusion with objects transformed by objectAtContent
        indices.push(content.indexOf(objectAt(arrangedContent, i)));
      }

      // Replace in reverse order since indices will change
      indices.sort((a, b) => b - a);

      beginPropertyChanges();
      for (let i = 0; i < indices.length; i++) {
        this._replace(indices[i], 1, EMPTY);
      }
      endPropertyChanges();
    }

    return this;
  },

  pushObject(obj) {
    this._insertAt(get(this, 'content.length'), obj);
    return obj;
  },

  pushObjects(objects) {
    if (!(Enumerable.detect(objects) || isArray(objects))) {
      throw new TypeError('Must pass Ember.Enumerable to Ember.MutableArray#pushObjects');
    }
    this._replace(get(this, 'length'), 0, objects);
    return this;
  },

  setObjects(objects) {
    if (objects.length === 0) {
      return this.clear();
    }

    let len = get(this, 'length');
    this._replace(0, len, objects);
    return this;
  },

  unshiftObject(obj) {
    this._insertAt(0, obj);
    return obj;
  },

  unshiftObjects(objects) {
    this._replace(0, 0, objects);
    return this;
  },

  slice() {
    let arr = this.toArray();
    return arr.slice(...arguments);
  },

  arrangedContentArrayWillChange(item, idx, removedCnt, addedCnt) {
    this.arrayContentWillChange(idx, removedCnt, addedCnt);
  },

  arrangedContentArrayDidChange(item, idx, removedCnt, addedCnt) {
    this.arrayContentDidChange(idx, removedCnt, addedCnt);
  },

  init() {
    this._super(...arguments);
    this._setupContent();
    this._setupArrangedContent();
  },

  willDestroy() {
    this._teardownArrangedContent();
    this._teardownContent();
  }
});
