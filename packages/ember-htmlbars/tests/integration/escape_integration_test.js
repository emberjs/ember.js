import run from 'ember-metal/run_loop';
import Ember from 'ember-metal/core';
import EmberView from 'ember-views/views/view';
import EmberHandlebars from 'ember-handlebars-compiler';
import htmlbarsCompile from 'ember-htmlbars/system/compile';

import { set } from 'ember-metal/property_set';
import { create as o_create } from 'ember-metal/platform';

var compile, view;

if (Ember.FEATURES.isEnabled('ember-htmlbars')) {
  compile = htmlbarsCompile;
} else {
  compile = EmberHandlebars.compile;
}

QUnit.module('ember-htmlbars: Integration with Globals', {
  teardown: function() {
    run(function() {
      if (view) {
        view.destroy();
      }

      view = null;
    });
  }
});

function appendView(view) {
  run(view, 'appendTo', '#qunit-fixture');
}

test('should read from a global-ish simple local path without deprecation', function() {
  view = EmberView.create({
    context: { NotGlobal: 'Gwar' },
    template: compile('{{NotGlobal}}')
  });

  expectNoDeprecation();
  appendView(view);

  equal(view.$().text(), 'Gwar');
});

test('should read a number value', function() {
  var context = { aNumber: 1 };
  view = EmberView.create({
    context: context,
    template: compile('{{aNumber}}')
  });

  appendView(view);
  equal(view.$().text(), '1');

  Ember.run(function(){
    Ember.set(context, 'aNumber', 2);
  });

  equal(view.$().text(), '2');
});

test('should read an escaped number value', function() {
  var context = { aNumber: 1 };
  view = EmberView.create({
    context: context,
    template: compile('{{{aNumber}}}')
  });

  appendView(view);
  equal(view.$().text(), '1');

  Ember.run(function(){
    Ember.set(context, 'aNumber', 2);
  });

  equal(view.$().text(), '2');
});

test('should read from an Object.create(null)', function() {
  // Use ember's polyfill for Object.create
  var nullObject = o_create(null);
  nullObject['foo'] = 'bar';
  view = EmberView.create({
    context: { nullObject: nullObject },
    template: compile('{{nullObject.foo}}')
  });

  appendView(view);
  equal(view.$().text(), 'bar');

  Ember.run(function(){
    Ember.set(nullObject, 'foo', 'baz');
  });

  equal(view.$().text(), 'baz');
});

test('should escape HTML in primitive value contexts when using normal mustaches', function() {
  view = EmberView.create({
    context: '<b>Max</b><b>James</b>',
    template: compile('{{this}}'),
  });

  appendView(view);

  equal(view.$('b').length, 0, 'does not create an element');
  equal(view.$().text(), '<b>Max</b><b>James</b>', 'inserts entities, not elements');

  run(function() {
    set(view, 'context', '<i>Max</i><i>James</i>');
  });

  equal(view.$().text(), '<i>Max</i><i>James</i>', 'updates with entities, not elements');
  equal(view.$('i').length, 0, 'does not create an element when value is updated');
});

test('should not escape HTML in primitive value contexts when using triple mustaches', function() {
  view = EmberView.create({
    context: '<b>Max</b><b>James</b>',
    template: compile('{{{this}}}'),
  });

  appendView(view);

  equal(view.$('b').length, 2, 'creates an element');

  run(function() {
    set(view, 'context', '<i>Max</i><i>James</i>');
  });

  equal(view.$('i').length, 2, 'creates an element when value is updated');
});
