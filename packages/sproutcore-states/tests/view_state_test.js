require('sproutcore-states/view_state');

var get = SC.get, set = SC.set, getPath = SC.getPath, setPath = SC.setPath;

module("SC.ViewState");

test("it inherits from SC.State", function() {
  ok(SC.State.detect(SC.ViewState), "SC.ViewState is an SC.State");
});

test("it can act like a state in a state manager", function() {
  var viewState = SC.ViewState.create({
    entered: 0,

    enter: function() {
      this.entered++;
    }
  });

  var stateManager = SC.StateManager.create({
    start: viewState
  });

  ok(get(stateManager, 'currentState') === viewState, "automatically transitions to the view state");
  equals(viewState.entered, 1, "viewState receives enter event when transitioning to current state");
});

test("it appends and removes a view when it is entered and exited", function() {
  var view = SC.View.create({
    elementId: 'test-view'
  });

  var viewState = SC.ViewState.create({
    view: view
  });

  var stateManager;

  SC.run(function() {
    stateManager = SC.StateManager.create({
      start: viewState,

      other: SC.ViewState.create()
    });
  });

  equals(SC.$('#test-view').length, 1, "found view with custom id in DOM");

  SC.run(function() {
    stateManager.goToState('other');
  });

  equals(SC.$('#test-view').length, 0, "can't find view with custom id in DOM");
});

test("it appends and removes a view to the element specified in its state manager", function() {
  var view = SC.View.create({
    elementId: 'test-view'
  });

  var viewState = SC.ViewState.create({
    view: view
  });

  var stateManager;

  $('<div id="my-container"></div>').appendTo($('#qunit-fixture'));

  equals($('#qunit-fixture > #my-container')[0].childNodes.length, 0, "precond - container does not have any child nodes");

  SC.run(function() {
    stateManager = SC.StateManager.create({
      rootElement: '#qunit-fixture > #my-container',
      start: viewState,

      other: SC.ViewState.create()
    });
  });

  equals(SC.$('#test-view').length, 1, "found view with custom id in DOM");
  equals($("#test-view").parent().attr('id'), "my-container", "appends view to the correct element");

  SC.run(function() {
    stateManager.goToState('other');
  });

  equals(SC.$('#test-view').length, 0, "can't find view with custom id in DOM");
});
