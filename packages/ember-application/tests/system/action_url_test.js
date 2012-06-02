// FIXME: Move this to an integration test pacakge with proper requires
try {
  require('ember-handlebars');
} catch(e) { }

module("the {{action}} helper with href attribute");

var compile = function(string) {
  return Ember.Handlebars.compile(string);
};

var namespace = {
  "Component": {
    toString: function() { return "Component"; },
    find: function() { return { id: 1 }; }
  }
};

test("it generates the URL from the target", function() {
  var view = Ember.View.create({
    template: compile("<a {{action show href=true}}>Hi</a>")
  });

  var controller = Ember.Object.create(Ember.ControllerMixin, {
    target: {
      urlForEvent: function(event, context) {
        return "/foo/bar";
      }
    }
  });

  Ember.run(function() {
    view.set('controller', controller);
    view.appendTo('#qunit-fixture');
  });

  ok(view.$().html().match(/href=['"]\/foo\/bar['"]/), "The html (" + view.$().html() + ") does not have the href /foo/bar in it");
});

test("it does not generate the URL when href property is not specified", function() {
  var view = Ember.View.create({
    template: compile("<a {{action show}}>Hi</a>")
  });

  var controller = Ember.Object.create(Ember.ControllerMixin, {
    target: {
      urlForEvent: function(event, context) {
        return "/foo/bar";
      }
    }
  });

  Ember.run(function() {
    view.set('controller', controller);
    view.appendTo('#qunit-fixture');
  });

  ok(!view.$().html().match(/href=['"]\/foo\/bar['"]/), "The html (" + view.$().html() + ") has the href /foo/bar in it");
});

test("it sets a URL with a context", function() {
  var router = Ember.Router.create({
    location: null,
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
    router.route("/");
  });

  equal(router.getPath('currentState.path'), "root.index", "precond - the current stat is root.index");

  var view = Ember.View.create({
    template: compile('<a {{action showDashboard context="controller.component" href=true}}>')
  });

  var controller = {
    target: router,
    component: { id: 1 }
  };

  Ember.run(function() {
    view.set('controller', controller);
    view.appendTo('#qunit-fixture');
  });

  ok(view.$().html().match(/href=['"]\/dashboard\/1['"]/), "The html (" + view.$().html() + ") has the href /dashboard/1 in it");
});
