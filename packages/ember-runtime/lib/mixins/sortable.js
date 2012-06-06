var get = Ember.get, set = Ember.set, forEach = Ember.ArrayUtils.forEach;

Ember.SortableMixin = Ember.Mixin.create(Ember.MutableEnumerable, {
  sortProperties: null,
  sortAscending: true,

  addObject: function(obj) {
    var content = get(this, 'content');
    content.pushObject(obj);
  },

  removeObject: function(obj) {
    var content = get(this, 'content');
    content.removeObject(obj);
  },

  orderBy: function(item1, item2) {
    var result = 0,
        sortProperties = get(this, 'sortProperties'),
        sortAscending = get(this, 'sortAscending');

    Ember.assert("you need to define `sortProperties`", !!sortProperties);

    forEach(sortProperties, function(propertyName) {
      if (result === 0) {
        result = Ember.compare(get(item1, propertyName), get(item2, propertyName));
        if ((result !== 0) && !sortAscending) {
          result = (-1) * result;
        }
      }
    });

    return result;
  },

  destroy: function() {
    var content = get(this, 'content'),
        sortProperties = get(this, 'sortProperties');

    if (content && sortProperties) {
      forEach(content, function(item) {
        forEach(sortProperties, function(sortProperty) {
          Ember.removeObserver(item, sortProperty, this, 'contentItemSortPropertyDidChange');
        }, this);
      }, this);
    }

    return this._super();
  },

  isSorted: Ember.computed('sortProperties', function() {
    return !!get(this, 'sortProperties');
  }),

  arrangedContent: Ember.computed('content', 'sortProperties.@each', function(key, value) {
    var content = get(this, 'content'),
        isSorted = get(this, 'isSorted'),
        sortProperties = get(this, 'sortProperties'),
        self = this;

    if (content && isSorted) {
      content = content.slice();
      content.sort(function(item1, item2) {
        return self.orderBy(item1, item2);
      });
      forEach(content, function(item) {
        forEach(sortProperties, function(sortProperty) {
          Ember.addObserver(item, sortProperty, this, 'contentItemSortPropertyDidChange');
        }, this);
      }, this);
      return Ember.A(content);
    }

    return content;
  }).cacheable(),

  _contentWillChange: Ember.beforeObserver(function() {
    var content = get(this, 'content'),
        sortProperties = get(this, 'sortProperties');

    if (content && sortProperties) {
      forEach(content, function(item) {
        forEach(sortProperties, function(sortProperty) {
          Ember.removeObserver(item, sortProperty, this, 'contentItemSortPropertyDidChange');
        }, this);
      }, this);
    }

    this._super();
  }, 'content'),

  sortAscendingWillChange: Ember.beforeObserver(function() {
    this._lastSortAscending = get(this, 'sortAscending');
  }, 'sortAscending'),

  sortAscendingDidChange: Ember.observer(function() {
    if (get(this, 'sortAscending') !== this._lastSortAscending) {
      var arrangedContent = get(this, 'arrangedContent');
      arrangedContent.reverse();
    }
  }, 'sortAscending'),

  contentArrayWillChange: function(array, idx, removedCount, addedCount) {
    var isSorted = get(this, 'isSorted');

    if (isSorted) {
      var arrangedContent = get(this, 'arrangedContent');
      var removedObjects = array.slice(idx, idx+removedCount);
      var sortProperties = get(this, 'sortProperties');

      removedObjects.forEach(function(item) {
        arrangedContent.removeObject(item);

        forEach(sortProperties, function(sortProperty) {
          Ember.removeObserver(item, sortProperty, this, 'contentItemSortPropertyDidChange');
        }, this);
      });
    }

    return this._super(array, idx, removedCount, addedCount);
  },

  contentArrayDidChange: function(array, idx, removedCount, addedCount) {
    var isSorted = get(this, 'isSorted'),
        sortProperties = get(this, 'sortProperties');

    if (isSorted) {
      var addedObjects = array.slice(idx, idx+addedCount);
      var arrangedContent = get(this, 'arrangedContent');

      addedObjects.forEach(function(item) {
        this.insertItemSorted(item);

        forEach(sortProperties, function(sortProperty) {
          Ember.addObserver(item, sortProperty, this, 'contentItemSortPropertyDidChange');
        }, this);
        this.arrayContentDidChange(idx, 0, 1);
      }, this);
    }

    return this._super(array, idx, removedCount, addedCount);
  },

  insertItemSorted: function(item) {
    var arrangedContent = get(this, 'arrangedContent');
    var length = get(arrangedContent, 'length');

    var idx = this._binarySearch(item, 0, length);
    arrangedContent.insertAt(idx, item);
  },

  contentItemSortPropertyDidChange: function(item) {
    var arrangedContent = get(this, 'arrangedContent'),
        index = arrangedContent.indexOf(item);

    arrangedContent.removeObject(item);
    this.insertItemSorted(item);
  },

  _binarySearch: function(item, low, high) {
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
