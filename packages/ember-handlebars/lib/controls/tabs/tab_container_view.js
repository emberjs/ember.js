/**
@module ember
@submodule ember-handlebars
*/

/**
@class TabContainerView
@namespace Ember
@deprecated
@extends Ember.View
*/
Ember.TabContainerView = Ember.View.extend({
  init: function() {
    Ember.deprecate("Ember.TabContainerView is deprecated and will be removed from future releases.");
    this._super();
  }
});
