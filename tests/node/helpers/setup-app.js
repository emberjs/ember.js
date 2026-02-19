/* eslint-disable no-console */

'use strict';

const SimpleDOM = require('simple-dom');
const { loadEmberModules } = require('./ember-esm');

/*
 * This helper sets up a QUnit test module with all of the environment and
 * helper methods necessary to test an Ember.js application running in the
 * server-side environment.
 *
 * On each test, it loads the compiled Ember.js ESM packages from `dist`,
 * just like how FastBoot works. It uses the `visit()` API to simulate a
 * FastBoot environment.
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
 *     return this.renderToHTML('/photos').then(function(html) {
 *       assert.ok(html.matches('<h1>Hello world</h1>'));
 *     });
 */
module.exports = function (hooks) {
  hooks.beforeEach(async function () {
    let m = await loadEmberModules();
    this._m = m;

    this.compile = m.compile;
    this.setComponentTemplate = m.setComponentTemplate;
    this.templateOnlyComponent = m.templateOnly;
    this.run = m.run;
    this.all = m.all;

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

  hooks.afterEach(function () {
    if (this.app) {
      this.run(this.app, 'destroy');
      this.app = null;
    }
    this._m = null;
  });
};

function createApplication() {
  if (this.app) return this.app;

  let m = this._m;

  let app = class extends m.Application {}.create({
    autoboot: false,
    Resolver: {
      create: (specifier) => {
        return this.registry[specifier];
      },
    },
  });

  let Router = class extends m.Router {
    location = 'none';
  };

  if (this.routesCallback) {
    Router.map(this.routesCallback);
  }

  this.register('router:main', Router);

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
  }).catch(function (error) {
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
  }).then(function () {
    let serializer = new SimpleDOM.HTMLSerializer(SimpleDOM.voidMap);
    return serializer.serialize(root);
  });
}

function registerApplicationClasses(app, registry) {
  app.initializer({
    name: 'register-application-classes',
    initialize: function (app) {
      for (let key in registry) {
        app.register(key, registry[key]);
      }
    },
  });
}

function registerTemplate(name, template) {
  this.register('template:' + name, this.compile(template));
}

function registerComponent(name, componentProps, templateContents) {
  let m = this._m;
  let component = m.setComponentTemplate(
    m.compile(templateContents),
    componentProps ? m.Component.extend(componentProps) : m.templateOnly()
  );
  this.register('component:' + name, component);
}

function registerController(name, controllerProps) {
  let m = this._m;
  let controller = m.Controller.extend(controllerProps);
  this.register('controller:' + name, controller);
}

function registerRoute(name, routeProps) {
  let m = this._m;
  let route = m.Route.extend({
    router: m.service('router'),
    ...routeProps,
  });
  this.register('route:' + name, route);
}

function registerService(name, serviceProps) {
  let m = this._m;
  let service = m.EmberObject.extend(serviceProps);
  this.register('service:' + name, service);
}

function registerRoutes(cb) {
  this.routesCallback = cb;
}
