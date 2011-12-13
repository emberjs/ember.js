require('ember-states/view_state');

var get = Ember.get, set = Ember.set, getPath = Ember.getPath, setPath = Ember.setPath;

module("Ember.ViewState");

test("it inherits from Ember.State", function() {
  ok(Ember.State.detect(Ember.ViewState), "Ember.ViewState is an Ember.State");
});

test("it is duck-typed as a view state", function() {
  ok(get(Ember.ViewState.create(), 'isViewState'), "reports isViewState is true");
});

test("it can act like a state in a state manager", function() {
  var viewState = Ember.ViewState.create({
    entered: 0,

    enter: function() {
      this.entered++;
    }
  });

  var stateManager = Ember.StateManager.create({
    start: viewState
  });

  ok(get(stateManager, 'currentState') === viewState, "automatically transitions to the view state");
  equals(viewState.entered, 1, "viewState receives enter event when transitioning to current state");
});

test("it appends and removes a view when it is entered and exited", function() {
  var view = Ember.View.create({
    elementId: 'test-view'
  });

  var viewState = Ember.ViewState.create({
    view: view
  });

  var stateManager;

  Ember.run(function() {
    stateManager = Ember.StateManager.create({
      start: viewState,

      other: Ember.ViewState.create()
    });
  });

  equals(Ember.$('#test-view').length, 1, "found view with custom id in DOM");

  Ember.run(function() {
    stateManager.goToState('other');
  });

  equals(Ember.$('#test-view').length, 0, "can't find view with custom id in DOM");
});

test("it appends and removes a view to the element specified in its state manager", function() {
  var view = Ember.View.create({
    elementId: 'test-view'
  });

  var viewState = Ember.ViewState.create({
    view: view
  });

  var stateManager;

  $('<div id="my-container"></div>').appendTo($('#qunit-fixture'));

  equals($('#qunit-fixture > #my-container')[0].childNodes.length, 0, "precond - container does not have any child nodes");

  Ember.run(function() {
    stateManager = Ember.StateManager.create({
      rootElement: '#qunit-fixture > #my-container',
      start: viewState,

      other: Ember.ViewState.create()
    });
  });

  equals(Ember.$('#test-view').length, 1, "found view with custom id in DOM");
  equals($("#test-view").parent().attr('id'), "my-container", "appends view to the correct element");

  Ember.run(function() {
    stateManager.goToState('other');
  });

  equals(Ember.$('#test-view').length, 0, "can't find view with custom id in DOM");
});
