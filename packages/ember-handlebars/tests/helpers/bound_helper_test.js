/*globals TemplateTests*/

var get = Ember.get, set = Ember.set;

var view;

var appendView = function() {
  Ember.run(function() { view.appendTo('#qunit-fixture'); });
};

var registerRepeatHelper = function() {
  Ember.Handlebars.registerBoundHelper('repeat', function(value, options) {
    var count = options.hash.count;
    var a = [];
    while(a.length < count){
        a.push(value);
    }
    return a.join('');
  });
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

  registerRepeatHelper();
  
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

test("bound helpers should support bound options", function() {

  registerRepeatHelper();
  
  view = Ember.View.create({
    controller: Ember.Object.create({text: 'ab', numRepeats: 3}),
    template: Ember.Handlebars.compile('{{repeat text countBinding="numRepeats"}}')
  });

  appendView();
  
  equal(view.$().text(), 'ababab', "helper output is correct");

  Ember.run(function() {
    view.set('controller.numRepeats', 4);
  });

  equal(view.$().text(), 'abababab', "helper correctly re-rendered after bound option was changed");

  Ember.run(function() {
    view.set('controller.numRepeats', 2);
    view.set('controller.text', "YES");
  });

  equal(view.$().text(), 'YESYES', "helper correctly re-rendered after both bound option and property changed");
});


test("bound helpers should support multiple bound properties", function() {

  Ember.Handlebars.registerBoundHelper('concat', function() {
    return [].slice.call(arguments, 0, -1).join('');
  });
  
  view = Ember.View.create({
    controller: Ember.Object.create({thing1: 'ZOID', thing2: 'BERG'}),
    template: Ember.Handlebars.compile('{{concat thing1 thing2}}')
  });

  appendView();
  
  equal(view.$().text(), 'ZOIDBERG', "helper output is correct");

  Ember.run(function() {
    view.set('controller.thing2', "NERD");
  });

  equal(view.$().text(), 'ZOIDNERD', "helper correctly re-rendered after second bound helper property changed");

  Ember.run(function() {
    view.controller.setProperties({
      thing1: "WOOT",
      thing2: "YEAH"
    });
  });

  equal(view.$().text(), 'WOOTYEAH', "helper correctly re-rendered after both bound helper properties changed");
});

test("bound helpers should expose property names in options.data.properties", function() {
  Ember.Handlebars.registerBoundHelper('echo', function() {
    var options = arguments[arguments.length - 1];
    var values = [].slice.call(arguments, 0, -1);
    var a = [];
    for(var i = 0; i < values.length; ++i) {
      var propertyName = options.data.properties[i];
      a.push(propertyName);
    }
    return a.join(' ');
  });
  
  view = Ember.View.create({
    controller: Ember.Object.create({
      thing1: 'ZOID', 
      thing2: 'BERG', 
      thing3: Ember.Object.create({ 
        foo: 123 
      })
    }),
    template: Ember.Handlebars.compile('{{echo thing1 thing2 thing3.foo}}')
  });

  appendView();
  
  equal(view.$().text(), 'thing1 thing2 thing3.foo', "helper output is correct");
});

test("bound helpers can be invoked with zero args", function() {
  Ember.Handlebars.registerBoundHelper('troll', function(options) {
    return options.hash.text || "TROLOLOL";
  });
  
  view = Ember.View.create({
    controller: Ember.Object.create({trollText: "yumad"}),
    template: Ember.Handlebars.compile('{{troll}} and {{troll text="bork"}}')
  });

  appendView();
  
  equal(view.$().text(), 'TROLOLOL and bork', "helper output is correct");
});

