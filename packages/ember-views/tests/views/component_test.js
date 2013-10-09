var get = Ember.get, set = Ember.set;

module("Ember.Component");

var Component = Ember.Component.extend();

test("The context of an Ember.Component is itself", function() {
  var control = Component.create();
  strictEqual(control, control.get('context'), "A control's context is itself");
});

test("The controller (target of `action`) of an Ember.Component is itself", function() {
  var control = Component.create();
  strictEqual(control, control.get('controller'), "A control's controller is itself");
});

var component, controller, actionCounts, sendCount, actionContext, actionReturn = true;

module("Ember.Component - Actions", {
  setup: function() {
    actionCounts = {};
    sendCount = 0;
    actionContext = null;

    controller = Ember.Object.create({
      send: function(actionName, context) {
        sendCount++;
        actionCounts[actionName] = actionCounts[actionName] || 0;
        actionCounts[actionName]++;
        actionContext = context;

        return actionReturn;
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

  strictEqual(actionContext, testContext, "context was sent with the action");
});

test("it should return false if the event does", function(){
  actionReturn = false;

  set(component, 'playing', "didStartPlaying");

  var ret = component.sendAction('playing');

  equal(ret, false, 'action return value was returned');
});
