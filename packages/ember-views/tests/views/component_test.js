import { set } from 'ember-metal/property_set';
import run from 'ember-metal/run_loop';
import EmberObject from 'ember-runtime/system/object';
import Service from 'ember-runtime/system/service';
import { Registry } from 'ember-runtime/system/container';
import inject from 'ember-runtime/inject';
import { get } from 'ember-metal/property_get';

import EmberView from 'ember-views/views/view';
import Component from 'ember-views/components/component';

import { MUTABLE_CELL } from 'ember-views/compat/attrs-proxy';

var a_slice = Array.prototype.slice;

var component, controller, actionCounts, sendCount, actionArguments;

QUnit.module('Ember.Component', {
  setup() {
    component = Component.create();
  },
  teardown() {
    run(function() {
      if (component) { component.destroy(); }
      if (controller) { controller.destroy(); }
    });
  }
});

QUnit.test('can access `actions` hash via `_actions` [DEPRECATED]', function() {
  expect(2);

  component = Component.extend({
    actions: {
      foo: function() {
        ok(true, 'called foo action');
      }
    }
  }).create();

  expectDeprecation(function() {
    component._actions.foo();
  }, 'Usage of `_actions` is deprecated, use `actions` instead.');
});

QUnit.test('The context of an Ember.Component is itself', function() {
  strictEqual(component, component.get('context'), 'A component\'s context is itself');
});

QUnit.test('The controller (target of `action`) of an Ember.Component is itself', function() {
  strictEqual(component, component.get('controller'), 'A component\'s controller is itself');
});

QUnit.test('Specifying both templateName and layoutName to a component is NOT deprecated', function() {
  expectNoDeprecation();
  component = Component.extend({
    templateName: 'blah-blah',
    layoutName: 'hum-drum'
  }).create();

  equal(get(component, 'templateName'), 'blah-blah');
  equal(get(component, 'layoutName'), 'hum-drum');
});

QUnit.test('Specifying a templateName on a component with a layoutName specified in a superclass is NOT deprecated', function() {
  expectNoDeprecation();
  var Parent = Component.extend({
    layoutName: 'hum-drum'
  });

  component = Parent.extend({
    templateName: 'blah-blah'
  }).create();

  equal(get(component, 'templateName'), 'blah-blah');
  equal(get(component, 'layoutName'), 'hum-drum');
});

QUnit.module('Ember.Component - Actions', {
  setup() {
    actionCounts = {};
    sendCount = 0;
    actionArguments = null;

    controller = EmberObject.create({
      send(actionName) {
        sendCount++;
        actionCounts[actionName] = actionCounts[actionName] || 0;
        actionCounts[actionName]++;
        actionArguments = a_slice.call(arguments, 1);
      }
    });

    component = Component.create({
      parentView: EmberView.create({
        controller: controller
      })
    });
  },

  teardown() {
    run(function() {
      component.destroy();
      controller.destroy();
    });
  }
});

QUnit.test('Calling sendAction on a component without an action defined does nothing', function() {
  component.sendAction();
  equal(sendCount, 0, 'addItem action was not invoked');
});

QUnit.test('Calling sendAction on a component with an action defined calls send on the controller', function() {
  set(component, 'action', 'addItem');

  component.sendAction();

  equal(sendCount, 1, 'send was called once');
  equal(actionCounts['addItem'], 1, 'addItem event was sent once');
});

QUnit.test('Calling sendAction on a component with a function calls the function', function() {
  expect(1);
  set(component, 'action', function() {
    ok(true, 'function is called');
  });

  component.sendAction();
});

QUnit.test('Calling sendAction on a component with a function calls the function with arguments', function() {
  expect(1);
  var argument = {};
  set(component, 'action', function(actualArgument) {
    equal(actualArgument, argument, 'argument is passed');
  });

  component.sendAction('action', argument);
});

QUnit.test('Calling sendAction on a component with a mut attr calls the function with arguments', function() {
  var mut = {
    value: 'didStartPlaying',
    [MUTABLE_CELL]: true
  };
  set(component, 'playing', null);
  set(component, 'attrs', { playing: mut });

  component.sendAction('playing');

  equal(sendCount, 1, 'send was called once');
  equal(actionCounts['didStartPlaying'], 1, 'named action was sent');
});

QUnit.test('Calling sendAction with a named action uses the component\'s property as the action name', function() {
  set(component, 'playing', 'didStartPlaying');
  set(component, 'action', 'didDoSomeBusiness');

  component.sendAction('playing');

  equal(sendCount, 1, 'send was called once');
  equal(actionCounts['didStartPlaying'], 1, 'named action was sent');

  component.sendAction('playing');

  equal(sendCount, 2, 'send was called twice');
  equal(actionCounts['didStartPlaying'], 2, 'named action was sent');

  component.sendAction();

  equal(sendCount, 3, 'send was called three times');
  equal(actionCounts['didDoSomeBusiness'], 1, 'default action was sent');
});

QUnit.test('Calling sendAction when the action name is not a string raises an exception', function() {
  set(component, 'action', {});
  set(component, 'playing', {});

  expectAssertion(function() {
    component.sendAction();
  });

  expectAssertion(function() {
    component.sendAction('playing');
  });
});

QUnit.test('Calling sendAction on a component with a context', function() {
  set(component, 'playing', 'didStartPlaying');

  var testContext = { song: 'She Broke My Ember' };

  component.sendAction('playing', testContext);

  deepEqual(actionArguments, [testContext], 'context was sent with the action');
});

QUnit.test('Calling sendAction on a component with multiple parameters', function() {
  set(component, 'playing', 'didStartPlaying');

  var firstContext  = { song: 'She Broke My Ember' };
  var secondContext = { song: 'My Achey Breaky Ember' };

  component.sendAction('playing', firstContext, secondContext);

  deepEqual(actionArguments, [firstContext, secondContext], 'arguments were sent to the action');
});

QUnit.module('Ember.Component - injected properties');

QUnit.test('services can be injected into components', function() {
  var registry = new Registry();
  var container = registry.container();

  registry.register('component:application', Component.extend({
    profilerService: inject.service('profiler')
  }));

  registry.register('service:profiler', Service.extend());

  var appComponent = container.lookup('component:application');
  var profilerService = container.lookup('service:profiler');

  equal(profilerService, appComponent.get('profilerService'), 'service.profiler is injected');
});

QUnit.module('Ember.Component - subscribed and sent actions trigger errors');

QUnit.test('something', function() {
  expect(2);

  var appComponent = Component.extend({
    actions: {
      foo(message) {
        equal('bar', message);
      }
    }
  }).create();

  appComponent.send('foo', 'bar');

  throws(function() {
    appComponent.send('baz', 'bar');
  }, /had no action handler for: baz/, 'asdf');
});

QUnit.test('component with target', function() {
  expect(2);

  var target = {
    send(message, payload) {
      equal('foo', message);
      equal('baz', payload);
    }
  };

  var appComponent = Component.create({
    target: target
  });

  appComponent.send('foo', 'baz');
});
