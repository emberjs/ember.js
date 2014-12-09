/*jshint newcap:false*/
import Ember from "ember-metal/core";
import EmberView from "ember-views/views/view";
import EmberHandlebars from "ember-handlebars";
import { A } from "ember-runtime/system/native_array";
import { runAppend, runDestroy } from "ember-runtime/tests/utils";

var view;

QUnit.module("Templates redrawing and bindings", {
  teardown: function() {
    runDestroy(view);
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
    runAppend(view);
  }, 'An error occurred while setting up template bindings. Please check "blahzorz" template for invalid markup or bindings within HTML comments.');
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

    runAppend(view);
  }, "Missing helper: 'group'");
});
}
