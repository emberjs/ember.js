import EmberObject from "ember-runtime/system/object";
import run from "ember-metal/run_loop";
import {View as EmberView} from "ember-views/views/view";
import ObjectProxy from "ember-runtime/system/object_proxy";

var appendView = function(view) {
  run(function() { view.appendTo('#qunit-fixture'); });
};

var compile = Ember.Handlebars.compile;

var view;

module("Handlebars {{#if}} and {{#unless}} helpers", {
  teardown: function() {
    run(function() {
      if (view) {
        view.destroy();
      }
    });
  }
});

test("unless should keep the current context (#784)", function() {
  view = EmberView.create({
    o: EmberObject.create({foo: '42'}),

    template: compile('{{#with view.o}}{{#view Ember.View}}{{#unless view.doesNotExist}}foo: {{foo}}{{/unless}}{{/view}}{{/with}}')
  });

  appendView(view);

  equal(view.$().text(), 'foo: 42');
});

test("The `if` helper tests for `isTruthy` if available", function() {
  view = EmberView.create({
    truthy: EmberObject.create({ isTruthy: true }),
    falsy: EmberObject.create({ isTruthy: false }),

    template: compile('{{#if view.truthy}}Yep{{/if}}{{#if view.falsy}}Nope{{/if}}')
  });

  appendView(view);

  equal(view.$().text(), 'Yep');
});

test("The `if` helper does not print the contents for an object proxy without content", function() {
  view = EmberView.create({
    truthy: ObjectProxy.create({ content: {} }),
    falsy: ObjectProxy.create({ content: null }),

    template: compile('{{#if view.truthy}}Yep{{/if}}{{#if view.falsy}}Nope{{/if}}')
  });

  appendView(view);

  equal(view.$().text(), 'Yep');
});

test("The `if` helper updates if an object proxy gains or loses context", function() {
  view = EmberView.create({
    proxy: ObjectProxy.create({ content: null }),

    template: compile('{{#if view.proxy}}Yep{{/if}}')
  });

  appendView(view);

  equal(view.$().text(), '');

  run(function() {
    view.set('proxy.content', {});
  });

  equal(view.$().text(), 'Yep');

  run(function() {
    view.set('proxy.content', null);
  });

  equal(view.$().text(), '');
});

test("The `if` helper updates if an array is empty or not", function() {
  view = EmberView.create({
    array: Ember.A(),

    template: compile('{{#if view.array}}Yep{{/if}}')
  });

  appendView(view);

  equal(view.$().text(), '');

  run(function() {
    view.get('array').pushObject(1);
  });

  equal(view.$().text(), 'Yep');

  run(function() {
    view.get('array').removeObject(1);
  });

  equal(view.$().text(), '');
});

test("The `if` helper updates when the value changes", function() {
  view = EmberView.create({
    conditional: true,
    template: compile('{{#if view.conditional}}Yep{{/if}}')
  });
  appendView(view);
  equal(view.$().text(), 'Yep');
  run(function(){
    view.set('conditional', false);
  });
  equal(view.$().text(), '');
});

test("The `unbound if` helper does not update when the value changes", function() {
  view = EmberView.create({
    conditional: true,
    template: compile('{{#unbound if view.conditional}}Yep{{/unbound}}')
  });
  appendView(view);
  equal(view.$().text(), 'Yep');
  run(function(){
    view.set('conditional', false);
  });
  equal(view.$().text(), 'Yep');
});

test("The `unless` helper updates when the value changes", function() {
  view = EmberView.create({
    conditional: false,
    template: compile('{{#unless view.conditional}}Nope{{/unless}}')
  });
  appendView(view);
  equal(view.$().text(), 'Nope');
  run(function(){
    view.set('conditional', true);
  });
  equal(view.$().text(), '');
});

test("The `unbound if` helper does not update when the value changes", function() {
  view = EmberView.create({
    conditional: false,
    template: compile('{{#unbound unless view.conditional}}Nope{{/unbound}}')
  });
  appendView(view);
  equal(view.$().text(), 'Nope');
  run(function(){
    view.set('conditional', true);
  });
  equal(view.$().text(), 'Nope');
});

