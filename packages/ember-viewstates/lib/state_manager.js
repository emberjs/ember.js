var get = Ember.get;

Ember.StateManager.reopen(
/** @scope Ember.StateManager.prototype */ {

  /**
    If the current state is a view state or the descendent of a view state,
    this property will be the view associated with it. If there is no
    view state active in this state manager, this value will be null.

    @type Ember.View
  */
  currentView: Ember.computed(function() {
    var currentState = get(this, 'currentState'),
        view;

    while (currentState) {
      // TODO: Remove this when view state is removed
      if (get(currentState, 'isViewState')) {
        view = get(currentState, 'view');
        if (view) { return view; }
      }

      currentState = get(currentState, 'parentState');
    }

    return null;
  }).property('currentState').cacheable()

});
