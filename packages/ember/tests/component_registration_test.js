import "ember";

import compile from "ember-template-compiler/system/compile";
import helpers from "ember-htmlbars/helpers";

var App, registry, container;
var originalHelpers;

function prepare() {
  Ember.TEMPLATES["components/expand-it"] = compile("<p>hello {{yield}}</p>");
  Ember.TEMPLATES.application = compile("Hello world {{#expand-it}}world{{/expand-it}}");

  originalHelpers = Ember.A(Ember.keys(helpers));
}

function cleanup() {
  Ember.run(function() {
    if (App) {
      App.destroy();
    }
    App = null;
    Ember.TEMPLATES = {};

    cleanupHandlebarsHelpers();
  });
}

function cleanupHandlebarsHelpers() {
  var currentHelpers = Ember.A(Ember.keys(helpers));

  currentHelpers.forEach(function(name) {
    if (!originalHelpers.contains(name)) {
      delete helpers[name];
    }
  });
}

QUnit.module("Application Lifecycle - Component Registration", {
  setup: prepare,
  teardown: cleanup
});

function boot(callback) {
  Ember.run(function() {
    App = Ember.Application.create({
      name: 'App',
      rootElement: '#qunit-fixture'
    });

    App.deferReadiness();

    App.Router = Ember.Router.extend({
      location: 'none'
    });

    registry = App.registry;
    container = App.__container__;

    if (callback) { callback(); }
  });

  var router = container.lookup('router:main');

  Ember.run(App, 'advanceReadiness');
  Ember.run(function() {
    router.handleURL('/');
  });
}

QUnit.test("The helper becomes the body of the component", function() {
  boot();
  equal(Ember.$('div.ember-view > div.ember-view', '#qunit-fixture').text(), "hello world", "The component is composed correctly");
});

QUnit.test("If a component is registered, it is used", function() {
  boot(function() {
    registry.register('component:expand-it', Ember.Component.extend({
      classNames: 'testing123'
    }));
  });

  equal(Ember.$('div.testing123', '#qunit-fixture').text(), "hello world", "The component is composed correctly");
});


QUnit.skip("Late-registered components can be rendered with custom `template` property (DEPRECATED)", function() {

  Ember.TEMPLATES.application = compile("<div id='wrapper'>there goes {{my-hero}}</div>");

  expectDeprecation(/Do not specify template on a Component/);

  boot(function() {
    registry.register('component:my-hero', Ember.Component.extend({
      classNames: 'testing123',
      template() { return "watch him as he GOES"; }
    }));
  });

  equal(Ember.$('#wrapper').text(), "there goes watch him as he GOES", "The component is composed correctly");
  ok(!helpers['my-hero'], "Component wasn't saved to global helpers hash");
});

QUnit.test("Late-registered components can be rendered with template registered on the container", function() {

  Ember.TEMPLATES.application = compile("<div id='wrapper'>hello world {{sally-rutherford}}-{{#sally-rutherford}}!!!{{/sally-rutherford}}</div>");

  boot(function() {
    registry.register('template:components/sally-rutherford', compile("funkytowny{{yield}}"));
    registry.register('component:sally-rutherford', Ember.Component);
  });

  equal(Ember.$('#wrapper').text(), "hello world funkytowny-funkytowny!!!", "The component is composed correctly");
  ok(!helpers['sally-rutherford'], "Component wasn't saved to global helpers hash");
});

QUnit.test("Late-registered components can be rendered with ONLY the template registered on the container", function() {

  Ember.TEMPLATES.application = compile("<div id='wrapper'>hello world {{borf-snorlax}}-{{#borf-snorlax}}!!!{{/borf-snorlax}}</div>");

  boot(function() {
    registry.register('template:components/borf-snorlax', compile("goodfreakingTIMES{{yield}}"));
  });

  equal(Ember.$('#wrapper').text(), "hello world goodfreakingTIMES-goodfreakingTIMES!!!", "The component is composed correctly");
  ok(!helpers['borf-snorlax'], "Component wasn't saved to global helpers hash");
});

QUnit.test("Component-like invocations are treated as bound paths if neither template nor component are registered on the container", function() {

  Ember.TEMPLATES.application = compile("<div id='wrapper'>{{user-name}} hello {{api-key}} world</div>");

  boot(function() {
    registry.register('controller:application', Ember.Controller.extend({
      'user-name': 'machty'
    }));
  });

  equal(Ember.$('#wrapper').text(), "machty hello  world", "The component is composed correctly");
});

QUnit.test("Assigning templateName to a component should setup the template as a layout (DEPRECATED)", function() {
  expect(2);

  Ember.TEMPLATES.application = compile("<div id='wrapper'>{{#my-component}}{{text}}{{/my-component}}</div>");
  Ember.TEMPLATES['foo-bar-baz'] = compile("{{text}}-{{yield}}");

  expectDeprecation(/Do not specify templateName on a Component/);

  boot(function() {
    registry.register('controller:application', Ember.Controller.extend({
      'text': 'outer'
    }));

    registry.register('component:my-component', Ember.Component.extend({
      text: 'inner',
      templateName: 'foo-bar-baz'
    }));
  });

  equal(Ember.$('#wrapper').text(), "inner-outer", "The component is composed correctly");
});

QUnit.test("Assigning templateName and layoutName should use the templates specified [DEPRECATED]", function() {
  expect(2);
  expectDeprecation(/Using deprecated `template` property on a Component/);

  Ember.TEMPLATES.application = compile("<div id='wrapper'>{{my-component}}</div>");
  Ember.TEMPLATES['foo'] = compile("{{text}}");
  Ember.TEMPLATES['bar'] = compile("{{text}}-{{yield}}");

  boot(function() {
    registry.register('controller:application', Ember.Controller.extend({
      'text': 'outer'
    }));

    registry.register('component:my-component', Ember.Component.extend({
      text: 'inner',
      layoutName: 'bar',
      templateName: 'foo'
    }));
  });

  equal(Ember.$('#wrapper').text(), "inner-outer", "The component is composed correctly");
});

QUnit.test('Using name of component that does not exist', function () {
  Ember.TEMPLATES.application = compile("<div id='wrapper'>{{#no-good}} {{/no-good}}</div>");

  expectAssertion(function () {
    boot();
  }, /A helper named 'no-good' could not be found/);
});

QUnit.module("Application Lifecycle - Component Context", {
  setup: prepare,
  teardown: cleanup
});

QUnit.test("Components with a block should have the proper content when a template is provided", function() {
  Ember.TEMPLATES.application = compile("<div id='wrapper'>{{#my-component}}{{text}}{{/my-component}}</div>");
  Ember.TEMPLATES['components/my-component'] = compile("{{text}}-{{yield}}");

  boot(function() {
    registry.register('controller:application', Ember.Controller.extend({
      'text': 'outer'
    }));

    registry.register('component:my-component', Ember.Component.extend({
      text: 'inner'
    }));
  });

  equal(Ember.$('#wrapper').text(), "inner-outer", "The component is composed correctly");
});

QUnit.test("Components with a block should yield the proper content without a template provided", function() {
  Ember.TEMPLATES.application = compile("<div id='wrapper'>{{#my-component}}{{text}}{{/my-component}}</div>");

  boot(function() {
    registry.register('controller:application', Ember.Controller.extend({
      'text': 'outer'
    }));

    registry.register('component:my-component', Ember.Component.extend({
      text: 'inner'
    }));
  });

  equal(Ember.$('#wrapper').text(), "outer", "The component is composed correctly");
});

QUnit.test("Components without a block should have the proper content when a template is provided", function() {
  Ember.TEMPLATES.application = compile("<div id='wrapper'>{{my-component}}</div>");
  Ember.TEMPLATES['components/my-component'] = compile("{{text}}");

  boot(function() {
    registry.register('controller:application', Ember.Controller.extend({
      'text': 'outer'
    }));

    registry.register('component:my-component', Ember.Component.extend({
      text: 'inner'
    }));
  });

  equal(Ember.$('#wrapper').text(), "inner", "The component is composed correctly");
});

QUnit.test("Components without a block should have the proper content", function() {
  Ember.TEMPLATES.application = compile("<div id='wrapper'>{{my-component}}</div>");

  boot(function() {
    registry.register('controller:application', Ember.Controller.extend({
      'text': 'outer'
    }));

    registry.register('component:my-component', Ember.Component.extend({
      didInsertElement() {
        this.$().html('Some text inserted by jQuery');
      }
    }));
  });

  equal(Ember.$('#wrapper').text(), "Some text inserted by jQuery", "The component is composed correctly");
});

QUnit.skip("properties of a component  without a template should not collide with internal structures", function() {
  Ember.TEMPLATES.application = compile("<div id='wrapper'>{{my-component data=foo}}</div>");

  boot(function() {
    registry.register('controller:application', Ember.Controller.extend({
      'text': 'outer',
      'foo': 'Some text inserted by jQuery'
    }));

    registry.register('component:my-component', Ember.Component.extend({
      didInsertElement() {
        this.$().html(this.get('data'));
      }
    }));
  });

  equal(Ember.$('#wrapper').text(), "Some text inserted by jQuery", "The component is composed correctly");
});

QUnit.test("Components trigger actions in the parents context when called from within a block", function() {
  Ember.TEMPLATES.application = compile("<div id='wrapper'>{{#my-component}}<a href='#' id='fizzbuzz' {{action 'fizzbuzz'}}>Fizzbuzz</a>{{/my-component}}</div>");

  boot(function() {
    registry.register('controller:application', Ember.Controller.extend({
      actions: {
        fizzbuzz() {
          ok(true, 'action triggered on parent');
        }
      }
    }));

    registry.register('component:my-component', Ember.Component.extend());
  });

  Ember.run(function() {
    Ember.$('#fizzbuzz', "#wrapper").click();
  });
});

QUnit.test("Components trigger actions in the components context when called from within its template", function() {
  Ember.TEMPLATES.application = compile("<div id='wrapper'>{{#my-component}}{{text}}{{/my-component}}</div>");
  Ember.TEMPLATES['components/my-component'] = compile("<a href='#' id='fizzbuzz' {{action 'fizzbuzz'}}>Fizzbuzz</a>");

  boot(function() {
    registry.register('controller:application', Ember.Controller.extend({
      actions: {
        fizzbuzz() {
          ok(false, 'action triggered on the wrong context');
        }
      }
    }));

    registry.register('component:my-component', Ember.Component.extend({
      actions: {
        fizzbuzz() {
          ok(true, 'action triggered on component');
        }
      }
    }));
  });

  Ember.$('#fizzbuzz', "#wrapper").click();
});
