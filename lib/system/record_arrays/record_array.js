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
    this.contentWillChange();
    this._super();
  },

  contentWillChange: Ember.beforeObserver(function() {
    set(this, 'recordCache', []);
  }, 'content'),

  contentArrayDidChange: function(array, index, removed, added) {
    var recordCache = get(this, 'recordCache');
    var args = [index, 0].concat(new Array(added));

    recordCache.splice.apply(recordCache, args);
  },

  contentArrayWillChange: function(array, index, removed, added) {
    var recordCache = get(this, 'recordCache');
    recordCache.splice(index, removed);
  },

  objectAtContent: function(index) {
    var recordCache = get(this, 'recordCache');
    var record = recordCache[index];

    if (!record) {
      var store = get(this, 'store');
      var content = get(this, 'content');

      var contentObject = content.objectAt(index);

      if (contentObject !== undefined) {
        record = store.findByClientId(get(this, 'type'), contentObject);
        recordCache[index] = record;
      }
    }

    return record;
  }
});
