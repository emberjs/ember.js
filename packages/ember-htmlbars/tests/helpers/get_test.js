import Ember from 'ember-metal/core'; // TEMPLATES
import EmberObject from 'ember-runtime/system/object';
import run from 'ember-metal/run_loop';
import compile from 'ember-template-compiler/system/compile';
import { runAppend, runDestroy } from 'ember-runtime/tests/utils';
import EmberView from 'ember-views/views/view';
import ComponentLookup from 'ember-views/component_lookup';
import TextField from 'ember-views/views/text_field';
import buildOwner from 'container/tests/test-helpers/build-owner';
import { OWNER } from 'container/owner';

var view, owner;

QUnit.module('ember-htmlbars: {{get}} helper', {
  setup() {
    owner = buildOwner();
    owner.register('component:-text-field', TextField);
    owner.register('component-lookup:main', ComponentLookup);
    owner.registerOptionsForType('template', { instantiate: false });
  },
  teardown() {
    run(function() {
      Ember.TEMPLATES = {};
    });
    runDestroy(view);
    runDestroy(owner);
    owner = view = null;
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

  run(function() {
    view.set('context.colors.apple', 'red');
  });

  equal(view.$().text(), '[red] [red]', 'should return \'red\' for {{get colors \'apple\'}}');
});

QUnit.test('should be able to get an object value with nested static key', function() {
  var context = {
    colors: { apple: { gala: 'red and yellow' }, banana: 'yellow' }
  };

  view = EmberView.create({
    context: context,
    template: compile(`[{{get colors "apple.gala"}}] [{{if true (get colors "apple.gala")}}]`)
  });

  runAppend(view);

  equal(view.$().text(), '[red and yellow] [red and yellow]', 'should return \'red and yellow\' for {{get colors "apple.gala"}}');

  run(function() {
    view.set('context.colors', { apple: { gala: 'yellow and red striped' }, banana: 'purple' });
  });

  equal(view.$().text(), '[yellow and red striped] [yellow and red striped]', 'should return \'yellow and red striped\' for {{get colors \'apple.gala\'}}');

  run(function() {
    view.set('context.colors.apple.gala', 'yellow-redish');
  });

  equal(view.$().text(), '[yellow-redish] [yellow-redish]', 'should return \'yellow-redish\' for {{get colors \'apple.gala\'}}');
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

  run(function() {
    view.set('context.colors.apple', 'red');
  });

  equal(view.$().text(), '[red] [red]', 'should return \'red\' for {{get colors key}}  (key = \'apple\')');
});

QUnit.test('should be able to get an object value with nested dynamic key', function() {
  var context = {
    colors: { apple: { gala: 'red and yellow', mcintosh: 'red' }, banana: 'yellow' },
    key: 'apple.gala'
  };

  view = EmberView.create({
    context: context,
    template: compile('[{{get colors key}}] [{{if true (get colors key)}}]')
  });

  runAppend(view);

  equal(view.$().text(), '[red and yellow] [red and yellow]', 'should return \'red and yellow\' for {{get colors "apple.gala"}}');

  run(function() {
    view.set('context.key', 'apple.mcintosh');
  });

  equal(view.$().text(), '[red] [red]', 'should return \'red\' for {{get colors \'apple.mcintosh\'}}');

  run(function() {
    view.set('context.key', 'banana');
  });

  equal(view.$().text(), '[yellow] [yellow]', 'should return \'yellow\' for {{get colors \'banana\'}}');
});

QUnit.test('should be able to get an object value with subexpression returning nested key', function() {
  var context = {
    colors: { apple: { gala: 'red and yellow', mcintosh: 'red' }, banana: 'yellow' }
  };

  view = EmberView.create({
    context: context,
    template: compile(`[{{get colors (concat 'apple' '.' 'gala')}}] [{{if true (get colors (concat 'apple' '.' 'gala'))}}]`)
  });

  runAppend(view);

  equal(view.$().text(), '[red and yellow] [red and yellow]', 'should return \'red and yellow\' for {{get colors "apple.gala"}}');

  run(function() {
    view.set('context.colors', { apple: { gala: 'yellow and red striped' }, banana: 'purple' });
  });

  equal(view.$().text(), '[yellow and red striped] [yellow and red striped]', 'should return \'yellow and red striped\' for {{get colors \'apple.gala\'}}');

  run(function() {
    view.set('context.colors.apple.gala', 'yellow-redish');
  });

  equal(view.$().text(), '[yellow-redish] [yellow-redish]', 'should return \'yellow-redish\' for {{get colors \'apple.gala\'}}');
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

  run(function() {
    view.set('context.colors.apple', 'red');
  });

  equal(view.$().text(), '[red] [red]', 'should return \'red\'');
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

QUnit.test('get helper value should be updatable using {{input}} and (mut) - dynamic key', function() {
  var context = {
    source: EmberObject.create({
      banana: 'banana'
    }),
    key: 'banana'
  };

  view = EmberView.create({
    [OWNER]: owner,
    context: context,
    template: compile(`{{input type='text' value=(mut (get source key)) id='get-input'}}`)
  });

  runAppend(view);

  equal(view.$('#get-input').val(), 'banana');

  run(function() {
    view.set('context.source.banana', 'yellow');
  });

  equal(view.$('#get-input').val(), 'yellow');

  run(function() {
    view.$('#get-input').val('some value');
    view.childViews[0]._elementValueDidChange();
  });

  equal(view.$('#get-input').val(), 'some value');
  equal(view.get('context.source.banana'), 'some value');
});

QUnit.test('get helper value should be updatable using {{input}} and (mut) - dynamic nested key', function() {
  var context = {
    source: EmberObject.create({
      apple: {
        mcintosh: 'mcintosh'
      }
    }),
    key: 'apple.mcintosh'
  };

  view = EmberView.create({
    [OWNER]: owner,
    context: context,
    template: compile(`{{input type='text' value=(mut (get source key)) id='get-input'}}`)
  });

  runAppend(view);

  equal(view.$('#get-input').val(), 'mcintosh');

  run(function() {
    view.set('context.source.apple.mcintosh', 'red');
  });

  equal(view.$('#get-input').val(), 'red');

  run(function() {
    view.$('#get-input').val('some value');
    view.childViews[0]._elementValueDidChange();
  });

  equal(view.$('#get-input').val(), 'some value');
  equal(view.get('context.source.apple.mcintosh'), 'some value');
});

QUnit.test('get helper value should be updatable using {{input}} and (mut) - static key', function() {
  var context = {
    source: EmberObject.create({
      banana: 'banana'
    }),
    key: 'banana'
  };

  view = EmberView.create({
    [OWNER]: owner,
    context: context,
    template: compile(`{{input type='text' value=(mut (get source 'banana')) id='get-input'}}`)
  });

  runAppend(view);

  equal(view.$('#get-input').val(), 'banana');

  run(function() {
    view.set('context.source.banana', 'yellow');
  });

  equal(view.$('#get-input').val(), 'yellow');

  run(function() {
    view.$('#get-input').val('some value');
    view.childViews[0]._elementValueDidChange();
  });

  equal(view.$('#get-input').val(), 'some value');
  equal(view.get('context.source.banana'), 'some value');
});
