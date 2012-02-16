require("ember-data/system/model_array");

var get = Ember.get, set = Ember.set;

DS.AdapterPopulatedModelArray = DS.ModelArray.extend({
  query: null,
  isLoaded: false,

  load: function(array) {
    var store = get(this, 'store'), type = get(this, 'type');

    var clientIds = store.loadMany(type, array).clientIds;

    this.beginPropertyChanges();
    set(this, 'content', Ember.A(clientIds));
    set(this, 'isLoaded', true);
    this.endPropertyChanges();
  }
});

