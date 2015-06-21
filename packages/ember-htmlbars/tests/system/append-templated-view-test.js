import { runAppend, runDestroy } from 'ember-runtime/tests/utils';
import EmberView from 'ember-views/views/view';
import EmberComponent from 'ember-views/views/component';
import compile from 'ember-template-compiler/system/compile';

var view;
QUnit.module('ember-htmlbars: appendTemplatedView', {
  teardown() {
    runDestroy(view);
  }
});

QUnit.test('can accept a view instance', function() {
  var controller = {
    someProp: 'controller context',
    someView: EmberView.create({
      template: compile('{{someProp}}')
    })
  };

  view = EmberView.create({
    controller: controller,
    template: compile('{{someProp}} - {{view someView}}')
  });

  runAppend(view);

  equal(view.$().text(), 'controller context - controller context');
});

QUnit.test('can accept a view factory', function() {
  var controller = {
    someProp: 'controller context',
    someView: EmberView.extend({
      template: compile('{{someProp}}')
    })
  };

  view = EmberView.create({
    controller: controller,
    template: compile('{{someProp}} - {{view someView}}')
  });

  runAppend(view);

  equal(view.$().text(), 'controller context - controller context');
});

QUnit.test('does change the context if the view factory has a controller specified', function() {
  var controller = {
    someProp: 'controller context',
    someView: EmberView.extend({
      controller: {
        someProp: 'view local controller context'
      },
      template: compile('{{someProp}}')
    })
  };

  view = EmberView.create({
    controller: controller,
    template: compile('{{someProp}} - {{view someView}}')
  });

  runAppend(view);

  equal(view.$().text(), 'controller context - view local controller context');
});

QUnit.test('does change the context if a component factory is used', function() {
  var controller = {
    someProp: 'controller context',
    someView: EmberComponent.extend({
      someProp: 'view local controller context',
      layout: compile('{{someProp}}')
    })
  };

  view = EmberView.create({
    controller: controller,
    template: compile('{{someProp}} - {{view someView}}')
  });

  runAppend(view);

  equal(view.$().text(), 'controller context - view local controller context');
});

QUnit.test('does change the context if a component instance is used', function() {
  var controller = {
    someProp: 'controller context',
    someView: EmberComponent.create({
      someProp: 'view local controller context',
      layout: compile('{{someProp}}')
    })
  };

  view = EmberView.create({
    controller: controller,
    template: compile('{{someProp}} - {{view someView}}')
  });

  runAppend(view);

  equal(view.$().text(), 'controller context - view local controller context');
});
