var App, container;
var compile = Ember.Handlebars.compile;

module("Application Lifecycle - Component Registration", {
  setup: function() {
    Ember.TEMPLATES["components/expand-it"] = compile("<p>hello {{yield}}</p>");
    Ember.TEMPLATES.application = compile("Hello world {{#expand-it}}world{{/expand-it}}");
  },

  teardown: function() {
    Ember.run(function() {
      App.destroy();
      App = null;
      Ember.TEMPLATES = {};
    });
  }
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

    container = App.__container__;

    if (callback) { callback(); }
  });

  var router = container.lookup('router:main');

  Ember.run(App, 'advanceReadiness');
  Ember.run(function() {
    router.handleURL('/');
  });
}

test("The helper becomes the body of the component", function() {
  boot();
  equal(Ember.$('div.ember-view > div.ember-view', '#qunit-fixture').text(), "hello world", "The component is composed correctly");
});

test("If a component is registered, it is used", function() {
  boot(function() {
    container.register('component:expand-it', Ember.Component.extend({
      classNames: 'testing123'
    }));
  });

  equal(Ember.$('div.testing123', '#qunit-fixture').text(), "hello world", "The component is composed correctly");
});


test("Late-registered components can be rendered with custom `template` property", function() {

  Ember.TEMPLATES.application = compile("<div id='wrapper'>there goes {{my-hero}}</div>");

  boot(function() {
    container.register('component:my-hero', Ember.Component.extend({
      classNames: 'testing123',
      template: function() { return "watch him as he GOES"; }
    }));
  });

  equal(Ember.$('#wrapper').text(), "there goes watch him as he GOES", "The component is composed correctly");
  ok(!Ember.Handlebars.helpers['my-hero'], "Component wasn't saved to global Handlebars.helpers hash");
});

test("Late-registered components can be rendered with template registered on the container", function() {

  Ember.TEMPLATES.application = compile("<div id='wrapper'>hello world {{sally-rutherford}} {{#sally-rutherford}}!!!{{/sally-rutherford}}</div>");

  boot(function() {
    container.register('template:components/sally-rutherford', compile("funkytowny{{yield}}"));
    container.register('component:sally-rutherford', Ember.Component);
  });

  equal(Ember.$('#wrapper').text(), "hello world funkytowny funkytowny!!!", "The component is composed correctly");
  ok(!Ember.Handlebars.helpers['sally-rutherford'], "Component wasn't saved to global Handlebars.helpers hash");
});

test("Late-registered components can be rendered with ONLY the template registered on the container", function() {

  Ember.TEMPLATES.application = compile("<div id='wrapper'>hello world {{borf-snorlax}} {{#borf-snorlax}}!!!{{/borf-snorlax}}</div>");

  boot(function() {
    container.register('template:components/borf-snorlax', compile("goodfreakingTIMES{{yield}}"));
  });

  equal(Ember.$('#wrapper').text(), "hello world goodfreakingTIMES goodfreakingTIMES!!!", "The component is composed correctly");
  ok(!Ember.Handlebars.helpers['borf-snorlax'], "Component wasn't saved to global Handlebars.helpers hash");
});

test("Component-like invocations are treated as bound paths if neither template nor component are registered on the container", function() {

  Ember.TEMPLATES.application = compile("<div id='wrapper'>{{user-name}} hello {{api-key}} world</div>");

  boot(function() {
    container.register('controller:application', Ember.Controller.extend({
      'user-name': 'machty'
    }));
  });

  equal(Ember.$('#wrapper').text(), "machty hello  world", "The component is composed correctly");
});

test("Component lookups should take place on components' subcontainers", function() {

  expect(1);

  Ember.TEMPLATES.application = compile("<div id='wrapper'>{{#sally-rutherford}}{{mach-ty}}{{/sally-rutherford}}</div>");

  boot(function() {
    container.register('component:sally-rutherford', Ember.Component.extend({
      init: function() {
        this._super();
        this.container = new Ember.Container(this.container);
        this.container.register('component:mach-ty', Ember.Component.extend({
          didInsertElement: function() {
            ok(true, "mach-ty was rendered");
          }
        }));
      }
    }));
  });
});
