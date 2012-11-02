/**
@module ember
@submodule ember-handlebars
*/

var get = Ember.get, setPath = Ember.setPath;

/**
@class TabView
@namespace Ember
@extends Ember.View
@deprecated
*/
Ember.TabView = Ember.View.extend({
  tabsContainer: Ember.computed(function() {
    return this.nearestInstanceOf(Ember.TabContainerView);
  }).property().volatile(),

  mouseUp: function() {
    setPath(this, 'tabsContainer.currentView', get(this, 'value'));
  },

  init: function() {
    Ember.deprecate("Ember.TabView is deprecated and will be removed from future releases.");
    this._super();
  }
});
