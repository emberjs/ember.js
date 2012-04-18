var get = Ember.get, getPath = Ember.getPath;

Ember.TabPaneView = Ember.View.extend({
  tabsContainer: Ember.computed(function() {
    return this.nearestInstanceOf(Ember.TabContainerView);
  }).property().volatile(),

  isVisible: Ember.computed(function() {
    return get(this, 'viewName') === getPath(this, 'tabsContainer.currentView');
  }).property('tabsContainer.currentView').volatile()
});
