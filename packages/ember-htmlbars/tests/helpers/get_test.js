import Ember from 'ember-metal/core';
import isEnabled from 'ember-metal/features';
import run from 'ember-metal/run_loop';
import { Registry } from 'ember-runtime/system/container';
import compile from 'ember-template-compiler/system/compile';
import { runAppend, runDestroy } from 'ember-runtime/tests/utils';
import EmberView from 'ember-views/views/view';

var view, registry, container;

// jscs:disable validateIndentation
if (isEnabled('ember-htmlbars-get-helper')) {
  QUnit.module('ember-htmlbars: {{get}} helper', {
  setup() {
    registry = new Registry();
    container = registry.container();
    registry.optionsForType('template', { instantiate: false });
  },
  teardown() {
    run(function() {
      Ember.TEMPLATES = {};
    });
    runDestroy(view);
    runDestroy(container);
    registry = container = view = null;
  }
});

  QUnit.test('should be able to get an object value with a static key', function() {
  var context = {
    colors: { apple: 'red', banana: 'yellow' }
  };

  view = EmberView.create({
    context: context,
    template: compile('[{{get colors \'apple\'}}] [{{if true (get colors \'apple\')}}]')
  });

  runAppend(view);

  equal(view.$().text(), '[red] [red]', 'should return \'red\' for {{get colors \'apple\'}}');

  run(function() {
    view.set('context.colors', { apple: 'green', banana: 'purple' });
  });

  equal(view.$().text(), '[green] [green]', 'should return \'green\' for {{get colors \'apple\'}}');
});

  QUnit.test('should be able to get an object value with a bound/dynamic key', function() {
  var context = {
    colors: { apple: 'red', banana: 'yellow' },
    key: 'apple'
  };

  view = EmberView.create({
    context: context,
    template: compile('[{{get colors key}}] [{{if true (get colors key)}}]')
  });

  runAppend(view);

  equal(view.$().text(), '[red] [red]', 'should return \'red\' for {{get colors key}}  (key = \'apple\')');

  run(function() {
    view.set('context.key', 'banana');
  });

  equal(view.$().text(), '[yellow] [yellow]', 'should return \'red\' for {{get colors key}} (key = \'banana\')');

  run(function() {
    view.set('context.colors', { apple: 'green', banana: 'purple' });
  });

  equal(view.$().text(), '[purple] [purple]', 'should return \'purple\' for {{get colors key}} (key = \'banana\')');

  run(function() {
    view.set('context.key', 'apple');
  });

  equal(view.$().text(), '[green] [green]', 'should return \'green\' for {{get colors key}} (key = \'apple\')');
});

  QUnit.test('should be able to get an object value with a GetStream key', function() {
  var context = {
    colors: { apple: 'red', banana: 'yellow' },
    key: 'key1',
    possibleKeys: { key1: 'apple', key2: 'banana' }
  };

  view = EmberView.create({
    context: context,
    template: compile('[{{get colors (get possibleKeys key)}}] [{{if true (get colors (get possibleKeys key))}}]')
  });

  runAppend(view);

  equal(view.$().text(), '[red] [red]', 'should return \'red\'');

  run(function() {
    view.set('context.key', 'key2');
  });

  equal(view.$().text(), '[yellow] [yellow]', 'should return \'red\' for {{get colors key}} (key = \'banana\')');

  run(function() {
    view.set('context.colors', { apple: 'green', banana: 'purple' });
  });

  equal(view.$().text(), '[purple] [purple]', 'should return \'purple\'');

  run(function() {
    view.set('context.key', 'key1');
  });

  equal(view.$().text(), '[green] [green]', 'should return \'green\'');
});

  QUnit.test('should be able to get an object value with a GetStream value and bound/dynamic key', function() {
  var context = {
    possibleValues: {
      colors1: { apple: 'red', banana: 'yellow' },
      colors2: { apple: 'green', banana: 'purple' }
    },
    objectKey: 'colors1',
    key: 'apple'
  };

  view = EmberView.create({
    context: context,
    template: compile('[{{get (get possibleValues objectKey) key}}] [{{if true (get (get possibleValues objectKey) key)}}]')
  });

  runAppend(view);

  equal(view.$().text(), '[red] [red]', 'should return \'red\'');

  run(function() {
    view.set('context.objectKey', 'colors2');
  });

  equal(view.$().text(), '[green] [green]', 'should return \'green\'');

  run(function() {
    view.set('context.objectKey', 'colors1');
  });

  equal(view.$().text(), '[red] [red]', 'should return \'red\'');

  run(function() {
    view.set('context.key', 'banana');
  });

  equal(view.$().text(), '[yellow] [yellow]', 'should return \'yellow\'');

  run(function() {
    view.set('context.objectKey', 'colors2');
  });

  equal(view.$().text(), '[purple] [purple]', 'should return \'purple\'');

  run(function() {
    view.set('context.objectKey', 'colors1');
  });

  equal(view.$().text(), '[yellow] [yellow]', 'should return \'yellow\'');
});

  QUnit.test('should be able to get an object value with a GetStream value and GetStream key', function() {
  var context = {
    possibleValues: {
      colors1: { apple: 'red', banana: 'yellow' },
      colors2: { apple: 'green', banana: 'purple' }
    },
    objectKey: 'colors1',
    possibleKeys: {
      key1: 'apple',
      key2: 'banana'
    },
    key: 'key1'
  };

  view = EmberView.create({
    context: context,
    template: compile('[{{get (get possibleValues objectKey) (get possibleKeys key)}}] [{{if true (get (get possibleValues objectKey) (get possibleKeys key))}}]')
  });

  runAppend(view);

  equal(view.$().text(), '[red] [red]', 'should return \'red\'');

  run(function() {
    view.set('context.objectKey', 'colors2');
  });

  equal(view.$().text(), '[green] [green]', 'should return \'green\'');

  run(function() {
    view.set('context.objectKey', 'colors1');
  });

  equal(view.$().text(), '[red] [red]', 'should return \'red\'');

  run(function() {
    view.set('context.key', 'key2');
  });

  equal(view.$().text(), '[yellow] [yellow]', 'should return \'yellow\'');

  run(function() {
    view.set('context.objectKey', 'colors2');
  });

  equal(view.$().text(), '[purple] [purple]', 'should return \'purple\'');

  run(function() {
    view.set('context.objectKey', 'colors1');
  });

  equal(view.$().text(), '[yellow] [yellow]', 'should return \'yellow\'');
});

  QUnit.test('should handle object values as nulls', function() {
  var context = {
    colors: null
  };

  view = EmberView.create({
    context: context,
    template: compile('[{{get colors \'apple\'}}] [{{if true (get colors \'apple\')}}]')
  });

  runAppend(view);

  equal(view.$().text(), '[] []', 'should return \'\' for {{get colors \'apple\'}} (colors = null)');

  run(function() {
    view.set('context.colors', { apple: 'green', banana: 'purple' });
  });

  equal(view.$().text(), '[green] [green]', 'should return \'green\' for {{get colors \'apple\'}} (colors = { apple: \'green\', banana: \'purple\' })');

  run(function() {
    view.set('context.colors', null);
  });

  equal(view.$().text(), '[] []', 'should return \'\' for {{get colors \'apple\'}} (colors = null)');
});

  QUnit.test('should handle object keys as nulls', function() {
  var context = {
    colors: { apple: 'red', banana: 'yellow' },
    key: null
  };

  view = EmberView.create({
    context: context,
    template: compile('[{{get colors key}}] [{{if true (get colors key)}}]')
  });

  runAppend(view);

  equal(view.$().text(), '[] []', 'should return \'\' for {{get colors key}}  (key = null)');

  run(function() {
    view.set('context.key', 'banana');
  });

  equal(view.$().text(), '[yellow] [yellow]', 'should return \'yellow\' for {{get colors key}} (key = \'banana\')');

  run(function() {
    view.set('context.key', null);
  });

  equal(view.$().text(), '[] []', 'should return \'\' for {{get colors key}}  (key = null)');
});

  QUnit.test('should handle object values and keys as nulls', function() {
  var context = {
    colors: null,
    key: null
  };

  view = EmberView.create({
    context: context,
    template: compile('[{{get colors key}}] [{{if true (get colors key)}}]')
  });

  runAppend(view);

  equal(view.$().text(), '[] []', 'should return \'\' for {{get colors key}}  (colors=null, key = null)');
});
}
// jscs:enable validateIndentation
