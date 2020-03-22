/* eslint-disable no-console */

const path = require('path');
const distPath = path.join(__dirname, '../../../dist');
const emberPath = path.join(distPath, 'tests/ember');
const templateCompilerPath = path.join(distPath, 'ember-template-compiler');
const SimpleDOM = require('simple-dom');

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

module.exports = function(hooks) {
  hooks.beforeEach(function() {
    let Ember = (this.Ember = require(emberPath));

    Ember.testing = true;

    let precompile = require(templateCompilerPath).precompile;
    this.compile = function(templateString, options) {
      let templateSpec = precompile(templateString, options);
      let template = new Function('return ' + templateSpec)();

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
  });

  hooks.afterEach(function() {
    this.run(this.app, 'destroy');

    delete global.Ember;

    // clear the previously cached version of this module
    delete require.cache[emberPath + '.js'];
    delete require.cache[templateCompilerPath + '.js'];
  });
};

function createApplication() {
  if (this.app) return this.app;

  let app = this.Ember.Application.extend().create({
    autoboot: false,
  });

  app.Router = this.Ember.Router.extend({
    location: 'none',
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
  let app = this.createApplication();
  let dom = new SimpleDOM.Document();

  return this.run(app, 'visit', url, {
    isBrowser: false,
    document: dom,
    rootElement: dom.body,
  }).catch(function(error) {
    console.error(error.stack);
  });
}

function renderToHTML(url) {
  let app = this.createApplication();
  let dom = new SimpleDOM.Document();
  let root = dom.body;

  return this.run(app, 'visit', url, {
    isBrowser: false,
    document: dom,
    rootElement: root,
  }).then(function() {
    let serializer = new SimpleDOM.HTMLSerializer(SimpleDOM.voidMap);
    return serializer.serialize(root);
  });
}

function registerApplicationClasses(app, registry) {
  app.initializer({
    name: 'register-application-classes',
    initialize: function(app) {
      for (let key in registry) {
        app.register(key, registry[key]);
      }
    },
  });
}

function registerTemplate(name, template) {
  this.register('template:' + name, this.compile(template));
}

function registerComponent(name, componentProps) {
  let component = this.Ember.Component.extend(componentProps);
  this.register('component:' + name, component);
}

function registerController(name, controllerProps) {
  let controller = this.Ember.Controller.extend(controllerProps);
  this.register('controller:' + name, controller);
}

function registerRoute(name, routeProps) {
  let route = this.Ember.Route.extend(routeProps);
  this.register('route:' + name, route);
}

function registerService(name, serviceProps) {
  let service = this.Ember.Object.extend(serviceProps);
  this.register('service:' + name, service);
}

function registerRoutes(cb) {
  this.routesCallback = cb;
}
