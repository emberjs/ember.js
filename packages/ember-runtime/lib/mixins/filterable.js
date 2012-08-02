var get = Ember.get, set = Ember.set, forEach = Ember.EnumerableUtils.forEach;

/**
 @class

 @extends Ember.Mixin
 @extends Ember.MutableEnumerable
*/
Ember.FilterableMixin = Ember.Mixin.create(Ember.MutableEnumerable, {
  filterProperties: null,

  filterCondition: function(item){
    var filterProperties = get(this, 'filterProperties');
    return Ember.A(filterProperties).every(function(property){
      return !!get(item, property);
    });
  },

  addObject: function(obj) {
    var content = get(this, 'content');
    content.pushObject(obj);
  },

  removeObject: function(obj) {
    var content = get(this, 'content');
    content.removeObject(obj);
  },

  destroy: function() {
    var content = get(this, 'content'),
        filterProperties = get(this, 'filterProperties');

    if (content && filterProperties) {
      forEach(content, function(item) {
        forEach(filterProperties, function(filterProperty) {
          Ember.removeObserver(item, filterProperty, this, 'contentItemFilterPropertyDidChange');
        }, this);
      }, this);
    }

    return this._super();
  },

  isFiltered: Ember.computed('filterProperties', function() {
    return !!get(this, 'filterProperties');
  }),

  arrangedContent: Ember.computed('content', 'filterProperties.@each', function(key, value) {
    var content = get(this, 'content'),
        isFiltered = get(this, 'isFiltered'),
        filterProperties = get(this, 'filterProperties'),
        filterValue = get(this, 'filterValue'),
        self = this;

    if (content && isFiltered) {
      forEach(content, function(item) {
        forEach(filterProperties, function(filterProperty) {
          Ember.addObserver(item, filterProperty, this, 'contentItemFilterPropertyDidChange');
        }, this);
      }, this);
      content = content.slice();
      content = content.filter(this.filterCondition, this);

      return Ember.A(content);
    }

    return content;
  }).cacheable(),

  _contentWillChange: Ember.beforeObserver(function() {
    var content = get(this, 'content'),
        filterProperties = get(this, 'filterProperties');

    if (content && filterProperties) {
      forEach(content, function(item) {
        forEach(filterProperties, function(filterProperty) {
          Ember.removeObserver(item, filterProperty, this, 'contentItemFilterPropertyDidChange');
        }, this);
      }, this);
    }

    this._super();
  }, 'content'),

  contentArrayWillChange: function(array, idx, removedCount, addedCount) {
    var isFiltered = get(this, 'isFiltered');

    if (isFiltered) {
      var arrangedContent = get(this, 'arrangedContent');
      var removedObjects = array.slice(idx, idx+removedCount);
      var filterProperties = get(this, 'filterProperties');

      forEach(removedObjects, function(item) {
        arrangedContent.removeObject(item);
        forEach(filterProperties, function(filterProperty) {
          Ember.removeObserver(item, filterProperty, this, 'contentItemFilterPropertyDidChange');
        }, this);
      });
    }

    return this._super(array, idx, removedCount, addedCount);
  },

  contentArrayDidChange: function(array, idx, removedCount, addedCount) {
    var isFiltered = get(this, 'isFiltered'),
        filterProperties = get(this, 'filterProperties');

    if (isFiltered) {
      var addedObjects = array.slice(idx, idx+addedCount);
      var arrangedContent = get(this, 'arrangedContent');

      forEach(addedObjects, function(item) {
        this.insertItemFiltered(item);

        forEach(filterProperties, function(filterProperty) {
          Ember.addObserver(item, filterProperty, this, 'contentItemFilterPropertyDidChange');
        }, this);
      }, this);
    }

    return this._super(array, idx, removedCount, addedCount);
  },

  contentItemFilterPropertyDidChange: function(item) {
    var arrangedContent = get(this, 'arrangedContent'),
        index = arrangedContent.indexOf(item);

    arrangedContent.removeObject(item);
    this.insertItemFiltered(item);
  },

  insertItemFiltered: function(item){
    var arrangedContent = get(this, 'arrangedContent');

    if( this.filterCondition(item) ){
      arrangedContent.pushObject(item);
    }
  }

});
