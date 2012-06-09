var get = Ember.get, getPath = Ember.getPath;

Ember.TabPaneView = Ember.View.extend({
  tabsContainer: Ember.computed(function() {
    return this.nearestInstanceOf(Ember.TabContainerView);
  }).property().uncached(),

  isVisible: Ember.computed(function() {
    return get(this, 'viewName') === getPath(this, 'tabsContainer.currentView');
  }).property('tabsContainer.currentView').uncached()
});
