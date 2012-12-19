require("ember-views/views/view");

var get = Ember.get, getPath = Ember.getPath, set = Ember.set;


/**
  @class

  A control is an Ember.View subclass which behaves slightly differently.

  Specifically, a control uses itself as its context and is generally controller-less.

  @extends Ember.View
*/
Ember.Control = Ember.View.extend({

  init: function() {
    this._super();
    
    // Once #1234 is merged in this can be moved out of init
    set(this, '_context', this);
  }

});