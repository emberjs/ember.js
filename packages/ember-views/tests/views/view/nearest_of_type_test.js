import run from 'ember-metal/run_loop';
import { Mixin as EmberMixin } from 'ember-metal/mixin';
import View from 'ember-views/views/view';
import { compile } from 'ember-htmlbars-template-compiler';

import { registerKeyword, resetKeyword } from 'ember-htmlbars/tests/utils';
import viewKeyword from 'ember-htmlbars/keywords/view';

var parentView, view;
var originalViewKeyword;

var Mixin, Parent;

QUnit.module('View#nearest*', {
  setup() {
    originalViewKeyword = registerKeyword('view',  viewKeyword);
    Mixin = EmberMixin.create({});
    Parent = View.extend(Mixin, {
      template: compile(`{{view}}`)
    });
  },
  teardown() {
    run(function() {
      if (parentView) { parentView.destroy(); }
      if (view) { view.destroy(); }
    });
    resetKeyword('view', originalViewKeyword);
  }
});

QUnit.test('nearestOfType should find the closest view by view class', function() {
  var child;

  run(function() {
    parentView = Parent.create();
    parentView.appendTo('#qunit-fixture');
  });

  child = parentView.get('childViews')[0];
  equal(child.nearestOfType(Parent), parentView, 'finds closest view in the hierarchy by class');
});

QUnit.test('nearestOfType should find the closest view by mixin', function() {
  var child;

  run(function() {
    parentView = Parent.create();
    parentView.appendTo('#qunit-fixture');
  });

  child = parentView.get('childViews')[0];
  equal(child.nearestOfType(Mixin), parentView, 'finds closest view in the hierarchy by class');
});

QUnit.test('nearestWithProperty should search immediate parent', function() {
  var childView;

  view = View.create({
    myProp: true,
    template: compile('{{view}}')
  });

  run(function() {
    view.appendTo('#qunit-fixture');
  });

  childView = view.get('childViews')[0];
  equal(childView.nearestWithProperty('myProp'), view);
});

QUnit.test('nearestChildOf should be deprecated', function() {
  var child;

  run(function() {
    parentView = Parent.create();
    parentView.appendTo('#qunit-fixture');
  });

  child = parentView.get('childViews')[0];
  expectDeprecation(function() {
    child.nearestChildOf(Parent);
  }, 'nearestChildOf has been deprecated.');
});

