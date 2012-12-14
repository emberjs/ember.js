
/**
@module ember
@submodule ember-runtime
*/

var get = Ember.get, set = Ember.set, forEach = Ember.EnumerableUtils.forEach;

/**
  `Ember.ArrangeableMixin` provides a standard interface for array proxies
  to specify filtering and sort order. The arrangment is maintained when new
  objects are added, updated, or removed. The ordering does not effect
  the underlying content array.

  ```javascript
  var songs = [
    {trackNumber: 4, title: 'Ob-La-Di, Ob-La-Da'},
    {trackNumber: 2, title: 'Back in the U.S.S.R.'},
    {trackNumber: 3, title: 'Glass Onion'},
  ];

  // Sorting
  var songsController = Ember.ArrayController.create({
    content: songs,
    sortProperties: ['trackNumber']
  });

  songsController.get('firstObject');  // {trackNumber: 2, title: 'Back in the U.S.S.R.'}

  songsController.addObject({trackNumber: 1, title: 'Dear Prudence'});
  songsController.get('firstObject');  // {trackNumber: 1, title: 'Dear Prudence'}

  // Filtering
  var songs = [
    {trackNumber: 4, title: 'Ob-La-Di, Ob-La-Da', favorite: true},
    {trackNumber: 2, title: 'Back in the U.S.S.R.'},
    {trackNumber: 3, title: 'Glass Onion', favorite: true},
  ];

  var songsController = Ember.ArrayController.create({
    content: songs,
    filterProperites: ['favorite']
  });

  songsController.get('firstObject');  // {trackNumber: 4, title: 'Ob-La-Di, Ob-La-Da', favorite: true}

  songsController.addObject({trackNumber: 1, title: 'Dear Prudence', favorite: true});
  songsController.get('lastObject');  // {trackNumber: 1, title: 'Dear Prudence', favorite: true}
  ```

  @class ArrangeableMixin
  @namespace Ember
  @extends Ember.Mixin
  @uses Ember.MutableEnumerable
*/
Ember.ArrangeableMixin = Ember.Mixin.create(Ember.MutableEnumerable, {
  /**
    An array of properties to sort using. The content will not be
    sorted unless this property is set.

    ```javascript
    ['name']         // sort according to name
    ['name', 'age']  // sort by name then age
    ````

    @property sortProperties
    @type {Array}
  */
  sortProperties: null,

  /**
    Set if the array should be sorted in ascending order (lowest first). 
    Set to `false` if you'd like descending order.

    @property sortAscending
    @type {Boolean}
    @default true
  */
  sortAscending: true,

  /**
    The function used to compare to values. You can override this if you 
    want to do custom comparisions.

    @property sortFunction
    @type {Function}
    @default Ember.compare
  */
  sortFunction: Ember.compare,

  /**
    An array of properties to filter against. The content will not be
    filtered unless this property is set. You can specifiy filter
    conditions in multiple ways. Properties can be filtered by
    truthyness, given values, regexes, or functions. Each property
    is compared against a given value. This is an inclusive filter.
    Items matching these filters will be included in the content array.

    ```javascript
    var controller = Ember.ArrayController.create({
      filterProperties: ['name']                    // Only items with a name property
      filterProperties: [['name', 'Adam Hawkins']]  // Only items with name === 'Adam Hawkins'
      filterProperties: [['name', /x/]              // Only items with names with an x
      filterProperties: [['name', function(item) {  // Only items with names starting with 'A'
        return item.name[0] === 'A';
      }]]
    });
    ```

    @property filterProperties
    @type {Array}
  */
  filterProperties: null,

  /**
    Filter items if they match all filters. Set this to `false` if
    the can match any condition.

    @property filterAllProperties
    @type {Boolean}
    @default {true}
  */
  filterAllProperties: true,

  arrangedContent: Ember.computed('content', 'sortProperties.@each','filterProperties.@each', 'filterAllProperties', function(key, value) {
    var content = get(this, 'content'),
        isArranged = get(this, 'isArranged'),
        isSorted = get(this, 'isSorted'),
        isFiltered = get(this, 'isFiltered'),
        sortProperties = get(this, 'sortProperties'),
        filterProperties = get(this, 'filterProperties'),
        arrangeableProperties = get(this, 'arrangeableProperties'),
        self = this;

    if (!content) {
      return content;
    } else if (content && !isArranged) {
      return content;
    }

    // need to slice it so we get a new copy
    content = content.slice();

    // add an observer that will update the array
    // when sorting or filtering information changes
    forEach(content, function(item) {
      forEach(arrangeableProperties, function(filterProperty) {
        Ember.addObserver(item, filterProperty, this, 'contentItemArrangeablePropertyDidChange');
      }, this);
    }, this);

    if (isFiltered) {
      content = content.filter(this.filterCondition, this);
    }

    if (isSorted) {
      content.sort(function(item1, item2) {
        return self._orderBy(item1, item2);
      });
    }

    return Ember.A(content);
  }),


  sortAscendingWillChange: Ember.beforeObserver(function() {
    this._lastSortAscending = get(this, 'sortAscending');
  }, 'sortAscending'),

  sortAscendingDidChange: Ember.observer(function() {
    if (get(this, 'sortAscending') !== this._lastSortAscending) {
      var arrangedContent = get(this, 'arrangedContent');
      arrangedContent.reverseObjects();
    }
  }, 'sortAscending'),

  contentArrayWillChange: function(array, idx, removedCount, addedCount) {
    var content = get(this, 'content'),
        arrangeableProperties = get(this, 'arrangeableProperties'),
        isArranged = get(this, 'isArranged');

    if (isArranged) {
      var arrangedContent = get(this, 'arrangedContent');
      var removedObjects = array.slice(idx, idx+removedCount);

      forEach(removedObjects, function(item) {
        arrangedContent.removeObject(item);

        forEach(arrangeableProperties, function(arrangeableProperty) {
          Ember.removeObserver(item, arrangeableProperty, this, 'contentItemArrangeablePropertyDidChange');
        }, this);
      });
    }

    return this._super(array, idx, removedCount, addedCount);
  },

  contentArrayDidChange: function(array, idx, removedCount, addedCount) {
    var isArranged = get(this, 'isArranged'),
        arrangeableProperties = get(this, 'arrangeableProperties');

    if (isArranged) {
      var addedObjects = array.slice(idx, idx+addedCount);
      var arrangedContent = get(this, 'arrangedContent');

      forEach(addedObjects, function(item) {
        this.insertItemArranged(item);

        forEach(arrangeableProperties, function(arrangeableProperty) {
          Ember.addObserver(item, arrangeableProperty, this, 'contentItemArrangeablePropertyDidChange');
        }, this);
      }, this);
    }

    return this._super(array, idx, removedCount, addedCount);
  },

  contentItemArrangeablePropertyDidChange: function(item) {
    var arrangedContent = get(this, 'arrangedContent');

    if(this.hasItemArrangementChanged(item)) {
      arrangedContent.removeObject(item);
      this.insertItemArranged(item);
    }
  },

  insertItemArranged: function(item) {
    var isFiltered = get(this, 'isFiltered'),
        isSorted = get(this, 'isSorted');

    if(isFiltered && isSorted) {
      if(this.filterCondition(item)) {
        this.insertItemSorted(item);
      }
    } else if(isFiltered && !isSorted) {
      this.insertItemFiltered(item);
    } else if(!isFiltered && isSorted) {
      this.insertItemSorted(item);
    }
  },

  hasItemArrangementChanged: function(item) {
    var isFiltered = get(this, 'isFiltered'),
        isSorted = get(this, 'isSorted');

    if(isSorted && !isFiltered) {
      return this.hasSortPositionChanged(item);
    } else {
      return true;
    }
  },

  hasSortPositionChanged: function(item) {
    var arrangedContent = get(this, 'arrangedContent'),
        oldIndex = arrangedContent.indexOf(item),
        leftItem = arrangedContent.objectAt(oldIndex - 1),
        rightItem = arrangedContent.objectAt(oldIndex + 1),
        leftResult = leftItem && this._orderBy(item, leftItem),
        rightResult = rightItem && this._orderBy(item, rightItem);

    return (leftResult < 0 || rightResult > 0);
  },

  insertItemFiltered: function(item){
    var arrangedContent = get(this, 'arrangedContent');

    if (this.filterCondition(item)) {
      arrangedContent.pushObject(item);
    }
  },

  insertItemSorted: function(item) {
    var arrangedContent = get(this, 'arrangedContent');
    var length = get(arrangedContent, 'length');

    var idx = this._binarySearch(item, 0, length);
    arrangedContent.insertAt(idx, item);
  },

  arrangeableProperties: Ember.computed('sortProperties', 'filterProperties', function() {
    var sortProperties = get(this, 'sortProperties'),
        filterProperties = get(this, 'filterProperties');

    var base = Ember.A();

    if(sortProperties) {
      forEach(sortProperties, function(property) {
        base.pushObject(property);
      });
    }

    if(filterProperties) {
      forEach(filterProperties, function(property) {
        if (Ember.typeOf(property) === 'array') {
          base.pushObject(property[0]);
        } else {
          base.pushObject(property);
        }
      });
    }

    return base.uniq();
  }),

  filterCondition: function(item){
    var filterProperties = Ember.A(get(this, 'filterProperties')),
        filterAllProperties = get(this, 'filterAllProperties');

    var filterer = filterAllProperties ? 'every' : 'some';

    return filterProperties[filterer](function(property) {
      if (Ember.typeOf(property) === 'array') {
        return this.filterFunction(property, get(item, property[0]), property[1]);
      } else {
        return this.filterFunction(property, get(item, property));
      }
    }, this);
  },

  filterFunction: function(key, value, match) {
    switch(Ember.typeOf(match)) {
    case "regexp":
      return value.match(match);
    case "function":
      return match(key, value);
    case "undefined":
      return !!value;
    case "null":
      return !!value;
    default:
      return value === match;
    }
  },

  destroy: function() {
    var content = get(this, 'content'),
        arrangeableProperties = get(this, 'arrangeableProperties'),
        isArranged = get(this, 'isArranged');

    if (content && isArranged) {
      forEach(content, function(item) {
        forEach(arrangeableProperties, function(arrangeableProperty) {
          Ember.removeObserver(item, arrangeableProperty, this, 'contentItemArrangeablePropertyDidChange');
        }, this);
      }, this);
    }

    return this._super();
  },

  isSorted: Ember.computed('sortProperties', function() {
    return !!get(this, 'sortProperties');
  }),

  isFiltered: Ember.computed('filterProperties', function() {
    return !!get(this, 'filterProperties');
  }),

  isArranged: Ember.computed('isFiltered', 'isSorted', function() {
    return get(this, 'isFiltered') || get(this, 'isSorted');
  }),

  _orderBy: function(item1, item2) {
    var result = 0,
        sortProperties = get(this, 'sortProperties'),
        sortAscending = get(this, 'sortAscending'),
        sortFunction = get(this, 'sortFunction');

    Ember.assert("you need to define `sortProperties`", !!sortProperties);

    forEach(sortProperties, function(propertyName) {
      if (result === 0) {
        result = sortFunction(get(item1, propertyName), get(item2, propertyName));
        if ((result !== 0) && !sortAscending) {
          result = (-1) * result;
        }
      }
    });

    return result;
  },

  _contentWillChange: Ember.beforeObserver(function() {
    var content = get(this, 'content'),
        arrangeableProperties = get(this, 'arrangeableProperties');

    if (content) {
      forEach(content, function(item) {
        forEach(arrangeableProperties, function(arrangeableProperty) {
          Ember.removeObserver(item, arrangeableProperty, this, 'contentItemArrangeablePropertyDidChange');
        }, this);
      }, this);
    }

    this._super();
  }, 'content'),

  _binarySearch: function(item, low, high) {
    var mid, midItem, res, arrangedContent;

    if (low === high) {
      return low;
    }

    arrangedContent = get(this, 'arrangedContent');

    mid = low + Math.floor((high - low) / 2);
    midItem = arrangedContent.objectAt(mid);

    res = this._orderBy(midItem, item);

    if (res < 0) {
      return this._binarySearch(item, mid+1, high);
    } else if (res > 0) {
      return this._binarySearch(item, low, mid);
    }

    return mid;
  }
});
