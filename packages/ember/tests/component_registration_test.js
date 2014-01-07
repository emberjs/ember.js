var App, container;
var compile = Ember.Handlebars.compile;
var originalHelpers;

function prepare(){
  Ember.TEMPLATES["components/expand-it"] = compile("<p>hello {{yield}}</p>");
  Ember.TEMPLATES.application = compile("Hello world {{#expand-it}}world{{/expand-it}}");

  originalHelpers = Ember.A(Ember.keys(Ember.Handlebars.helpers));
}

function cleanup(){
  Ember.run(function() {
    App.destroy();
    App = null;
    Ember.TEMPLATES = {};

    cleanupHandlebarsHelpers();
  });
}

function cleanupHandlebarsHelpers(){
  var currentHelpers = Ember.A(Ember.keys(Ember.Handlebars.helpers));

  currentHelpers.forEach(function(name){
    if (!originalHelpers.contains(name)) {
      delete Ember.Handlebars.helpers[name];
    }
  });
}

module("Application Lifecycle - Component Registration", {
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

test("Assigning templateName to a component should setup the template as a layout", function(){
  expect(1);

  Ember.TEMPLATES.application = compile("<div id='wrapper'>{{#my-component}}{{text}}{{/my-component}}</div>");
  Ember.TEMPLATES['foo-bar-baz'] = compile("{{text}}-{{yield}}");

  boot(function() {
    container.register('controller:application', Ember.Controller.extend({
      'text': 'outer'
    }));

    container.register('component:my-component', Ember.Component.extend({
      text: 'inner',
      templateName: 'foo-bar-baz'
    }));
  });

  equal(Ember.$('#wrapper').text(), "inner-outer", "The component is composed correctly");
});

test("Assigning templateName and layoutName should use the templates specified", function(){
  expect(1);

  Ember.TEMPLATES.application = compile("<div id='wrapper'>{{my-component}}</div>");
  Ember.TEMPLATES['foo'] = compile("{{text}}");
  Ember.TEMPLATES['bar'] = compile("{{text}}-{{yield}}");

  boot(function() {
    container.register('controller:application', Ember.Controller.extend({
      'text': 'outer'
    }));

    container.register('component:my-component', Ember.Component.extend({
      text: 'inner',
      layoutName: 'bar',
      templateName: 'foo'
    }));
  });

  equal(Ember.$('#wrapper').text(), "inner-outer", "The component is composed correctly");
});

module("Application Lifecycle - Component Context", {
  setup: prepare,
  teardown: cleanup
});

test("Components with a block should have the proper content when a template is provided", function(){
  Ember.TEMPLATES.application = compile("<div id='wrapper'>{{#my-component}}{{text}}{{/my-component}}</div>");
  Ember.TEMPLATES['components/my-component'] = compile("{{text}}-{{yield}}");

  boot(function() {
    container.register('controller:application', Ember.Controller.extend({
      'text': 'outer'
    }));

    container.register('component:my-component', Ember.Component.extend({
      text: 'inner'
    }));
  });

  equal(Ember.$('#wrapper').text(), "inner-outer", "The component is composed correctly");
});

test("Components with a block should yield the proper content without a template provided", function(){
  Ember.TEMPLATES.application = compile("<div id='wrapper'>{{#my-component}}{{text}}{{/my-component}}</div>");

  boot(function() {
    container.register('controller:application', Ember.Controller.extend({
      'text': 'outer'
    }));

    container.register('component:my-component', Ember.Component.extend({
      text: 'inner'
    }));
  });

  equal(Ember.$('#wrapper').text(), "outer", "The component is composed correctly");
});

test("Components without a block should have the proper content when a template is provided", function(){
  Ember.TEMPLATES.application = compile("<div id='wrapper'>{{my-component}}</div>");
  Ember.TEMPLATES['components/my-component'] = compile("{{text}}");

  boot(function() {
    container.register('controller:application', Ember.Controller.extend({
      'text': 'outer'
    }));

    container.register('component:my-component', Ember.Component.extend({
      text: 'inner'
    }));
  });

  equal(Ember.$('#wrapper').text(), "inner", "The component is composed correctly");
});

test("Components without a block should have the proper content", function(){
  Ember.TEMPLATES.application = compile("<div id='wrapper'>{{my-component}}</div>");

  boot(function() {
    container.register('controller:application', Ember.Controller.extend({
      'text': 'outer'
    }));

    container.register('component:my-component', Ember.Component.extend({
      didInsertElement: function() {
        this.$().html('Some text inserted by jQuery');
      }
    }));
  });

  equal(Ember.$('#wrapper').text(), "Some text inserted by jQuery", "The component is composed correctly");
});

test("properties of a component  without a template should not collide with internal structures", function(){
  Ember.TEMPLATES.application = compile("<div id='wrapper'>{{my-component data=foo}}</div>");

  boot(function() {
    container.register('controller:application', Ember.Controller.extend({
      'text': 'outer',
      'foo': 'Some text inserted by jQuery'
    }));

    container.register('component:my-component', Ember.Component.extend({
      didInsertElement: function() {
        this.$().html(this.get('data'));
      }
    }));
  });

  equal(Ember.$('#wrapper').text(), "Some text inserted by jQuery", "The component is composed correctly");
});


test("Components trigger actions in the parents context when called from within a block", function(){
  Ember.TEMPLATES.application = compile("<div id='wrapper'>{{#my-component}}<a href='#' id='fizzbuzz' {{action 'fizzbuzz'}}>Fizzbuzz</a>{{/my-component}}</div>");

  boot(function() {
    container.register('controller:application', Ember.Controller.extend({
      actions: {
        fizzbuzz: function(){
          ok(true, 'action triggered on parent');
        }
      }
    }));

    container.register('component:my-component', Ember.Component.extend());
  });

  Ember.run(function(){
    Ember.$('#fizzbuzz', "#wrapper").click();
  });
});

test("Components trigger actions in the components context when called from within its template", function(){
  Ember.TEMPLATES.application = compile("<div id='wrapper'>{{#my-component}}{{text}}{{/my-component}}</div>");
  Ember.TEMPLATES['components/my-component'] = compile("<a href='#' id='fizzbuzz' {{action 'fizzbuzz'}}>Fizzbuzz</a>");

  boot(function() {
    container.register('controller:application', Ember.Controller.extend({
      actions: {
        fizzbuzz: function(){
          ok(false, 'action triggered on the wrong context');
        }
      }
    }));

    container.register('component:my-component', Ember.Component.extend({
      actions: {
        fizzbuzz: function(){
          ok(true, 'action triggered on component');
        }
      }
    }));
  });

  Ember.$('#fizzbuzz', "#wrapper").click();
});
