import Ember from "ember-metal/core"; // Ember.K, Ember.assert
import { get } from "ember-metal/property_get";
import { set } from "ember-metal/property_set";
import {
  isArray,
  apply
} from "ember-metal/utils";
import { computed } from "ember-metal/computed";
import {
  beforeObserver,
  observer
} from "ember-metal/mixin";
import {
  beginPropertyChanges,
  endPropertyChanges
} from "ember-metal/property_events";
import EmberError from "ember-metal/error";
import EmberObject from "ember-runtime/system/object";
import MutableArray from "ember-runtime/mixins/mutable_array";
import Enumerable from "ember-runtime/mixins/enumerable";
import { fmt } from "ember-runtime/system/string";

/**
@module ember
@submodule ember-runtime
*/

var OUT_OF_RANGE_EXCEPTION = "Index out of range";
var EMPTY = [];
var alias = computed.alias;
var K = Ember.K;

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
*/
var ArrayProxy = EmberObject.extend(MutableArray, {

  /**
    The content array. Must be an object that implements `Ember.Array` and/or
    `Ember.MutableArray.`

    @property content
    @type Ember.Array
  */
  content: null,

  /**
   The array that the proxy pretends to be. In the default `ArrayProxy`
   implementation, this and `content` are the same. Subclasses of `ArrayProxy`
   can override this property to provide things like sorting and filtering.

   @property arrangedContent
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
  */
  objectAtContent: function(idx) {
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
  */
  replaceContent: function(idx, amt, objects) {
    get(this, 'content').replace(idx, amt, objects);
  },

  /**
    Invoked when the content property is about to change. Notifies observers that the
    entire array content will change.

    @private
    @method _contentWillChange
  */
  _contentWillChange: beforeObserver('content', function() {
    this._teardownContent();
  }),

  _teardownContent: function() {
    var content = get(this, 'content');

    if (content) {
      content.removeArrayObserver(this, {
        willChange: 'contentArrayWillChange',
        didChange: 'contentArrayDidChange'
      });
    }
  },

  contentArrayWillChange: K,
  contentArrayDidChange: K,

  /**
    Invoked when the content property changes. Notifies observers that the
    entire array content has changed.

    @private
    @method _contentDidChange
  */
  _contentDidChange: observer('content', function() {
    var content = get(this, 'content');

    Ember.assert("Can't set ArrayProxy's content to itself", content !== this);

    this._setupContent();
  }),

  _setupContent: function() {
    var content = get(this, 'content');

    if (content) {
      Ember.assert(fmt('ArrayProxy expects an Array or ' +
        'Ember.ArrayProxy, but you passed %@', [typeof content]),
        isArray(content) || content.isDestroyed);

      content.addArrayObserver(this, {
        willChange: 'contentArrayWillChange',
        didChange: 'contentArrayDidChange'
      });
    }
  },

  _arrangedContentWillChange: beforeObserver('arrangedContent', function() {
    var arrangedContent = get(this, 'arrangedContent'),
        len = arrangedContent ? get(arrangedContent, 'length') : 0;

    this.arrangedContentArrayWillChange(this, 0, len, undefined);
    this.arrangedContentWillChange(this);

    this._teardownArrangedContent(arrangedContent);
  }),

  _arrangedContentDidChange: observer('arrangedContent', function() {
    var arrangedContent = get(this, 'arrangedContent'),
        len = arrangedContent ? get(arrangedContent, 'length') : 0;

    Ember.assert("Can't set ArrayProxy's content to itself", arrangedContent !== this);

    this._setupArrangedContent();

    this.arrangedContentDidChange(this);
    this.arrangedContentArrayDidChange(this, 0, undefined, len);
  }),

  _setupArrangedContent: function() {
    var arrangedContent = get(this, 'arrangedContent');

    if (arrangedContent) {
      Ember.assert(fmt('ArrayProxy expects an Array or ' +
        'Ember.ArrayProxy, but you passed %@', [typeof arrangedContent]),
        isArray(arrangedContent) || arrangedContent.isDestroyed);

      arrangedContent.addArrayObserver(this, {
        willChange: 'arrangedContentArrayWillChange',
        didChange: 'arrangedContentArrayDidChange'
      });
    }
  },

  _teardownArrangedContent: function() {
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

  objectAt: function(idx) {
    return get(this, 'content') && this.objectAtContent(idx);
  },

  length: computed(function() {
    var arrangedContent = get(this, 'arrangedContent');
    return arrangedContent ? get(arrangedContent, 'length') : 0;
    // No dependencies since Enumerable notifies length of change
  }),

  _replace: function(idx, amt, objects) {
    var content = get(this, 'content');
    Ember.assert('The content property of '+ this.constructor + ' should be set before modifying it', content);
    if (content) this.replaceContent(idx, amt, objects);
    return this;
  },

  replace: function() {
    if (get(this, 'arrangedContent') === get(this, 'content')) {
      apply(this, this._replace, arguments);
    } else {
      throw new EmberError("Using replace on an arranged ArrayProxy is not allowed.");
    }
  },

  _insertAt: function(idx, object) {
    if (idx > get(this, 'content.length')) throw new EmberError(OUT_OF_RANGE_EXCEPTION);
    this._replace(idx, 0, [object]);
    return this;
  },

  insertAt: function(idx, object) {
    if (get(this, 'arrangedContent') === get(this, 'content')) {
      return this._insertAt(idx, object);
    } else {
      throw new EmberError("Using insertAt on an arranged ArrayProxy is not allowed.");
    }
  },

  removeAt: function(start, len) {
    if ('number' === typeof start) {
      var content = get(this, 'content'),
          arrangedContent = get(this, 'arrangedContent'),
          indices = [], i;

      if ((start < 0) || (start >= get(this, 'length'))) {
        throw new EmberError(OUT_OF_RANGE_EXCEPTION);
      }

      if (len === undefined) len = 1;

      // Get a list of indices in original content to remove
      for (i=start; i<start+len; i++) {
        // Use arrangedContent here so we avoid confusion with objects transformed by objectAtContent
        indices.push(content.indexOf(arrangedContent.objectAt(i)));
      }

      // Replace in reverse order since indices will change
      indices.sort(function(a,b) { return b - a; });

      beginPropertyChanges();
      for (i=0; i<indices.length; i++) {
        this._replace(indices[i], 1, EMPTY);
      }
      endPropertyChanges();
    }

    return this ;
  },

  pushObject: function(obj) {
    this._insertAt(get(this, 'content.length'), obj) ;
    return obj ;
  },

  pushObjects: function(objects) {
    if (!(Enumerable.detect(objects) || isArray(objects))) {
      throw new TypeError("Must pass Ember.Enumerable to Ember.MutableArray#pushObjects");
    }
    this._replace(get(this, 'length'), 0, objects);
    return this;
  },

  setObjects: function(objects) {
    if (objects.length === 0) return this.clear();

    var len = get(this, 'length');
    this._replace(0, len, objects);
    return this;
  },

  unshiftObject: function(obj) {
    this._insertAt(0, obj) ;
    return obj ;
  },

  unshiftObjects: function(objects) {
    this._replace(0, 0, objects);
    return this;
  },

  slice: function() {
    var arr = this.toArray();
    return arr.slice.apply(arr, arguments);
  },

  arrangedContentArrayWillChange: function(item, idx, removedCnt, addedCnt) {
    this.arrayContentWillChange(idx, removedCnt, addedCnt);
  },

  arrangedContentArrayDidChange: function(item, idx, removedCnt, addedCnt) {
    this.arrayContentDidChange(idx, removedCnt, addedCnt);
  },

  init: function() {
    this._super();
    this._setupContent();
    this._setupArrangedContent();
  },

  willDestroy: function() {
    this._teardownArrangedContent();
    this._teardownContent();
  }
});

export default ArrayProxy;
