import { assert } from 'ember-metal/debug';
import { get } from 'ember-metal/property_get';
import {
  isArray
} from 'ember-runtime/utils';
import { computed } from 'ember-metal/computed';
import { observer } from 'ember-metal/mixin';
import {
  beginPropertyChanges,
  endPropertyChanges
} from 'ember-metal/property_events';
import EmberError from 'ember-metal/error';
import EmberObject from 'ember-runtime/system/object';
import MutableArray from 'ember-runtime/mixins/mutable_array';
import Enumerable from 'ember-runtime/mixins/enumerable';
import alias from 'ember-metal/alias';

/**
@module ember
@submodule ember-runtime
*/

var OUT_OF_RANGE_EXCEPTION = 'Index out of range';
var EMPTY = [];

function K() { return this; }

/**
  An ArrayProxy wraps any other object that implements `Ember.Array` and/or
  `Ember.MutableArray,` forwarding all requests. This makes it very useful for
  a number of binding use cases or other cases where being able to swap
  out the underlying array is useful.

  A simple example of usage:

  ```javascript
  var pets = ['dog', 'cat', 'fish'];
  var ap = Ember.ArrayProxy.create({ content: Ember.A(pets) });

  ap.get('firstObject');                        // 'dog'
  ap.set('content', ['amoeba', 'paramecium']);
  ap.get('firstObject');                        // 'amoeba'
  ```

  This class can also be useful as a layer to transform the contents of
  an array, as they are accessed. This can be done by overriding
  `objectAtContent`:

  ```javascript
  var pets = ['dog', 'cat', 'fish'];
  var ap = Ember.ArrayProxy.create({
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
var ArrayProxy = EmberObject.extend(MutableArray, {

  /**
    The content array. Must be an object that implements `Ember.Array` and/or
    `Ember.MutableArray.`

    @property content
    @type Ember.Array
    @private
  */
  content: computed({
    get() {
      return this._content;
    },
    set(k, v) {
      if (this._didInitArrayProxy) {
        var oldContent = this._content;
        var len = oldContent ? get(oldContent, 'length') : 0;
        this.arrangedContentArrayWillChange(this, 0, len, undefined);
        this.arrangedContentWillChange(this);
      }
      this._content = v;
      return v;
    }
  }),



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
    @private
  */
  objectAtContent(idx) {
    return get(this, 'arrangedContent').objectAt(idx);
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

  _teardownContent(content) {
    if (content) {
      content.removeArrayObserver(this, {
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
    var content = get(this, 'content');
    this._teardownContent(this._prevContent);

    assert('Can\'t set ArrayProxy\'s content to itself', content !== this);

    this._setupContent();
  }),

  _setupContent() {
    var content = get(this, 'content');
    this._prevContent = content;

    if (content) {
      assert(`ArrayProxy expects an Array or Ember.ArrayProxy, but you passed ${typeof content}`, isArray(content) || content.isDestroyed);

      content.addArrayObserver(this, {
        willChange: 'contentArrayWillChange',
        didChange: 'contentArrayDidChange'
      });
    }
  },

  _arrangedContentDidChange: observer('arrangedContent', function() {
    this._teardownArrangedContent(this._prevArrangedContent);
    var arrangedContent = get(this, 'arrangedContent');
    var len = arrangedContent ? get(arrangedContent, 'length') : 0;

    assert('Can\'t set ArrayProxy\'s content to itself', arrangedContent !== this);

    this._setupArrangedContent();

    this.arrangedContentDidChange(this);
    this.arrangedContentArrayDidChange(this, 0, undefined, len);
  }),

  _setupArrangedContent() {
    var arrangedContent = get(this, 'arrangedContent');
    this._prevArrangedContent = arrangedContent;

    if (arrangedContent) {
      assert(`ArrayProxy expects an Array or Ember.ArrayProxy, but you passed ${typeof arrangedContent}`,
        isArray(arrangedContent) || arrangedContent.isDestroyed);

      arrangedContent.addArrayObserver(this, {
        willChange: 'arrangedContentArrayWillChange',
        didChange: 'arrangedContentArrayDidChange'
      });
    }
  },

  _teardownArrangedContent() {
    var arrangedContent = get(this, 'arrangedContent');

    if (arrangedContent) {
      arrangedContent.removeArrayObserver(this, {
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
    var arrangedContent = get(this, 'arrangedContent');
    return arrangedContent ? get(arrangedContent, 'length') : 0;
    // No dependencies since Enumerable notifies length of change
  }),

  _replace(idx, amt, objects) {
    var content = get(this, 'content');
    assert('The content property of ' + this.constructor + ' should be set before modifying it', content);
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
      var content = get(this, 'content');
      var arrangedContent = get(this, 'arrangedContent');
      var indices = [];
      var i;

      if ((start < 0) || (start >= get(this, 'length'))) {
        throw new EmberError(OUT_OF_RANGE_EXCEPTION);
      }

      if (len === undefined) {
        len = 1;
      }

      // Get a list of indices in original content to remove
      for (i = start; i < start + len; i++) {
        // Use arrangedContent here so we avoid confusion with objects transformed by objectAtContent
        indices.push(content.indexOf(arrangedContent.objectAt(i)));
      }

      // Replace in reverse order since indices will change
      indices.sort(function(a, b) { return b - a; });

      beginPropertyChanges();
      for (i = 0; i < indices.length; i++) {
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

    var len = get(this, 'length');
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
    var arr = this.toArray();
    return arr.slice(...arguments);
  },

  arrangedContentArrayWillChange(item, idx, removedCnt, addedCnt) {
    this.arrayContentWillChange(idx, removedCnt, addedCnt);
  },

  arrangedContentArrayDidChange(item, idx, removedCnt, addedCnt) {
    this.arrayContentDidChange(idx, removedCnt, addedCnt);
  },

  init() {
    this._didInitArrayProxy = true;
    this._super(...arguments);
    this._setupContent();
    this._setupArrangedContent();
  },

  willDestroy() {
    this._teardownArrangedContent();
    this._teardownContent(this.get('content'));
  }
});

export default ArrayProxy;
