import { get } from 'ember-metal/property_get';
import run from 'ember-metal/run_loop';
import jQuery from 'ember-views/system/jquery';
import View from 'ember-views/views/view';

let parentView, child;

let view;
// .......................................................
// removeFromParent()
//
QUnit.module('View#removeFromParent', {
  teardown() {
    run(() => {
      if (parentView) { parentView.destroy(); }
      if (child) { child.destroy(); }
      if (view) { view.destroy(); }
    });
  }
});

QUnit.test('does nothing if not in parentView', function() {
  child = View.create();

  // monkey patch for testing...
  ok(!get(child, 'parentView'), 'precond - has no parent');

  child.removeFromParent();

  run(() => child.destroy());
});

QUnit.test('the DOM element is gone after doing append and remove in two separate runloops', function() {
  view = View.create();
  run(() => view.append());
  run(() => view.remove());

  let viewElem = jQuery('#' + get(view, 'elementId'));
  ok(viewElem.length === 0, 'view\'s element doesn\'t exist in DOM');
});

QUnit.test('the DOM element is gone after doing append and remove in a single runloop', function() {
  view = View.create();
  run(() => {
    view.append();
    view.remove();
  });

  let viewElem = jQuery('#' + get(view, 'elementId'));
  ok(viewElem.length === 0, 'view\'s element doesn\'t exist in DOM');
});
