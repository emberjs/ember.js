module("Ember.Routable");

var locationStub = {};

test("it should have its updateRoute method called when it is entered", function() {
  expect(2);


  var state = Ember.State.create({
    route: 'foo',
    updateRoute: function(manager, location) {
      ok(true, "updateRoute was called");
      strictEqual(location, locationStub);
    }
  });

  var stateManager = Ember.StateManager.create({
    location: locationStub,
    start: Ember.State.create({
      ready: function(manager) {
        manager.goToState('initial');
      },

      initial: state
    })
  });

  stateManager.send('ready');
});

test("when you call `route` on the StateManager, it calls it on the current state", function() {
  expect(2);

  var state = Ember.State.create({
    routePath: function(manager, path) {
      equal(path, 'hookers/and/blow', "correct path is passed to route");
    }
  });

  var stateManager = Ember.StateManager.create({
    location: locationStub,
    start: Ember.State.create({
      ready: function(manager) {
        manager.goToState('initial');
      },

      initial: state
    })
  });

  stateManager.send('ready');
  stateManager.route('/hookers/and/blow');
  stateManager.route('hookers/and/blow');
});

test("a state can enumerate its child states that are routable", function() {
  var match;

  var state = Ember.State.create({
    fooChildState: Ember.State.create({
      route: 'foo'
    }),

    barChildState: Ember.State.create({
      route: 'bar'
    })
  });

  var routeMatcher = state.get('routeMatcher');

  match = routeMatcher.match('foo');
  equal(match.state, state.get('fooChildState'));
  deepEqual(match.hash, {});

  match = routeMatcher.match('bar');
  equal(match.state, state.get('barChildState'));
  deepEqual(match.hash, {});

  match = routeMatcher.match('/foo');
  equal(match.state, state.get('fooChildState'));
  deepEqual(match.hash, {});

  match = routeMatcher.match('/bar');
  equal(match.state, state.get('barChildState'));
  deepEqual(match.hash, {});
});

test("route repeatedly descends into a nested hierarchy", function() {
  var state = Ember.State.create({
    fooChild: Ember.State.create({
      route: 'foo',

      barChild: Ember.State.create({
        route: 'bar',

        bazChild: Ember.State.create({
          route: 'baz'
        })
      })
    })
  });

  var stateManager = Ember.StateManager.create({
    start: state
  });

  stateManager.route("/foo/bar/baz");

  equal(stateManager.getPath('currentState.path'), 'start.fooChild.barChild.bazChild');
});

test("when you descend into a state, the route is set", function() {
  var state = Ember.State.create({
    ready: function(manager) {
      manager.goToState('fooChild.barChild.bazChild');
    },

    fooChild: Ember.State.create({
      route: 'foo',

      barChild: Ember.State.create({
        route: 'bar',

        bazChild: Ember.State.create({
          route: 'baz'
        })
      })
    })
  });

  var count = 0;

  var stateManager = Ember.StateManager.create({
    start: state,
    location: {
      setUrl: function(url) {
        if (count === 0) {
          equal(url, '/foo/bar/baz', "The current URL should be passed in");
          count++;
        } else {
          ok(false, "Should not get here");
        }
      }
    }
  });

  stateManager.send('ready');
});
