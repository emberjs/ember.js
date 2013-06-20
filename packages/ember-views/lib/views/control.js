require("ember-views/views/view");

Ember.Control = Ember.View.extend({
  init: function() {
    this._super();
    this.set('context', this);
    this.set('controller', this);
  }
});
