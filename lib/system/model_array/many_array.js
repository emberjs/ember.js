require("ember-data/system/model_array");

var get = Ember.get, set = Ember.set;

DS.ManyArray = DS.ModelArray.extend({
  parentRecord: null,

  // Overrides Ember.Array's replace method to implement
  replace: function(index, removed, added) {
    var parentRecord = get(this, 'parentRecord');
    var pendingParent = parentRecord && !get(parentRecord, 'id');

    added = added.map(function(item) {
      ember_assert("You can only add items of " + (get(this, 'type') && get(this, 'type').toString()) + " to this association.", !get(this, 'type') || (get(this, 'type') === item.constructor));

      if (pendingParent) { item.send('waitingOn', parentRecord); }
      return item.get('clientId');
    });

    this._super(index, removed, added);
  }
});
