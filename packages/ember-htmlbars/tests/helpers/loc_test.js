import EmberView from 'ember-views/views/view';
import compile from "ember-htmlbars/system/compile";
import { runAppend, runDestroy } from "ember-runtime/tests/utils";
import run from "ember-metal/run_loop";

function buildView(template, context) {
  return EmberView.create({
    template: compile(template),
    context: (context || {})
  });
}

var oldString;

QUnit.module('ember-htmlbars: {{#loc}} helper', {
  setup: function() {
    oldString = Ember.STRINGS;
    Ember.STRINGS = {
      '_Howdy Friend': 'Hallo Freund'
    };
  },

  teardown: function() {
    Ember.STRINGS = oldString;
  }
});

test('let the original value through by default', function() {
  var view = buildView('{{loc "Hiya buddy!"}}');
  runAppend(view);

  equal(view.$().text(), 'Hiya buddy!');

  runDestroy(view);
});

test('localize a simple string', function() {
  var view = buildView('{{loc "_Howdy Friend"}}');
  runAppend(view);

  equal(view.$().text(), 'Hallo Freund');

  runDestroy(view);
});

test('localize takes passed formats into an account', function() {
  var view = buildView('{{loc "%@, %@" "Hello" "Mr. Pitkin"}}');
  runAppend(view);

  equal(view.$().text(), 'Hello, Mr. Pitkin', 'the value of localizationKey is correct');

  runDestroy(view);
});

if (Ember.FEATURES.isEnabled('ember-htmlbars')) {
test('localize can update if the second parameter is a binding', function() {
  var view = buildView('{{loc "Hello %@" name}}');

  runAppend(view);

  run(function(){
    view.set('context.name', 'Mixonic Jazz Hands');
  });

  equal(view.$().text(), 'Hello Mixonic Jazz Hands');

  runDestroy(view);
});

test('localize can take a bound localizationKey', function() {
  var view = buildView('{{loc localizationKey}}', {
    localizationKey: 'villain'
  });
  runAppend(view);

  equal(view.$().text(), 'villain');

  run(function(){
    view.set('context.localizationKey', 'person');
  });

  equal(view.$().text(), 'person');

  runDestroy(view);
});

test('localize can mix/match primitive and bound values', function() {
  var view = buildView('{{loc localizationKey "is super!"}}', {
    localizationKey: 'villain %@'
  });
  runAppend(view);

  equal(view.$().text(), 'villain is super!');

  run(function(){
    view.set('context.localizationKey', 'person %@');
  });

  equal(view.$().text(), 'person is super!');

  runDestroy(view);
});

test('localize can accept x bound arguments after the localizationKey', function(){
  var view = buildView('{{loc "do great %@ %@" firstThing secondThing}}', {
    firstThing: 'not',
    secondThing: 'bad'
  });
  runAppend(view);

  equal(view.$().text(), 'do great not bad');

  run(function(){
    view.set('context.firstThing', 'things');
    view.set('context.secondThing', 'every day');
  });

  equal(view.$().text(), 'do great things every day');

  runDestroy(view);
});
}
