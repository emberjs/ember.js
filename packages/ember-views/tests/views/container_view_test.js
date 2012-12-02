var get = Ember.get, set = Ember.set;

module("ember-views/views/container_view_test");

test("should be able to insert views after the DOM representation is created", function() {
  var container = Ember.ContainerView.create({
    classNameBindings: ['name'],
    name: 'foo'
  });

  Ember.run(function() {
    container.appendTo('#qunit-fixture');
  });

  var view = Ember.View.create({
    template: function() {
      return "This is my moment";
    }
  });

  Ember.run(function() {
    container.get('childViews').pushObject(view);
  });

  equal(container.$().text(), "This is my moment");

  Ember.run(function(){
    container.destroy();
  });

});

test("should be able to observe properties that contain child views", function() {
  var container;

  Ember.run(function() {
    container = Ember.ContainerView.createWithMixins({
      childViews: ['displayView'],
      displayIsDisplayedBinding: 'displayView.isDisplayed',

      displayView: Ember.View.extend({
        isDisplayed: true
      })
    });

    container.appendTo('#qunit-fixture');
  });

  ok(container.get('displayIsDisplayed'), "can bind to child view");
});

test("should set the parentView property on views that are added to the child views array", function() {
  var container = Ember.ContainerView.create(),
      View = Ember.View.extend({
        template: function() {
          return "This is my moment";
        }
      }),
      view = View.create(),
      childViews = get(container, 'childViews');

  childViews.pushObject(view);
  equal(view.get('parentView'), container, "sets the parent view after the childView is appended");

  Ember.run(function() {
    childViews.removeObject(view);
  });
  equal(get(view, 'parentView'), null, "sets parentView to null when a view is removed");

  Ember.run(function() {
    container.appendTo('#qunit-fixture');
  });

  Ember.run(function(){
    childViews.pushObject(view);
  });

  equal(get(view, 'parentView'), container, "sets the parent view after the childView is appended");

  var secondView = View.create(),
      thirdView = View.create(),
      fourthView = View.create();

  Ember.run(function(){
    childViews.pushObject(secondView);
    childViews.replace(1, 0, [thirdView, fourthView]);
  });

  equal(get(secondView, 'parentView'), container, "sets the parent view of the second view");
  equal(get(thirdView, 'parentView'), container, "sets the parent view of the third view");
  equal(get(fourthView, 'parentView'), container, "sets the parent view of the fourth view");

  childViews.replace(2, 2);
  equal(get(view, 'parentView'), container, "doesn't change non-removed view");
  equal(get(thirdView, 'parentView'), container, "doesn't change non-removed view");
  equal(get(secondView, 'parentView'), null, "clears the parent view of the third view");
  equal(get(fourthView, 'parentView'), null, "clears the parent view of the fourth view");
});

test("views that are removed from a ContainerView should have their child views cleared", function() {
  var container = Ember.ContainerView.create();
  var view = Ember.View.createWithMixins({
    remove: function() {
      this._super();
    },
    template: function(context, options) {
      options.data.view.appendChild(Ember.View);
    }
  });

  get(container, 'childViews').pushObject(view);

  Ember.run(function() {
    container.appendTo('#qunit-fixture');
  });

  equal(get(view, 'childViews.length'), 1, "precond - renders one child view");
  Ember.run(function() {
    get(container, 'childViews').removeObject(view);
  });
  equal(get(view, 'childViews.length'), 0, "child views are cleared when removed from container view");
});

test("if a ContainerView starts with an empy currentView, nothing is displayed", function() {
  var container = Ember.ContainerView.create();

  Ember.run(function() {
    container.appendTo('#qunit-fixture');
  });

  equal(container.$().text(), '', "has a empty contents");
  equal(get(container, 'childViews.length'), 0, "should not have any child views");
});

test("if a ContainerView starts with a currentView, it is rendered as a child view", function() {
  var controller = Ember.Controller.create();
  var container = Ember.ContainerView.create({
    controller: controller
  });
  var context = null;
  var templateData = null;
  var mainView = Ember.View.create({
    template: function(ctx, opts) {
      context = ctx;
      templateData = opts.data;
      return "This is the main view.";
    }
  });

  set(container, 'currentView', mainView);

  Ember.run(function() {
    container.appendTo('#qunit-fixture');
  });

  equal(container.$().text(), "This is the main view.", "should render its child");
  equal(get(container, 'childViews.length'), 1, "should have one child view");
  equal(get(container, 'childViews').objectAt(0), mainView, "should have the currentView as the only child view");
  equal(mainView.get('parentView'), container, "parentView is setup");
  equal(context, container.get('context'), 'context preserved');
  equal(templateData.keywords.controller, controller, 'templateData is setup');
  equal(templateData.keywords.view, mainView, 'templateData is setup');
});

test("if a ContainerView is created with a currentView, it is rendered as a child view", function() {
  var context = null;
  var templateData = null;
  var mainView = Ember.View.create({
    template: function(ctx, opts) {
      context = ctx;
      templateData = opts.data;
      return "This is the main view.";
    }
  });

  var controller = Ember.Controller.create();

  var container = Ember.ContainerView.create({
    currentView: mainView,
    controller: controller
  });

  Ember.run(function() {
    container.appendTo('#qunit-fixture');
  });

  equal(container.$().text(), "This is the main view.", "should render its child");
  equal(get(container, 'childViews.length'), 1, "should have one child view");
  equal(get(container, 'childViews').objectAt(0), mainView, "should have the currentView as the only child view");
  equal(mainView.get('parentView'), container, "parentView is setup");
  equal(context, container.get('context'), 'context preserved');
  equal(templateData.keywords.controller, controller, 'templateData is setup');
  equal(templateData.keywords.view, mainView, 'templateData is setup');
});

test("if a ContainerView starts with no currentView and then one is set, the ContainerView is updated", function() {
  var container = Ember.ContainerView.create();
  var mainView = Ember.View.create({
    template: function() {
      return "This is the main view.";
    }
  });

  Ember.run(function() {
    container.appendTo('#qunit-fixture');
  });

  equal(container.$().text(), '', "has a empty contents");
  equal(get(container, 'childViews.length'), 0, "should not have any child views");

  Ember.run(function() {
    set(container, 'currentView', mainView);
  });

  equal(container.$().text(), "This is the main view.", "should render its child");
  equal(get(container, 'childViews.length'), 1, "should have one child view");
  equal(get(container, 'childViews').objectAt(0), mainView, "should have the currentView as the only child view");
});

test("if a ContainerView starts with a currentView and then is set to null, the ContainerView is updated", function() {
  var container = Ember.ContainerView.create();
  var mainView = Ember.View.create({
    template: function() {
      return "This is the main view.";
    }
  });
  container.set('currentView', mainView);

  Ember.run(function() {
    container.appendTo('#qunit-fixture');
  });

  equal(container.$().text(), "This is the main view.", "should render its child");
  equal(get(container, 'childViews.length'), 1, "should have one child view");
  equal(get(container, 'childViews').objectAt(0), mainView, "should have the currentView as the only child view");

  Ember.run(function() {
    set(container, 'currentView', null);
  });

  equal(container.$().text(), '', "has a empty contents");
  equal(get(container, 'childViews.length'), 0, "should not have any child views");
});

test("if a ContainerView starts with a currentView and then is set to null, the ContainerView is updated and the previous currentView is destroyed", function() {
  var container = Ember.ContainerView.create();
  var mainView = Ember.View.create({
    template: function() {
      return "This is the main view.";
    }
  });
  container.set('currentView', mainView);

  Ember.run(function() {
    container.appendTo('#qunit-fixture');
  });

  equal(container.$().text(), "This is the main view.", "should render its child");
  equal(get(container, 'childViews.length'), 1, "should have one child view");
  equal(get(container, 'childViews').objectAt(0), mainView, "should have the currentView as the only child view");

  Ember.run(function() {
    set(container, 'currentView', null);
  });

  equal(mainView.isDestroyed, true, 'should destroy the previous currentView.');

  equal(container.$().text(), '', "has a empty contents");
  equal(get(container, 'childViews.length'), 0, "should not have any child views");
});

test("if a ContainerView starts with a currentView and then a different currentView is set, the old view is destroyed and the new one is added", function() {
  var container = Ember.ContainerView.create();
  var mainView = Ember.View.create({
    template: function() {
      return "This is the main view.";
    }
  });

  var secondaryView = Ember.View.create({
    template: function() {
      return "This is the secondary view.";
    }
  });

  container.set('currentView', mainView);

  Ember.run(function() {
    container.appendTo('#qunit-fixture');
  });

  equal(container.$().text(), "This is the main view.", "should render its child");
  equal(get(container, 'childViews.length'), 1, "should have one child view");
  equal(get(container, 'childViews').objectAt(0), mainView, "should have the currentView as the only child view");

  Ember.run(function() {
    set(container, 'currentView', secondaryView);
  });

  equal(mainView.isDestroyed, true, 'should destroy the previous currentView.');

  equal(container.$().text(), "This is the secondary view.", "should render its child");
  equal(get(container, 'childViews.length'), 1, "should have one child view");
  equal(get(container, 'childViews').objectAt(0), secondaryView, "should have the currentView as the only child view");
});

test("should be able to modify childViews many times during an run loop", function () {

  var container = Ember.ContainerView.create();

  Ember.run(function() {
    container.appendTo('#qunit-fixture');
  });

  var one = Ember.View.create({
    template: function() {
      return 'one';
    }
  });

  var two = Ember.View.create({
    template: function() {
      return 'two';
    }
  });

  var three = Ember.View.create({
    template: function() {
      return 'three';
    }
  });

  var childViews = container.get('childViews');

  Ember.run(function() {
    // initial order
    childViews.pushObjects([three, one, two]);
    // sort
    childViews.removeObject(three);
    childViews.pushObject(three);
  });

  equal(container.$().text(), 'onetwothree');
});

test("should be able to modify childViews then remove the ContainerView in same run loop", function () {
  var container = Ember.ContainerView.create();

  Ember.run(function() {
    container.appendTo('#qunit-fixture');
  });

  var childViews = container.get('childViews');
  var count = 0;
  var child = Ember.View.create({
    template: function () { count++; return 'child'; }
  });

  Ember.run(function() {
    childViews.pushObject(child);
    container.remove();
  });

  equal(count, 0, 'did not render child');
});

test("should be able to modify childViews then destroy the ContainerView in same run loop", function () {
    var container = Ember.ContainerView.create();

  Ember.run(function() {
    container.appendTo('#qunit-fixture');
  });

  var childViews = container.get('childViews');
  var count = 0;
  var child = Ember.View.create({
    template: function () { count++; return 'child'; }
  });

  Ember.run(function() {
    childViews.pushObject(child);
    container.destroy();
  });

  equal(count, 0, 'did not render child');
});


test("should be able to modify childViews then rerender the ContainerView in same run loop", function () {
    var container = Ember.ContainerView.create();

  Ember.run(function() {
    container.appendTo('#qunit-fixture');
  });

  var childViews = container.get('childViews');
  var count = 0;
  var child = Ember.View.create({
    template: function () { count++; return 'child'; }
  });

  Ember.run(function() {
    childViews.pushObject(child);
    container.rerender();
  });

  equal(count, 1, 'rendered child only once');
});

test("should be able to modify childViews then rerender then modify again the ContainerView in same run loop", function () {
  var container = Ember.ContainerView.create();

  Ember.run(function() {
    container.appendTo('#qunit-fixture');
  });

  var childViews = container.get('childViews');
  var Child = Ember.View.extend({
    count: 0,
    render: function (buffer) {
      this.count++;
      buffer.push(this.label);
    }
  });
  var one = Child.create({label: 'one'});
  var two = Child.create({label: 'two'});

  Ember.run(function() {
    childViews.pushObject(one);
    childViews.pushObject(two);
  });

  equal(one.count, 1, 'rendered child only once');
  equal(two.count, 1, 'rendered child only once');
  equal(container.$().text(), 'onetwo');
});

test("should be able to modify childViews then rerender again the ContainerView in same run loop and then modify again", function () {
  var container = Ember.ContainerView.create();

  Ember.run(function() {
    container.appendTo('#qunit-fixture');
  });

  var childViews = container.get('childViews');
  var Child = Ember.View.extend({
    count: 0,
    render: function (buffer) {
      this.count++;
      buffer.push(this.label);
    }
  });
  var one = Child.create({label: 'one'});
  var two = Child.create({label: 'two'});

  Ember.run(function() {
    childViews.pushObject(one);
    container.rerender();
  });

  equal(one.count, 1, 'rendered child only once');
  equal(container.$().text(), 'one');

  Ember.run(function () {
    childViews.pushObject(two);
  });

  equal(one.count, 1, 'rendered child only once');
  equal(two.count, 1, 'rendered child only once');
  equal(container.$().text(), 'onetwo');
});

test("should invalidate `element` on itself and childViews when being rendered by ensureChildrenAreInDOM", function () {
  var root = Ember.ContainerView.create(),
      view = Ember.View.create({ template: function() {} }),
      container = Ember.ContainerView.create({ childViews: ['child'], child: view });

  Ember.run(function() {
    root.appendTo('#qunit-fixture');
  });

  Ember.run(function() {
    root.get('childViews').pushObject(container);

    // Get the parent and child's elements to cause them to be cached as null
    container.get('element');
    view.get('element');
  });

  ok(!!container.get('element'), "Parent's element should have been recomputed after being rendered");
  ok(!!view.get('element'), "Child's element should have been recomputed after being rendered");
});
