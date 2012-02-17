var application, view,
    ActionHelper = Ember.Handlebars.ActionHelper,
    originalRegisterAction = ActionHelper.registerAction;

var appendView = function() {
  Ember.run(function() { view.appendTo('#qunit-fixture'); });
};

module("Ember.Handlebars - action helper", {
  setup: function() {
    application = Ember.Application.create();
  },

  teardown: function() {
    Ember.run(function() {
      view.destroy();
      application.destroy();
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

  ActionHelper.registerAction = function(actionName, eventName) {
    registeredEventName = eventName;
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

  ActionHelper.registerAction = function(actionName, eventName) {
    registeredEventName = eventName;
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

  ActionHelper.registerAction = function(actionName, eventName, target) {
    registeredTarget = target;
  };

  view = Ember.View.create({
    template: Ember.Handlebars.compile('<a href="#" {{action "edit"}}>edit</a>')
  });

  appendView();

  equal(registeredTarget, view, "The parent view was registered as the target");

  ActionHelper.registerAction = originalRegisterAction;
});

test("should allow a target to be specified", function() {
  var registeredTarget;

  ActionHelper.registerAction = function(actionName, eventName, target) {
    registeredTarget = target;
  };

  var anotherTarget = Ember.View.create();

  view = Ember.View.create({
    template: Ember.Handlebars.compile('<a href="#" {{action "edit" target="anotherTarget"}}>edit</a>'),
    anotherTarget: anotherTarget
  });

  appendView();

  equal(registeredTarget, anotherTarget, "The specified target was registered");

  ActionHelper.registerAction = originalRegisterAction;
});

test("should attach an event handler on the parent view", function() {
  var eventHandlerWasCalled = false;

  view = Ember.View.create({
    template: Ember.Handlebars.compile('<a href="#" {{action "edit"}}>click me</a>'),
    edit: function() { eventHandlerWasCalled = true; }
  });

  appendView();

  ok('function' === typeof view.click, "An event handler was added to the parent view");

  view.$('a').trigger('click');

  ok(eventHandlerWasCalled, "The event handler was called");
});

test("should wrap an existing event handler on the parent view", function() {
  var eventHandlerWasCalled = false,
      originalEventHandlerWasCalled = false;

  view = Ember.View.create({
    template: Ember.Handlebars.compile('<a href="#" {{action "edit"}}>click me</a>'),
    click: function() { originalEventHandlerWasCalled = true; },
    edit: function() { eventHandlerWasCalled = true; return false; }
  });

  appendView();

  view.$('a').trigger('click');

  ok(eventHandlerWasCalled, "The event handler was called");
  ok(!originalEventHandlerWasCalled, "The parent view's event handler wasn't called");

  eventHandlerWasCalled = originalEventHandlerWasCalled = false;

  view.$().trigger('click');

  ok(!eventHandlerWasCalled, "The event handler wasn't called");
  ok(originalEventHandlerWasCalled, "The parent view's event handler was called");
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
    template: Ember.Handlebars.compile('{{#each items}}<a href="#" {{action "edit"}}>click me</a>{{/each}}'),
    edit: function() { eventHandlerWasCalled = true; }
  });

  appendView();

  ok('function' === typeof view.click, "The event handler was added to the parent view");

  view.$('a').trigger('click');

  ok(eventHandlerWasCalled, "The event handler was called");
});

test("should work properly in a #with block", function() {
  var eventHandlerWasCalled = false;

  view = Ember.View.create({
    something: {ohai: 'there'},
    template: Ember.Handlebars.compile('{{#with something}}<a href="#" {{action "edit"}}>click me</a>{{/with}}'),
    edit: function() { eventHandlerWasCalled = true; }
  });

  appendView();

  ok('function' === typeof view.click, "The event handler was added to the parent view");

  view.$('a').trigger('click');

  ok(eventHandlerWasCalled, "The event handler was called");
});

test("should unwrap parent view event handlers on rerender", function() {
  var eventHandlerWasCalled = false;

  view = Ember.View.create({
    template: Ember.Handlebars.compile('<a href="#" {{action "edit"}}>click me</a>'),
    edit: function() { eventHandlerWasCalled = true; }
  });

  appendView();

  ok('function' === typeof view.click, "The event handler was added to the parent view");

  view.rerender();

  ok(view.click === null, "On rerender, the event handler was removed");

  Ember.run.end();

  ok('function' === typeof view.click, "After rerender completes, a new event handler was added");
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
    edit: function() { eventHandlerWasCalled = true; return true; }
  });

  appendView();

  view.$('a').trigger('click');

  ok(eventHandlerWasCalled && originalEventHandlerWasCalled, "Both event handlers were called");
});

test("should be compatible with sending events to a state manager", function() {
  var sendWasCalled = false,
      eventNameSent,
      eventObjectSent,
      fakeManager = {
        send: function(eventName, actionEvent) { sendWasCalled = true; eventNameSent = eventName; eventObjectSent = actionEvent; }
      };

  view = Ember.View.create({
    template: Ember.Handlebars.compile('<a href="#" {{action "edit" target="fakeManager"}}>click me</a>'),
    fakeManager: fakeManager
  });

  appendView();

  view.$('a').trigger('click');

  ok(sendWasCalled, "The state manager's send method was called");
  equal(eventNameSent, "edit", "The edit event was sent to the state manager");
  ok(eventObjectSent, "The state manager's send method was called with an event object");
});

test("should send the view, event and current Handlebars context to the action", function() {
  var passedTarget;
  var passedView;
  var passedEvent;
  var passedContext;

  var aTarget = Ember.View.create({
    edit: function(view, event, context) {
      passedTarget = this;
      passedView = view;
      passedEvent = event;
      passedContext = context;
    }
  });

  var aContext = { aTarget: aTarget };

  view = Ember.View.create({
    aContext: aContext,
    template: Ember.Handlebars.compile('{{#with aContext}}<a id="edit" href="#" {{action "edit" target="aTarget"}}>edit</a>{{/with}}')
  });

  appendView();

  view.$('#edit').trigger('click');

  strictEqual(passedTarget, aTarget, "the action is called with the target as this");
  strictEqual(passedView, view, "the view passed is the view containing the action helper");
  deepEqual(passedContext, aContext, "the context passed is the context surrounding the action helper");
  equal(passedEvent.type, 'click', "the event passed is the event triggered for the action helper");
});
