var get = Ember.get;

Ember.TabPaneView = Ember.View.extend({
  tabsContainer: Ember.computed(function() {
    return this.nearestInstanceOf(Ember.TabContainerView);
  }).property().volatile(),

  isVisible: Ember.computed(function() {
    return get(this, 'viewName') === get(this, 'tabsContainer.currentView');
  }).property('tabsContainer.currentView').volatile(),

  init: function() {
    Ember.deprecate("Ember.TabPaneView is deprecated and will be removed from future releases.");
    this._super();
  }
});
