/*jshint newcap:false*/
import Ember from "ember-metal/core";
import run from "ember-metal/run_loop";
import EmberView from "ember-views/views/view";
import EmberHandlebars from "ember-handlebars";
import { A } from "ember-runtime/system/native_array";

var view;

var appendView = function(view) {
  run(view, 'appendTo', '#qunit-fixture');
};

QUnit.module("Templates redrawing and bindings", {
  teardown: function() {
    run(view, 'destroy');
  }
});

if (!Ember.FEATURES.isEnabled('ember-htmlbars')) {
// HTMLBars properly handles this scenario
// https://github.com/tildeio/htmlbars/pull/162
test("should provide a helpful assertion for bindings within HTML comments", function() {
  view = EmberView.create({
    template: EmberHandlebars.compile('<!-- {{view.someThing}} -->'),
    someThing: 'foo',
    _debugTemplateName: 'blahzorz'
  });

  expectAssertion(function() {
    appendView(view);
  }, 'An error occured while setting up template bindings. Please check "blahzorz" template for invalid markup or bindings within HTML comments.');
});

// HTMLBars does not throw an error when a missing helper is found
test("using Handlebars helper that doesn't exist should result in an error", function() {
  var names = [{ name: 'Alex' }, { name: 'Stef' }];
  var context = { content: A(names) };

  throws(function() {
    view = EmberView.create({
      context: context,
      template: EmberHandlebars.compile('{{#group}}{{#each name in content}}{{name}}{{/each}}{{/group}}')
    });

    appendView(view);
  }, "Missing helper: 'group'");
});
}
