/* eslint-disable no-console */

import SimpleDOM from 'simple-dom';
import Application from 'ember-source/@ember/application/index.js';
import EmberRouter from 'ember-source/@ember/routing/router.js';
import Component from 'ember-source/@ember/component/index.js';
import { setComponentTemplate } from 'ember-source/@ember/component/index.js';
import templateOnly from 'ember-source/@ember/component/template-only.js';
import Controller from 'ember-source/@ember/controller/index.js';
import Route from 'ember-source/@ember/routing/route.js';
import EmberObject from 'ember-source/@ember/object/index.js';
import { service } from 'ember-source/@ember/service/index.js';
import { run } from 'ember-source/@ember/runloop/index.js';
import RSVP from 'ember-source/@ember/-internals/runtime/lib/ext/rsvp.js';
import { precompile } from 'ember-source/ember-template-compiler/index.js';
import { createTemplateFactory } from 'ember-source/@ember/template-factory/index.js';

function compile(templateString, options) {
  let templateSpec = precompile(templateString, options);
  return createTemplateFactory(JSON.parse(templateSpec));
}

/*
 * This helper sets up a QUnit test module with all of the environment and
 * helper methods necessary to test an Ember.js application running in the
 * server-side environment.
 *
 * It uses direct ESM imports from ember-source. It uses the `visit()` API
 * to simulate a FastBoot environment.
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

export default function (hooks) {
  hooks.beforeEach(function () {
    this.compile = compile;
    this.setComponentTemplate = setComponentTemplate;
    this.templateOnlyComponent = templateOnly;

    this.run = run;
    this.all = RSVP.all.bind(RSVP);

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
    this.run(this.app, 'destroy');
  });
}

function createApplication() {
  if (this.app) return this.app;

  let app = class extends Application {}.create({
    autoboot: false,
    Resolver: {
      create: (specifier) => {
        return this.registry[specifier];
      },
    },
  });

  let Router = class extends EmberRouter {
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
  let component = this.setComponentTemplate(
    this.compile(templateContents),
    componentProps ? Component.extend(componentProps) : this.templateOnlyComponent()
  );
  this.register('component:' + name, component);
}

function registerController(name, controllerProps) {
  let controller = Controller.extend(controllerProps);
  this.register('controller:' + name, controller);
}

function registerRoute(name, routeProps) {
  let route = Route.extend({
    router: service('router'),
    ...routeProps,
  });
  this.register('route:' + name, route);
}

function registerService(name, serviceProps) {
  let svc = EmberObject.extend(serviceProps);
  this.register('service:' + name, svc);
}

function registerRoutes(cb) {
  this.routesCallback = cb;
}
