import run from 'ember-metal/run_loop';
import Service from 'ember-runtime/system/service';
import inject from 'ember-runtime/inject';

import Component from 'ember-templates/component';

import buildOwner from 'container/tests/test-helpers/build-owner';
import computed from 'ember-metal/computed';

let component, controller;

QUnit.module('Ember.Component', {
  setup() {
    component = Component.create();
  },
  teardown() {
    run(() => {
      if (component) { component.destroy(); }
      if (controller) { controller.destroy(); }
    });
  }
});

QUnit.test('throws an error if `this._super` is not called from `init`', function() {
  let TestComponent = Component.extend({
    init() { }
  });

  expectAssertion(() => {
    TestComponent.create();
  }, /You must call `this._super\(...arguments\);` when implementing `init` in a component. Please update .* to call `this._super` from `init`/);
});

QUnit.test('can access `actions` hash via `_actions` [DEPRECATED]', function() {
  expect(2);

  component = Component.extend({
    actions: {
      foo() {
        ok(true, 'called foo action');
      }
    }
  }).create();

  expectDeprecation(() => {
    component._actions.foo();
  }, 'Usage of `_actions` is deprecated, use `actions` instead.');
});

QUnit.test('Specifying a defaultLayout to a component is deprecated', function() {
  expectDeprecation(() => {
    Component.extend({
      defaultLayout: 'hum-drum'
    }).create();
  }, /Specifying `defaultLayout` to .+ is deprecated\./);
});

QUnit.test('should warn if a computed property is used for classNames', function() {
  expectAssertion(() => {
    Component.extend({
      elementId: 'test',
      classNames: computed(function() {
        return ['className'];
      })
    }).create();
  }, /Only arrays of static class strings.*For dynamic classes/i);
});

QUnit.test('should warn if a non-array is used for classNameBindings', function() {
  expectAssertion(() => {
    Component.extend({
      elementId: 'test',
      classNameBindings: computed(function() {
        return ['className'];
      })
    }).create();
  }, /Only arrays are allowed/i);
});

QUnit.module('Ember.Component - injected properties');

QUnit.test('services can be injected into components', function() {
  let owner = buildOwner();

  owner.register('component:application', Component.extend({
    profilerService: inject.service('profiler')
  }));

  owner.register('service:profiler', Service.extend());

  let appComponent = owner.lookup('component:application');
  let profilerService = owner.lookup('service:profiler');

  equal(profilerService, appComponent.get('profilerService'), 'service.profiler is injected');
});

QUnit.module('Ember.Component - subscribed and sent actions trigger errors');

QUnit.test('component with target', function() {
  expect(2);

  let target = {
    send(message, payload) {
      equal('foo', message);
      equal('baz', payload);
    }
  };

  let appComponent = Component.create({
    target: target
  });

  appComponent.send('foo', 'baz');
});
