/*globals TemplateTests*/
import {View as EmberView} from "ember-views/views/view";
import run from "ember-metal/run_loop";
import EmberObject from "ember-runtime/system/object";
import Namespace from "ember-runtime/system/namespace";
import EmberHandlebars from "ember-handlebars-compiler";

import {get} from "ember-metal/property_get";
import {set} from "ember-metal/property_set";

var appendView = function() {
  run(function() { view.appendTo('#qunit-fixture'); });
};

var view;


module("Handlebars custom view helpers", {
  setup: function() {
    window.TemplateTests = Namespace.create();
  },
  teardown: function() {
    run(function() {
      if (view) {
        view.destroy();
      }
    });
    window.TemplateTests = undefined;
  }
});

test("should render an instance of the specified view", function() {
  TemplateTests.OceanView = EmberView.extend({
    template: EmberHandlebars.compile('zomg, nice view')
  });

  EmberHandlebars.helper('oceanView', TemplateTests.OceanView);

  view = EmberView.create({
    controller: EmberObject.create(),
    template: EmberHandlebars.compile('{{oceanView tagName="strong"}}')
  });

  appendView();

  var oceanViews = view.$().find("strong:contains('zomg, nice view')");

  equal(oceanViews.length, 1, "helper rendered an instance of the view");
});

test("Should bind to this keyword", function() {
  TemplateTests.OceanView = EmberView.extend({
    model: null,
    template: EmberHandlebars.compile('{{view.model}}')
  });

  EmberHandlebars.helper('oceanView', TemplateTests.OceanView);

  view = EmberView.create({
    context: 'foo',
    controller: EmberObject.create(),
    template: EmberHandlebars.compile('{{oceanView tagName="strong" viewName="ocean" model=this}}')
  });

  appendView();

  var oceanViews = view.$().find("strong:contains('foo')");

  equal(oceanViews.length, 1, "helper rendered an instance of the view");

  run(function() {
    set(view, 'ocean.model', 'bar');
  });

  oceanViews = view.$().find("strong:contains('bar')");

  equal(oceanViews.length, 1, "helper rendered an instance of the view");
});
