var get = Ember.get, getPath = Ember.getPath, set = Ember.set;

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

  container.destroy();
});

test("should be able to observe properties that contain child views", function() {
  var container;

  Ember.run(function() {
    container = Ember.ContainerView.create({
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

  childViews.pushObject(view);
  equal(get(view, 'parentView'), container, "sets the parent view after the childView is appended");

  var secondView = View.create(),
      thirdView = View.create(),
      fourthView = View.create();

  childViews.pushObject(secondView);
  childViews.replace(1, 0, [thirdView, fourthView]);
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
  var view = Ember.View.create({
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

  equal(getPath(view, 'childViews.length'), 1, "precond - renders one child view");
  Ember.run(function() {
    get(container, 'childViews').removeObject(view);
  });
  equal(getPath(view, 'childViews.length'), 0, "child views are cleared when removed from container view");
});

test("if a ContainerView starts with an empy currentView, nothing is displayed", function() {
  var container = Ember.ContainerView.create();

  Ember.run(function() {
    container.appendTo('#qunit-fixture');
  });

  equal(container.$().text(), '', "has a empty contents");
  equal(getPath(container, 'childViews.length'), 0, "should not have any child views");
});

test("if a ContainerView starts with a currentView, it is rendered as a child view", function() {
  var container = Ember.ContainerView.create();
  var mainView = Ember.View.create({
    template: function() {
      return "This is the main view.";
    }
  });

  set(container, 'currentView', mainView);

  Ember.run(function() {
    container.appendTo('#qunit-fixture');
  });

  equal(container.$().text(), "This is the main view.", "should render its child");
  equal(getPath(container, 'childViews.length'), 1, "should have one child view");
  equal(getPath(container, 'childViews').objectAt(0), mainView, "should have the currentView as the only child view");
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
  equal(getPath(container, 'childViews.length'), 0, "should not have any child views");

  Ember.run(function() {
    set(container, 'currentView', mainView);
  });

  equal(container.$().text(), "This is the main view.", "should render its child");
  equal(getPath(container, 'childViews.length'), 1, "should have one child view");
  equal(getPath(container, 'childViews').objectAt(0), mainView, "should have the currentView as the only child view");
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
  equal(getPath(container, 'childViews.length'), 1, "should have one child view");
  equal(getPath(container, 'childViews').objectAt(0), mainView, "should have the currentView as the only child view");

  Ember.run(function() {
    set(container, 'currentView', null);
  });

  equal(container.$().text(), '', "has a empty contents");
  equal(getPath(container, 'childViews.length'), 0, "should not have any child views");
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
  equal(getPath(container, 'childViews.length'), 1, "should have one child view");
  equal(getPath(container, 'childViews').objectAt(0), mainView, "should have the currentView as the only child view");

  Ember.run(function() {
    set(container, 'currentView', null);
  });

  equal(container.$().text(), '', "has a empty contents");
  equal(getPath(container, 'childViews.length'), 0, "should not have any child views");
});

test("if a ContainerView starts with a currentView and then a different currentView is set, the old view is removed and the new one is added", function() {
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
  equal(getPath(container, 'childViews.length'), 1, "should have one child view");
  equal(getPath(container, 'childViews').objectAt(0), mainView, "should have the currentView as the only child view");

  Ember.run(function() {
    set(container, 'currentView', secondaryView);
  });

  equal(container.$().text(), "This is the secondary view.", "should render its child");
  equal(getPath(container, 'childViews.length'), 1, "should have one child view");
  equal(getPath(container, 'childViews').objectAt(0), secondaryView, "should have the currentView as the only child view");
});
