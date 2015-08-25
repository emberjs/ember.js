import { getDebugFunction, setDebugFunction } from 'ember-metal/debug';
import { get } from 'ember-metal/property_get';
import { set } from 'ember-metal/property_set';
import run from 'ember-metal/run_loop';
import { computed } from 'ember-metal/computed';
import EmberView from 'ember-views/views/view';
import ContainerView from 'ember-views/views/container_view';

import { registerKeyword, resetKeyword } from 'ember-htmlbars/tests/utils';
import viewKeyword from 'ember-htmlbars/keywords/view';

var View, view, parentBecameVisible, childBecameVisible, grandchildBecameVisible;
var parentBecameHidden, childBecameHidden, grandchildBecameHidden;
var warnings, originalWarn;
var originalViewKeyword;

QUnit.module('EmberView#isVisible', {
  setup() {
    originalViewKeyword = registerKeyword('view',  viewKeyword);
    warnings = [];
    originalWarn = getDebugFunction('warn');
    setDebugFunction('warn', function(message, test) {
      if (!test) {
        warnings.push(message);
      }
    });
  },

  teardown() {
    if (view) {
      run(function() { view.destroy(); });
    }
    resetKeyword('view', originalViewKeyword);
    setDebugFunction('warn', originalWarn);
  }
});

QUnit.test('should hide views when isVisible is false', function() {
  view = EmberView.create({
    isVisible: false
  });

  run(function() {
    view.append();
  });

  ok(view.$().is(':hidden'), 'the view is hidden');

  run(function() {
    set(view, 'isVisible', true);
  });

  ok(view.$().is(':visible'), 'the view is visible');
  run(function() {
    view.remove();
  });

  deepEqual(warnings, [], 'no warnings were triggered');
});

QUnit.test('should hide element if isVisible is false before element is created', function() {
  view = EmberView.create({
    isVisible: false
  });

  ok(!get(view, 'isVisible'), 'precond - view is not visible');

  set(view, 'template', function() { return 'foo'; });

  run(function() {
    view.append();
  });

  ok(view.$().is(':hidden'), 'should be hidden');

  run(function() {
    view.remove();
  });

  run(function() {
    set(view, 'isVisible', true);
  });

  run(function() {
    view.append();
  });

  ok(view.$().is(':visible'), 'view should be visible');

  run(function() {
    view.remove();
  });

  deepEqual(warnings, [], 'no warnings were triggered');
});

QUnit.test('should hide views when isVisible is a CP returning false', function() {
  view = EmberView.extend({
    isVisible: computed(function() {
      return false;
    })
  }).create();

  run(function() {
    view.append();
  });

  ok(view.$().is(':hidden'), 'the view is hidden');

  run(function() {
    set(view, 'isVisible', true);
  });

  ok(view.$().is(':visible'), 'the view is visible');
  run(function() {
    view.remove();
  });

  deepEqual(warnings, [], 'no warnings were triggered');
});

QUnit.test('doesn\'t overwrite existing style attribute bindings', function() {
  view = EmberView.create({
    isVisible: false,
    attributeBindings: ['style'],
    style: 'color: blue;'
  });

  run(function() {
    view.append();
  });

  equal(view.$().attr('style'), 'color: blue; display: none;', 'has concatenated style attribute');
});

QUnit.module('EmberView#isVisible with Container', {
  setup() {
    originalViewKeyword = registerKeyword('view',  viewKeyword);
    expectDeprecation('Setting `childViews` on a Container is deprecated.');

    parentBecameVisible = 0;
    childBecameVisible = 0;
    grandchildBecameVisible = 0;
    parentBecameHidden = 0;
    childBecameHidden = 0;
    grandchildBecameHidden = 0;

    View = ContainerView.extend({
      childViews: ['child'],
      becameVisible() { parentBecameVisible++; },
      becameHidden() { parentBecameHidden++; },

      child: ContainerView.extend({
        childViews: ['grandchild'],
        becameVisible() { childBecameVisible++; },
        becameHidden() { childBecameHidden++; },

        grandchild: EmberView.extend({
          template() { return 'seems weird bro'; },
          becameVisible() { grandchildBecameVisible++; },
          becameHidden() { grandchildBecameHidden++; }
        })
      })
    });
  },

  teardown() {
    if (view) {
      run(function() { view.destroy(); });
    }
    resetKeyword('view', originalViewKeyword);
  }
});

QUnit.test('view should be notified after isVisible is set to false and the element has been hidden', function() {
  run(function() {
    view = View.create({ isVisible: false });
    view.append();
  });

  ok(view.$().is(':hidden'), 'precond - view is hidden when appended');

  run(function() {
    view.set('isVisible', true);
  });

  ok(view.$().is(':visible'), 'precond - view is now visible');
  equal(parentBecameVisible, 1);
  equal(childBecameVisible, 1);
  equal(grandchildBecameVisible, 1);
});

QUnit.test('view should be notified after isVisible is set to false and the element has been hidden', function() {
  run(function() {
    view = View.create({ isVisible: false });
    view.append();
  });

  ok(view.$().is(':hidden'), 'precond - view is hidden when appended');

  run(function() {
    view.set('isVisible', true);
  });

  ok(view.$().is(':visible'), 'precond - view is now visible');
  equal(parentBecameVisible, 1);
  equal(childBecameVisible, 1);
  equal(grandchildBecameVisible, 1);
});

QUnit.test('view should be notified after isVisible is set to false and the element has been hidden', function() {
  view = View.create({ isVisible: true });
  //var childView = view.get('childViews').objectAt(0);

  run(function() {
    view.append();
  });

  ok(view.$().is(':visible'), 'precond - view is visible when appended');

  run(function() {
    view.set('isVisible', false);
  });

  ok(view.$().is(':hidden'), 'precond - view is now hidden');
});

QUnit.test('view should be notified after isVisible is set to true and the element has been shown', function() {
  view = View.create({ isVisible: false });

  run(function() {
    view.append();
  });

  ok(view.$().is(':hidden'), 'precond - view is hidden when appended');

  run(function() {
    view.set('isVisible', true);
  });

  ok(view.$().is(':visible'), 'precond - view is now visible');

  equal(parentBecameVisible, 1);
  equal(childBecameVisible, 1);
  equal(grandchildBecameVisible, 1);
});

QUnit.test('if a view descends from a hidden view, making isVisible true should not trigger becameVisible', function() {
  view = View.create({ isVisible: true });
  var childView = view.get('childViews').objectAt(0);

  run(function() {
    view.append();
  });

  ok(view.$().is(':visible'), 'precond - view is visible when appended');

  run(function() {
    childView.set('isVisible', false);
  });

  run(function() {
    view.set('isVisible', false);
  });

  childBecameVisible = 0;
  grandchildBecameVisible = 0;

  run(function() {
    childView.set('isVisible', true);
  });

  equal(childBecameVisible, 0, 'the child did not become visible');
  equal(grandchildBecameVisible, 0, 'the grandchild did not become visible');
});

QUnit.test('if a child view becomes visible while its parent is hidden, if its parent later becomes visible, it receives a becameVisible callback', function() {
  view = View.create({ isVisible: false });
  var childView = view.get('childViews').objectAt(0);

  run(function() {
    view.append();
  });

  ok(view.$().is(':hidden'), 'precond - view is hidden when appended');

  run(function() {
    childView.set('isVisible', true);
  });

  equal(childBecameVisible, 0, 'child did not become visible since parent is hidden');
  equal(grandchildBecameVisible, 0, 'grandchild did not become visible since parent is hidden');

  run(function() {
    view.set('isVisible', true);
  });

  equal(parentBecameVisible, 1);
  equal(childBecameVisible, 1);
  equal(grandchildBecameVisible, 1);
});
