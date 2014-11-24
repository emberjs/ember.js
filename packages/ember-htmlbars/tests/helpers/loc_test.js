import run from 'ember-metal/run_loop';
import EmberView from 'ember-views/views/view';
import EmberHandlebars from 'ember-handlebars-compiler';
import htmlbarsCompile from "ember-htmlbars/system/compile";

var compile;
if (Ember.FEATURES.isEnabled('ember-htmlbars')) {
  compile = htmlbarsCompile;
} else {
  compile = EmberHandlebars.compile;
}

function buildView(template, context) {
  return EmberView.create({
    template: compile(template),
    context: (context || {})
  });
}

function appendView(view) {
  run(function() {
    view.appendTo('#qunit-fixture');
  });
}

function destroyView(view) {
  run(function() {
    view.destroy();
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
  appendView(view);

  equal(view.$().text(), 'Hiya buddy!');

  destroyView(view);
});

test('localize a simple string', function() {
  var view = buildView('{{loc "_Howdy Friend"}}');
  appendView(view);

  equal(view.$().text(), 'Hallo Freund');

  destroyView(view);
});

test('localize takes passed formats into an account', function() {
  var view = buildView('{{loc "%@, %@" "Hello" "Mr. Pitkin"}}');
  appendView(view);

  equal(view.$().text(), 'Hello, Mr. Pitkin', 'the value of localizationKey is correct');

  destroyView(view);
});

if (Ember.FEATURES.isEnabled('ember-htmlbars')) {
test('localize throws an assertion if the second parameter is a binding', function() {
  var view = buildView('{{loc "Hello %@" name}}', {
    name: 'Bob Foster'
  });

  expectAssertion(function() {
    appendView(view);
  }, /You cannot pass bindings to `loc` helper/);

  destroyView(view);
});

test('localize a binding throws an assertion', function() {
  var view = buildView('{{loc localizationKey}}', {
    localizationKey: 'villain'
  });

  expectAssertion(function() {
    appendView(view);
  }, /You cannot pass bindings to `loc` helper/);

  destroyView(view);
});
}
