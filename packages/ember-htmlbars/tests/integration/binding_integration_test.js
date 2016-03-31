import Ember from 'ember-metal/core';
import run from 'ember-metal/run_loop';
import jQuery from 'ember-views/system/jquery';
import EmberView from 'ember-views/views/view';
import { Binding } from 'ember-metal/binding';
import EmberObject from 'ember-runtime/system/object';
import { computed } from 'ember-metal/computed';
import compile from 'ember-template-compiler/system/compile';
import { runAppend, runDestroy } from 'ember-runtime/tests/utils';
import { registerHelper } from 'ember-htmlbars/helpers';

import { registerKeyword, resetKeyword } from 'ember-htmlbars/tests/utils';
import viewKeyword from 'ember-htmlbars/keywords/view';

var view, MyApp, originalLookup, lookup, originalViewKeyword;

var trim = jQuery.trim;

import isEnabled from 'ember-metal/features';
if (!isEnabled('ember-glimmer')) {
  // jscs:disable

QUnit.module('ember-htmlbars: binding integration', {
  setup() {
    originalViewKeyword = registerKeyword('view',  viewKeyword);
    originalLookup = Ember.lookup;
    Ember.lookup = lookup = {};

    MyApp = lookup.MyApp = EmberObject.create({});
  },

  teardown() {
    Ember.lookup = originalLookup;

    runDestroy(view);
    resetKeyword('view', originalViewKeyword);
    view = null;

    MyApp = null;
  }
});

QUnit.test('should call a registered helper for mustache without parameters', function() {
  registerHelper('foobar', function() {
    return 'foobar';
  });

  view = EmberView.create({
    template: compile('{{foobar}}')
  });

  runAppend(view);

  ok(view.$().text() === 'foobar', 'Regular helper was invoked correctly');
});

QUnit.test('should bind to the property if no registered helper found for a mustache without parameters', function() {
  view = EmberView.extend({
    foobarProperty: computed(function() {
      return 'foobarProperty';
    })
  }).create({
    template: compile('{{view.foobarProperty}}')
  });

  runAppend(view);

  ok(view.$().text() === 'foobarProperty', 'Property was bound to correctly');
});

QUnit.test('should be able to update when bound property updates', function() {
  MyApp.set('controller', EmberObject.create({ name: 'first' }));

  var View = EmberView.extend({
    template: compile('<i>{{view.value.name}}, {{view.computed}}</i>'),
    valueBinding: 'MyApp.controller',
    computed: computed(function() {
      return this.get('value.name') + ' - computed';
    }).property('value')
  });

  run(function() {
    view = View.create();
  });

  runAppend(view);

  run(function() {
    MyApp.set('controller', EmberObject.create({
      name: 'second'
    }));
  });

  equal(view.get('computed'), 'second - computed', 'view computed properties correctly update');
  equal(view.$('i').text(), 'second, second - computed', 'view rerenders when bound properties change');
});

QUnit.test('should allow rendering of undefined props', function() {
  view = EmberView.create({
    template: compile('{{name}}')
  });

  runAppend(view);

  equal(view.$().text(), '', 'rendered undefined binding');
});

QUnit.test('should cleanup bound properties on rerender', function() {
  view = EmberView.create({
    controller: EmberObject.create({ name: 'wycats' }),
    template: compile('{{name}}')
  });

  runAppend(view);

  equal(view.$().text(), 'wycats', 'rendered binding');

  run(view, 'rerender');

  equal(view.$().text(), 'wycats', 'rendered binding');
});

QUnit.test('should accept bindings as a string or an Ember.Binding', function() {
  var ViewWithBindings = EmberView.extend({
    twoWayBindingTestBinding: Binding.from('context.direction'),
    stringBindingTestBinding: 'context.direction',
    template: compile(
      'two way: {{view.twoWayBindingTest}}, ' +
      'string: {{view.stringBindingTest}}'
    )
  });

  view = EmberView.create({
    viewWithBindingsClass: ViewWithBindings,
    context: EmberObject.create({
      direction: 'down'
    }),
    template: compile('{{view view.viewWithBindingsClass}}')
  });

  runAppend(view);

  equal(trim(view.$().text()), 'two way: down, string: down');
});

}
