require('ember-runtime/mixins/mutable_array');
require('ember-runtime/system/object');

/**
@module ember
@submodule ember-runtime
*/

var OUT_OF_RANGE_EXCEPTION = "Index out of range";
var EMPTY = [];

var get = Ember.get, set = Ember.set;

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
Ember.ArrayProxy = Ember.Object.extend(Ember.MutableArray,/** @scope Ember.ArrayProxy.prototype */ {

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
  arrangedContent: Ember.computed.alias('content'),

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
    @private

    Invoked when the content property is about to change. Notifies observers that the
    entire array content will change.

    @method _contentWillChange
  */
  _contentWillChange: Ember.beforeObserver('content', function() {
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

  contentArrayWillChange: Ember.K,
  contentArrayDidChange: Ember.K,

  /**
    @private

    Invoked when the content property changes. Notifies observers that the
    entire array content has changed.

    @method _contentDidChange
  */
  _contentDidChange: Ember.observer('content', function() {
    var content = get(this, 'content');

    Ember.assert("Can't set ArrayProxy's content to itself", content !== this);

    this._setupContent();
  }),

  _setupContent: function() {
    var content = get(this, 'content');

    if (content) {
      content.addArrayObserver(this, {
        willChange: 'contentArrayWillChange',
        didChange: 'contentArrayDidChange'
      });
    }
  },

  _arrangedContentWillChange: Ember.beforeObserver('arrangedContent', function() {
    var arrangedContent = get(this, 'arrangedContent'),
        len = arrangedContent ? get(arrangedContent, 'length') : 0;

    this.arrangedContentArrayWillChange(this, 0, len, undefined);
    this.arrangedContentWillChange(this);

    this._teardownArrangedContent(arrangedContent);
  }),

  _arrangedContentDidChange: Ember.observer('arrangedContent', function() {
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

  arrangedContentWillChange: Ember.K,
  arrangedContentDidChange: Ember.K,

  objectAt: function(idx) {
    return get(this, 'content') && this.objectAtContent(idx);
  },

  length: Ember.computed(function() {
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
      this._replace.apply(this, arguments);
    } else {
      throw new Ember.Error("Using replace on an arranged ArrayProxy is not allowed.");
    }
  },

  _insertAt: function(idx, object) {
    if (idx > get(this, 'content.length')) throw new Ember.Error(OUT_OF_RANGE_EXCEPTION);
    this._replace(idx, 0, [object]);
    return this;
  },

  insertAt: function(idx, object) {
    if (get(this, 'arrangedContent') === get(this, 'content')) {
      return this._insertAt(idx, object);
    } else {
      throw new Ember.Error("Using insertAt on an arranged ArrayProxy is not allowed.");
    }
  },

  removeAt: function(start, len) {
    if ('number' === typeof start) {
      var content = get(this, 'content'),
          arrangedContent = get(this, 'arrangedContent'),
          indices = [], i;

      if ((start < 0) || (start >= get(this, 'length'))) {
        throw new Ember.Error(OUT_OF_RANGE_EXCEPTION);
      }

      if (len === undefined) len = 1;

      // Get a list of indices in original content to remove
      for (i=start; i<start+len; i++) {
        // Use arrangedContent here so we avoid confusion with objects transformed by objectAtContent
        indices.push(content.indexOf(arrangedContent.objectAt(i)));
      }

      // Replace in reverse order since indices will change
      indices.sort(function(a,b) { return b - a; });

      Ember.beginPropertyChanges();
      for (i=0; i<indices.length; i++) {
        this._replace(indices[i], 1, EMPTY);
      }
      Ember.endPropertyChanges();
    }

    return this ;
  },

  pushObject: function(obj) {
    this._insertAt(get(this, 'content.length'), obj) ;
    return obj ;
  },

  pushObjects: function(objects) {
    if (!(Ember.Enumerable.detect(objects) || Ember.isArray(objects))) {
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
