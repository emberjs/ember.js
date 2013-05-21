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

test("view should support connectOutlet for the main outlet", function() {
  var template = "<h1>HI</h1>{{outlet}}";
  view = Ember.View.create({
    template: Ember.Handlebars.compile(template)
  });

  appendView(view);

  equal(view.$().text(), 'HI');

  Ember.run(function() {
    view.connectOutlet('main', Ember.View.create({
      template: compile("<p>BYE</p>")
    }));
  });

  // Replace whitespace for older IE
  equal(view.$().text().replace(/\s+/,''), 'HIBYE');
});

test("outlet should support connectOutlet in slots in prerender state", function() {
  var template = "<h1>HI</h1>{{outlet}}";
  view = Ember.View.create({
    template: Ember.Handlebars.compile(template)
  });

  view.connectOutlet('main', Ember.View.create({
    template: compile("<p>BYE</p>")
  }));

  appendView(view);

  equal(view.$().text(), 'HIBYE');
});

test("outlet should support an optional name", function() {
  var template = "<h1>HI</h1>{{outlet mainView}}";
  view = Ember.View.create({
    template: Ember.Handlebars.compile(template)
  });

  appendView(view);

  equal(view.$().text(), 'HI');

  Ember.run(function() {
    view.connectOutlet('mainView', Ember.View.create({
      template: compile("<p>BYE</p>")
    }));
  });

  // Replace whitespace for older IE
  equal(view.$().text().replace(/\s+/,''), 'HIBYE');
});


test("outlet should support an optional view class", function() {
  var template = "<h1>HI</h1>{{outlet viewClass=view.outletView}}";
  view = Ember.View.create({
    template: Ember.Handlebars.compile(template),
    outletView: Ember.ContainerView.extend()
  });

  appendView(view);

  equal(view.$().text(), 'HI');

  var childView = Ember.View.create({
    template: compile("<p>BYE</p>")
  });

  Ember.run(function() {
    view.connectOutlet('main', childView);
  });

  ok(view.outletView.detectInstance(childView.get('_parentView')), "The custom view class should be used for the outlet");

  // Replace whitespace for older IE
  equal(view.$().text().replace(/\s+/,''), 'HIBYE');
});


test("Outlets bind to the current view, not the current concrete view", function() {
  var parentTemplate = "<h1>HI</h1>{{outlet}}";
  var middleTemplate = "<h2>MIDDLE</h2>{{outlet}}";
  var bottomTemplate = "<h3>BOTTOM</h3>";

  view = Ember.View.create({
    template: compile(parentTemplate)
  });

  var middleView = Ember._MetamorphView.create({
    template: compile(middleTemplate)
  });

  var bottomView = Ember._MetamorphView.create({
    template: compile(bottomTemplate)
  });

  appendView(view);

  Ember.run(function() {
    view.connectOutlet('main', middleView);
  });

  Ember.run(function() {
    middleView.connectOutlet('main', bottomView);
  });

  var output = Ember.$('#qunit-fixture h1 ~ h2 ~ h3').text();
  equal(output, "BOTTOM", "all templates were rendered");
});

test("view should support disconnectOutlet for the main outlet", function() {
  var template = "<h1>HI</h1>{{outlet}}";
  view = Ember.View.create({
    template: Ember.Handlebars.compile(template)
  });

  appendView(view);

  equal(view.$().text(), 'HI');

  Ember.run(function() {
    view.connectOutlet('main', Ember.View.create({
      template: compile("<p>BYE</p>")
    }));
  });

  // Replace whitespace for older IE
  equal(view.$().text().replace(/\s+/,''), 'HIBYE');

  Ember.run(function() {
    view.disconnectOutlet('main');
  });

  // Replace whitespace for older IE
  equal(view.$().text().replace(/\s+/,''), 'HI');
});

test("Outlets bind to the current template's view, not inner contexts", function() {
  var parentTemplate = "<h1>HI</h1>{{#if view.alwaysTrue}}{{#with this}}{{outlet}}{{/with}}{{/if}}";
  var bottomTemplate = "<h3>BOTTOM</h3>";

  view = Ember.View.create({
    alwaysTrue: true,
    template: compile(parentTemplate)
  });

  var bottomView = Ember._MetamorphView.create({
    template: compile(bottomTemplate)
  });

  appendView(view);

  Ember.run(function() {
    view.connectOutlet('main', bottomView);
  });

  var output = Ember.$('#qunit-fixture h1 ~ h3').text();
  equal(output, "BOTTOM", "all templates were rendered");
});
