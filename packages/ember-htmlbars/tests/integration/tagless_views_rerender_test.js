import run from "ember-metal/run_loop";
import EmberView from "ember-views/views/view";
import EmberHandlebars from "ember-htmlbars/compat";
import { runAppend, runDestroy } from "ember-runtime/tests/utils";

var view;
var compile = EmberHandlebars.compile;

QUnit.module("ember-htmlbars: tagless views should be able to add/remove child views", {
  teardown() {
    runDestroy(view);
  }
});

QUnit.test("can insert new child views after initial tagless view rendering", function() {
  view = EmberView.create({
    shouldShow: false,
    array: Ember.A([1]),

    template: compile('{{#if view.shouldShow}}{{#each view.array as |item|}}{{item}}{{/each}}{{/if}}')
  });

  runAppend(view);

  equal(view.$().text(), '');

  run(function() {
    view.set('shouldShow', true);
  });

  equal(view.$().text(), '1');


  run(function() {
    view.get('array').pushObject(2);
  });

  equal(view.$().text(), '12');
});

QUnit.test("can remove child views after initial tagless view rendering", function() {
  view = EmberView.create({
    shouldShow: false,
    array: Ember.A([]),

    template: compile('{{#if view.shouldShow}}{{#each view.array as |item|}}{{item}}{{/each}}{{/if}}')
  });

  runAppend(view);

  equal(view.$().text(), '');

  run(function() {
    view.set('shouldShow', true);
    view.get('array').pushObject(1);
  });

  equal(view.$().text(), '1');

  run(function() {
    view.get('array').removeObject(1);
  });

  equal(view.$().text(), '');
});
