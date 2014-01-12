var get = Ember.get, set = Ember.set,
    a_slice = Array.prototype.slice;

var component, controller, actionCounts, sendCount, actionArguments;

module("Ember.Component", {
  setup: function(){
    component = Ember.Component.create();
  },
  teardown: function() {
    Ember.run(function() {
      if(component)  { component.destroy(); }
      if(controller) { controller.destroy(); }
    });

    Ember.TESTING_DEPRECATION = false;
    Ember.ENV.RAISE_ON_DEPRECATION = false;
  }
});

test("The context of an Ember.Component is itself", function() {
  strictEqual(component, component.get('context'), "A components's context is itself");
});

test("The controller (target of `action`) of an Ember.Component is itself", function() {
  strictEqual(component, component.get('controller'), "A components's controller is itself");
});

test("A templateName specified to a component is moved to the layoutName", function(){
  Ember.TESTING_DEPRECATION = true;

  component = Ember.Component.extend({
    templateName: 'blah-blah'
  }).create();

  equal(component.get('layoutName'), 'blah-blah', "The layoutName now contains the templateName specified.");
});

test("A template specified to a component is moved to the layout", function(){
  Ember.TESTING_DEPRECATION = true;

  component = Ember.Component.extend({
    template: 'blah-blah'
  }).create();

  equal(component.get('layout'), 'blah-blah', "The layoutName now contains the templateName specified.");
});

test("A template specified to a component is deprecated", function(){
  Ember.ENV.RAISE_ON_DEPRECATION = true;

  try {
    component = Ember.Component.extend({
      template: 'blah-blah'
    }).create();
  } catch (e) {
    equal(e.message, 'Do not specify template on a Component, use layout instead.', "deprecation warning is present");
  }
});

test("A templateName specified to a component is deprecated", function(){
  Ember.ENV.RAISE_ON_DEPRECATION = true;

  try {
    component = Ember.Component.extend({
      templateName: 'blah-blah'
    }).create();
  } catch (e) {
    equal(e.message, 'Do not specify templateName on a Component, use layoutName instead.', "deprecation warning is present");
  }
});

test("Specifying both templateName and layoutName to a component is NOT deprecated", function(){
  expect(0);

  Ember.ENV.RAISE_ON_DEPRECATION = true;

  try {
    component = Ember.Component.extend({
      templateName: 'blah-blah',
      layoutName: 'hum-drum'
    }).create();
  } catch (e) {
    ok(false, "deprecation should not be thrown");
  }
});

module("Ember.Component - Actions", {
  setup: function() {
    actionCounts = {};
    sendCount = 0;
    actionArguments = null;

    controller = Ember.Object.create({
      send: function(actionName) {
        sendCount++;
        actionCounts[actionName] = actionCounts[actionName] || 0;
        actionCounts[actionName]++;
        actionArguments = a_slice.call(arguments, 1);
      }
    });

    component = Ember.Component.create({
      _parentView: Ember.View.create({
        controller: controller
      })
    });
  },

  teardown: function() {
    Ember.run(function() {
      component.destroy();
      controller.destroy();
    });
  }
});

test("Calling sendAction on a component without an action defined does nothing", function() {
  component.sendAction();
  equal(sendCount, 0, "addItem action was not invoked");
});

test("Calling sendAction on a component with an action defined calls send on the controller", function() {
  set(component, 'action', "addItem");

  component.sendAction();

  equal(sendCount, 1, "send was called once");
  equal(actionCounts['addItem'], 1, "addItem event was sent once");
});

test("Calling sendAction with a named action uses the component's property as the action name", function() {
  set(component, 'playing', "didStartPlaying");
  set(component, 'action', "didDoSomeBusiness");

  component.sendAction('playing');

  equal(sendCount, 1, "send was called once");
  equal(actionCounts['didStartPlaying'], 1, "named action was sent");

  component.sendAction('playing');

  equal(sendCount, 2, "send was called twice");
  equal(actionCounts['didStartPlaying'], 2, "named action was sent");

  component.sendAction();

  equal(sendCount, 3, "send was called three times");
  equal(actionCounts['didDoSomeBusiness'], 1, "default action was sent");
});

test("Calling sendAction when the action name is not a string raises an exception", function() {
  set(component, 'action', {});
  set(component, 'playing', {});

  expectAssertion(function() {
    component.sendAction();
  });

  expectAssertion(function() {
    component.sendAction('playing');
  });
});

test("Calling sendAction on a component with a context", function() {
  set(component, 'playing', "didStartPlaying");

  var testContext = {song: 'She Broke My Ember'};

  component.sendAction('playing', testContext);

  deepEqual(actionArguments, [testContext], "context was sent with the action");
});

test("Calling sendAction on a component with multiple parameters", function() {
  set(component, 'playing', "didStartPlaying");

  var firstContext  = {song: 'She Broke My Ember'},
      secondContext = {song: 'My Achey Breaky Ember'};

  component.sendAction('playing', firstContext, secondContext);

  deepEqual(actionArguments, [firstContext, secondContext], "arguments were sent to the action");
});
