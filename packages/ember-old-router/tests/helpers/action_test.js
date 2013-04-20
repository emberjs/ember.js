var dispatcher, view,
    ActionHelper = Ember.Handlebars.ActionHelper,
    originalRegisterAction = ActionHelper.registerAction;

var appendView = function() {
  Ember.run(function() { view.appendTo('#qunit-fixture'); });
};

module("Ember.Handlebars - action helper", {
  setup: function() {
    dispatcher = Ember.EventDispatcher.create();
    dispatcher.setup();
  },

  teardown: function() {
    Ember.run(function() {
      dispatcher.destroy();
      if (view) { view.destroy(); }
    });
  }
});

test("should output a data attribute with a guid", function() {
  view = Ember.View.create({
    template: Ember.Handlebars.compile('<a href="#" {{action "edit"}}>edit</a>')
  });

  appendView();

  ok(view.$('a').attr('data-ember-action').match(/\d+/), "A data-ember-action attribute with a guid was added");
});

test("should by default register a click event", function() {
  var registeredEventName;

  ActionHelper.registerAction = function(actionName, options) {
    registeredEventName = options.eventName;
  };

  view = Ember.View.create({
    template: Ember.Handlebars.compile('<a href="#" {{action "edit"}}>edit</a>')
  });

  appendView();

  equal(registeredEventName, 'click', "The click event was properly registered");

  ActionHelper.registerAction = originalRegisterAction;
});

test("should allow alternative events to be handled", function() {
  var registeredEventName;

  ActionHelper.registerAction = function(actionName, options) {
    registeredEventName = options.eventName;
  };

  view = Ember.View.create({
    template: Ember.Handlebars.compile('<a href="#" {{action "edit" on="mouseUp"}}>edit</a>')
  });

  appendView();

  equal(registeredEventName, 'mouseUp', "The alternative mouseUp event was properly registered");

  ActionHelper.registerAction = originalRegisterAction;
});

test("should by default target the parent view", function() {
  var registeredTarget;

  ActionHelper.registerAction = function(actionName, options) {
    registeredTarget = options.target;
  };

  view = Ember.View.create({
    template: Ember.Handlebars.compile('<a href="#" {{action "edit"}}>edit</a>')
  });

  appendView();

  equal(registeredTarget, view, "The parent view was registered as the target");

  ActionHelper.registerAction = originalRegisterAction;
});

test("should by default target the state manager on the controller if it exists", function() {
  var registeredTarget;

  var sent = 0;

  view = Ember.View.create({
    controller: Ember.Controller.create({
      target: Ember.Object.create({
        isState: true,
        send: function(context) {
          sent++;
        }
      })
    }),
    template: Ember.Handlebars.compile('<a id="ember-link" href="#" {{action "edit"}}>edit</a>')
  });

  appendView();

  Ember.$("#ember-link").click();
  equal(sent, 1, "The action was sent to the state manager");
});

test("should allow a target to be specified", function() {
  var registeredTarget;

  ActionHelper.registerAction = function(actionName, options) {
    registeredTarget = options.target;
  };

  var anotherTarget = Ember.View.create();

  view = Ember.View.create({
    template: Ember.Handlebars.compile('<a href="#" {{action "edit" target="view.anotherTarget"}}>edit</a>'),
    anotherTarget: anotherTarget
  });

  appendView();

  equal(registeredTarget, anotherTarget, "The specified target was registered");

  ActionHelper.registerAction = originalRegisterAction;

  Ember.run(function() { anotherTarget.destroy(); });
});

test("should register an event handler", function() {
  var eventHandlerWasCalled = false;

  view = Ember.View.create({
    template: Ember.Handlebars.compile('<a href="#" {{action "edit"}}>click me</a>'),
    edit: function() { eventHandlerWasCalled = true; }
  });

  appendView();

  var actionId = view.$('a[data-ember-action]').attr('data-ember-action');

  ok(Ember.Handlebars.ActionHelper.registeredActions[actionId], "The action was registered");

  view.$('a').trigger('click');

  ok(eventHandlerWasCalled, "The event handler was called");
});

test("should be able to use action more than once for the same event within a view", function() {
  var editWasCalled = false,
      deleteWasCalled = false,
      originalEventHandlerWasCalled = false;

  view = Ember.View.create({
    template: Ember.Handlebars.compile(
      '<a id="edit" href="#" {{action "edit"}}>edit</a><a id="delete" href="#" {{action "delete"}}>delete</a>'
    ),
    click: function() { originalEventHandlerWasCalled = true; },
    edit: function() { editWasCalled = true; return false; },
    "delete": function() { deleteWasCalled = true; return false; }
  });

  appendView();

  view.$('#edit').trigger('click');

  ok(editWasCalled && !deleteWasCalled && !originalEventHandlerWasCalled, "Only the edit action was called");

  editWasCalled = deleteWasCalled = originalEventHandlerWasCalled = false;

  view.$('#delete').trigger('click');

  ok(!editWasCalled && deleteWasCalled && !originalEventHandlerWasCalled, "Only the delete action was called");

  editWasCalled = deleteWasCalled = originalEventHandlerWasCalled = false;

  view.$().trigger('click');

  ok(!editWasCalled && !deleteWasCalled && originalEventHandlerWasCalled, "Only the original event handler was called");
});

test("should work properly in an #each block", function() {
  var eventHandlerWasCalled = false;

  view = Ember.View.create({
    items: Ember.A([1, 2, 3, 4]),
    template: Ember.Handlebars.compile('{{#each view.items}}<a href="#" {{action "edit"}}>click me</a>{{/each}}'),
    edit: function() { eventHandlerWasCalled = true; }
  });

  appendView();

  view.$('a').trigger('click');

  ok(eventHandlerWasCalled, "The event handler was called");
});

test("should work properly in a #with block", function() {
  var eventHandlerWasCalled = false;

  view = Ember.View.create({
    something: {ohai: 'there'},
    template: Ember.Handlebars.compile('{{#with view.something}}<a href="#" {{action "edit"}}>click me</a>{{/with}}'),
    edit: function() { eventHandlerWasCalled = true; }
  });

  appendView();

  view.$('a').trigger('click');

  ok(eventHandlerWasCalled, "The event handler was called");
});

test("should unregister event handlers on rerender", function() {
  var eventHandlerWasCalled = false;

  view = Ember.View.create({
    template: Ember.Handlebars.compile('<a href="#" {{action "edit"}}>click me</a>'),
    edit: function() { eventHandlerWasCalled = true; }
  });

  appendView();

  var previousActionId = view.$('a[data-ember-action]').attr('data-ember-action');

  Ember.run(function(){
    view.rerender();
  });

  ok(!Ember.Handlebars.ActionHelper.registeredActions[previousActionId], "On rerender, the event handler was removed");

  var newActionId = view.$('a[data-ember-action]').attr('data-ember-action');

  ok(Ember.Handlebars.ActionHelper.registeredActions[newActionId], "After rerender completes, a new event handler was added");
});

test("should properly capture events on child elements of a container with an action", function() {
  var eventHandlerWasCalled = false;

  view = Ember.View.create({
    template: Ember.Handlebars.compile('<div {{action "edit"}}><button>click me</button></div>'),
    edit: function() { eventHandlerWasCalled = true; }
  });

  appendView();

  view.$('button').trigger('click');

  ok(eventHandlerWasCalled, "Event on a child element triggered the action of it's parent");
});

test("should allow bubbling of events from action helper to original parent event", function() {
  var eventHandlerWasCalled = false,
      originalEventHandlerWasCalled = false;

  view = Ember.View.create({
    template: Ember.Handlebars.compile('<a href="#" {{action "edit"}}>click me</a>'),
    click: function() { originalEventHandlerWasCalled = true; },
    edit: function() { eventHandlerWasCalled = true; }
  });

  appendView();

  view.$('a').trigger('click');

  ok(eventHandlerWasCalled && originalEventHandlerWasCalled, "Both event handlers were called");
});

test("should not bubble an event from action helper to original parent event if it returns false", function() {
  var eventHandlerWasCalled = false,
      originalEventHandlerWasCalled = false;

  view = Ember.View.create({
    template: Ember.Handlebars.compile('<a href="#" {{action "edit"}}>click me</a>'),
    click: function() { originalEventHandlerWasCalled = true; },
    edit: function() { eventHandlerWasCalled = true; return false; }
  });

  appendView();

  view.$('a').trigger('click');

  ok(eventHandlerWasCalled, "The child handler was called");
  ok(!originalEventHandlerWasCalled, "The parent handler was not called");
});

test("should be compatible with sending events to a state manager", function() {
  var eventNameCalled,
      eventObjectSent,
      manager = {
        isState: true,
        send: function(eventName, eventObject) { eventNameCalled = eventName; eventObjectSent = eventObject; }
      };

  view = Ember.View.create({
    template: Ember.Handlebars.compile('<a href="#" {{action "edit" target="view.manager"}}>click me</a>'),
    manager: manager
  });

  appendView();

  view.$('a').trigger('click');

  equal(eventNameCalled, "edit", "The state manager's send method was called");
  ok(eventObjectSent, "The state manager's send method was called with an event object");
});

test("should allow 'send' as action name (#594)", function() {
  var eventHandlerWasCalled = false;
  var eventObjectSent;

  view = Ember.View.create({
    template: Ember.Handlebars.compile('<a href="#" {{action "send" }}>send</a>'),
    send: function(evt){ eventHandlerWasCalled = true; eventObjectSent = evt; }
  });

  appendView();

  view.$('a').trigger('click');

  ok(eventHandlerWasCalled, "The view's send method was called");
  ok(eventObjectSent, "Callback was called with an event object");
});


test("should send the view, event and current Handlebars context to the action", function() {
  var passedTarget;
  var passedView;
  var passedEvent;
  var passedContext;

  var aTarget = Ember.View.create({
    edit: function(event) {
      passedTarget = this;
      passedEvent = event;
    }
  });

  var aContext = { aTarget: aTarget };

  view = Ember.View.create({
    aContext: aContext,
    template: Ember.Handlebars.compile('{{#with view.aContext}}<a id="edit" href="#" {{action edit this target="aTarget"}}>edit</a>{{/with}}')
  });

  appendView();

  view.$('#edit').trigger('click');

  strictEqual(passedTarget, aTarget, "the action is called with the target as this");
  strictEqual(passedEvent.view, view, "the view passed is the view containing the action helper");
  deepEqual(passedEvent.context, aContext, "the context is passed");
  equal(passedEvent.type, 'click', "the event passed is the event triggered for the action helper");

  Ember.run(function(){ aTarget.destroy(); });
});

test("should only trigger actions for the event they were registered on", function() {
  var editWasCalled = false;

  view = Ember.View.create({
    template: Ember.Handlebars.compile('<a href="#" {{action "edit"}}>edit</a>'),
    edit: function() { editWasCalled = true; }
  });

  appendView();

  view.$('a').trigger('dblclick');

  ok(!editWasCalled, "The action wasn't called");
});

test("should allow a context to be specified", function() {
  var passedContext,
      model = Ember.Object.create();

  view = Ember.View.create({
    people: Ember.A([model]),
    template: Ember.Handlebars.compile('{{#each person in view.people}}<button {{action edit person}}>edit</button>{{/each}}'),
    edit: function(event) {
      passedContext = event.context;
    }
  });

  appendView();

  view.$('button').trigger('click');

  equal(passedContext, model, "the action was called with the passed context");
});

test("should allow multiple contexts to be specified", function() {
  var passedContexts,
      models = [Ember.Object.create(), Ember.Object.create()];

  view = Ember.View.create({
    modelA: models[0],
    modelB: models[1],
    template: Ember.Handlebars.compile('<button {{action edit view.modelA view.modelB}}>edit</button>'),
    edit: function(event) {
      passedContexts = event.contexts;
    }
  });

  appendView();

  view.$('button').trigger('click');

  deepEqual(passedContexts, models, "the action was called with the passed contexts");
});

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

  view = Ember.View.create({
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
  var showCalled = false;

  view = Ember.View.create({
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
});

module("Ember.Handlebars - added allowed action events", {
  setup: function() {
    dispatcher = Ember.EventDispatcher.create();

    // add keyDown to allwed events which can be handled with an {{action}} helper
    dispatcher.setup({}, ['keyDown']);
  },

  teardown: function() {
    Ember.run(function() {
      dispatcher.destroy();
      if (view) { view.destroy(); }
    });
  }
});

test("should raise an exception when an event is tried to be handled with an action helper, but this event is not allowed", function() {
  var editWasCalled = false;

  view = Ember.View.create({
    template: Ember.Handlebars.compile('<a href="#" {{action "edit" target="view" on="touchStart" }}>edit</a>'),
    edit: function() { editWasCalled = true; }
  });

  appendView();

  raises(function() {
    view.$('a').trigger('touchstart');
  }, Error);

  ok(!editWasCalled, "The action wasn't called");
});

test("it is possible to add additional allowed events which can be handled by the action helper", function() {
  var editWasCalled = false;

  view = Ember.View.create({
    template: Ember.Handlebars.compile('<a href="#" {{action "edit" target="view" on="keyDown" }}>edit</a>'),
    edit: function() { editWasCalled = true; }
  });

  appendView();

  view.$('a').trigger('keydown');

  ok(editWasCalled, "The action has been called");
});
