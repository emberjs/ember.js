var appendView = function(view) {
  Ember.run(function() { view.appendTo('#qunit-fixture'); });
};

var compile = Ember.Handlebars.compile;

var view;

module("Handlebars {{#if}} and {{#unless}} helpers", {
  teardown: function() {
    Ember.run(function() {
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

test("The `if` helper updates if an object proxy gains or loses context", function() {
  view = Ember.View.create({
    proxy: Ember.ObjectProxy.create({ content: null }),

    template: compile('{{#if view.proxy}}Yep{{/if}}')
  });

  appendView(view);

  equal(view.$().text(), '');

  Ember.run(function() {
    view.set('proxy.content', {});
  });

  equal(view.$().text(), 'Yep');

  Ember.run(function() {
    view.set('proxy.content', null);
  });

  equal(view.$().text(), '');
});

test("The `if` helper updates if an array is empty or not", function() {
  view = Ember.View.create({
    array: Ember.A(),

    template: compile('{{#if view.array}}Yep{{/if}}')
  });

  appendView(view);

  equal(view.$().text(), '');

  Ember.run(function() {
    view.get('array').pushObject(1);
  });

  equal(view.$().text(), 'Yep');

  Ember.run(function() {
    view.get('array').removeObject(1);
  });

  equal(view.$().text(), '');
});

test("The `if` helper updates when the value changes", function() {
  view = Ember.View.create({
    conditional: true,
    template: compile('{{#if view.conditional}}Yep{{/if}}')
  });
  appendView(view);
  equal(view.$().text(), 'Yep');
  Ember.run(function(){
    view.set('conditional', false);
  });
  equal(view.$().text(), '');
});

test("The `unbound if` helper does not update when the value changes", function() {
  view = Ember.View.create({
    conditional: true,
    template: compile('{{#unbound if view.conditional}}Yep{{/unbound}}')
  });
  appendView(view);
  equal(view.$().text(), 'Yep');
  Ember.run(function(){
    view.set('conditional', false);
  });
  equal(view.$().text(), 'Yep');
});

test("The `unless` helper updates when the value changes", function() {
  view = Ember.View.create({
    conditional: false,
    template: compile('{{#unless view.conditional}}Nope{{/unless}}')
  });
  appendView(view);
  equal(view.$().text(), 'Nope');
  Ember.run(function(){
    view.set('conditional', true);
  });
  equal(view.$().text(), '');
});

test("The `unbound if` helper does not update when the value changes", function() {
  view = Ember.View.create({
    conditional: false,
    template: compile('{{#unbound unless view.conditional}}Nope{{/unbound}}')
  });
  appendView(view);
  equal(view.$().text(), 'Nope');
  Ember.run(function(){
    view.set('conditional', true);
  });
  equal(view.$().text(), 'Nope');
});

