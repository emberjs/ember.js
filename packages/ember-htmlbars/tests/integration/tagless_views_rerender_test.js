import run from "ember-metal/run_loop";
import EmberView from "ember-views/views/view";
import EmberHandlebars from "ember-htmlbars/compat";

var view;
var compile = EmberHandlebars.compile;


function appendView(view) {
  run(function() { view.appendTo('#qunit-fixture'); });
}

QUnit.module("ember-htmlbars: tagless views should be able to add/remove child views", {
  teardown: function() {
    run(function() {
      if (view) {
        view.destroy();
      }
    });
  }
});

test("can insert new child views after initial tagless view rendering", function() {
  view = EmberView.create({
    shouldShow: false,
    array: Ember.A([ 1 ]),

    template: compile('{{#if view.shouldShow}}{{#each item in view.array}}{{item}}{{/each}}{{/if}}')
  });

  appendView(view);

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

test("can remove child views after initial tagless view rendering", function() {
  view = EmberView.create({
    shouldShow: false,
    array: Ember.A([ ]),

    template: compile('{{#if view.shouldShow}}{{#each item in view.array}}{{item}}{{/each}}{{/if}}')
  });

  appendView(view);

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
