/*globals TemplateTests*/

var get = Ember.get, set = Ember.set;

var view;

var appendView = function() {
  Ember.run(function() { view.appendTo('#qunit-fixture'); });
};

module("Handlebars bound helpers", {
  setup: function() {
    window.TemplateTests = Ember.Namespace.create();
  },
  teardown: function() {
    Ember.run(function(){
      if (view) {
        view.destroy();
      }
    });
    window.TemplateTests = undefined;
  }
});

test("should update bound helpers when properties change", function() {
  Ember.Handlebars.registerBoundHelper('capitalize', function(value) {
    return value.toUpperCase();
  });
  
  view = Ember.View.create({
    controller: Ember.Object.create({name: "Brogrammer"}),
    template: Ember.Handlebars.compile("{{capitalize name}}")
  });

  appendView();
  
  equal(view.$().text(), 'BROGRAMMER', "helper output is correct");
  
  Ember.run(function() {
    set(view.controller, 'name', 'wes');
  });
  
  equal(view.$().text(), 'WES', "helper output updated");
});

test("should allow for computed properties with dependencies", function() {
  Ember.Handlebars.registerBoundHelper('capitalizeName', function(value) {
    return get(value, 'name').toUpperCase();
  }, 'name');
  
  view = Ember.View.create({
    controller: Ember.Object.create({
      person: Ember.Object.create({
        name: 'Brogrammer'
      })
    }),
    template: Ember.Handlebars.compile("{{capitalizeName person}}")
  });

  appendView();
  
  equal(view.$().text(), 'BROGRAMMER', "helper output is correct");
  
  Ember.run(function() {
    set(view.controller.person, 'name', 'wes');
  });
  
  equal(view.$().text(), 'WES', "helper output updated");
});

test("bound helpers should support options", function() {
  Ember.Handlebars.registerBoundHelper('repeat', function(value, options) {
    var count = options.hash.count;
    var a = [];
    while(a.length < count){
        a.push(value);
    }
    return a.join('');
  });
  
  view = Ember.View.create({
    controller: Ember.Object.create({text: 'ab'}),
    template: Ember.Handlebars.compile("{{repeat text count=3}}")
  });

  appendView();
  
  ok(view.$().text() === 'ababab', "helper output is correct");
});

test("bound helpers should support keywords", function() {
  Ember.Handlebars.registerBoundHelper('capitalize', function(value) {
    return value.toUpperCase();
  });

  view = Ember.View.create({
    text: 'ab',
    template: Ember.Handlebars.compile("{{capitalize view.text}}")
  });

  appendView();

  ok(view.$().text() === 'AB', "helper output is correct");
});

test("bound helpers should support global paths", function() {
  Ember.Handlebars.registerBoundHelper('capitalize', function(value) {
    return value.toUpperCase();
  });
  
  TemplateTests.text = 'ab';

  view = Ember.View.create({
    template: Ember.Handlebars.compile("{{capitalize TemplateTests.text}}")
  });

  appendView();

  ok(view.$().text() === 'AB', "helper output is correct");
});

test("bound helper should support this keyword", function() {
  Ember.Handlebars.registerBoundHelper('capitalize', function(value) {
    return get(value, 'text').toUpperCase();
  });

  view = Ember.View.create({
    controller: Ember.Object.create({text: 'ab'}),
    template: Ember.Handlebars.compile("{{capitalize this}}")
  });

  appendView();

  ok(view.$().text() === 'AB', "helper output is correct");
});