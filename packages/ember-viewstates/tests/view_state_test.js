var get = Ember.get, set = Ember.set, getPath = Ember.getPath, setPath = Ember.setPath;

var TestApp;

var appendView = function(stateManager) {
  var view = Ember.View.create({
    template: Ember.Handlebars.compile('{{outlet}}'),
    controller: stateManager.applicationController
  });
  Ember.run(function() { view.appendTo('#qunit-fixture'); });
};

module("Ember.ViewState", {
  setup: function() {
    Ember.run(function () {
      TestApp = Ember.Application.create();
    });


    TestApp.ApplicationController = Ember.Controller.extend();
  },

  teardown: function() {
    Ember.run(function () {
      TestApp.destroy();
    });
    TestApp = undefined;
  }
});

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
    view: Ember.Object.extend({
      foo: 1
    })
  });

  var stateManager;

  Ember.run(function() {
    raises(function() {
      stateManager = Ember.Router.create({
        root: viewState
      });
    }, Error);
  });
});

test("it creates and appends a view when it is entered", function() {
  TestApp.TestView = Ember.View.extend({
    elementId: 'test-view'
  });

  var stateManager;

  Ember.run(function() {
    stateManager = Ember.Router.create({
      root: Ember.State.create(),
      viewState: Ember.ViewState.extend({
        view: TestApp.TestView
      })
    });
  });

  Ember.run(function() {
    TestApp.initialize(stateManager);
    appendView(stateManager);

    stateManager.transitionTo('viewState');
  });

  equal(Ember.$('#test-view').length, 1, "found view within custom id in DOM");
});

test("it appends and removes a view when it is entered and exited", function() {
  TestApp.TestView = Ember.View.extend({
    elementId: 'test-view'
  });

  TestApp.OtherView = Ember.View.extend({
    elementId: 'other-view'
  });

  var stateManager;

  Ember.run(function() {
    stateManager = Ember.Router.create({
      root: Ember.State.create(),

      viewState: Ember.ViewState.create({
        view: TestApp.TestView
      }),

      other: Ember.ViewState.create({
        view: TestApp.OtherView
      })
    });
  });

  Ember.run(function() {
    TestApp.initialize(stateManager);
    appendView(stateManager);

    stateManager.transitionTo('viewState');
  });

  equal(Ember.$('#test-view').length, 1, "found view with custom id in DOM");

  Ember.run(function() {
    stateManager.transitionTo('other');
  });

  equal(Ember.$('#test-view').length, 0, "can't find view with custom id in DOM");
});
