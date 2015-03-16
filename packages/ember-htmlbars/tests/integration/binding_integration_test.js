import run from 'ember-metal/run_loop';
import jQuery from 'ember-views/system/jquery';
import EmberView from 'ember-views/views/view';
import { Binding } from 'ember-metal/binding';
import EmberObject from 'ember-runtime/system/object';
import { computed } from 'ember-metal/computed';
import ContainerView from 'ember-views/views/container_view';
import compile from 'ember-template-compiler/system/compile';
import { runAppend, runDestroy } from "ember-runtime/tests/utils";
import { registerHelper } from "ember-htmlbars/helpers";

import { set } from 'ember-metal/property_set';

var view, MyApp, originalLookup, lookup;

var trim = jQuery.trim;

QUnit.module('ember-htmlbars: binding integration', {
  setup() {
    originalLookup = Ember.lookup;
    Ember.lookup = lookup = {};

    MyApp = lookup.MyApp = EmberObject.create({});
  },

  teardown() {
    Ember.lookup = originalLookup;

    runDestroy(view);
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
  view = EmberView.createWithMixins({
    template: compile('{{view.foobarProperty}}'),
    foobarProperty: computed(function() {
      return 'foobarProperty';
    })
  });

  runAppend(view);

  ok(view.$().text() === 'foobarProperty', 'Property was bound to correctly');
});

QUnit.test("should be able to update when bound property updates", function() {
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

  equal(view.get('computed'), "second - computed", "view computed properties correctly update");
  equal(view.$('i').text(), 'second, second - computed', "view rerenders when bound properties change");
});

QUnit.test('should cleanup bound properties on rerender', function() {
  view = EmberView.create({
    controller: EmberObject.create({ name: 'wycats' }),
    template: compile('{{name}}')
  });

  runAppend(view);

  equal(view.$().text(), 'wycats', 'rendered binding');

  run(view, 'rerender');

  equal(view._childViews.length, 1);
});

QUnit.test("should update bound values after view's parent is removed and then re-appended", function() {
  expectDeprecation("Setting `childViews` on a Container is deprecated.");

  var controller = EmberObject.create();

  var parentView = ContainerView.create({
    childViews: ['testView'],

    controller: controller,

    testView: EmberView.create({
      template: compile("{{#if showStuff}}{{boundValue}}{{else}}Not true.{{/if}}")
    })
  });

  controller.setProperties({
    showStuff: true,
    boundValue: "foo"
  });

  runAppend(parentView);
  view = parentView.get('testView');

  equal(trim(view.$().text()), "foo");
  run(function() {
    set(controller, 'showStuff', false);
  });
  equal(trim(view.$().text()), "Not true.");

  run(function() {
    set(controller, 'showStuff', true);
  });
  equal(trim(view.$().text()), "foo");

  run(function() {
    parentView.remove();
    set(controller, 'showStuff', false);
  });
  run(function() {
    set(controller, 'showStuff', true);
  });
  runAppend(parentView);

  run(function() {
    set(controller, 'boundValue', "bar");
  });
  equal(trim(view.$().text()), "bar");

  runDestroy(parentView);
});

QUnit.test('should accept bindings as a string or an Ember.Binding', function() {
  var ViewWithBindings = EmberView.extend({
    oneWayBindingTestBinding: Binding.oneWay('context.direction'),
    twoWayBindingTestBinding: Binding.from('context.direction'),
    stringBindingTestBinding: 'context.direction',
    template: compile(
      "one way: {{view.oneWayBindingTest}}, " +
      "two way: {{view.twoWayBindingTest}}, " +
      "string: {{view.stringBindingTest}}"
    )
  });

  view = EmberView.create({
    viewWithBindingsClass: ViewWithBindings,
    context: EmberObject.create({
      direction: "down"
    }),
    template: compile("{{view view.viewWithBindingsClass}}")
  });

  runAppend(view);

  equal(trim(view.$().text()), "one way: down, two way: down, string: down");
});
