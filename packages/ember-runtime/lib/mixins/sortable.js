/**
@module ember
@submodule ember-runtime
*/

import Ember from "ember-metal/core"; // Ember.assert, Ember.A

import { get } from "ember-metal/property_get";
import { forEach } from "ember-metal/enumerable_utils";
import MutableEnumerable from "ember-runtime/mixins/mutable_enumerable";
import compare from "ember-runtime/compare";
import {
  addObserver,
  removeObserver
} from "ember-metal/observer";
import { computed } from "ember-metal/computed";
import { notEmpty } from "ember-metal/computed_macros";
import {
  Mixin,
  _beforeObserver,
  observer
} from "ember-metal/mixin"; //ES6TODO: should we access these directly from their package or from how their exposed in ember-metal?

/**
  `Ember.SortableMixin` provides a standard interface for array proxies
  to specify a sort order and maintain this sorting when objects are added,
  removed, or updated without changing the implicit order of their underlying
  model array:

  ```javascript
  songs = [
    {trackNumber: 4, title: 'Ob-La-Di, Ob-La-Da'},
    {trackNumber: 2, title: 'Back in the U.S.S.R.'},
    {trackNumber: 3, title: 'Glass Onion'},
  ];

  songsController = Ember.ArrayController.create({
    model: songs,
    sortProperties: ['trackNumber'],
    sortAscending: true
  });

  songsController.get('firstObject');  // {trackNumber: 2, title: 'Back in the U.S.S.R.'}

  songsController.addObject({trackNumber: 1, title: 'Dear Prudence'});
  songsController.get('firstObject');  // {trackNumber: 1, title: 'Dear Prudence'}
  ```

  If you add or remove the properties to sort by or change the sort direction the model
  sort order will be automatically updated.

  ```javascript
  songsController.set('sortProperties', ['title']);
  songsController.get('firstObject'); // {trackNumber: 2, title: 'Back in the U.S.S.R.'}

  songsController.toggleProperty('sortAscending');
  songsController.get('firstObject'); // {trackNumber: 4, title: 'Ob-La-Di, Ob-La-Da'}
  ```

  `SortableMixin` works by sorting the `arrangedContent` array, which is the array that
  `ArrayProxy` displays. Due to the fact that the underlying 'content' array is not changed, that
  array will not display the sorted list:

   ```javascript
  songsController.get('content').get('firstObject'); // Returns the unsorted original content
  songsController.get('firstObject'); // Returns the sorted content.
  ```

  Although the sorted content can also be accessed through the `arrangedContent` property,
  it is preferable to use the proxied class and not the `arrangedContent` array directly.

  @class SortableMixin
  @namespace Ember
  @uses Ember.MutableEnumerable
  @private
*/
export default Mixin.create(MutableEnumerable, {

  /**
    Specifies which properties dictate the `arrangedContent`'s sort order.

    When specifying multiple properties the sorting will use properties
    from the `sortProperties` array prioritized from first to last.

    @property {Array} sortProperties
    @private
  */
  sortProperties: null,

  /**
    Specifies the `arrangedContent`'s sort direction.
    Sorts the content in ascending order by default. Set to `false` to
    use descending order.

    @property {Boolean} sortAscending
    @default true
    @private
  */
  sortAscending: true,

  /**
    The function used to compare two values. You can override this if you
    want to do custom comparisons. Functions must be of the type expected by
    Array#sort, i.e.,

    *  return 0 if the two parameters are equal,
    *  return a negative value if the first parameter is smaller than the second or
    *  return a positive value otherwise:

    ```javascript
    function(x, y) { // These are assumed to be integers
      if (x === y)
        return 0;
      return x < y ? -1 : 1;
    }
    ```

    @property sortFunction
    @type {Function}
    @default Ember.compare
    @private
  */
  sortFunction: compare,

  orderBy(item1, item2) {
    var result = 0;
    var sortProperties = get(this, 'sortProperties');
    var sortAscending = get(this, 'sortAscending');
    var sortFunction = get(this, 'sortFunction');

    Ember.assert("you need to define `sortProperties`", !!sortProperties);

    forEach(sortProperties, function(propertyName) {
      if (result === 0) {
        result = sortFunction.call(this, get(item1, propertyName), get(item2, propertyName));
        if ((result !== 0) && !sortAscending) {
          result = (-1) * result;
        }
      }
    }, this);

    return result;
  },

  destroy() {
    var content = get(this, 'content');
    var sortProperties = get(this, 'sortProperties');

    if (content && sortProperties) {
      forEach(content, function(item) {
        forEach(sortProperties, function(sortProperty) {
          removeObserver(item, sortProperty, this, 'contentItemSortPropertyDidChange');
        }, this);
      }, this);
    }

    return this._super(...arguments);
  },

  isSorted: notEmpty('sortProperties'),

  /**
    Overrides the default `arrangedContent` from `ArrayProxy` in order to sort by `sortFunction`.
    Also sets up observers for each `sortProperty` on each item in the content Array.

    @property arrangedContent
    @private
  */
  arrangedContent: computed('content', 'sortProperties.[]', {
    get(key) {
      var content = get(this, 'content');
      var isSorted = get(this, 'isSorted');
      var sortProperties = get(this, 'sortProperties');
      var self = this;

      if (content && isSorted) {
        content = content.slice();
        content.sort(function(item1, item2) {
          return self.orderBy(item1, item2);
        });
        forEach(content, function(item) {
          forEach(sortProperties, function(sortProperty) {
            addObserver(item, sortProperty, this, 'contentItemSortPropertyDidChange');
          }, this);
        }, this);
        return Ember.A(content);
      }

      return content;
    }
  }),

  _contentWillChange: _beforeObserver('content', function() {
    var content = get(this, 'content');
    var sortProperties = get(this, 'sortProperties');

    if (content && sortProperties) {
      forEach(content, function(item) {
        forEach(sortProperties, function(sortProperty) {
          removeObserver(item, sortProperty, this, 'contentItemSortPropertyDidChange');
        }, this);
      }, this);
    }

    this._super(...arguments);
  }),

  sortPropertiesWillChange: _beforeObserver('sortProperties', function() {
    this._lastSortAscending = undefined;
  }),

  sortPropertiesDidChange: observer('sortProperties', function() {
    this._lastSortAscending = undefined;
  }),

  sortAscendingWillChange: _beforeObserver('sortAscending', function() {
    this._lastSortAscending = get(this, 'sortAscending');
  }),

  sortAscendingDidChange: observer('sortAscending', function() {
    if (this._lastSortAscending !== undefined && get(this, 'sortAscending') !== this._lastSortAscending) {
      var arrangedContent = get(this, 'arrangedContent');
      arrangedContent.reverseObjects();
    }
  }),

  contentArrayWillChange(array, idx, removedCount, addedCount) {
    var isSorted = get(this, 'isSorted');

    if (isSorted) {
      var arrangedContent = get(this, 'arrangedContent');
      var removedObjects = array.slice(idx, idx+removedCount);
      var sortProperties = get(this, 'sortProperties');

      forEach(removedObjects, function(item) {
        arrangedContent.removeObject(item);

        forEach(sortProperties, function(sortProperty) {
          removeObserver(item, sortProperty, this, 'contentItemSortPropertyDidChange');
        }, this);
      }, this);
    }

    return this._super(array, idx, removedCount, addedCount);
  },

  contentArrayDidChange(array, idx, removedCount, addedCount) {
    var isSorted = get(this, 'isSorted');
    var sortProperties = get(this, 'sortProperties');

    if (isSorted) {
      var addedObjects = array.slice(idx, idx+addedCount);

      forEach(addedObjects, function(item) {
        this.insertItemSorted(item);

        forEach(sortProperties, function(sortProperty) {
          addObserver(item, sortProperty, this, 'contentItemSortPropertyDidChange');
        }, this);
      }, this);
    }

    return this._super(array, idx, removedCount, addedCount);
  },

  insertItemSorted(item) {
    var arrangedContent = get(this, 'arrangedContent');
    var length = get(arrangedContent, 'length');

    var idx = this._binarySearch(item, 0, length);
    arrangedContent.insertAt(idx, item);
  },

  contentItemSortPropertyDidChange(item) {
    var arrangedContent = get(this, 'arrangedContent');
    var oldIndex = arrangedContent.indexOf(item);
    var leftItem = arrangedContent.objectAt(oldIndex - 1);
    var rightItem = arrangedContent.objectAt(oldIndex + 1);
    var leftResult = leftItem && this.orderBy(item, leftItem);
    var rightResult = rightItem && this.orderBy(item, rightItem);

    if (leftResult < 0 || rightResult > 0) {
      arrangedContent.removeObject(item);
      this.insertItemSorted(item);
    }
  },

  _binarySearch(item, low, high) {
    var mid, midItem, res, arrangedContent;

    if (low === high) {
      return low;
    }

    arrangedContent = get(this, 'arrangedContent');

    mid = low + Math.floor((high - low) / 2);
    midItem = arrangedContent.objectAt(mid);

    res = this.orderBy(midItem, item);

    if (res < 0) {
      return this._binarySearch(item, mid+1, high);
    } else if (res > 0) {
      return this._binarySearch(item, low, mid);
    }

    return mid;
  }
});
