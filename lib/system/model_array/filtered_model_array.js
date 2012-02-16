require("ember-data/system/model_array");

var get = Ember.get;

DS.FilteredModelArray = DS.ModelArray.extend({
  filterFunction: null,

  updateFilter: Ember.observer(function() {
    var store = get(this, 'store');
    store.updateModelArrayFilter(this, get(this, 'type'), get(this, 'filterFunction'));
  }, 'filterFunction')
});
