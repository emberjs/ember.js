import run from "ember-metal/run_loop";

import Namespace from "ember-runtime/system/namespace";
import Controller from "ember-runtime/controllers/controller";
import EmberView from "ember-views/views/view";
import jQuery from "ember-views/system/jquery";

import compile from "ember-template-compiler/system/compile";
import { runAppend, runDestroy } from "ember-runtime/tests/utils";
import { buildRegistry } from "ember-routing-htmlbars/tests/utils";

var trim = jQuery.trim;

var registry, container, top;

QUnit.module("ember-routing-htmlbars: {{outlet}} helper", {
  setup() {
    var namespace = Namespace.create();
    registry = buildRegistry(namespace);
    container = registry.container();

    var CoreOutlet = container.lookupFactory('view:core-outlet');
    top = CoreOutlet.create();
  },

  teardown() {
    runDestroy(container);
    runDestroy(top);
    registry = container = top = null;
  }
});

QUnit.test("view should render the outlet when set after dom insertion", function() {
  var routerState = withTemplate("<h1>HI</h1>{{outlet}}");
  top.setOutletState(routerState);
  runAppend(top);

  equal(top.$().text(), 'HI');

  routerState.outlets.main = withTemplate("<p>BYE</p>");

  run(function() {
    top.setOutletState(routerState);
  });

  // Replace whitespace for older IE
  equal(trim(top.$().text()), 'HIBYE');
});

QUnit.test("a top-level outlet should always be a view", function() {
  registry.register('view:toplevel', EmberView.extend({
    elementId: 'top-level'
  }));
  var routerState = withTemplate("<h1>HI</h1>{{outlet}}");
  top.setOutletState(routerState);
  routerState.outlets.main = withTemplate("<p>BYE</p>");
  runAppend(top);

  // Replace whitespace for older IE
  equal(trim(top.$('#top-level').text()), 'HIBYE');
});

QUnit.test("a top-level outlet should have access to `{{controller}}`", function() {
  var routerState = withTemplate("<h1>{{controller.salutation}}</h1>{{outlet}}");
  routerState.render.controller = Controller.create({
    salutation: 'HI'
  });
  top.setOutletState(routerState);
  routerState.outlets.main = withTemplate("<p>BYE</p>");
  runAppend(top);

  // Replace whitespace for older IE
  equal(trim(top.$().text()), 'HIBYE');
});

QUnit.test("a non top-level outlet should have access to `{{controller}}`", function() {
  var routerState = withTemplate("<h1>HI</h1>{{outlet}}");
  top.setOutletState(routerState);
  routerState.outlets.main = withTemplate("<p>BYE</p>");
  routerState.outlets.main.render.controller = Controller.create({
    salutation: 'BYE'
  });

  runAppend(top);

  // Replace whitespace for older IE
  equal(trim(top.$().text()), 'HIBYE');
});

QUnit.test("view should render the outlet when set before dom insertion", function() {
  var routerState = withTemplate("<h1>HI</h1>{{outlet}}");
  routerState.outlets.main = withTemplate("<p>BYE</p>");
  top.setOutletState(routerState);
  runAppend(top);

  // Replace whitespace for older IE
  equal(trim(top.$().text()), 'HIBYE');
});


QUnit.test("outlet should support an optional name", function() {
  var routerState = withTemplate("<h1>HI</h1>{{outlet 'mainView'}}");
  top.setOutletState(routerState);
  runAppend(top);

  equal(top.$().text(), 'HI');

  routerState.outlets.mainView = withTemplate("<p>BYE</p>");

  run(function() {
    top.setOutletState(routerState);
  });

  // Replace whitespace for older IE
  equal(trim(top.$().text()), 'HIBYE');
});


QUnit.test("outlet should correctly lookup a view [DEPRECATED]", function() {
  expectDeprecation(/Passing `view` or `viewClass` to {{outlet}} is deprecated/);
  var CoreOutlet = container.lookupFactory('view:core-outlet');
  var SpecialOutlet = CoreOutlet.extend({
    classNames: ['special']
  });

  registry.register("view:special-outlet", SpecialOutlet);

  var routerState = withTemplate("<h1>HI</h1>{{outlet view='special-outlet'}}");
  top.setOutletState(routerState);
  runAppend(top);

  equal(top.$().text(), 'HI');

  routerState.outlets.main = withTemplate("<p>BYE</p>");
  run(function() {
    top.setOutletState(routerState);
  });

  // Replace whitespace for older IE
  equal(trim(top.$().text()), 'HIBYE');
  equal(top.$().find('.special').length, 1, "expected to find .special element");
});

QUnit.test("outlet should assert view is specified as a string [DEPRECATED]", function() {
  expectDeprecation(/Passing `view` or `viewClass` to {{outlet}} is deprecated/);
  top.setOutletState(withTemplate("<h1>HI</h1>{{outlet view=containerView}}"));

  expectAssertion(function () {
    runAppend(top);
  }, /Using a quoteless view parameter with {{outlet}} is not supported/);

});

QUnit.test("outlet should assert view path is successfully resolved [DEPRECATED]", function() {
  expectDeprecation(/Passing `view` or `viewClass` to {{outlet}} is deprecated/);
  top.setOutletState(withTemplate("<h1>HI</h1>{{outlet view='someViewNameHere'}}"));

  expectAssertion(function () {
    runAppend(top);
  }, /someViewNameHere must be a subclass or an instance of Ember.View/);

});

QUnit.test("outlet should support an optional view class [DEPRECATED]", function() {
  expectDeprecation(/Passing `view` or `viewClass` to {{outlet}} is deprecated/);
  var CoreOutlet = container.lookupFactory('view:core-outlet');
  var SpecialOutlet = CoreOutlet.extend({
    classNames: ['very-special']
  });
  var routerState = {
    render: {
      ViewClass: EmberView.extend({
        template: compile("<h1>HI</h1>{{outlet viewClass=view.outletView}}"),
        outletView: SpecialOutlet
      })
    },
    outlets: {}
  };
  top.setOutletState(routerState);

  runAppend(top);

  equal(top.$().text(), 'HI');
  equal(top.$().find('.very-special').length, 1, "Should find .very-special");

  routerState.outlets.main = withTemplate("<p>BYE</p>");

  run(function() {
    top.setOutletState(routerState);
  });

  // Replace whitespace for older IE
  equal(trim(top.$().text()), 'HIBYE');
});


QUnit.test("Outlets bind to the current view, not the current concrete view", function() {
  var routerState = withTemplate("<h1>HI</h1>{{outlet}}");
  top.setOutletState(routerState);
  runAppend(top);
  routerState.outlets.main = withTemplate("<h2>MIDDLE</h2>{{outlet}}");
  run(function() {
    top.setOutletState(routerState);
  });
  routerState.outlets.main.outlets.main = withTemplate("<h3>BOTTOM</h3>");
  run(function() {
    top.setOutletState(routerState);
  });

  var output = jQuery('#qunit-fixture h1 ~ h2 ~ h3').text();
  equal(output, "BOTTOM", "all templates were rendered");
});

QUnit.test("Outlets bind to the current template's view, not inner contexts [DEPRECATED]", function() {
  var parentTemplate = "<h1>HI</h1>{{#if view.alwaysTrue}}{{outlet}}{{/if}}";
  var bottomTemplate = "<h3>BOTTOM</h3>";

  var routerState = {
    render: {
      ViewClass: EmberView.extend({
        alwaysTrue: true,
        template: compile(parentTemplate)
      })
    },
    outlets: {}
  };

  top.setOutletState(routerState);

  runAppend(top);

  routerState.outlets.main = withTemplate(bottomTemplate);

  run(function() {
    top.setOutletState(routerState);
  });

  var output = jQuery('#qunit-fixture h1 ~ h3').text();
  equal(output, "BOTTOM", "all templates were rendered");
});

QUnit.test("should support layouts [DEPRECATED]", function() {
  expectDeprecation(/Using deprecated `template` property on a View/);
  var template = "{{outlet}}";
  var layout = "<h1>HI</h1>{{yield}}";
  var routerState = {
    render: {
      ViewClass: EmberView.extend({
        template: compile(template),
        layout: compile(layout)
      })
    },
    outlets: {}
  };
  top.setOutletState(routerState);
  runAppend(top);

  equal(top.$().text(), 'HI');

  routerState.outlets.main = withTemplate("<p>BYE</p>");

  run(function() {
    top.setOutletState(routerState);
  });

  // Replace whitespace for older IE
  equal(trim(top.$().text()), 'HIBYE');
});

QUnit.test("should not throw deprecations if {{outlet}} is used without a name", function() {
  expectNoDeprecation();
  top.setOutletState(withTemplate("{{outlet}}"));
  runAppend(top);
});

QUnit.test("should not throw deprecations if {{outlet}} is used with a quoted name", function() {
  expectNoDeprecation();
  top.setOutletState(withTemplate("{{outlet \"foo\"}}"));
  runAppend(top);
});

QUnit.test("{{outlet}} should work with an unquoted name", function() {
  var routerState = {
    render: {
      controller: Ember.Controller.create({
        outletName: 'magical'
      }),
      template: compile('{{outlet outletName}}')
    },
    outlets: {
      magical: withTemplate("It's magic")
    }
  };

  top.setOutletState(routerState);
  runAppend(top);

  equal(top.$().text().trim(), "It's magic");
});

QUnit.test("{{outlet}} should rerender when bound name changes", function() {
  var routerState = {
    render: {
      controller: Ember.Controller.create({
        outletName: 'magical'
      }),
      template: compile('{{outlet outletName}}')
    },
    outlets: {
      magical: withTemplate("It's magic"),
      second: withTemplate("second")
    }
  };

  top.setOutletState(routerState);
  runAppend(top);
  equal(top.$().text().trim(), "It's magic");
  run(function() {
    routerState.render.controller.set('outletName', 'second');
  });
  equal(top.$().text().trim(), "second");
});


function withTemplate(string) {
  return {
    render: {
      template: compile(string)
    },
    outlets: {}
  };
}
