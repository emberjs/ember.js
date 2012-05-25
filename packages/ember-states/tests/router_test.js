module("router.urlForEvent");

var namespace = {
  "Component": {
    toString: function() { return "Component"; },
    find: function() { return { id: 1 }; }
  }
};


test("router.urlForEvent looks in the current state's eventTransitions hash", function() {
  var router = Ember.Router.create({
    namespace: namespace,
    root: Ember.State.create({
      index: Ember.State.create({
        route: '/',

        showDashboard: function(router) {
          router.transitionTo('dashboard');
        },

        eventTransitions: {
          showDashboard: 'dashboard'
        }
      }),

      dashboard: Ember.State.create({
        route: '/dashboard'
      })
    })
  });

  Ember.run(function() {
    router.route('/');
  });

  equal(router.getPath('currentState.path'), "root.index", "precond - the router is in root.index");

  var url = router.urlForEvent('showDashboard');
  equal(url, "/dashboard");
});

test("router.urlForEvent works with a context", function() {
  var router = Ember.Router.create({
    namespace: namespace,
    root: Ember.State.create({
      index: Ember.State.create({
        route: '/',

        showDashboard: function(router) {
          router.transitionTo('dashboard');
        },

        eventTransitions: {
          showDashboard: 'dashboard'
        }
      }),

      dashboard: Ember.State.create({
        route: '/dashboard/:component_id'
      })
    })
  });

  Ember.run(function() {
    router.route('/');
  });

  equal(router.getPath('currentState.path'), "root.index", "precond - the router is in root.index");

  var url = router.urlForEvent('showDashboard', { id: 1 });
  equal(url, "/dashboard/1");
});

test("router.urlForEvent works with Ember.State.transitionTo", function() {
  var router = Ember.Router.create({
    namespace: namespace,
    root: Ember.State.create({
      index: Ember.State.create({
        route: '/',

        showDashboard: Ember.State.transitionTo('dashboard')
      }),

      dashboard: Ember.State.create({
        route: '/dashboard/:component_id'
      })
    })
  });

  Ember.run(function() {
    router.route('/');
  });

  equal(router.getPath('currentState.path'), "root.index", "precond - the router is in root.index");

  var url = router.urlForEvent('showDashboard', { id: 1 });
  equal(url, "/dashboard/1");
});

