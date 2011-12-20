var get = Ember.get, getPath = Ember.getPath;

Ember.TabPaneView = Ember.View.extend({
  tabsContainer: SC.computed(function() {
    return this.nearestInstanceOf(Ember.TabContainerView);
  }).property(),

  isVisible: SC.computed(function() {
    return get(this, 'viewName') === getPath(this, 'tabsContainer.currentView');
  }).property('tabsContainer.currentView')
});
