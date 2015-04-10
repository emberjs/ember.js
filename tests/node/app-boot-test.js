/*globals global,__dirname*/

var path = require('path');
var distPath = path.join(__dirname, '../../dist');
var emberPath = path.join(distPath, 'ember.debug.cjs');
var templateCompilerPath = path.join(distPath, 'ember-template-compiler');

var defeatureifyConfig = require(path.join(__dirname, '../../features.json'));

var canUseInstanceInitializers, canUseApplicationVisit;

if (defeatureifyConfig.features['ember-application-instance-initializers'] !== false) {
  canUseInstanceInitializers = true;
}

if (defeatureifyConfig.features['ember-application-visit'] !== false) {
  canUseApplicationVisit = true;
}

var features = {};
for (var feature in defeatureifyConfig.features) {
  features[feature] = defeatureifyConfig.features[feature];
}
features['ember-application-instance-initializers'] = true;
features['ember-application-visit'] =true;

/*jshint -W079 */
global.EmberENV = {
  FEATURES: features
};

var Ember, compile, domHelper, run;

var SimpleDOM = require('simple-dom');
var URL = require('url');

function createApplication() {
  var App = Ember.Application.extend().create({
    autoboot: false
  });

  App.Router = Ember.Router.extend({
    location: 'none'
  });

  return App;
}

function createDOMHelper() {
  var document = new SimpleDOM.Document();
  var domHelper = new DOMHelper(document);

  domHelper.protocolForURL = function(url) {
    var protocol = URL.parse(url).protocol;
    return (protocol == null) ? ':' : protocol;
  };

  return domHelper;
}

function registerDOMHelper(app) {
  app.instanceInitializer({
    name: 'register-dom-helper',
    initialize: function(app) {
      app.registry.register('renderer:-dom', {
        create: function() {
          return new Ember.View._Renderer(domHelper, false);
        }
      });
    }
  });
}

function registerTemplates(app, templates) {
  app.instanceInitializer({
    name: 'register-application-template',
    initialize: function(app) {
      for (var key in templates) {
        app.registry.register('template:' + key, compile(templates[key]));
      }
    }
  });
}

function renderToElement(instance) {
  var element;
  Ember.run(function() {
    element = instance.view.renderToElement();
  });

  return element;
}

function assertHTMLMatches(actualElement, expectedHTML) {
  var serializer = new SimpleDOM.HTMLSerializer(SimpleDOM.voidMap);
  var serialized = serializer.serialize(actualElement);
  ok(serialized.match(expectedHTML), serialized + " matches " + expectedHTML);
}


QUnit.module("App boot", {
  setup: function() {
    Ember = require(emberPath);
    compile = require(templateCompilerPath).compile;
    Ember.testing = true;
    DOMHelper = Ember.View.DOMHelper;
    domHelper = createDOMHelper();
    run = Ember.run;
  },

  teardown: function() {
    delete global.Ember;

    // clear the previously cached version of this module
    delete require.cache[emberPath + '.js'];
    delete require.cache[templateCompilerPath + '.js'];
  }
});

if (canUseInstanceInitializers && canUseApplicationVisit) {
  QUnit.test("App is created without throwing an exception", function() {
    var app;

    Ember.run(function() {
      app = createApplication();
      registerDOMHelper(app);

      app.visit('/');
    });

    QUnit.ok(app);
  });

  QUnit.test("It is possible to render a view in Node", function() {
    var View = Ember.View.extend({
      renderer: new Ember.View._Renderer(new DOMHelper(new SimpleDOM.Document())),
      template: compile("<h1>Hello</h1>")
    });

    var view = View.create({
      _domHelper: new DOMHelper(new SimpleDOM.Document()),
    });

    run(view, view.createElement);

    var serializer = new SimpleDOM.HTMLSerializer(SimpleDOM.voidMap);
    ok(serializer.serialize(view.element).match(/<h1>Hello<\/h1>/));
  });

  QUnit.test("It is possible to render a view with curlies in Node", function() {
    var View = Ember.Component.extend({
      renderer: new Ember.View._Renderer(new DOMHelper(new SimpleDOM.Document())),
      layout: compile("<h1>Hello {{location}}</h1>"),
      location: "World"
    });

    var view = View.create({
      _domHelper: new DOMHelper(new SimpleDOM.Document())
    });

    run(view, view.createElement);

    var serializer = new SimpleDOM.HTMLSerializer(SimpleDOM.voidMap);
    ok(serializer.serialize(view.element).match(/<h1>Hello World<\/h1>/));
  });

  QUnit.test("It is possible to render a view with a nested {{view}} helper in Node", function() {
    var View = Ember.Component.extend({
      renderer: new Ember.View._Renderer(new DOMHelper(new SimpleDOM.Document())),
      layout: compile("<h1>Hello {{#if hasExistence}}{{location}}{{/if}}</h1> <div>{{view bar}}</div>"),
      location: "World",
      hasExistence: true,
      bar: Ember.View.extend({
        template: compile("<p>The files are *inside* the computer?!</p>")
      })
    });

    var view = View.create({
      _domHelper: new DOMHelper(new SimpleDOM.Document())
    });

    run(view, view.createElement);

    var serializer = new SimpleDOM.HTMLSerializer(SimpleDOM.voidMap);
    ok(serializer.serialize(view.element).match(/<h1>Hello World<\/h1> <div><div id="(.*)" class="ember-view"><p>The files are \*inside\* the computer\?\!<\/p><\/div><\/div>/));
  });

  QUnit.test("It is possible to render a view with {{link-to}} in Node", function() {
    QUnit.stop();

    var app;

    run(function() {
      app = createApplication();

      app.Router.map(function() {
        this.route('photos');
      });

      registerDOMHelper(app);
      registerTemplates(app, {
        application: "<h1>{{#link-to 'photos'}}Go to photos{{/link-to}}</h1>"
      });
    });

    app.visit('/').then(function(instance) {
      QUnit.start();

      var element = renderToElement(instance);

      assertHTMLMatches(element.firstChild, /^<div id="ember\d+" class="ember-view"><h1><a id="ember\d+" class="ember-view" href="\/photos">Go to photos<\/a><\/h1><\/div>$/);
    });
  });

  QUnit.test("It is possible to render outlets in Node", function() {
    QUnit.stop();
    QUnit.stop();

    var run = Ember.run;
    var app;

    run(function() {
      app = createApplication();

      app.Router.map(function() {
        this.route('photos');
      });

      registerDOMHelper(app);
      registerTemplates(app, {
        application: "<p>{{outlet}}</p>",
        index: "<span>index</span>",
        photos: "<em>photos</em>"
      });
    });

    app.visit('/').then(function(instance) {
      QUnit.start();

      var element = renderToElement(instance);

      assertHTMLMatches(element.firstChild, /<div id="ember(.*)" class="ember-view"><p><span>index<\/span><\/p><\/div>/);
    });

    app.visit('/photos').then(function(instance) {
      QUnit.start();

      var element = renderToElement(instance);

      assertHTMLMatches(element.firstChild, /<div id="ember(.*)" class="ember-view"><p><em>photos<\/em><\/p><\/div>/);
    });
  });
}
