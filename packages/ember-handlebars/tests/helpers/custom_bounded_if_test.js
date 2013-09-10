/*globals TemplateTests*/

var get = Ember.get, set = Ember.set;

var view;

var appendView = function() {
  Ember.run(function() { view.appendTo('#qunit-fixture'); });
};

var registerRepeatHelper = function() {
  Ember.Handlebars.helper('repeat', function(value, options) {
    var count = options.hash.count;
    var a = [];
    while(a.length < count) {
        a.push(value);
    }
    return a.join('');
  });
};

module("Handlebars bounded if helpers", {
  setup: function() {
    window.TemplateTests = Ember.Namespace.create();
  },
  teardown: function() {
    Ember.run(function() {
      if (view) {
        view.destroy();
      }
    });
    window.TemplateTests = undefined;
  }
});

test("should be able to register ifData", function() {

  Ember.Handlebars.registerHelper("ifData", function(property, fn){
    var context = (fn.contexts && fn.contexts[0]) || this;

    var func = function(result){
      if (typeof result === 'boolean'){
        return result;
      }

      return result !== undefined && result !== null;
    };

    return Ember.Handlebars.helpers._bind.call(context, property, fn, true, func, func);
  });

  view = Ember.View.create({
    controller: Ember.Object.create({name: "Brogrammer"}),
    template: Ember.Handlebars.compile("{{#ifData name}}{{name}}{{else}}No Data{{/ifData}}")
  });

  appendView();

  equal(view.$().text(), 'Brogrammer', "helper output is correct");

  Ember.run(function() {
    set(view.controller, 'name', undefined);
  });

  equal(view.$().text(), 'No Data', "helper output updated");

  Ember.run(function() {
    set(view.controller, 'name', "Henry Gale");
  });

  equal(view.$().text(), 'Henry Gale', "helper output updated");

  Ember.run(function() {
    set(view.controller, 'name', null);
  });

  equal(view.$().text(), 'No Data', "helper output updated");

  Ember.run(function() {
    set(view.controller, 'name', 0);
  });

  equal(view.$().text(), '0', "helper output updated");
});

test("should be able to register ifPositive", function() {

  Ember.Handlebars.registerHelper("ifPositive", function(property, fn){
    var context = (fn.contexts && fn.contexts[0]) || this;

    var func = function(result){
      if (typeof result === 'boolean'){
        return result;
      }

      return result > 0;
    };

    return Ember.Handlebars.helpers._bind.call(context, property, fn, true, func, func);
  });

  view = Ember.View.create({
    controller: Ember.Object.create({age: 10}),
    template: Ember.Handlebars.compile("{{#ifPositive age}}Welcome{{else}}Access Denied{{/ifPositive}}")
  });

  appendView();

  equal(view.$().text(), 'Welcome', "helper output is correct");

  Ember.run(function() {
    set(view.controller, 'age', -100);
  });

  equal(view.$().text(), 'Access Denied', "helper output updated");
});