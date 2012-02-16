var get = Ember.get, set = Ember.set;

/**
  A model array is an array that contains records of a certain type. The model
  array materializes records as needed when they are retrieved for the first
  time. You should not create model arrays yourself. Instead, an instance of
  DS.ModelArray or its subclasses will be returned by your application's store
  in response to queries.
*/

DS.ModelArray = Ember.ArrayProxy.extend({

  /**
    The model type contained by this model array.

    @type DS.Model
  */
  type: null,

  // The array of client ids backing the model array. When a
  // record is requested from the model array, the record
  // for the client id at the same index is materialized, if
  // necessary, by the store.
  content: null,

  // The store that created this model array.
  store: null,

  init: function() {
    set(this, 'modelCache', Ember.A([]));
    this._super();
  },

  // Overrides Ember.Array's replace method to implement
  replace: function(index, removed, added) {
    added = added.map(function(item) {
      ember_assert("You can only add items of " + (get(this, 'type') && get(this, 'type').toString()) + " to this association.", !get(this, 'type') || (get(this, 'type') === item.constructor));
      return item.get('clientId');
    });

    this._super(index, removed, added);
  },

  arrayDidChange: function(array, index, removed, added) {
    var modelCache = get(this, 'modelCache');
    modelCache.replace(index, 0, Array(added));

    this._super(array, index, removed, added);
  },

  arrayWillChange: function(array, index, removed, added) {
    this._super(array, index, removed, added);

    var modelCache = get(this, 'modelCache');
    modelCache.replace(index, removed);
  },

  objectAtContent: function(index) {
    var modelCache = get(this, 'modelCache');
    var model = modelCache.objectAt(index);

    if (!model) {
      var store = get(this, 'store');
      var content = get(this, 'content');

      var contentObject = content.objectAt(index);

      if (contentObject !== undefined) {
        model = store.findByClientId(get(this, 'type'), contentObject);
        modelCache.replace(index, 1, [model]);
      }
    }

    return model;
  }
});
