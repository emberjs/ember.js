import { get } from 'ember-metal/property_get';
import run from 'ember-metal/run_loop';
import jQuery from 'ember-views/system/jquery';
import View from 'ember-views/views/view';
import { compile } from 'ember-template-compiler';

import { registerKeyword, resetKeyword } from 'ember-htmlbars/tests/utils';
import viewKeyword from 'ember-htmlbars/keywords/view';

import { objectAt } from 'ember-runtime/mixins/array';
import { runAppend, runDestroy } from 'ember-runtime/tests/utils';

var parentView, child;
var originalViewKeyword;

import isEnabled from 'ember-metal/features';
if (!isEnabled('ember-glimmer')) {
// jscs:disable

// .......................................................
// removeAllChildren()
//
var view, childViews;
QUnit.module('View#removeAllChildren', {
  setup() {
    originalViewKeyword = registerKeyword('view',  viewKeyword);

    view = View.extend({
      template: compile(`
        {{view view.childView1}}
        {{view view.childView2}}
        {{view view.childView3}}
      `),
      childView1: View.extend(),
      childView2: View.extend(),
      childView3: View.extend()
    }).create();
    runAppend(view);

    childViews = get(view, 'childViews');
  },
  teardown() {
    childViews.forEach((v) => runDestroy(v));
    runDestroy(view);
    resetKeyword('view', originalViewKeyword);
  }
});

QUnit.test('removes all child views', function() {
  equal(get(view, 'childViews.length'), 3, 'precond - has child views');

  view.removeAllChildren();
  equal(get(view, 'childViews.length'), 0, 'removed all children');
});

QUnit.test('returns receiver', function() {
  equal(view.removeAllChildren(), view, 'receiver');
});

// .......................................................
// removeFromParent()
//
QUnit.module('View#removeFromParent', {
  setup() {
    originalViewKeyword = registerKeyword('view',  viewKeyword);
  },
  teardown() {
    run(function() {
      if (parentView) { parentView.destroy(); }
      if (child) { child.destroy(); }
      if (view) { view.destroy(); }
    });
    resetKeyword('view', originalViewKeyword);
  }
});

QUnit.test('removes view from parent view', function() {
  parentView = View.extend({
    template: compile('{{view view.childView}}'),
    childView: View.extend({
      template: compile('child view template')
    })
  }).create();
  run(parentView, parentView.append);

  child = objectAt(get(parentView, 'childViews'), 0);
  ok(get(child, 'parentView'), 'precond - has parentView');

  ok(parentView.$('div').length, 'precond - has a child DOM element');

  run(function() {
    child.removeFromParent();
  });

  ok(!get(child, 'parentView'), 'no longer has parentView');
  ok(get(parentView, 'childViews').indexOf(child) < 0, 'no longer in parent childViews');
  equal(parentView.$('div').length, 0, 'removes DOM element from parent');
});

QUnit.test('returns receiver', function() {
  parentView = View.extend({
    template: compile('{{view view.childView}}'),
    childView: View.extend({
      template: compile('child view template')
    })
  }).create();

  run(parentView, parentView.append);
  child = objectAt(get(parentView, 'childViews'), 0);

  let removed = run(() => child.removeFromParent());

  equal(removed, child, 'receiver');
});

QUnit.test('does nothing if not in parentView', function() {
  child = View.create();

  // monkey patch for testing...
  ok(!get(child, 'parentView'), 'precond - has no parent');

  child.removeFromParent();

  run(function() {
    child.destroy();
  });
});

QUnit.test('the DOM element is gone after doing append and remove in two separate runloops', function() {
  view = View.create();
  run(function() {
    view.append();
  });
  run(function() {
    view.remove();
  });

  var viewElem = jQuery('#' + get(view, 'elementId'));
  ok(viewElem.length === 0, 'view\'s element doesn\'t exist in DOM');
});

QUnit.test('the DOM element is gone after doing append and remove in a single runloop', function() {
  view = View.create();
  run(function() {
    view.append();
    view.remove();
  });

  var viewElem = jQuery('#' + get(view, 'elementId'));
  ok(viewElem.length === 0, 'view\'s element doesn\'t exist in DOM');
});

}
