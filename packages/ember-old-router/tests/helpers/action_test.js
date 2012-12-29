var namespace = {
  "Component": {
    toString: function() { return "Component"; },
    find: function() { return { id: 1 }; }
  }
};

var compile = function(string) {
  return Ember.Handlebars.compile(string);
};

test("it sets an URL with a context", function() {
  var router = Ember.Router.create({
    location: {
      formatURL: function(url) {
        return url;
      },
      setURL: Ember.K
    },
    namespace: namespace,
    root: Ember.Route.create({
      index: Ember.Route.create({
        route: '/',

        showDashboard: function(router) {
          router.transitionTo('dashboard');
        },

        eventTransitions: {
          showDashboard: 'dashboard'
        }
      }),

      dashboard: Ember.Route.create({
        route: '/dashboard/:component_id'
      })
    })
  });

  Ember.run(function() {
    router.route("/");
  });

  equal(router.get('currentState.path'), "root.index", "precond - the current stat is root.index");

  var view = Ember.View.create({
    template: compile('<a {{action showDashboard controller.component href=true}}>test</a>')
  });

  var controller = Ember.Controller.create({
    target: router,
    component: { id: 1 }
  });

  Ember.run(function() {
    view.set('controller', controller);
    view.appendTo('#qunit-fixture');
  });

  ok(view.$().html().match(/href=['"].*\/dashboard\/1['"]/), "The html (" + view.$().html() + ") has the href /dashboard/1 in it");
});

test("it does not trigger action with special clicks", function() {
  var dispatcher = Ember.EventDispatcher.create();
  dispatcher.setup();

  var showCalled = false;

  var view = Ember.View.create({
    template: compile("<a {{action show href=true}}>Hi</a>")
  });

  var controller = Ember.Controller.create({
    target: {
      urlForEvent: function(event, context) {
        return "/foo/bar";
      },

      send: function(event, context) {
        this[event](context);
      },

      show: function() {
        showCalled = true;
      }
    }
  });

  Ember.run(function() {
    view.set('controller', controller);
    view.appendTo('#qunit-fixture');
  });

  function checkClick(prop, value, expected) {
    var event = Ember.$.Event("click");
    event[prop] = value;
    view.$('a').trigger(event);
    if (expected) {
      ok(showCalled, "should call action with "+prop+":"+value);
      ok(event.isDefaultPrevented(), "should prevent default");
    } else {
      ok(!showCalled, "should not call action with "+prop+":"+value);
      ok(!event.isDefaultPrevented(), "should not prevent default");
    }
  }

  checkClick('ctrlKey', true, false);
  checkClick('altKey', true, false);
  checkClick('metaKey', true, false);
  checkClick('shiftKey', true, false);
  checkClick('which', 2, false);

  checkClick('which', 1, true);
  checkClick('which', undefined, true); // IE <9

  Ember.run(function() {
    dispatcher.destroy();
  });
});

