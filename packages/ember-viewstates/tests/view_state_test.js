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
  equal(viewState.entered, 1, "viewState receives enter event when transitioning to current state");
});

test("it throws an error when the view passed is not an Ember.View", function() {
  var viewState = Ember.ViewState.extend({
    view: Ember.Object.create({
      foo: 1
    })
  });

  var stateManager;

  Ember.run(function() {
    raises(function() {
      stateManager = Ember.StateManager.create({
        start: viewState
      });
    }, Error);
  });
});

test("it creates and appends a view when it is entered", function() {
  var viewState = Ember.ViewState.extend({
    view: Ember.View.extend({
      elementId: 'test-view'
    })
  });

  var stateManager;

  Ember.run(function() {
    stateManager = Ember.StateManager.create({
      start: viewState
    });
  });

  equal(Ember.$('#test-view').length, 1, "found view within custom id in DOM");

  stateManager.getPath('currentState.view').remove();
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

  equal(Ember.$('#test-view').length, 1, "found view with custom id in DOM");

  Ember.run(function() {
    stateManager.goToState('other');
  });

  equal(Ember.$('#test-view').length, 0, "can't find view with custom id in DOM");
});

test("it appends and removes a view to the element specified in its state manager", function() {
  var view = Ember.View.create({
    elementId: 'test-view'
  });

  var viewState = Ember.ViewState.create({
    view: view
  });

  var stateManager;

  Ember.$('<div id="my-container"></div>').appendTo(Ember.$('#qunit-fixture'));

  equal(Ember.$('#qunit-fixture > #my-container')[0].childNodes.length, 0, "precond - container does not have any child nodes");

  Ember.run(function() {
    stateManager = Ember.StateManager.create({
      rootElement: '#qunit-fixture > #my-container',
      start: viewState,

      other: Ember.ViewState.create()
    });
  });

  equal(Ember.$('#test-view').length, 1, "found view with custom id in DOM");
  equal(Ember.$("#test-view").parent().attr('id'), "my-container", "appends view to the correct element");

  Ember.run(function() {
    stateManager.goToState('other');
  });

  equal(Ember.$('#test-view').length, 0, "can't find view with custom id in DOM");
});

test("it appends and removes a view to the view specified in the state manager's rootView property", function() {
  var view = Ember.View.create({
    elementId: 'test-view'
  });

  var otherView = Ember.View.create({
    elementId: 'test-other-view'
  });

  var viewState = Ember.ViewState.create({
    view: view
  });

  var rootView = Ember.ContainerView.create({
    elementId: 'root-view'
  });

  Ember.run(function() {
    rootView.appendTo('#qunit-fixture');
  });

  equal(getPath(rootView, 'childViews.length'), 0, "precond - root container should not have any child views");


  var stateManager;
  Ember.run(function() {
    stateManager = Ember.StateManager.create({
      rootView: rootView,
      initialState: 'start',

      states: {
        start: viewState,

        other: Ember.ViewState.create(),
        otherWithView: Ember.ViewState.create({
          view: otherView
        })
      }
    });
  });

  equal(getPath(rootView, 'childViews.length'), 1, "when transitioning into a view state, its view should be added as a child of the root view");
  equal(get(rootView, 'childViews').objectAt(0), view, "the view added is the view state's view");

  Ember.run(function() {
    stateManager.goToState('other');
  });

  equal(getPath(rootView, 'childViews.length'), 0, "transitioning to a state without a view should remove the previous view");

  Ember.run(function() {
    stateManager.goToState('otherWithView');
  });

  equal(get(rootView, 'childViews').objectAt(0), otherView, "the view added is the otherView state's view");

  Ember.run(function() {
    stateManager.goToState('start');
  });
  equal(getPath(rootView, 'childViews.length'), 1, "when transitioning into a view state, its view should be added as a child of the root view");
  equal(get(rootView, 'childViews').objectAt(0), view, "the view added is the view state's view");
});

test("it reports the view associated with the current view state, if any", function() {
  var view = Ember.View.create();

  var stateManager = Ember.StateManager.create({
    foo: Ember.ViewState.create({
      view: view,
      bar: Ember.State.create()
    })
  });

  stateManager.goToState('foo.bar');

  equal(get(stateManager, 'currentView'), view, "returns nearest parent view state's view");
});

