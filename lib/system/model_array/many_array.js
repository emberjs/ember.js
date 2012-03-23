require("ember-data/system/model_array/model_array");
require("ember-data/system/model_array/many_array_states");

var get = Ember.get, set = Ember.set, getPath = Ember.getPath;

DS.ManyArray = DS.ModelArray.extend({
  init: function() {
    set(this, 'stateManager', DS.ManyArrayStateManager.create({ manyArray: this }));

    return this._super();
  },

  parentRecord: null,

  isDirty: Ember.computed(function() {
    return getPath(this, 'stateManager.currentState.isDirty');
  }).property('stateManager.currentState').cacheable(),

  fetch: function() {
    var clientIds = get(this, 'content'),
        store = get(this, 'store'),
        type = get(this, 'type');

    var ids = clientIds.map(function(clientId) {
      return store.clientIdToId[clientId];
    });

    store.fetchMany(type, ids);
  },

  // Overrides Ember.Array's replace method to implement
  replace: function(index, removed, added) {
    var parentRecord = get(this, 'parentRecord');
    var pendingParent = parentRecord && !get(parentRecord, 'id');
    var stateManager = get(this, 'stateManager');

    added = added.map(function(record) {
      ember_assert("You can only add records of " + (get(this, 'type') && get(this, 'type').toString()) + " to this association.", !get(this, 'type') || (get(this, 'type') === record.constructor));

      if (pendingParent) {
        record.send('waitingOn', parentRecord);
      }

      this.assignInverse(record, parentRecord);

      stateManager.send('recordWasAdded', record);

      return record.get('clientId');
    }, this);

    var store = this.store;

    var len = index+removed, record;
    for (var i = index; i < len; i++) {
      // TODO: null out inverse FK
      record = this.objectAt(i);
      this.assignInverse(record, parentRecord, true);
      stateManager.send('recordWasAdded', record);
    }

    this._super(index, removed, added);
  },

  assignInverse: function(record, parentRecord, remove) {
    var associationMap = get(record.constructor, 'associations'),
        possibleAssociations = associationMap.get(parentRecord.constructor),
        possible, actual;

    if (!possibleAssociations) { return; }

    for (var i = 0, l = possibleAssociations.length; i < l; i++) {
      possible = possibleAssociations[i];

      if (possible.kind === 'belongsTo') {
        actual = possible;
        break;
      }
    }

    if (actual) {
      set(record, actual.name, remove ? null : parentRecord);
    }
  }
});
