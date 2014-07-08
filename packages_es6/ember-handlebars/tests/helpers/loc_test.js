import run from "ember-metal/run_loop";
import {View as EmberView} from "ember-views/views/view";
var buildView = function(template, context) {
  return EmberView.create({
    template: Ember.Handlebars.compile(template),
    context: (context || {})
  });
};

var appendView = function(view) {
  run(function() {
    view.appendTo('#qunit-fixture');
  });
};

var destroyView = function(view) {
  run(function() {
    view.destroy();
  });
};

var oldString;

module('Handlebars {{loc valueToLocalize}} helper', {
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

test("let the original value through by default", function() {
  var view = buildView('{{loc "Hiya buddy!"}}');
  appendView(view);

  equal(view.$().text(), "Hiya buddy!");

  destroyView(view);
});

test("localize a simple string", function() {
  var view = buildView('{{loc "_Howdy Friend"}}');
  appendView(view);

  equal(view.$().text(), "Hallo Freund");

  destroyView(view);
});
