import EmberView from 'ember-views/views/view';
import compile from "ember-template-compiler/system/compile";
import { runAppend, runDestroy } from "ember-runtime/tests/utils";

function buildView(template, context) {
  return EmberView.create({
    template: compile(template),
    context: (context || {})
  });
}

var oldString;

QUnit.module('ember-htmlbars: {{#loc}} helper', {
  setup() {
    oldString = Ember.STRINGS;
    Ember.STRINGS = {
      '_Howdy Friend': 'Hallo Freund'
    };
  },

  teardown() {
    Ember.STRINGS = oldString;
  }
});

QUnit.test('let the original value through by default', function() {
  var view = buildView('{{loc "Hiya buddy!"}}');
  runAppend(view);

  equal(view.$().text(), 'Hiya buddy!');

  runDestroy(view);
});

QUnit.test('localize a simple string', function() {
  var view = buildView('{{loc "_Howdy Friend"}}');
  runAppend(view);

  equal(view.$().text(), 'Hallo Freund');

  runDestroy(view);
});

QUnit.test('localize takes passed formats into an account', function() {
  var view = buildView('{{loc "%@, %@" "Hello" "Mr. Pitkin"}}');
  runAppend(view);

  equal(view.$().text(), 'Hello, Mr. Pitkin', 'the value of localizationKey is correct');

  runDestroy(view);
});
