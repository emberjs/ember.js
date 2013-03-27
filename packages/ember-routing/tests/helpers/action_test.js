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

test("should by default target the view's controller", function() {
  var registeredTarget, controller = {};

  ActionHelper.registerAction = function(actionName, options) {
    registeredTarget = options.target;
  };

  view = Ember.View.create({
    controller: controller,
    template: Ember.Handlebars.compile('<a href="#" {{action "edit"}}>edit</a>')
  });

  appendView();

  equal(registeredTarget.root, controller, "The controller was registered as the target");

  ActionHelper.registerAction = originalRegisterAction;
});

test("should target the current controller inside an {{each}} loop", function() {
  var registeredTarget;

  ActionHelper.registerAction = function(actionName, options) {
    registeredTarget = options.target;
  };

  var itemController = Ember.ObjectController.create();

  var ArrayController = Ember.ArrayController.extend({
    itemController: 'stub',
    controllerAt: function(idx, object) {
      return itemController;
    }
  });

  var controller = ArrayController.create({
    model: Ember.A([1])
  });

  view = Ember.View.create({
    controller: controller,
    template: Ember.Handlebars.compile('{{#each controller}}{{action "editTodo"}}{{/each}}')
  });

  appendView();

  equal(registeredTarget.root, itemController, "the item controller is the target of action");

  ActionHelper.registerAction = originalRegisterAction;
});

test("should allow a target to be specified", function() {
  var registeredTarget;

  ActionHelper.registerAction = function(actionName, options) {
    registeredTarget = options.target;
  };

  var anotherTarget = Ember.View.create();

  view = Ember.View.create({
    controller: {},
    template: Ember.Handlebars.compile('<a href="#" {{action "edit" target="view.anotherTarget"}}>edit</a>'),
    anotherTarget: anotherTarget
  });

  appendView();

  equal(registeredTarget.options.data.keywords.view, view, "The specified target was registered");
  equal(registeredTarget.target, 'view.anotherTarget', "The specified target was registered");

  ActionHelper.registerAction = originalRegisterAction;

  Ember.run(function() {
    anotherTarget.destroy();
  });
});

test("should lazily evaluate the target", function() {
  var firstEdit = 0, secondEdit = 0;

  var controller = {};
  var first = {
    edit: function() {
      firstEdit++;
    }
  };

  var second = {
    edit: function() {
      secondEdit++;
    }
  };

  controller.theTarget = first;

  view = Ember.View.create({
    controller: controller,
    template: Ember.Handlebars.compile('<a href="#" {{action "edit" target="theTarget"}}>edit</a>')
  });

  appendView();

  Ember.run(function() {
    Ember.$('a').trigger('click');
  });

  equal(firstEdit, 1);

  Ember.set(controller, 'theTarget', second);

  Ember.run(function() {
    Ember.$('a').trigger('click');
  });

  equal(firstEdit, 1);
  equal(secondEdit, 1);
});

test("should register an event handler", function() {
  var eventHandlerWasCalled = false;

  var controller = Ember.Controller.extend({
    edit: function() { eventHandlerWasCalled = true; }
  }).create();

  view = Ember.View.create({
    controller: controller,
    template: Ember.Handlebars.compile('<a href="#" {{action "edit"}}>click me</a>')
  });

  appendView();

  var actionId = view.$('a[data-ember-action]').attr('data-ember-action');

  ok(Ember.Handlebars.ActionHelper.registeredActions[actionId], "The action was registered");

  view.$('a').trigger('click');

  ok(eventHandlerWasCalled, "The event handler was called");
});

test("handles whitelisted modifier keys", function() {
  var eventHandlerWasCalled = false;

  var controller = Ember.Controller.extend({
    edit: function() { eventHandlerWasCalled = true; }
  }).create();

  view = Ember.View.create({
    controller: controller,
    template: Ember.Handlebars.compile('<a href="#" {{action "edit" allowedKeys="alt"}}>click me</a>')
  });

  appendView();

  var actionId = view.$('a[data-ember-action]').attr('data-ember-action');

  ok(Ember.Handlebars.ActionHelper.registeredActions[actionId], "The action was registered");

  var e = Ember.$.Event('click');
  e.altKey = true;
  view.$('a').trigger(e);

  ok(eventHandlerWasCalled, "The event handler was called");
});


test("should be able to use action more than once for the same event within a view", function() {
  var editWasCalled = false,
      deleteWasCalled = false,
      originalEventHandlerWasCalled = false;

  var controller = Ember.Controller.extend({
    edit: function() { editWasCalled = true; },
    "delete": function() { deleteWasCalled = true; }
  }).create();

  view = Ember.View.create({
    controller: controller,
    template: Ember.Handlebars.compile(
      '<a id="edit" href="#" {{action "edit"}}>edit</a><a id="delete" href="#" {{action "delete"}}>delete</a>'
    ),
    click: function() { originalEventHandlerWasCalled = true; }
  });

  appendView();

  view.$('#edit').trigger('click');

  equal(editWasCalled, true, "The edit action was called");
  equal(deleteWasCalled, false, "The delete action was not called");

  editWasCalled = deleteWasCalled = originalEventHandlerWasCalled = false;

  view.$('#delete').trigger('click');

  equal(editWasCalled, false, "The edit action was not called");
  equal(deleteWasCalled, true, "The delete action was called");

  editWasCalled = deleteWasCalled = originalEventHandlerWasCalled = false;

  view.$().trigger('click');

  equal(editWasCalled, false, "The edit action was not called");
  equal(deleteWasCalled, false, "The delete action was not called");
});

test("the event should not bubble if `bubbles=false` is passed", function() {
  var editWasCalled = false,
      deleteWasCalled = false,
      originalEventHandlerWasCalled = false;

  var controller = Ember.Controller.extend({
    edit: function() { editWasCalled = true; },
    "delete": function() { deleteWasCalled = true; }
  }).create();

  view = Ember.View.create({
    controller: controller,
    template: Ember.Handlebars.compile(
      '<a id="edit" href="#" {{action "edit" bubbles=false}}>edit</a><a id="delete" href="#" {{action "delete" bubbles=false}}>delete</a>'
    ),
    click: function() { originalEventHandlerWasCalled = true; }
  });

  appendView();

  view.$('#edit').trigger('click');

  equal(editWasCalled, true, "The edit action was called");
  equal(deleteWasCalled, false, "The delete action was not called");
  equal(originalEventHandlerWasCalled, false, "The original event handler was not called");

  editWasCalled = deleteWasCalled = originalEventHandlerWasCalled = false;

  view.$('#delete').trigger('click');

  equal(editWasCalled, false, "The edit action was not called");
  equal(deleteWasCalled, true, "The delete action was called");
  equal(originalEventHandlerWasCalled, false, "The original event handler was not called");

  editWasCalled = deleteWasCalled = originalEventHandlerWasCalled = false;

  view.$().trigger('click');

  equal(editWasCalled, false, "The edit action was not called");
  equal(deleteWasCalled, false, "The delete action was not called");
  equal(originalEventHandlerWasCalled, true, "The original event handler was called");
});

test("should work properly in an #each block", function() {
  var eventHandlerWasCalled = false;

  var controller = Ember.Controller.extend({
    edit: function() { eventHandlerWasCalled = true; }
  }).create();

  view = Ember.View.create({
    controller: controller,
    items: Ember.A([1, 2, 3, 4]),
    template: Ember.Handlebars.compile('{{#each view.items}}<a href="#" {{action "edit"}}>click me</a>{{/each}}')
  });

  appendView();

  view.$('a').trigger('click');

  ok(eventHandlerWasCalled, "The event handler was called");
});

test("should work properly in a #with block", function() {
  var eventHandlerWasCalled = false;

  var controller = Ember.Controller.extend({
    edit: function() { eventHandlerWasCalled = true; }
  }).create();

  view = Ember.View.create({
    controller: controller,
    something: {ohai: 'there'},
    template: Ember.Handlebars.compile('{{#with view.something}}<a href="#" {{action "edit"}}>click me</a>{{/with}}')
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

test("should unregister event handlers on inside virtual views", function() {
  var things = Ember.A([
    {
      name: 'Thingy'
    }
  ]);
  view = Ember.View.create({
    template: Ember.Handlebars.compile('{{#each view.things}}<a href="#" {{action "edit"}}>click me</a>{{/each}}'),
    things: things
  });

  appendView();

  var actionId = view.$('a[data-ember-action]').attr('data-ember-action');

  Ember.run(function() {
    things.removeAt(0);
  });

  ok(!Ember.Handlebars.ActionHelper.registeredActions[actionId], "After the virtual view was destroyed, the action was unregistered");
});

test("should properly capture events on child elements of a container with an action", function() {
  var eventHandlerWasCalled = false;

  var controller = Ember.Controller.extend({
    edit: function() { eventHandlerWasCalled = true; }
  }).create();

  view = Ember.View.create({
    controller: controller,
    template: Ember.Handlebars.compile('<div {{action "edit"}}><button>click me</button></div>')
  });

  appendView();

  view.$('button').trigger('click');

  ok(eventHandlerWasCalled, "Event on a child element triggered the action of it's parent");
});

test("should allow bubbling of events from action helper to original parent event", function() {
  var eventHandlerWasCalled = false,
      originalEventHandlerWasCalled = false;

  var controller = Ember.Controller.extend({
    edit: function() { eventHandlerWasCalled = true; }
  }).create();

  view = Ember.View.create({
    controller: controller,
    template: Ember.Handlebars.compile('<a href="#" {{action "edit"}}>click me</a>'),
    click: function() { originalEventHandlerWasCalled = true; }
  });

  appendView();

  view.$('a').trigger('click');

  ok(eventHandlerWasCalled && originalEventHandlerWasCalled, "Both event handlers were called");
});

test("should not bubble an event from action helper to original parent event if `bubbles=false` is passed", function() {
  var eventHandlerWasCalled = false,
      originalEventHandlerWasCalled = false;

  var controller = Ember.Controller.extend({
    edit: function() { eventHandlerWasCalled = true; }
  }).create();

  view = Ember.View.create({
    controller: controller,
    template: Ember.Handlebars.compile('<a href="#" {{action "edit" bubbles=false}}>click me</a>'),
    click: function() { originalEventHandlerWasCalled = true; }
  });

  appendView();

  view.$('a').trigger('click');

  ok(eventHandlerWasCalled, "The child handler was called");
  ok(!originalEventHandlerWasCalled, "The parent handler was not called");
});

test("should allow 'send' as action name (#594)", function() {
  var eventHandlerWasCalled = false;
  var eventObjectSent;

  var controller = Ember.Controller.extend({
    send: function() { eventHandlerWasCalled = true; }
  }).create();

  view = Ember.View.create({
    controller: controller,
    template: Ember.Handlebars.compile('<a href="#" {{action "send" }}>send</a>')
  });

  appendView();

  view.$('a').trigger('click');

  ok(eventHandlerWasCalled, "The view's send method was called");
});


test("should send the view, event and current Handlebars context to the action", function() {
  var passedTarget;
  var passedContext;

  var aTarget = Ember.Controller.extend({
    edit: function(context) {
      passedTarget = this;
      passedContext = context;
    }
  }).create();

  var aContext = { aTarget: aTarget };

  view = Ember.View.create({
    aContext: aContext,
    template: Ember.Handlebars.compile('{{#with view.aContext}}<a id="edit" href="#" {{action edit this target="aTarget"}}>edit</a>{{/with}}')
  });

  appendView();

  view.$('#edit').trigger('click');

  strictEqual(passedTarget, aTarget, "the action is called with the target as this");
  strictEqual(passedContext, aContext, "the parameter is passed along");
});

test("should only trigger actions for the event they were registered on", function() {
  var editWasCalled = false;

  view = Ember.View.create({
    template: Ember.Handlebars.compile('<a href="#" {{action "edit"}}>edit</a>'),
    edit: function() { editWasCalled = true; }
  });

  appendView();

  view.$('a').trigger('mouseover');

  ok(!editWasCalled, "The action wasn't called");
});

test("should allow a context to be specified", function() {
  var passedContext,
      model = Ember.Object.create();

  var controller = Ember.Controller.extend({
    edit: function(context) {
      passedContext = context;
    }
  }).create();

  view = Ember.View.create({
    controller: controller,
    people: Ember.A([model]),
    template: Ember.Handlebars.compile('{{#each person in view.people}}<button {{action edit person}}>edit</button>{{/each}}')
  });

  appendView();

  view.$('button').trigger('click');

  equal(passedContext, model, "the action was called with the passed context");
});

test("should unwrap controllers passed as a context", function() {
  var passedContext,
      model = Ember.Object.create(),
      controller = Ember.ObjectController.extend({
        model: model,
        edit: function(context) {
          passedContext = context;
        }
      }).create();

  view = Ember.View.create({
    controller: controller,
    template: Ember.Handlebars.compile('<button {{action "edit" this}}>edit</button>')
  });

  appendView();

  view.$('button').trigger('click');

  equal(passedContext, model, "the action was passed the unwrapped model");
});

test("should allow multiple contexts to be specified", function() {
  var passedContexts,
      models = [Ember.Object.create(), Ember.Object.create()];

  var controller = Ember.Controller.extend({
    edit: function() {
      passedContexts = [].slice.call(arguments);
    }
  }).create();

  view = Ember.View.create({
    controller: controller,
    modelA: models[0],
    modelB: models[1],
    template: Ember.Handlebars.compile('<button {{action edit view.modelA view.modelB}}>edit</button>')
  });

  appendView();

  view.$('button').trigger('click');

  deepEqual(passedContexts, models, "the action was called with the passed contexts");
});

test("should allow multiple contexts to be specified", function() {
  var passedParams,
      model = Ember.Object.create();

  var controller = Ember.Controller.extend({
    edit: function() {
      passedParams = [].slice.call(arguments);
    }
  }).create();

  view = Ember.View.create({
    controller: controller,
    modelA: model,
    template: Ember.Handlebars.compile('<button {{action edit "herp" view.modelA}}>edit</button>')
  });

  appendView();

  view.$('button').trigger('click');

  deepEqual(passedParams, ["herp", model], "the action was called with the passed contexts");
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


