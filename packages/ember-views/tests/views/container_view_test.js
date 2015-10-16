import { get } from 'ember-metal/property_get';
import { set } from 'ember-metal/property_set';
import run from 'ember-metal/run_loop';
import { computed } from 'ember-metal/computed';
import Controller from 'ember-runtime/controllers/controller';
import jQuery from 'ember-views/system/jquery';
import View from 'ember-views/views/view';
import ContainerView, { DeprecatedContainerView } from 'ember-views/views/container_view';
import compile from 'ember-template-compiler/system/compile';
import getElementStyle from 'ember-views/tests/test-helpers/get-element-style';
import buildOwner from 'container/tests/test-helpers/build-owner';
import { getOwner, OWNER } from 'container/owner';

import { registerKeyword, resetKeyword } from 'ember-htmlbars/tests/utils';
import viewKeyword from 'ember-htmlbars/keywords/view';

var trim = jQuery.trim;
var container, view, otherContainer, originalViewKeyword;

QUnit.module('Ember.ContainerView', {
  setup() {
    originalViewKeyword = registerKeyword('view',  viewKeyword);
  },
  teardown() {
    run(function() {
      if (container) { container.destroy(); }
      if (view) { view.destroy(); }
      if (otherContainer) { otherContainer.destroy(); }
    });
    resetKeyword('view', originalViewKeyword);
  }
});

QUnit.test('should be able to insert views after the DOM representation is created', function() {
  const owner = buildOwner();

  container = ContainerView.create({
    [OWNER]: owner,
    classNameBindings: ['name'],
    name: 'foo'
  });

  run(function() {
    container.appendTo('#qunit-fixture');
  });

  view = View.create({
    template: compile('This is my moment')
  });

  run(function() {
    container.pushObject(view);
  });

  equal(getOwner(view), owner, 'view gains its containerView\'s owner');
  equal(view.parentView, container, 'view\'s parentView is the container');
  equal(trim(container.$().text()), 'This is my moment');

  run(function() {
    container.destroy();
  });
});

QUnit.test('should be able to observe properties that contain child views', function() {
  expectDeprecation('Setting `childViews` on a Container is deprecated.');

  run(function() {
    var Container = ContainerView.extend({
      childViews: ['displayView'],
      displayIsDisplayed: computed.alias('displayView.isDisplayed'),

      displayView: View.extend({
        isDisplayed: true
      })
    });

    container = Container.create();
    container.appendTo('#qunit-fixture');
  });
  equal(container.get('displayIsDisplayed'), true, 'can bind to child view');

  run(function () {
    container.set('displayView.isDisplayed', false);
  });

  equal(container.get('displayIsDisplayed'), false, 'can bind to child view');
});

QUnit.test('childViews inherit their parents owner, and retain the original container even when moved', function() {
  const owner = buildOwner();

  container = ContainerView.create({
    [OWNER]: owner
  });

  otherContainer = ContainerView.create({
    [OWNER]: owner
  });

  view = View.create();

  container.pushObject(view);

  strictEqual(view.get('parentView'), container, 'sets the parent view after the childView is appended');
  strictEqual(getOwner(view), owner, 'inherits its parentViews owner');

  container.removeObject(view);

  strictEqual(getOwner(view), owner, 'leaves existing owner alone');

  otherContainer.pushObject(view);

  strictEqual(view.get('parentView'), otherContainer, 'sets the new parent view after the childView is appended');
  strictEqual(getOwner(view), owner, 'still inherits its original parentViews owner');
});

QUnit.test('should set the parentView property on views that are added to the child views array', function() {
  container = ContainerView.create();

  var ViewKlass = View.extend({
    template: compile('This is my moment')
  });

  view = ViewKlass.create();

  container.pushObject(view);
  equal(view.get('parentView'), container, 'sets the parent view after the childView is appended');

  run(function() {
    container.removeObject(view);
  });
  equal(get(view, 'parentView'), null, 'sets parentView to null when a view is removed');

  run(function() {
    container.appendTo('#qunit-fixture');
  });

  run(function() {
    container.pushObject(view);
  });

  equal(get(view, 'parentView'), container, 'sets the parent view after the childView is appended');

  var secondView = ViewKlass.create();
  var thirdView = ViewKlass.create();
  var fourthView = ViewKlass.create();

  run(function() {
    container.pushObject(secondView);
    container.replace(1, 0, [thirdView, fourthView]);
  });

  equal(get(secondView, 'parentView'), container, 'sets the parent view of the second view');
  equal(get(thirdView, 'parentView'), container, 'sets the parent view of the third view');
  equal(get(fourthView, 'parentView'), container, 'sets the parent view of the fourth view');

  run(function() {
    container.replace(2, 2);
  });

  equal(get(view, 'parentView'), container, 'doesn\'t change non-removed view');
  equal(get(thirdView, 'parentView'), container, 'doesn\'t change non-removed view');
  equal(get(secondView, 'parentView'), null, 'clears the parent view of the third view');
  equal(get(fourthView, 'parentView'), null, 'clears the parent view of the fourth view');

  run(function() {
    secondView.destroy();
    thirdView.destroy();
    fourthView.destroy();
  });
});

QUnit.test('should trigger parentViewDidChange when parentView is changed', function() {
  container = ContainerView.create();

  var secondContainer = ContainerView.create();
  var parentViewChanged = 0;

  var ViewKlass = View.extend({
    parentViewDidChange() { parentViewChanged++; }
  });

  view = ViewKlass.create();

  container.pushObject(view);
  container.removeChild(view);
  secondContainer.pushObject(view);

  equal(parentViewChanged, 3);

  run(function() {
    secondContainer.destroy();
  });
});

QUnit.test('should be able to push initial views onto the ContainerView and have it behave', function() {
  var Container = ContainerView.extend({
    init() {
      this._super.apply(this, arguments);
      this.pushObject(View.create({
        name: 'A',
        template: compile('A')
      }));
      this.pushObject(View.create({
        name: 'B',
        template: compile('B')
      }));
    },
    // functions here avoid attaching an observer, which is
    // not supported.
    lengthSquared() {
      return this.get('length') * this.get('length');
    },
    mapViewNames() {
      return this.map(function(_view) {
        return _view.get('name');
      });
    }
  });

  container = Container.create();

  equal(container.lengthSquared(), 4);

  deepEqual(container.mapViewNames(), ['A', 'B']);

  run(container, 'appendTo', '#qunit-fixture');

  equal(container.$().text(), 'AB');

  run(function () {
    container.pushObject(View.create({
      name: 'C',
      template: compile('C')
    }));
  });

  equal(container.lengthSquared(), 9);

  deepEqual(container.mapViewNames(), ['A', 'B', 'C']);

  equal(container.$().text(), 'ABC');

  run(container, 'destroy');
});

QUnit.test('views that are removed from a ContainerView should have their child views cleared', function() {
  container = ContainerView.create();

  var ChildView = View.extend({
    MyView: View,
    template: compile('{{view MyView}}')
  });
  var view = ChildView.create();

  container.pushObject(view);

  run(function() {
    container.appendTo('#qunit-fixture');
  });

  equal(get(view, 'childViews.length'), 1, 'precond - renders one child view');
  run(function() {
    container.removeObject(view);
  });
  strictEqual(container.$('div').length, 0, 'the child view is removed from the DOM');
});

QUnit.test('if a ContainerView starts with an empty currentView, nothing is displayed', function() {
  container = ContainerView.create();

  run(function() {
    container.appendTo('#qunit-fixture');
  });

  equal(container.$().text(), '', 'has a empty contents');
  equal(get(container, 'childViews.length'), 0, 'should not have any child views');
});

QUnit.test('if a ContainerView starts with a currentView, it is rendered as a child view', function() {
  var controller = Controller.create();
  container = ContainerView.create({
    controller: controller
  });

  var mainView = View.create({
    template: compile('This is the main view.')
  });

  set(container, 'currentView', mainView);

  run(function() {
    container.appendTo('#qunit-fixture');
  });

  equal(trim(container.$().text()), 'This is the main view.', 'should render its child');
  equal(get(container, 'length'), 1, 'should have one child view');
  equal(container.objectAt(0), mainView, 'should have the currentView as the only child view');
  equal(mainView.get('parentView'), container, 'parentView is setup');
});

QUnit.test('if a ContainerView is created with a currentView, it is rendered as a child view', function() {
  var mainView = View.create({
    template: compile('This is the main view.')
  });

  var controller = Controller.create();

  container = ContainerView.create({
    currentView: mainView,
    controller: controller
  });

  run(function() {
    container.appendTo('#qunit-fixture');
  });

  equal(container.$().text(), 'This is the main view.', 'should render its child');
  equal(get(container, 'length'), 1, 'should have one child view');
  equal(container.objectAt(0), mainView, 'should have the currentView as the only child view');
  equal(mainView.get('parentView'), container, 'parentView is setup');
});

QUnit.test('if a ContainerView starts with no currentView and then one is set, the ContainerView is updated', function() {
  var mainView = View.create({
    template: compile('This is the {{name}} view.')
  });

  var controller = Controller.create({
    name: 'main'
  });

  container = ContainerView.create({
    controller: controller
  });

  run(function() {
    container.appendTo('#qunit-fixture');
  });

  equal(container.$().text(), '', 'has a empty contents');
  equal(get(container, 'childViews.length'), 0, 'should not have any child views');

  run(function() {
    set(container, 'currentView', mainView);
  });

  equal(container.$().text(), 'This is the main view.', 'should render its child');
  equal(get(container, 'length'), 1, 'should have one child view');
  equal(container.objectAt(0), mainView, 'should have the currentView as the only child view');
  equal(mainView.get('parentView'), container, 'parentView is setup');
});

QUnit.test('if a ContainerView starts with a currentView and then is set to null, the ContainerView is updated', function() {
  var mainView = View.create({
    template: compile('This is the main view.')
  });

  var controller = Controller.create();

  container = ContainerView.create({
    controller: controller
  });

  container.set('currentView', mainView);

  run(function() {
    container.appendTo('#qunit-fixture');
  });

  equal(container.$().text(), 'This is the main view.', 'should render its child');
  equal(get(container, 'length'), 1, 'should have one child view');
  equal(container.objectAt(0), mainView, 'should have the currentView as the only child view');
  equal(mainView.get('parentView'), container, 'parentView is setup');

  run(function() {
    set(container, 'currentView', null);
  });

  equal(container.$().text(), '', 'has a empty contents');
  equal(get(container, 'childViews.length'), 0, 'should not have any child views');
});

QUnit.test('if a ContainerView starts with a currentView and then is set to null, the ContainerView is updated and the previous currentView is destroyed', function() {
  var mainView = View.create({
    template: compile('This is the main view.')
  });

  var controller = Controller.create();

  container = ContainerView.create({
    controller: controller
  });

  container.set('currentView', mainView);

  run(function() {
    container.appendTo('#qunit-fixture');
  });

  equal(container.$().text(), 'This is the main view.', 'should render its child');
  equal(get(container, 'length'), 1, 'should have one child view');
  equal(container.objectAt(0), mainView, 'should have the currentView as the only child view');
  equal(mainView.get('parentView'), container, 'parentView is setup');

  run(function() {
    set(container, 'currentView', null);
  });

  equal(mainView.isDestroyed, true, 'should destroy the previous currentView.');

  equal(container.$().text(), '', 'has a empty contents');
  equal(get(container, 'childViews.length'), 0, 'should not have any child views');
});

QUnit.test('if a ContainerView starts with a currentView and then a different currentView is set, the old view is destroyed and the new one is added', function() {
  container = ContainerView.create();
  var mainView = View.create({
    template: compile('This is the main view.')
  });

  var secondaryView = View.create({
    template: compile('This is the secondary view.')
  });

  var tertiaryView = View.create({
    template: compile('This is the tertiary view.')
  });

  container.set('currentView', mainView);

  run(function() {
    container.appendTo('#qunit-fixture');
  });

  equal(container.$().text(), 'This is the main view.', 'should render its child');
  equal(get(container, 'length'), 1, 'should have one child view');
  equal(container.objectAt(0), mainView, 'should have the currentView as the only child view');

  run(function() {
    set(container, 'currentView', secondaryView);
  });

  equal(get(container, 'length'), 1, 'should have one child view');
  equal(container.objectAt(0), secondaryView, 'should have the currentView as the only child view');
  equal(mainView.isDestroyed, true, 'should destroy the previous currentView: mainView.');

  equal(trim(container.$().text()), 'This is the secondary view.', 'should render its child');

  run(function() {
    set(container, 'currentView', tertiaryView);
  });

  equal(get(container, 'length'), 1, 'should have one child view');
  equal(container.objectAt(0), tertiaryView, 'should have the currentView as the only child view');
  equal(secondaryView.isDestroyed, true, 'should destroy the previous currentView: secondaryView.');

  equal(trim(container.$().text()), 'This is the tertiary view.', 'should render its child');
});

var child, count;
QUnit.module('Ember.ContainerView - modify childViews', {
  setup() {
    originalViewKeyword = registerKeyword('view',  viewKeyword);
    container = ContainerView.create({
      _viewRegistry: { }
    });

    run(function() {
      container.appendTo('#qunit-fixture');
    });

    count = 0;
    child = View.create({
      template: function () {
        count++;
        return 'child';
      }
    });
  },
  teardown() {
    run(function() {
      container.destroy();
      if (view) { view.destroy(); }
      if (child) { child.destroy(); }
      if (otherContainer) { otherContainer.destroy(); }
    });
  }
});

QUnit.test('should be able to modify childViews many times during a run loop', function () {
  var one = View.create({
    template: compile('one')
  });

  var two = View.create({
    template: compile('two')
  });

  var three = View.create({
    template: compile('three')
  });

  run(function() {
    // initial order
    container.pushObjects([three, one, two]);
    // sort
    container.removeObject(three);
    container.pushObject(three);
  });

  // Remove whitespace added by IE 8
  equal(trim(container.$().text()), 'onetwothree');
});

QUnit.test('should be able to modify childViews then rerender the ContainerView in same run loop', function () {
  container = ContainerView.create({
  });

  run(function() {
    container.appendTo('#qunit-fixture');
  });

  var child = View.create({
    _viewRegistry: { },
    template: compile('child')
  });

  run(function() {
    container.pushObject(child);
    container.rerender();
  });

  equal(trim(container.$().text()), 'child');
});

QUnit.test('should be able to modify childViews then remove the ContainerView in same run loop', function () {
  run(function() {
    container.pushObject(child);
    container.remove();
  });

  equal(count, 0, 'did not render child');
});

QUnit.test('should be able to modify childViews then destroy the ContainerView in same run loop', function () {
  run(function() {
    container.pushObject(child);
    container.destroy();
  });

  equal(count, 0, 'did not render child');
});

QUnit.test('should be able to modify childViews then rerender then modify again the ContainerView in same run loop', function () {
  container = ContainerView.create();

  run(function() {
    container.appendTo('#qunit-fixture');
  });

  var Child = View.extend({
    count: 0,
    _willRender() {
      this.count++;
    },
    template: compile('{{view.label}}')
  });

  var one = Child.create({ label: 'one' });
  var two = Child.create({ label: 'two' });

  run(function() {
    container.pushObject(one);
    container.pushObject(two);
  });

  equal(one.count, 1, 'rendered one.count child only once');
  equal(two.count, 1, 'rendered two.count child only once');
  // Remove whitespace added by IE 8
  equal(trim(container.$().text()), 'onetwo');
});

QUnit.test('should be able to modify childViews then rerender again the ContainerView in same run loop and then modify again', function () {
  container = ContainerView.create();

  run(function() {
    container.appendTo('#qunit-fixture');
  });

  var Child = View.extend({
    count: 0,
    _willRender() {
      this.count++;
    },
    template: compile('{{view.label}}')
  });

  var one = Child.create({ label: 'one' });
  var two = Child.create({ label: 'two' });

  run(function() {
    container.pushObject(one);
    container.rerender();
  });

  equal(one.count, 1, 'rendered one child only once');
  equal(container.$().text(), 'one');

  run(function () {
    container.pushObject(two);
  });

  equal(one.count, 1, 'rendered one child only once');
  equal(two.count, 1, 'rendered two child only once');

  // IE 8 adds a line break but this shouldn't affect validity
  equal(trim(container.$().text()), 'onetwo');
});

QUnit.module('Ember.ContainerView', {
  setup() {
    originalViewKeyword = registerKeyword('view',  viewKeyword);
  },
  teardown() {
    run(function() {
      container.destroy();
      if (view) { view.destroy(); }
      if (otherContainer) { otherContainer.destroy(); }
    });
  }
});

QUnit.test('should invalidate `element` on itself and childViews when being rendered by ensureChildrenAreInDOM', function () {
  expectDeprecation('Setting `childViews` on a Container is deprecated.');

  var root = ContainerView.create();

  view = View.create({ template: compile('child view') });
  container = ContainerView.create({ childViews: ['child'], child: view });

  run(function() {
    root.appendTo('#qunit-fixture');
  });

  run(function() {
    root.pushObject(container);

    // Get the parent and child's elements to cause them to be cached as null
    container.get('element');
    view.get('element');
  });

  ok(!!container.get('element'), 'Parent\'s element should have been recomputed after being rendered');
  ok(!!view.get('element'), 'Child\'s element should have been recomputed after being rendered');

  run(function() {
    root.destroy();
  });
});

QUnit.test('Child view can only be added to one container at a time', function () {
  expect(2);

  container = ContainerView.create();
  var secondContainer = ContainerView.create();

  run(function() {
    container.appendTo('#qunit-fixture');
  });

  var view = View.create();

  run(function() {
    container.set('currentView', view);
  });

  expectAssertion(function() {
    run(function() {
      secondContainer.set('currentView', view);
    });
  });

  expectAssertion(function() {
    run(function() {
      secondContainer.pushObject(view);
    });
  });

  run(function() {
    secondContainer.destroy();
  });
});

QUnit.test('if a containerView appends a child in its didInsertElement event, the didInsertElement event of the child view should be fired once', function (assert) {
  var counter = 0;
  var root = ContainerView.create({});

  container = ContainerView.create({
    didInsertElement() {
      var view = ContainerView.create({
        didInsertElement() {
          counter++;
        }
      });

      this.pushObject(view);
    }
  });

  run(function() {
    root.appendTo('#qunit-fixture');
  });

  expectDeprecation(function() {
    run(function() {
      root.pushObject(container);
    });
  }, /was modified inside the didInsertElement hook/);

  assert.strictEqual(counter, 1, 'child didInsertElement was invoked');

  run(function() {
    root.destroy();
  });
});


QUnit.test('ContainerView is observable [DEPRECATED]', function() {
  container = ContainerView.create();
  var observerFired = false;
  expectDeprecation(function() {
    container.addObserver('this.[]', function() {
      observerFired = true;
    });
  }, /ContainerViews should not be observed as arrays. This behavior will change in future implementations of ContainerView./);

  ok(!observerFired, 'Nothing changed, no observer fired');

  container.pushObject(View.create());
  ok(observerFired, 'View pushed, observer fired');
});

QUnit.test('ContainerView supports bound attributes', function() {
  container = ContainerView.create({
    attributeBindings: ['width'],
    width: '100px'
  });

  run(function() {
    container.appendTo('#qunit-fixture');
  });

  equal(container.$().attr('width'), '100px', 'width is applied to the element');

  run(function() {
    container.set('width', '200px');
  });

  equal(container.$().attr('width'), '200px', 'width is applied to the element');
});

QUnit.test('ContainerView supports bound style attribute', function() {
  container = ContainerView.create({
    attributeBindings: ['style'],
    style: 'width: 100px;'
  });

  run(function() {
    container.appendTo('#qunit-fixture');
  });

  equal(getElementStyle(container.element), 'WIDTH: 100PX;', 'width is applied to the element');

  run(function() {
    container.set('style', 'width: 200px;');
  });

  equal(getElementStyle(container.element), 'WIDTH: 200PX;', 'width is applied to the element');
});

QUnit.test('ContainerView supports changing children with style attribute', function() {
  container = ContainerView.create({
    attributeBindings: ['style'],
    style: 'width: 100px;'
  });

  run(function() {
    container.appendTo('#qunit-fixture');
  });

  equal(getElementStyle(container.element), 'WIDTH: 100PX;', 'width is applied to the element');

  view = View.create();

  run(function() {
    container.pushObject(view);
  });
});

QUnit.test('should render child views with a different tagName', function() {
  expectDeprecation('Setting `childViews` on a Container is deprecated.');

  container = ContainerView.create({
    childViews: ['child'],

    child: View.create({
      tagName: 'aside'
    })
  });

  run(function() {
    container.createElement();
  });

  equal(container.$('aside').length, 1);
});

QUnit.test('should allow hX tags as tagName', function() {
  expectDeprecation('Setting `childViews` on a Container is deprecated.');

  container = ContainerView.create({
    childViews: ['child'],

    child: View.create({
      tagName: 'h3'
    })
  });

  run(function() {
    container.createElement();
  });

  ok(container.$('h3').length, 'does not render the h3 tag correctly');
});

QUnit.test('renders contained view with omitted start tag and parent view context', function() {
  expectDeprecation('Setting `childViews` on a Container is deprecated.');

  view = ContainerView.extend({
    tagName: 'table',
    childViews: ['row'],
    row: View.create({
      tagName: 'tr'
    })
  }).create();

  run(view, view.append);

  equal(view.element.tagName, 'TABLE', 'container view is table');
  equal(view.element.childNodes[2].tagName, 'TR', 'inner view is tr');

  run(view, view.rerender);

  equal(view.element.tagName, 'TABLE', 'container view is table');
  equal(view.element.childNodes[2].tagName, 'TR', 'inner view is tr');
});

QUnit.module('DeprecatedContainerView');

QUnit.test('calling reopen on DeprecatedContainerView delegates to ContainerView', function() {
  expect(2);
  var originalReopen = ContainerView.reopen;
  var obj = {};

  ContainerView.reopen = function(arg) { ok(arg === obj); };

  expectNoDeprecation();
  DeprecatedContainerView.reopen(obj);

  ContainerView.reopen = originalReopen;
});
