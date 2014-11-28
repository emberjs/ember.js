import EmberView from "ember-views/views/view";
import run from "ember-metal/run_loop";
import EmberObject from "ember-runtime/system/object";
import EmberHandlebars from "ember-handlebars-compiler";
import { set } from "ember-metal/property_set";

import {
  default as htmlbarsHelpers,
  helper as htmlbarsHelper
} from "ember-htmlbars/helpers";
import htmlbarsCompile from "ember-htmlbars/system/compile";

var compile, helper, helpers;
if (Ember.FEATURES.isEnabled('ember-htmlbars')) {
  compile = htmlbarsCompile;
  helpers = htmlbarsHelpers;
  helper = htmlbarsHelper;
} else {
  compile = EmberHandlebars.compile;
  helper = EmberHandlebars.helper;
  helpers = EmberHandlebars.helpers;
}

function appendView(view) {
  run(view, 'appendTo', '#qunit-fixture');
}

var view;

QUnit.module("ember-htmlbars: Ember.HTMLBars.helper", {
  teardown: function() {
    if (view) {
      run(view, 'destroy');
    }

    delete helpers.oceanView;
    delete helpers.something;
  }
});

test("should render an instance of the specified view", function() {
  var OceanView = EmberView.extend({
    template: compile('zomg, nice view')
  });

  helper('oceanView', OceanView);

  view = EmberView.create({
    controller: EmberObject.create(),
    template: compile('{{oceanView tagName="strong"}}')
  });

  appendView(view);

  var oceanViews = view.$().find("strong:contains('zomg, nice view')");

  equal(oceanViews.length, 1, "helper rendered an instance of the view");
});

test("Should bind to this keyword", function() {
  var OceanView = EmberView.extend({
    model: null,
    template: compile('{{view.model}}')
  });

  helper('oceanView', OceanView);

  view = EmberView.create({
    context: 'foo',
    controller: EmberObject.create(),
    template: compile('{{oceanView tagName="strong" viewName="ocean" model=this}}')
  });

  appendView(view);

  var oceanViews = view.$().find("strong:contains('foo')");

  equal(oceanViews.length, 1, "helper rendered an instance of the view");

  run(function() {
    set(view, 'ocean.model', 'bar');
  });

  oceanViews = view.$().find("strong:contains('bar')");

  equal(oceanViews.length, 1, "helper rendered an instance of the view");
});

test('should create a bound helper when provided a function', function() {
  var boundFunc;
  if (Ember.FEATURES.isEnabled('ember-htmlbars')) {
    boundFunc = function(params, hash) {
      return params[0];
    };
  } else {
    boundFunc = function(name, options) {
      return name;
    };
  }

  helper('something', boundFunc);

  view = EmberView.create({
    controller: {
      value: 'foo'
    },
    template: compile('{{something value}}')
  });

  appendView(view);

  equal(view.$().text(), 'foo', 'renders the bound value initially');

  run(function() {
    set(view, 'controller.value', 'bar');
  });

  equal(view.$().text(), 'bar', 're-renders the bound value');
});
