/*jshint newcap:false*/
import Ember from 'ember-metal/core';
import run from 'ember-metal/run_loop';
import EmberView from 'ember-views/views/view';
import { computed } from 'ember-metal/computed';
import { Registry } from 'ember-runtime/system/container';
//import { set } from "ember-metal/property_set";
import { A } from 'ember-runtime/system/native_array';
import Component from 'ember-views/components/component';
import helpers from 'ember-htmlbars/helpers';
import ComponentLookup from 'ember-views/component_lookup';

import compile from 'ember-template-compiler/system/compile';
import { runAppend, runDestroy } from 'ember-runtime/tests/utils';

import { registerKeyword, resetKeyword } from 'ember-htmlbars/tests/utils';
import viewKeyword from 'ember-htmlbars/keywords/view';

var view, registry, container, originalViewKeyword;

function setupContainer() {
  registry = new Registry();
  container = registry.container();
  registry.optionsForType('template', { instantiate: false });
  registry.register('component-lookup:main', ComponentLookup);
}

function teardownContainer() {
  runDestroy(container);
  registry = container = view = null;
}

QUnit.module('ember-htmlbars: Support for {{yield}} helper', {
  setup() {
    setupContainer();
    originalViewKeyword = registerKeyword('view',  viewKeyword);
  },
  teardown() {
    run(function() {
      Ember.TEMPLATES = {};
    });
    runDestroy(view);
    teardownContainer();
    resetKeyword('view', originalViewKeyword);
  }
});

QUnit.test('a view with a layout set renders its template where the {{yield}} helper appears', function() {
  var ViewWithLayout = EmberView.extend({
    layout: compile('<div class="wrapper"><h1>{{attrs.title}}</h1>{{yield}}</div>')
  });

  view = EmberView.create({
    withLayout: ViewWithLayout,
    template: compile('{{#view view.withLayout title="My Fancy Page"}}<div class="page-body">Show something interesting here</div>{{/view}}')
  });

  runAppend(view);

  equal(view.$('div.wrapper div.page-body').length, 1, 'page-body is embedded within wrapping my-page');
});

QUnit.test('block should work properly even when templates are not hard-coded', function() {
  registry.register('template:nester', compile('<div class="wrapper"><h1>{{attrs.title}}</h1>{{yield}}</div>'));
  registry.register('template:nested', compile('{{#view "with-layout" title="My Fancy Page"}}<div class="page-body">Show something interesting here</div>{{/view}}'));

  registry.register('view:with-layout', EmberView.extend({
    container: container,
    layoutName: 'nester'
  }));

  view = EmberView.create({
    container: container,
    templateName: 'nested'
  });

  runAppend(view);

  equal(view.$('div.wrapper div.page-body').length, 1, 'page-body is embedded within wrapping my-page');
});

QUnit.test('templates should yield to block, when the yield is embedded in a hierarchy of virtual views', function() {
  var TimesView = EmberView.extend({
    layout: compile('<div class="times">{{#each view.index as |item|}}{{yield}}{{/each}}</div>'),
    n: null,
    index: computed(function() {
      var n = this.attrs.n;
      var indexArray = A();
      for (var i = 0; i < n; i++) {
        indexArray[i] = i;
      }
      return indexArray;
    })
  });

  view = EmberView.create({
    timesView: TimesView,
    template: compile('<div id="container"><div class="title">Counting to 5</div>{{#view view.timesView n=5}}<div class="times-item">Hello</div>{{/view}}</div>')
  });

  runAppend(view);

  equal(view.$('div#container div.times-item').length, 5, 'times-item is embedded within wrapping container 5 times, as expected');
});

QUnit.test('templates should yield to block, when the yield is embedded in a hierarchy of non-virtual views', function() {
  var NestingView = EmberView.extend({
    layout: compile('{{#view tagName="div" classNames="nesting"}}{{yield}}{{/view}}')
  });

  view = EmberView.create({
    nestingView: NestingView,
    template: compile('<div id="container">{{#view view.nestingView}}<div id="block">Hello</div>{{/view}}</div>')
  });

  runAppend(view);

  equal(view.$('div#container div.nesting div#block').length, 1, 'nesting view yields correctly even within a view hierarchy in the nesting view');
});

QUnit.test('block should not be required', function() {
  var YieldingView = EmberView.extend({
    layout: compile('{{#view tagName="div" classNames="yielding"}}{{yield}}{{/view}}')
  });

  view = EmberView.create({
    yieldingView: YieldingView,
    template: compile('<div id="container">{{view view.yieldingView}}</div>')
  });

  runAppend(view);

  equal(view.$('div#container div.yielding').length, 1, 'yielding view is rendered as expected');
});

QUnit.test('yield uses the outer context', function() {
  var component = Component.extend({
    boundText: 'inner',
    layout: compile('<p>{{boundText}}</p><p>{{yield}}</p>')
  });

  view = EmberView.create({
    controller: { boundText: 'outer', component: component },
    template: compile('{{#view component}}{{boundText}}{{/view}}')
  });

  runAppend(view);

  equal(view.$('div p:contains(inner) + p:contains(outer)').length, 1, 'Yield points at the right context');
});

QUnit.test('outer keyword doesn\'t mask inner component property', function () {
  var component = Component.extend({
    item: 'inner',
    layout: compile('<p>{{item}}</p><p>{{yield}}</p>')
  });

  view = EmberView.create({
    controller: { boundText: 'outer', component: component },
    template: compile('{{#with boundText as |item|}}{{#view component}}{{item}}{{/view}}{{/with}}')
  });

  runAppend(view);

  equal(view.$('div p:contains(inner) + p:contains(outer)').length, 1, 'inner component property isn\'t masked by outer keyword');
});

QUnit.test('inner keyword doesn\'t mask yield property', function() {
  var component = Component.extend({
    boundText: 'inner',
    layout: compile('{{#with boundText as |item|}}<p>{{item}}</p><p>{{yield}}</p>{{/with}}')
  });

  view = EmberView.create({
    controller: { item: 'outer', component: component },
    template: compile('{{#view component}}{{item}}{{/view}}')
  });

  runAppend(view);

  equal(view.$('div p:contains(inner) + p:contains(outer)').length, 1, 'outer property isn\'t masked by inner keyword');
});

QUnit.test('can bind a keyword to a component and use it in yield', function() {
  var component = Component.extend({
    layout: compile('<p>{{attrs.content}}</p><p>{{yield}}</p>')
  });

  view = EmberView.create({
    controller: { boundText: 'outer', component: component },
    template: compile('{{#with boundText as |item|}}{{#view component content=item}}{{item}}{{/view}}{{/with}}')
  });

  runAppend(view);

  equal(view.$('div p:contains(outer) + p:contains(outer)').length, 1, 'component and yield have keyword');

  run(function() {
    view.set('controller.boundText', 'update');
  });

  equal(view.$('div p:contains(update) + p:contains(update)').length, 1, 'keyword has correctly propagated update');
});

QUnit.test('yield view should be a virtual view', function() {
  var component = Component.extend({
    isParentComponent: true,

    layout: compile('{{yield}}')
  });

  view = EmberView.create({
    template: compile('{{#view component}}{{view includedComponent}}{{/view}}'),
    controller: {
      component: component,
      includedComponent: Component.extend({
        didInsertElement() {
          var parentView = this.get('parentView');

          ok(parentView.get('isParentComponent'), 'parent view is the parent component');
        }
      })
    }
  });

  runAppend(view);
});


QUnit.test('yield should work for views even if parentView is null', function() {
  view = EmberView.create({
    layout:   compile('Layout: {{yield}}'),
    template: compile('View Content')
  });

  run(function() {
    view.createElement();
  });

  equal(view.$().text(), 'Layout: View Content');
});

QUnit.test('simple bindings inside of a yielded template should work properly when the yield is nested inside of another view', function() {
  view = EmberView.create({
    layout:   compile('{{#if view.falsy}}{{else}}{{yield}}{{/if}}'),
    template: compile('{{view.text}}'),
    text: 'ohai'
  });

  run(function() {
    view.createElement();
  });

  equal(view.$().text(), 'ohai');
});

QUnit.test('nested simple bindings inside of a yielded template should work properly when the yield is nested inside of another view', function() {
  view = EmberView.create({
    layout:   compile('{{#if view.falsy}}{{else}}{{yield}}{{/if}}'),
    template: compile('{{#if view.falsy}}{{else}}{{view.text}}{{/if}}'),
    text: 'ohai'
  });

  run(function() {
    view.createElement();
  });

  equal(view.$().text(), 'ohai');
});

QUnit.module('ember-htmlbars: Component {{yield}}', {
  setup() {
    setupContainer();
    originalViewKeyword = registerKeyword('view',  viewKeyword);
  },
  teardown() {
    runDestroy(view);
    delete helpers['inner-component'];
    delete helpers['outer-component'];
    resetKeyword('view', originalViewKeyword);
  }
});

QUnit.test('yield with nested components (#3220)', function() {
  var InnerComponent = Component.extend({
    layout: compile('{{yield}}')
  });

  registry.register('component:inner-component', InnerComponent);

  var OuterComponent = Component.extend({
    layout: compile('{{#inner-component}}<span>{{yield}}</span>{{/inner-component}}')
  });

  registry.register('component:outer-component', OuterComponent);

  view = EmberView.extend({
    container,

    template: compile(
      '{{#outer-component}}Hello world{{/outer-component}}'
    )
  }).create();

  runAppend(view);

  equal(view.$('div > span').text(), 'Hello world');
});

QUnit.test('view keyword works inside component yield', function () {
  var component = Component.extend({
    layout: compile('<p>{{yield}}</p>')
  });

  view = EmberView.create({
    dummyText: 'hello',
    component: component,
    template: compile('{{#view view.component}}{{view.dummyText}}{{/view}}')
  });

  runAppend(view);

  equal(view.$('div > p').text(), 'hello', 'view keyword inside component yield block should refer to the correct view');
});
