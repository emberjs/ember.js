var appendView = function(view) {
  Ember.run(function() { view.appendTo('#qunit-fixture'); });
};

var compile = function(template) {
  return Ember.Handlebars.compile(template);
};

var view;

module("Handlebars {{outlet}} helpers", {
  teardown: function() {
    Ember.run(function () {
      if (view) {
        view.destroy();
      }
    });
  }
});

test("outlet should allow controllers to fill in slots", function() {
  var controller = Ember.Object.create();

  var template = "<h1>HI</h1>{{outlet}}";
  view = Ember.View.create({
    controller: controller,
    template: Ember.Handlebars.compile(template)
  });

  appendView(view);

  equal(view.$().text(), 'HI');

  Ember.run(function() {
    controller.set('view', Ember.View.create({
      template: compile("<p>BYE</p>")
    }));
  });

  // IE likes to add newlines
  equal(view.$().text().replace(/\s+/g, ''), 'HIBYE');
});

test("outlet should allow controllers to fill in slots in prerender state", function() {
  var controller = Ember.Object.create({
    view: Ember.View.create({
      template: compile("<p>BYE</p>")
    })
  });

  var template = "<h1>HI</h1>{{outlet}}";
  view = Ember.View.create({
    controller: controller,
    template: Ember.Handlebars.compile(template)
  });

  appendView(view);

  // IE likes to add newlines
  equal(view.$().text().replace(/\s+/g, ''), 'HIBYE');
});

test("outlet should allow a view's default context to fill in slots", function() {
  var template = "<h1>HI</h1>{{outlet}}";
  view = Ember.View.create({
    context: {},
    template: Ember.Handlebars.compile(template)
  });

  appendView(view);

  equal(view.$().text(), 'HI');

  Ember.run(function() {
    view.set('context.view', Ember.View.create({
      template: compile("<p>BYE</p>")
    }));
  });

  // IE likes to add newlines
  equal(view.$().text().replace(/\s+/g, ''), 'HIBYE');
});

test("outlet should support an optional name", function() {
  var controller = Ember.Object.create();

  var template = "<h1>HI</h1>{{outlet mainView}}";
  view = Ember.View.create({
    controller: controller,
    template: Ember.Handlebars.compile(template)
  });

  appendView(view);

  equal(view.$().text(), 'HI');

  Ember.run(function() {
    controller.set('mainView', Ember.View.create({
      template: compile("<p>BYE</p>")
    }));
  });

  // IE likes to add newlines
  equal(view.$().text().replace(/\s+/g, ''), 'HIBYE');
});
