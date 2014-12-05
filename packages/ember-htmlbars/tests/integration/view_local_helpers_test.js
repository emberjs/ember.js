import Ember from 'ember-metal/core';
import EmberView from 'ember-views/views/view';
import EmberHandlebars from 'ember-handlebars';
import htmlbarsCompile from 'ember-htmlbars/system/compile';
import { runAppend, runDestroy } from "ember-runtime/tests/utils";

var view, view1, view2;
var compile;

if (Ember.FEATURES.isEnabled('ember-htmlbars')) {
  compile = htmlbarsCompile;
} else {
  compile = EmberHandlebars.compile;
}

QUnit.module('ember-htmlbars: view local helper integration', {
  teardown: function() {
    runDestroy(view);
    runDestroy(view1);
    runDestroy(view2);
    view = view1 = view2 = null;
  }
});

test('are invoked', function() {
  expect(2);

  view = EmberView.create({
    helpers: {
      blah: {
        helperFunction: function(params, hash, options, env) {
          ok(true, 'blah helper was looked up');

          return 'derp! ' + params[0];
        },
        isHTMLBars: true
      }
    },

    template: compile('{{blah "hi"}}')
  });

  runAppend(view);

  equal(view.$().text(), 'derp! hi', 'local helper is used!');
});

test('are not shared', function() {
  expect(3);

  view1 = EmberView.create({
    helpers: {
      blah: {
        helperFunction: function(params, hash, options, env) {
          ok(true, 'blah helper was looked up');

          return 'derp! ' + params[0];
        },
        isHTMLBars: true
      }
    },

    template: compile('{{blah "hi"}}')
  });

  view2 = EmberView.create({
    template: compile('{{blah}}')
  });

  runAppend(view1);
  equal(view1.$().text(), 'derp! hi', 'local helper is used!');

  runAppend(view2);
  equal(view2.$().text(), '', 'local helper is used!');
});
