var get = Ember.get, set = Ember.set;

/**
  A record array is an array that contains records of a certain type. The record
  array materializes records as needed when they are retrieved for the first
  time. You should not create record arrays yourself. Instead, an instance of
  DS.RecordArray or its subclasses will be returned by your application's store
  in response to queries.
*/

DS.RecordArray = Ember.ArrayProxy.extend({

  /**
    The model type contained by this record array.

    @type DS.Model
  */
  type: null,

  // The array of client ids backing the record array. When a
  // record is requested from the record array, the record
  // for the client id at the same index is materialized, if
  // necessary, by the store.
  content: null,

  // The store that created this record array.
  store: null,

  init: function() {
    set(this, 'recordCache', Ember.A([]));
    this._super();
  },

  arrayDidChange: function(array, index, removed, added) {
    var recordCache = get(this, 'recordCache');
    recordCache.replace(index, 0, new Array(added));

    this._super(array, index, removed, added);
  },

  arrayWillChange: function(array, index, removed, added) {
    this._super(array, index, removed, added);

    var recordCache = get(this, 'recordCache');
    recordCache.replace(index, removed);
  },

  objectAtContent: function(index) {
    var recordCache = get(this, 'recordCache');
    var record = recordCache.objectAt(index);

    if (!record) {
      var store = get(this, 'store');
      var content = get(this, 'content');

      var contentObject = content.objectAt(index);

      if (contentObject !== undefined) {
        record = store.findByClientId(get(this, 'type'), contentObject);
        recordCache.replace(index, 1, [record]);
      }
    }

    return record;
  }
});
