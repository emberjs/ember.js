import Ember from 'ember-metal/core';
import { computed } from 'ember-metal/computed';
import run from 'ember-metal/run_loop';
import jQuery from 'ember-views/system/jquery';
import EmberView from 'ember-views/views/view';
import { compile } from 'ember-template-compiler';

var view;

QUnit.module('Ember.View', {
  teardown() {
    run(function() {
      view.destroy();
    });
  }
});

QUnit.test('should add ember-view to views', function() {
  view = EmberView.create();

  run(function() {
    view.createElement();
  });

  ok(view.$().hasClass('ember-view'), 'the view has ember-view');
});

QUnit.test('should not add role attribute unless one is specified', function() {
  view = EmberView.create();

  run(function() {
    view.createElement();
  });

  ok(view.$().attr('role') === undefined, 'does not have a role attribute');
});

QUnit.test('should allow tagName to be a computed property [DEPRECATED]', function() {
  view = EmberView.extend({
    tagName: computed(function() {
      return 'span';
    })
  }).create();

  expectDeprecation(function() {
    run(function() {
      view.createElement();
    });
  }, /using a computed property to define tagName will not be permitted/);

  equal(view.element.tagName, 'SPAN', 'the view has was created with the correct element');

  run(function() {
    view.set('tagName', 'div');
  });

  equal(view.element.tagName, 'SPAN', 'the tagName cannot be changed after initial render');
});

QUnit.test('should re-render if the context is changed', function() {
  view = EmberView.create({
    elementId: 'template-context-test',
    context: { foo: 'bar' },
    template: compile('{{foo}}')
  });

  run(function() {
    view.appendTo('#qunit-fixture');
  });

  equal(jQuery('#qunit-fixture #template-context-test').text(), 'bar', 'precond - renders the view with the initial value');

  run(function() {
    view.set('context', {
      foo: 'bang baz'
    });
  });

  equal(jQuery('#qunit-fixture #template-context-test').text(), 'bang baz', 're-renders the view with the updated context');
});

QUnit.test('renders a contained view with omitted start tag and tagless parent view context', function() {
  view = EmberView.create({
    tagName: 'table',
    template: compile('{{view view.pivot}}'),
    pivot: EmberView.extend({
      tagName: '',
      template: compile('{{view view.row}}'),
      row: EmberView.extend({
        tagName: 'tr'
      })
    })
  });

  run(view, view.append);

  equal(view.element.tagName, 'TABLE', 'container view is table');
  ok(view.$('tr').length, 'inner view is tr');

  run(view, view.rerender);

  equal(view.element.tagName, 'TABLE', 'container view is table');
  ok(view.$('tr').length, 'inner view is tr');
});

QUnit.test('propagates dependent-key invalidated sets upstream', function() {
  view = EmberView.create({
    parentProp: 'parent-value',
    template: compile('{{view view.childView childProp=view.parentProp}}'),
    childView: EmberView.create({
      template: compile('child template'),
      childProp: 'old-value'
    })
  });

  run(view, view.append);

  equal(view.get('parentProp'), 'parent-value', 'precond - parent value is there');
  var childView = view.get('childView');

  run(function() {
    childView.set('childProp', 'new-value');
  });

  equal(view.get('parentProp'), 'new-value', 'new value is propagated across template');
});

QUnit.test('propagates dependent-key invalidated bindings upstream', function() {
  view = EmberView.create({
    parentProp: 'parent-value',
    template: compile('{{view view.childView childProp=view.parentProp}}'),
    childView: EmberView.extend({
      template: compile('child template'),
      childProp: Ember.computed('dependencyProp', {
        get(key) {
          return this.get('dependencyProp');
        },
        set(key, value) {
          // Avoid getting stomped by the template attrs
          return this.get('dependencyProp');
        }
      }),
      dependencyProp: 'old-value'
    }).create()
  });

  run(view, view.append);

  equal(view.get('parentProp'), 'parent-value', 'precond - parent value is there');
  var childView = view.get('childView');
  run(() => childView.set('dependencyProp', 'new-value'));
  equal(childView.get('childProp'), 'new-value', 'pre-cond - new value is propagated to CP');
  equal(view.get('parentProp'), 'new-value', 'new value is propagated across template');
});
