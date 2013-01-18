var appendView = function(view) {
  Ember.run(function() { view.appendTo('#qunit-fixture'); });
};

var compile = Ember.Handlebars.compile;

var view;

module("Handlebars {{#if}} and {{#unless}} helpers", {
  teardown: function() {
    Ember.run(function(){
      if (view) {
        view.destroy();
      }
    });
  }
});

test("unless should keep the current context (#784)", function() {
  view = Ember.View.create({
    o: Ember.Object.create({foo: '42'}),

    template: compile('{{#with view.o}}{{#view Ember.View}}{{#unless view.doesNotExist}}foo: {{foo}}{{/unless}}{{/view}}{{/with}}')
  });

  appendView(view);

  equal(view.$().text(), 'foo: 42');
});

test("The `if` helper tests for `isTruthy` if available", function() {
  view = Ember.View.create({
    truthy: Ember.Object.create({ isTruthy: true }),
    falsy: Ember.Object.create({ isTruthy: false }),

    template: compile('{{#if view.truthy}}Yep{{/if}}{{#if view.falsy}}Nope{{/if}}')
  });

  appendView(view);

  equal(view.$().text(), 'Yep');
});

test("The `if` helper does not print the contents for an object proxy without content", function() {
  view = Ember.View.create({
    truthy: Ember.ObjectProxy.create({ content: {} }),
    falsy: Ember.ObjectProxy.create({ content: null }),

    template: compile('{{#if view.truthy}}Yep{{/if}}{{#if view.falsy}}Nope{{/if}}')
  });

  appendView(view);

  equal(view.$().text(), 'Yep');
});
