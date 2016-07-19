/*jshint node:true*/
/*globals global,__dirname*/

var path = require('path');
var QUnit = require('qunitjs');

var distPath = path.join(__dirname, '../../../dist');
var emberPath = path.join(distPath, 'ember.debug');
var templateCompilerPath = path.join(distPath, 'ember-template-compiler');
var features = require(path.join(__dirname, '../../../features.json')).features;
var SimpleDOM = require('simple-dom');

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
 *       componentProperty: true
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
    FEATURES: features
  };
}

module.exports = function(moduleName) {
  QUnit.module(moduleName, {
    beforeEach: function() {
      var Ember = this.Ember = require(emberPath);

      Ember.testing = true;

      var precompile = require(templateCompilerPath).precompile;
      this.compile = function(templateString, options) {
        var templateSpec = precompile(templateString, options);
        var template = new Function('return ' + templateSpec)();

        return Ember.HTMLBars.template(template);
      };

      this.run = Ember.run;
      this.all = Ember.RSVP.all;

      this.visit = visit;
      this.createApplication = createApplication;
      this.register = register;
      this.template = registerTemplate;
      this.component = registerComponent;
      this.controller = registerController;
      this.route = registerRoute;
      this.service = registerService;
      this.routes = registerRoutes;
      this.registry = {};
      this.renderToHTML = renderToHTML;
    },

    afterEach: function() {
      this.run(this.app, 'destroy');

      delete global.Ember;

      // clear the previously cached version of this module
      delete require.cache[emberPath + '.js'];
      delete require.cache[templateCompilerPath + '.js'];
    }
  });
};

module.exports.canRunTests = canRunTests;

function createApplication() {
  if (this.app) return this.app;

  var app = this.Ember.Application.extend().create({
    autoboot: false
  });

  app.Router = this.Ember.Router.extend({
    location: 'none'
  });

  if (this.routesCallback) {
    app.Router.map(this.routesCallback);
  }

  registerApplicationClasses(app, this.registry);

  // Run application initializers
  this.run(app, 'boot');

  this.app = app;

  return app;
}

function register(containerKey, klass) {
  this.registry[containerKey] = klass;
}

function visit(url) {
  var app = this.createApplication();
  var dom = new SimpleDOM.Document();

  return this.run(app, 'visit', url, {
    isBrowser: false,
    document: dom,
    rootElement: dom.body
  });
}

function renderToHTML(url) {
  var app = this.createApplication();
  var dom = new SimpleDOM.Document();
  var root = dom.body;

  return this.run(app, 'visit', url, {
    isBrowser: false,
    document: dom,
    rootElement: root
  }).then(function() {
    var element = root;
    var serializer = new SimpleDOM.HTMLSerializer(SimpleDOM.voidMap);
    var serialized = serializer.serialize(root);

    return serialized;
  });
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

function registerRoute(name, routeProps) {
  var route = this.Ember.Route.extend(routeProps);
  this.register('route:'+name, route);
}

function registerService(name, serviceProps) {
  var service = this.Ember.Object.extend(serviceProps);
  this.register('service:'+name, service);
}

function registerRoutes(cb) {
  this.routesCallback = cb;
}
