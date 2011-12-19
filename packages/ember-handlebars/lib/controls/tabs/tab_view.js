var get = Ember.get, setPath = Ember.setPath;

Ember.TabView = Ember.View.extend({
  tabsContainer: SC.computed(function() {
    return this.nearestInstanceOf(Ember.TabContainerView);
  }).property(),

  mouseUp: function() {
    setPath(this, 'tabsContainer.currentView', get(this, 'value'));
  }
});
