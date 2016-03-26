import Ember from 'ember-metal/core';
import run from 'ember-metal/run_loop';
import Namespace from 'ember-runtime/system/namespace';
import EmberView from 'ember-views/views/view';
import Component from 'ember-views/components/component';
import compile from 'ember-template-compiler/system/compile';
import { A as emberA } from 'ember-runtime/system/native_array';

import { runAppend, runDestroy } from 'ember-runtime/tests/utils';

import { registerKeyword, resetKeyword } from 'ember-htmlbars/tests/utils';
import viewKeyword from 'ember-htmlbars/keywords/view';
import ComponentLookup from 'ember-views/component_lookup';
import jQuery from 'ember-views/system/jquery';

import buildOwner from 'container/tests/test-helpers/build-owner';
import { OWNER } from 'container/owner';

var originalLookup = Ember.lookup;

var view, lookup, owner, TemplateTests, originalViewKeyword;

import isEnabled from 'ember-metal/features';
if (!isEnabled('ember-glimmer')) {
  // jscs:disable

QUnit.module('ember-htmlbars: {{#if}} and {{#unless}} helpers', {
  setup() {
    originalViewKeyword = registerKeyword('view',  viewKeyword);

    Ember.lookup = lookup = {};
    lookup.TemplateTests = TemplateTests = Namespace.create();
    owner = buildOwner();
    owner.registerOptionsForType('template', { instantiate: false });
    owner.registerOptionsForType('view', { singleton: false });
    owner.registerOptionsForType('component', { singleton: false });
    owner.register('view:toplevel', EmberView.extend());
    owner.register('component-lookup:main', ComponentLookup);
  },

  teardown() {
    runDestroy(owner);
    runDestroy(view);
    owner = view = null;

    Ember.lookup = lookup = originalLookup;
    TemplateTests = null;

    resetKeyword('view', originalViewKeyword);
  }
});

QUnit.test('properties within an if statement should not fail on re-render', function() {
  view = EmberView.create({
    template: compile('{{#if view.value}}{{view.value}}{{/if}}'),
    value: null
  });

  runAppend(view);

  equal(view.$().text(), '');

  run(function() {
    view.set('value', 'test');
  });

  equal(view.$().text(), 'test');

  run(function() {
    view.set('value', null);
  });

  equal(view.$().text(), '');
});

QUnit.test('views within an if statement should be sane on re-render', function() {
  view = EmberView.create({
    template: compile('{{#if view.display}}{{view view.MyView}}{{/if}}'),
    MyView: EmberView.extend({
      tagName: 'input'
    }),
    display: false
  });

  runAppend(view);

  equal(view.$('input').length, 0);

  run(function() {
    // Setting twice will trigger the observer twice, this is intentional
    view.set('display', true);
    view.set('display', 'yes');
  });

  var textfield = view.$('input');
  equal(textfield.length, 1);

  // Make sure the view is still registered in View.views
  ok(EmberView.views[textfield.attr('id')]);
});

QUnit.test('the {{this}} helper should not fail on removal', function() {
  view = EmberView.create({
    context: 'abc',
    template: compile('{{#if view.show}}{{this}}{{/if}}'),
    show: true
  });

  runAppend(view);

  equal(view.$().text(), 'abc', 'should start property - precond');

  run(function() {
    view.set('show', false);
  });

  equal(view.$().text(), '');
});

QUnit.test('properties within an if statement should not fail on re-render', function() {
  view = EmberView.create({
    template: compile('{{#if view.value}}{{view.value}}{{/if}}'),
    value: null
  });

  runAppend(view);

  equal(view.$().text(), '');

  run(function() {
    view.set('value', 'test');
  });

  equal(view.$().text(), 'test');

  run(function() {
    view.set('value', null);
  });

  equal(view.$().text(), '');
});

QUnit.test('the {{this}} helper should not fail on removal', function() {
  view = EmberView.create({
    context: 'abc',
    template: compile('{{#if view.show}}{{this}}{{/if}}'),
    show: true
  });

  runAppend(view);

  equal(view.$().text(), 'abc', 'should start property - precond');

  run(function() {
    view.set('show', false);
  });

  equal(view.$().text(), '');
});

QUnit.test('edge case: child conditional should not render children if parent conditional becomes false', function() {
  var childCreated = false;
  var child = null;

  view = EmberView.create({
    cond1: true,
    cond2: false,
    viewClass: EmberView.extend({
      init() {
        this._super(...arguments);
        childCreated = true;
        child = this;
      }
    }),
    template: compile('{{#if view.cond1}}{{#if view.cond2}}{{#view view.viewClass}}test{{/view}}{{/if}}{{/if}}')
  });

  runAppend(view);

  ok(!childCreated, 'precondition');

  run(function() {
    // The order of these sets is important for the test
    view.set('cond2', true);
    view.set('cond1', false);
  });

  // TODO: Priority Queue, for now ensure correct result.
  ok(!childCreated, 'child should not be created');
  //ok(child.isDestroyed, 'child should be gone');
  equal(view.$().text(), '');
});

QUnit.test('edge case: rerender appearance of inner virtual view', function() {
  view = EmberView.create({
    tagName: '',
    cond2: false,
    template: compile('{{#if view.cond2}}test{{/if}}')
  });

  runAppend(view);
  equal(jQuery('#qunit-fixture').text(), '');

  run(function() {
    view.set('cond2', true);
  });

  equal(jQuery('#qunit-fixture').text(), 'test');
});

QUnit.test('`if` helper with inline form: can use truthy param as binding', function() {
  view = EmberView.create({
    truthy: 'ok',
    conditional: true,
    template: compile('{{if view.conditional view.truthy}}')
  });

  runAppend(view);

  equal(view.$().text(), 'ok');

  run(function() {
    view.set('truthy', 'yes');
  });

  equal(view.$().text(), 'yes');
});

QUnit.test('using `if` with an `{{each}}` destroys components when transitioning to and from inverse (GH #12267)', function() {
  let destroyedChildrenCount = 0;

  owner.register('component:foo-bar', Component.extend({
    willDestroy() {
      destroyedChildrenCount++;
    }
  }));
  owner.register('template:components/foo-bar', compile('{{number}}'));

  view = EmberView.create({
    [OWNER]: owner,
    test: true,
    list: emberA([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]),
    template: compile(`
      {{~#if view.test~}}
        {{~#each view.list as |number|~}}
          {{~foo-bar number=number~}}
        {{~/each~}}
      {{~else~}}
        Nothing Here!
      {{~/if~}}`)
  });

  runAppend(view);

  equal(view.$().text(), '12345678910');

  run(() => {
    view.set('test', false);
  });

  equal(view.$().text(), 'Nothing Here!');

  equal(destroyedChildrenCount, 10, 'the children were properly destroyed');
});

}
