import { get } from 'ember-metal/property_get';
import run from 'ember-metal/run_loop';
import jQuery from 'ember-views/system/jquery';
import EmberView from 'ember-views/views/view';
import ContainerView from 'ember-views/views/container_view';

import { registerKeyword, resetKeyword } from 'ember-htmlbars/tests/utils';
import viewKeyword from 'ember-htmlbars/keywords/view';

var View, view;
var originalViewKeyword;

QUnit.module('EmberView - replaceIn()', {
  setup() {
    originalViewKeyword = registerKeyword('view',  viewKeyword);
    View = EmberView.extend({});
  },

  teardown() {
    run(function() {
      view.destroy();
    });
    resetKeyword('view', originalViewKeyword);
  }
});

QUnit.test('should be added to the specified element when calling replaceIn()', function() {
  jQuery('#qunit-fixture').html('<div id="menu"></div>');

  view = View.create();

  ok(!get(view, 'element'), 'precond - should not have an element');

  run(function() {
    view.replaceIn('#menu');
  });

  var viewElem = jQuery('#menu').children();
  ok(viewElem.length > 0, 'creates and replaces the view\'s element');
});

QUnit.test('raises an assert when a target does not exist in the DOM', function() {
  view = View.create();

  expectAssertion(function() {
    run(function() {
      view.replaceIn('made-up-target');
    });
  });
});


QUnit.test('should remove previous elements when calling replaceIn()', function() {
  jQuery('#qunit-fixture').html(`
    <div id="menu">
      <p id="child"></p>
    </div>
  `);

  view = View.create();

  var originalChild = jQuery('#child');
  ok(originalChild.length === 1, 'precond - target starts with child element');

  run(function() {
    view.replaceIn('#menu');
  });

  originalChild = jQuery('#child');
  ok(originalChild.length === 0, 'target\'s original child was removed');

  var newChild = jQuery('#menu').children();
  ok(newChild.length === 1, 'target has new child element');
});

QUnit.test('should move the view to the inDOM state after replacing', function() {
  jQuery('#qunit-fixture').html('<div id="menu"></div>');
  view = View.create();

  run(function() {
    view.replaceIn('#menu');
  });

  equal(view._currentState, view._states.inDOM, 'the view is in the inDOM state');
});

QUnit.module('EmberView - replaceIn() in a view hierarchy', {
  setup() {
    originalViewKeyword = registerKeyword('view',  viewKeyword);
    expectDeprecation('Setting `childViews` on a Container is deprecated.');

    View = ContainerView.extend({
      childViews: ['child'],
      child: EmberView.extend({
        elementId: 'child'
      })
    });
  },

  teardown() {
    run(function() {
      view.destroy();
    });
    resetKeyword('view', originalViewKeyword);
  }
});

QUnit.test('should be added to the specified element when calling replaceIn()', function() {
  jQuery('#qunit-fixture').html('<div id="menu"></div>');

  view = View.create();

  ok(!get(view, 'element'), 'precond - should not have an element');

  run(function() {
    view.replaceIn('#menu');
  });

  var viewElem = jQuery('#menu #child');
  ok(viewElem.length > 0, 'creates and replaces the view\'s element');
});
