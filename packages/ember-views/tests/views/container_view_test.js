import { get } from "ember-metal/property_get";
import { set } from "ember-metal/property_set";
import run from "ember-metal/run_loop";
import { computed } from "ember-metal/computed";
import { Controller } from "ember-runtime/controllers/controller";
import jQuery from "ember-views/system/jquery";
import View from "ember-views/views/view";
import ContainerView from "ember-views/views/container_view";

var trim = jQuery.trim, container, view, otherContainer;

QUnit.module("ember-views/views/container_view_test", {
  teardown: function() {
    run(function() {
      container.destroy();
      if (view) { view.destroy(); }
      if (otherContainer) { otherContainer.destroy(); }
    });
  }
});

test("should be able to insert views after the DOM representation is created", function() {
  container = ContainerView.create({
    classNameBindings: ['name'],
    name: 'foo',
    container: {}
  });

  run(function() {
    container.appendTo('#qunit-fixture');
  });

  view = View.create({
    template: function() {
      return "This is my moment";
    }
  });

  run(function() {
    container.pushObject(view);
  });

  equal(view.container, container.container, 'view gains its containerViews container');
  equal(view._parentView, container, 'view\'s _parentView is the container');
  equal(jQuery.trim(container.$().text()), "This is my moment");

  run(function() {
    container.destroy();
  });

});

test("should be able to observe properties that contain child views", function() {
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
  equal(container.get('displayIsDisplayed'), true, "can bind to child view");

  run(function () {
    container.set('displayView.isDisplayed', false);
  });

  equal(container.get('displayIsDisplayed'), false, "can bind to child view");
});

test("childViews inherit their parents iocContainer, and retain the original container even when moved", function() {
  container = ContainerView.create({
    container: {}
  });

  otherContainer = ContainerView.create({
    container: {}
  });

  view = View.create();

  container.pushObject(view);

  equal(view.get('parentView'), container, "sets the parent view after the childView is appended");
  equal(get(view, 'container'), container.container, "inherits its parentViews iocContainer");

  container.removeObject(view);

  equal(get(view, 'container'), container.container, "leaves existing iocContainer alone");

  otherContainer.pushObject(view);

  equal(view.get('parentView'), otherContainer, "sets the new parent view after the childView is appended");
  equal(get(view, 'container'), container.container, "still inherits its original parentViews iocContainer");
});

test("should set the parentView property on views that are added to the child views array", function() {
  container = ContainerView.create();

  var ViewKlass = View.extend({
      template: function() {
        return "This is my moment";
      }
    });

  view = ViewKlass.create();

  container.pushObject(view);
  equal(view.get('parentView'), container, "sets the parent view after the childView is appended");

  run(function() {
    container.removeObject(view);
  });
  equal(get(view, 'parentView'), null, "sets parentView to null when a view is removed");

  run(function() {
    container.appendTo('#qunit-fixture');
  });

  run(function() {
    container.pushObject(view);
  });

  equal(get(view, 'parentView'), container, "sets the parent view after the childView is appended");

  var secondView = ViewKlass.create(),
      thirdView = ViewKlass.create(),
      fourthView = ViewKlass.create();

  run(function() {
    container.pushObject(secondView);
    container.replace(1, 0, [thirdView, fourthView]);
  });

  equal(get(secondView, 'parentView'), container, "sets the parent view of the second view");
  equal(get(thirdView, 'parentView'), container, "sets the parent view of the third view");
  equal(get(fourthView, 'parentView'), container, "sets the parent view of the fourth view");

  run(function() {
    container.replace(2, 2);
  });

  equal(get(view, 'parentView'), container, "doesn't change non-removed view");
  equal(get(thirdView, 'parentView'), container, "doesn't change non-removed view");
  equal(get(secondView, 'parentView'), null, "clears the parent view of the third view");
  equal(get(fourthView, 'parentView'), null, "clears the parent view of the fourth view");

  run(function() {
    secondView.destroy();
    thirdView.destroy();
    fourthView.destroy();
  });
});

test("should trigger parentViewDidChange when parentView is changed", function() {
  container = ContainerView.create();

  var secondContainer = ContainerView.create();
  var parentViewChanged = 0;

  var ViewKlass = View.extend({
    parentViewDidChange: function() { parentViewChanged++; }
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

test("should be able to push initial views onto the ContainerView and have it behave", function() {
  var Container = ContainerView.extend({
    init: function () {
      this._super();
      this.pushObject(View.create({
        name: 'A',
        template: function () {
          return 'A';
        }
      }));
      this.pushObject(View.create({
        name: 'B',
        template: function () {
          return 'B';
        }
      }));
    },
    lengthSquared: computed(function () {
      return this.get('length') * this.get('length');
    }).property('length'),

    names: computed(function () {
      return this.mapBy('name');
    }).property('@each.name')
  });

  container = Container.create();

  equal(container.get('lengthSquared'), 4);

  deepEqual(container.get('names'), ['A','B']);

  run(container, 'appendTo', '#qunit-fixture');

  equal(container.$().text(), 'AB');

  run(function () {
    container.pushObject(View.create({
      name: 'C',
      template: function () {
        return 'C';
      }
    }));
  });

  equal(container.get('lengthSquared'), 9);

  deepEqual(container.get('names'), ['A','B','C']);

  equal(container.$().text(), 'ABC');

  run(container, 'destroy');
});

test("views that are removed from a ContainerView should have their child views cleared", function() {
  container = ContainerView.create();
  view = View.createWithMixins({
    remove: function() {
      this._super();
    },
    template: function(context, options) {
      options.data.view.appendChild(View);
    }
  });

  container.pushObject(view);

  run(function() {
    container.appendTo('#qunit-fixture');
  });

  equal(get(view, 'childViews.length'), 1, "precond - renders one child view");
  run(function() {
    container.removeObject(view);
  });
  equal(get(view, 'childViews.length'), 0, "child views are cleared when removed from container view");
  equal(container.$().html(),'', "the child view is removed from the DOM");
});

test("if a ContainerView starts with an empy currentView, nothing is displayed", function() {
  container = ContainerView.create();

  run(function() {
    container.appendTo('#qunit-fixture');
  });

  equal(container.$().text(), '', "has a empty contents");
  equal(get(container, 'childViews.length'), 0, "should not have any child views");
});

test("if a ContainerView starts with a currentView, it is rendered as a child view", function() {
  var controller = Controller.create();
  container = ContainerView.create({
    controller: controller
  });
  var context = null;
  var templateData = null;
  var mainView = View.create({
    template: function(ctx, opts) {
      context = ctx;
      templateData = opts.data;
      return "This is the main view.";
    }
  });

  set(container, 'currentView', mainView);

  run(function() {
    container.appendTo('#qunit-fixture');
  });

  equal(jQuery.trim(container.$().text()), "This is the main view.", "should render its child");
  equal(get(container, 'length'), 1, "should have one child view");
  equal(container.objectAt(0), mainView, "should have the currentView as the only child view");
  equal(mainView.get('parentView'), container, "parentView is setup");
  equal(context, container.get('context'), 'context preserved');
  equal(templateData.keywords.controller, controller, 'templateData is setup');
  equal(templateData.keywords.view, mainView, 'templateData is setup');
});

test("if a ContainerView is created with a currentView, it is rendered as a child view", function() {
  var context = null;
  var templateData = null;
  var mainView = View.create({
    template: function(ctx, opts) {
      context = ctx;
      templateData = opts.data;
      return "This is the main view.";
    }
  });

  var controller = Controller.create();

  container = ContainerView.create({
    currentView: mainView,
    controller: controller
  });

  run(function() {
    container.appendTo('#qunit-fixture');
  });

  equal(container.$().text(), "This is the main view.", "should render its child");
  equal(get(container, 'length'), 1, "should have one child view");
  equal(container.objectAt(0), mainView, "should have the currentView as the only child view");
  equal(mainView.get('parentView'), container, "parentView is setup");
  equal(context, container.get('context'), 'context preserved');
  equal(templateData.keywords.controller, controller, 'templateData is setup');
  equal(templateData.keywords.view, mainView, 'templateData is setup');
});

test("if a ContainerView starts with no currentView and then one is set, the ContainerView is updated", function() {
  var context = null;
  var templateData = null;
  var mainView = View.create({
    template: function(ctx, opts) {
      context = ctx;
      templateData = opts.data;
      return "This is the main view.";
    }
  });

  var controller = Controller.create();

  container = ContainerView.create({
    controller: controller
  });

  run(function() {
    container.appendTo('#qunit-fixture');
  });

  equal(container.$().text(), '', "has a empty contents");
  equal(get(container, 'childViews.length'), 0, "should not have any child views");

  run(function() {
    set(container, 'currentView', mainView);
  });

  equal(container.$().text(), "This is the main view.", "should render its child");
  equal(get(container, 'length'), 1, "should have one child view");
  equal(container.objectAt(0), mainView, "should have the currentView as the only child view");
  equal(mainView.get('parentView'), container, "parentView is setup");
  equal(context, container.get('context'), 'context preserved');
  equal(templateData.keywords.controller, controller, 'templateData is setup');
  equal(templateData.keywords.view, mainView, 'templateData is setup');
});

test("if a ContainerView starts with a currentView and then is set to null, the ContainerView is updated", function() {
  var context = null;
  var templateData = null;
  var mainView = View.create({
    template: function(ctx, opts) {
      context = ctx;
      templateData = opts.data;
      return "This is the main view.";
    }
  });

  var controller = Controller.create();

  container = ContainerView.create({
    controller: controller
  });

  container.set('currentView', mainView);

  run(function() {
    container.appendTo('#qunit-fixture');
  });

  equal(container.$().text(), "This is the main view.", "should render its child");
  equal(get(container, 'length'), 1, "should have one child view");
  equal(container.objectAt(0), mainView, "should have the currentView as the only child view");
  equal(mainView.get('parentView'), container, "parentView is setup");
  equal(context, container.get('context'), 'context preserved');
  equal(templateData.keywords.controller, controller, 'templateData is setup');
  equal(templateData.keywords.view, mainView, 'templateData is setup');

  run(function() {
    set(container, 'currentView', null);
  });

  equal(container.$().text(), '', "has a empty contents");
  equal(get(container, 'childViews.length'), 0, "should not have any child views");
});

test("if a ContainerView starts with a currentView and then is set to null, the ContainerView is updated and the previous currentView is destroyed", function() {
  var context = null;
  var templateData = null;
  var mainView = View.create({
    template: function(ctx, opts) {
      context = ctx;
      templateData = opts.data;
      return "This is the main view.";
    }
  });

  var controller = Controller.create();

  container = ContainerView.create({
    controller: controller
  });

  container.set('currentView', mainView);

  run(function() {
    container.appendTo('#qunit-fixture');
  });

  equal(container.$().text(), "This is the main view.", "should render its child");
  equal(get(container, 'length'), 1, "should have one child view");
  equal(container.objectAt(0), mainView, "should have the currentView as the only child view");
  equal(mainView.get('parentView'), container, "parentView is setup");
  equal(context, container.get('context'), 'context preserved');
  equal(templateData.keywords.controller, controller, 'templateData is setup');
  equal(templateData.keywords.view, mainView, 'templateData is setup');

  run(function() {
    set(container, 'currentView', null);
  });

  equal(mainView.isDestroyed, true, 'should destroy the previous currentView.');

  equal(container.$().text(), '', "has a empty contents");
  equal(get(container, 'childViews.length'), 0, "should not have any child views");
});

test("if a ContainerView starts with a currentView and then a different currentView is set, the old view is destroyed and the new one is added", function() {
  container = ContainerView.create();
  var mainView = View.create({
    template: function() {
      return "This is the main view.";
    }
  });

  var secondaryView = View.create({
    template: function() {
      return "This is the secondary view.";
    }
  });

  var tertiaryView = View.create({
    template: function() {
      return "This is the tertiary view.";
    }
  });

  container.set('currentView', mainView);

  run(function() {
    container.appendTo('#qunit-fixture');
  });

  equal(container.$().text(), "This is the main view.", "should render its child");
  equal(get(container, 'length'), 1, "should have one child view");
  equal(container.objectAt(0), mainView, "should have the currentView as the only child view");

  run(function() {
    set(container, 'currentView', secondaryView);
  });


  equal(get(container, 'length'), 1, "should have one child view");
  equal(container.objectAt(0), secondaryView, "should have the currentView as the only child view");
  equal(mainView.isDestroyed, true, 'should destroy the previous currentView: mainView.');

  equal(jQuery.trim(container.$().text()), "This is the secondary view.", "should render its child");

  run(function() {
    set(container, 'currentView', tertiaryView);
  });

  equal(get(container, 'length'), 1, "should have one child view");
  equal(container.objectAt(0), tertiaryView, "should have the currentView as the only child view");
  equal(secondaryView.isDestroyed, true, 'should destroy the previous currentView: secondaryView.');

  equal(jQuery.trim(container.$().text()), "This is the tertiary view.", "should render its child");
});

test("should be able to modify childViews many times during an run loop", function () {

  container = ContainerView.create();

  run(function() {
    container.appendTo('#qunit-fixture');
  });

  var one = View.create({
    template: function() {
      return 'one';
    }
  });

  var two = View.create({
    template: function() {
      return 'two';
    }
  });

  var three = View.create({
    template: function() {
      return 'three';
    }
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

test("should be able to modify childViews then remove the ContainerView in same run loop", function () {
  container = ContainerView.create();

  run(function() {
    container.appendTo('#qunit-fixture');
  });

  var count = 0;
  var child = View.create({
    template: function () { count++; return 'child'; }
  });

  run(function() {
    container.pushObject(child);
    container.remove();
  });

  equal(count, 0, 'did not render child');
});

test("should be able to modify childViews then destroy the ContainerView in same run loop", function () {
    container = ContainerView.create();

  run(function() {
    container.appendTo('#qunit-fixture');
  });

  var count = 0;
  var child = View.create({
    template: function () { count++; return 'child'; }
  });

  run(function() {
    container.pushObject(child);
    container.destroy();
  });

  equal(count, 0, 'did not render child');
});


test("should be able to modify childViews then rerender the ContainerView in same run loop", function () {
    container = ContainerView.create();

  run(function() {
    container.appendTo('#qunit-fixture');
  });

  var count = 0;
  var child = View.create({
    template: function () { count++; return 'child'; }
  });

  run(function() {
    container.pushObject(child);
    container.rerender();
  });

  equal(count, 1, 'rendered child only once');
});

test("should be able to modify childViews then rerender then modify again the ContainerView in same run loop", function () {
  container = ContainerView.create();

  run(function() {
    container.appendTo('#qunit-fixture');
  });

  var Child = View.extend({
    count: 0,
    render: function (buffer) {
      this.count++;
      buffer.push(this.label);
    }
  });
  var one = Child.create({label: 'one'});
  var two = Child.create({label: 'two'});

  run(function() {
    container.pushObject(one);
    container.pushObject(two);
  });

  equal(one.count, 1, 'rendered child only once');
  equal(two.count, 1, 'rendered child only once');
  // Remove whitespace added by IE 8
  equal(trim(container.$().text()), 'onetwo');
});

test("should be able to modify childViews then rerender again the ContainerView in same run loop and then modify again", function () {
  container = ContainerView.create();

  run(function() {
    container.appendTo('#qunit-fixture');
  });

  var Child = View.extend({
    count: 0,
    render: function (buffer) {
      this.count++;
      buffer.push(this.label);
    }
  });
  var one = Child.create({label: 'one'});
  var two = Child.create({label: 'two'});

  run(function() {
    container.pushObject(one);
    container.rerender();
  });

  equal(one.count, 1, 'rendered child only once');
  equal(container.$().text(), 'one');

  run(function () {
    container.pushObject(two);
  });

  equal(one.count, 1, 'rendered child only once');
  equal(two.count, 1, 'rendered child only once');
  // IE 8 adds a line break but this shouldn't affect validity
  equal(trim(container.$().text()), 'onetwo');
});

test("should invalidate `element` on itself and childViews when being rendered by ensureChildrenAreInDOM", function () {
  var root = ContainerView.create();

  view = View.create({ template: function() {} });
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

  ok(!!container.get('element'), "Parent's element should have been recomputed after being rendered");
  ok(!!view.get('element'), "Child's element should have been recomputed after being rendered");

  run(function() {
    root.destroy();
  });
});

test("Child view can only be added to one container at a time", function () {
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

test("if a containerView appends a child in its didInsertElement event, the didInsertElement event of the child view should be fired once", function () {

  var counter = 0,
      root = ContainerView.create({});

  container = ContainerView.create({

    didInsertElement: function() {

      var view = ContainerView.create({
        didInsertElement: function() {
          counter++;
        }
      });

      this.pushObject(view);

    }

  });


  run(function() {
    root.appendTo('#qunit-fixture');
  });

  run(function() {
    root.pushObject(container);
  });

  equal(container.get('childViews').get('length'), 1 , "containerView should only have a child");
  equal(counter, 1 , "didInsertElement should be fired once");

  run(function() {
    root.destroy();
  });

});

