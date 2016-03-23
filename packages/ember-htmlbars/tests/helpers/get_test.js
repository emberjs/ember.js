import Ember from 'ember-metal/core';
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

import isEnabled from 'ember-metal/features';
if (!isEnabled('ember-glimmer')) {
  // jscs:disable

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

}
