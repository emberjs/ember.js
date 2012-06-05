var get = Ember.get;

Ember.SortableMixin = Ember.Mixin.create({
  arrangedContent: Ember.computed('content', 'orderBy', function(key, value) {
    var content = get(this, 'content'),
        orderBy = get(this, 'orderBy');

    if (orderBy) {
      content = content.slice();
      content.sort(function(a, b) {
        var aValue, bValue;

        aValue = a ? get(a, orderBy) : undefined;
        bValue = b ? get(b, orderBy) : undefined;

        if (aValue < bValue) { return -1; }
        if (aValue > bValue) { return 1; }

        return 0;
      });

      return Ember.A(content);
    }

    return content;
  }).cacheable(),

  contentArrayWillChange: function(array, idx, removedCount, addedCount) {
    var orderBy = get(this, 'orderBy');

    if (orderBy) {
      var arrangedContent = get(this, 'arrangedContent');
      var removedObjects = array.slice(idx, idx+removedCount);

      removedObjects.forEach(function(item) {
        arrangedContent.removeObject(item);
      });
    }

    return this._super(array, idx, removedCount, addedCount);
  },

  contentArrayDidChange: function(array, idx, removedCount, addedCount) {
    var orderBy = get(this, 'orderBy');

    if (orderBy) {
      var addedObjects = array.slice(idx, idx+addedCount);
      var arrangedContent = get(this, 'arrangedContent');
      var length = arrangedContent.get('length');

      addedObjects.forEach(function(object) {
        idx = this._binarySearch(get(object, orderBy), orderBy, 0, length);
        arrangedContent.insertAt(idx, object);
        object.addObserver(orderBy, this, 'contentItemOrderByDidChange');
        length++;
        this.arrayContentDidChange(idx, 0, 1);
      }, this);
    }

    return this._super(array, idx, removedCount, addedCount);
  },

  _binarySearch: function(value, orderBy, low, high) {
    var mid, midValue;

    if (low === high) {
      return low;
    }

    mid = low + Math.floor((high - low) / 2);
    midValue = get(this.objectAt(mid), orderBy);

    if (value > midValue) {
      return this._binarySearch(value, orderBy, mid+1, high);
    } else if (value < midValue) {
      return this._binarySearch(value, orderBy, low, mid);
    }

    return mid;
  }
});
