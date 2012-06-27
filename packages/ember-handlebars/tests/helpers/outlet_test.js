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

  equal(view.$().text(), 'HIBYE');
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

  equal(view.$().text(), 'HIBYE');
});

test("outlets can be nested", function() {
  var controller = Ember.Object.create();

  var template = "<h1>MAIN</h1>{{outlet mainView}}";
  view = Ember.View.create({
    controller: controller,
    template: Ember.Handlebars.compile(template)
  });
    
  var subController = Ember.Object.create();
  var subTemplate = "<h2>SUB</h2>{{outlet subView}}";
  var subView = Ember.View.create({
    controller: subController,
    template: Ember.Handlebars.compile(subTemplate)
  });

  appendView(view);
  equal(view.$().text(), 'MAIN');

  Ember.run(function() {
    controller.set('mainView', subView);
  });

  equal(view.$().text(), 'MAINSUB');

  Ember.run(function() {
    subController.set('subView', Ember.View.create({
      template: compile("<p>BYE</p>")
    }));
  });

  equal(view.$().text(), 'MAINSUBBYE');

});
