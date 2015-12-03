import { get } from 'ember-metal/property_get';
import EmberView from 'ember-views/views/view';
import { runAppend, runDestroy } from 'ember-runtime/tests/utils';
import compile from 'ember-template-compiler/system/compile';
import isEnabled from 'ember-metal/features';

import ComponentLookup from 'ember-views/component_lookup';
import buildOwner from 'container/tests/test-helpers/build-owner';
import { OWNER } from 'container/owner';
import Component from 'ember-views/components/component';

var view;
QUnit.module('EmberView#$', {
  setup() {
    view = EmberView.extend({
      template: compile('<span></span>')
    }).create();

    runAppend(view);
  },

  teardown() {
    runDestroy(view);
  }
});

QUnit.test('returns undefined if no element', function() {
  var view = EmberView.create();
  ok(!get(view, 'element'), 'precond - should have no element');
  equal(view.$(), undefined, 'should return undefined');
  equal(view.$('span'), undefined, 'should undefined if filter passed');

  runDestroy(view);
});

QUnit.test('returns jQuery object selecting element if provided', function() {
  ok(get(view, 'element'), 'precond - should have element');

  var jquery = view.$();
  equal(jquery.length, 1, 'view.$() should have one element');
  equal(jquery[0], get(view, 'element'), 'element should be element');
});

QUnit.test('returns jQuery object selecting element inside element if provided', function() {
  ok(get(view, 'element'), 'precond - should have element');

  var jquery = view.$('span');
  equal(jquery.length, 1, 'view.$() should have one element');
  equal(jquery[0].parentNode, get(view, 'element'), 'element should be in element');
});

QUnit.test('returns empty jQuery object if filter passed that does not match item in parent', function() {
  ok(get(view, 'element'), 'precond - should have element');

  var jquery = view.$('body'); // would normally work if not scoped to view
  equal(jquery.length, 0, 'view.$(body) should have no elements');
});

if (!isEnabled('ember-views-tagless-jquery')) {
  QUnit.test('asserts for tagless views', function() {
    var view = EmberView.create({
      tagName: ''
    });

    runAppend(view);

    expectAssertion(function() {
      view.$();
    }, /You cannot access this.\$\(\) on a component with `tagName: \'\'` specified/);

    runDestroy(view);
  });
}

if (isEnabled('ember-views-tagless-jquery')) {
  QUnit.test('returns empty jQuery object on tagless components without template', function() {
    var view = EmberView.extend({
      tagName: ''
    }).create();

    runAppend(view);

    var jquery = view.$();
    equal(jquery.length, 0, 'view.$() should have no elements');

    runDestroy(view);
  });

  QUnit.test('returns empty jQuery object on tagless components with template with empty bound properties', function() {
    var view = EmberView.extend({
      tagName: '',
      template: compile('{{text1}}{{text2}}{{text3}}{{text4}}')
    }).create();

    runAppend(view);

    var jquery = view.$();
    equal(jquery.length, 0, 'view.$() should have no elements');

    runDestroy(view);
  });

  QUnit.test('returns jQuery object with child elements on tagless components', function() {
    var view = EmberView.extend({
      tagName: '',
      template: compile('<span></span><p></p><h1></h1>')
    }).create();

    runAppend(view);

    var jquery = view.$();
    equal(jquery.length, 3, 'view.$() should have three elements');
    equal(jquery[0].tagName, 'SPAN', 'first element should be span');
    equal(jquery[1].tagName, 'P', 'second element should be p');
    equal(jquery[2].tagName, 'H1', 'third element should be h1');

    runDestroy(view);
  });

  QUnit.test('returns jQuery object with child elements on tagless components', function() {
    var view = EmberView.extend({
      tagName: '',
      template: compile('<span></span><p><span id="theelement"></span></p><h1></h1>')
    }).create();

    runAppend(view);

    var jquery = view.$('span');
    equal(jquery.length, 2, 'view.$() should have 2 spans');

    jquery = view.$('#theelement');
    equal(jquery.length, 1, 'view.$() can select inner elements');

    runDestroy(view);
  });

  QUnit.test('returned jQuery object ignores first and last empty text nodes', function() {
    var owner = buildOwner();
    owner.registerOptionsForType('template', { instantiate: false });
    owner.register('component-lookup:main', ComponentLookup);

    owner.register('template:components/foo-bar', compile('<div id="child-div"></div>'));
    owner.register('component:foo-bar', Component.extend({
      classNames: 'foo-bar'
    }));

    var view = EmberView.extend({
      tagName: '',
      [OWNER]: owner,
      template: compile('{{component "foo-bar"}}')
    }).create();

    runAppend(view);

    var jquery = view.$();

    equal(jquery.length, 1, 'view.$() should have one element');
    ok(jquery.eq(0).hasClass('foo-bar'), 'element has class foo-bar');
    equal(jquery.eq(0).children()[0].id, 'child-div', 'component template rendered properly');

    runDestroy(view);
  });

  QUnit.test('returned jQuery object includes bound properties', function() {
    var view = EmberView.extend({
      tagName: '',
      context: {
        rawHTML: '<span></span><p></p><h1></h1>',
        text: 'çup?'
      },
      template: compile('{{text}}{{{rawHTML}}}')
    }).create();

    runAppend(view);

    var jquery = view.$();
    equal(jquery.length, 4, 'view.$() should have four elements');
    equal(jquery[0].nodeValue, 'çup?', 'first node should be a text node');
    equal(jquery[1].tagName, 'SPAN', 'second element should be span');
    equal(jquery[2].tagName, 'P', 'third element should be p');
    equal(jquery[3].tagName, 'H1', 'fourth element should be h1');

    runDestroy(view);
  });
}
