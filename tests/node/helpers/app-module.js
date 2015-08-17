/*jshint node:true*/
/*globals global,__dirname*/

var path = require('path');
var distPath = path.join(__dirname, '../../../dist');
var emberPath = path.join(distPath, 'ember.debug.cjs');
var templateCompilerPath = path.join(distPath, 'ember-template-compiler');
var features = require(path.join(__dirname, '../../../features.json')).features;
var SimpleDOM = require('simple-dom');
var URL = require('url');

/*
 * This helper sets up a QUnit test module with all of the environment and
 * helper methods necessary to test an Ember.js application running in the
 * server-side environment.
 *
 * On each test, it loads a fresh version of the compiled Ember.js library
 * from `dist`, just like how FastBoot works. It uses the new `visit()` API
 * to simulate a FastBoot environment (enabling that feature flag if it is
 * not already turned on).
 *
 * To test an app, register the objects that make up the app. For example,
 * to register a component:
 *
 *     this.component('component-name', {
 *       componetProperty: true
 *     });
 *
 * Or a template:
 *
 *    this.template('application', '{{outlet}}');
 *    this.template('components/foo-bar', '<h1>Hello world</h1>');
 *
 * Or a controller:
 *
 *    this.controller('controller-name', {
 *      actions: {
 *        sendEmail: function() { }
 *      }
 *    });
 *
 * You can also provide the routes for the application by calling `this.routes()`,
 * which is equivalent to `App.Router.map()`:
 *
 *     this.routes(function() {
 *       this.route('photos');
 *       this.route('admin', function() {
 *         this.route('logout');
 *       });
 *     });
 *
 * Once all of the constituent parts of the app are registered, you can kick off
 * app boot by calling either `this.visit(url)` or `this.renderToHTML(url)`.
 *
 * `visit` returns a promise that resolves to the application instance, and
 * `renderToHTML` returns a promise that resolves to the rendered HTML of the
 * application.
 *
 *     return this.renderToHTML('/'photos).then(function(html) {
 *       assert.ok(html.matches('<h1>Hello world</h1>'));
 *     });
*/

// Server-side rendering relies on the `ember-application-visit` feature flag.
// If the flag is enabled, or if the flag is disabled but not stripped, we can
// run the tests. Otherwise, for builds that have the feature stripped, we just
// skip the tests.
var canRunTests = features['ember-application-visit'] != false;

if (canRunTests) {
  // Enable the flag if it was disabled but not stripped.
  features['ember-application-visit'] = true;

  /*jshint -W079 */
  global.EmberENV = {
    FEATURES: features,
    // Views are disabled but can be re-enabled via an addon.
    // This flag simulates the addon so we can verify those
    // views remain compatible with FastBoot. This can
    // be removed in Ember 2.4 when view support is dropped
    // entirely.
    _ENABLE_LEGACY_VIEW_SUPPORT: true
  };
}

module.exports = function(moduleName) {
  QUnit.module(moduleName, {
    beforeEach: function() {
      var Ember = this.Ember = require(emberPath);
      var DOMHelper = Ember.HTMLBars.DOMHelper;
      Ember.testing = true;

      this.compile = require(templateCompilerPath).compile;
      this.domHelper = createDOMHelper(DOMHelper);
      this.run = Ember.run;
      this.all = Ember.RSVP.all;

      this.visit = visit;
      this.createApplication = createApplication;
      this.register = register;
      this.template = registerTemplate;
      this.component = registerComponent;
      this.controller = registerController;
      this.view = registerView;
      this.routes = registerRoutes;
      this.registry = {};
      this.renderToElement = renderToElement;
      this.renderToHTML = renderToHTML;
    },

    afterEach: function() {
      this.Ember.run(this.app, 'destroy');

      delete global.Ember;

      // clear the previously cached version of this module
      delete require.cache[emberPath + '.js'];
      delete require.cache[templateCompilerPath + '.js'];
    }
  });
};

module.exports.canRunTests = canRunTests;

function createApplication() {
  var app = this.Ember.Application.extend().create({
    autoboot: false
  });

  app.Router = this.Ember.Router.extend({
    location: 'none'
  });

  if (this.routesCallback) {
    app.Router.map(this.routesCallback);
  }

  registerDOMHelper(this.Ember, app, this.domHelper);
  registerApplicationClasses(app, this.registry);

  this.run(function() {
    app.boot();
  });
  this.app = app;

  return app;
}

function register(containerKey, klass) {
  this.registry[containerKey] = klass;
}

function visit(url) {
  if (!this.app) { this.createApplication(); }

  var promise;
  this.run(this, function() {
    promise = this.app.visit(url);
  });

  return promise;
}

function registerDOMHelper(Ember, app, domHelper) {
  app.initializer({
    name: 'register-dom-helper',
    initialize: function(app) {
      app.register('renderer:-dom', {
        create: function() {
          return new Ember._Renderer(domHelper, false);
        }
      });
    }
  });
}

function createDOMHelper(DOMHelper) {
  var document = new SimpleDOM.Document();
  var domHelper = new DOMHelper(document);

  domHelper.protocolForURL = function(url) {
    var protocol = URL.parse(url).protocol;
    return (protocol == null) ? ':' : protocol;
  };

  domHelper.setMorphHTML = function(morph, html) {
    var section = this.document.createRawHTMLSection(html);
    morph.setNode(section);
  };

  return domHelper;
}

function registerApplicationClasses(app, registry) {
  app.initializer({
    name: 'register-application-classes',
    initialize: function(app) {
      for (var key in registry) {
        app.register(key, registry[key]);
      }
    }
  });
}

function registerTemplate(name, template) {
  this.register('template:'+name, this.compile(template));
}

function registerComponent(name, componentProps) {
  var component = this.Ember.Component.extend(componentProps);
  this.register('component:'+name, component);
}

function registerController(name, controllerProps) {
  var controller = this.Ember.Controller.extend(controllerProps);
  this.register('controller:'+name, controller);
}

function registerView(name, viewProps) {
  var view = this.Ember.View.extend(viewProps);
  this.register('view:'+name, view);
}

function registerRoutes(cb) {
  this.routesCallback = cb;
}

function renderToElement(instance) {
  var element;
  this.run(function() {
    element = instance.view.renderToElement();
  });

  return element;
}

function renderToHTML(route) {
  var self = this;
  return this.visit(route).then(function(instance) {
    var element = self.renderToElement(instance);
    var serializer = new SimpleDOM.HTMLSerializer(SimpleDOM.voidMap);
    var serialized = serializer.serialize(element);

    return serialized;
  });
}
