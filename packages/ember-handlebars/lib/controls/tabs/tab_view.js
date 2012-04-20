var get = Ember.get, setPath = Ember.setPath;

Ember.TabView = Ember.View.extend({
  tabsContainer: Ember.computed(function() {
    return this.nearestInstanceOf(Ember.TabContainerView);
  }).property().volatile(),

  mouseUp: function() {
    setPath(this, 'tabsContainer.currentView', get(this, 'value'));
  }
});
