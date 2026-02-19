/**
 * ESM port of tests/node/helpers/setup-app.js
 *
 * Sets up a test context with Ember app creation, routing, template registration,
 * and renderToHTML support for server-side rendering tests.
 */
import SimpleDOM from 'simple-dom';
import Application from 'ember-source/@ember/application/index.js';
import Component from 'ember-source/@ember/component/index.js';
import { setComponentTemplate } from 'ember-source/@ember/component/index.js';
import templateOnly from 'ember-source/@ember/component/template-only.js';
import Controller from 'ember-source/@ember/controller/index.js';
import EmberObject from 'ember-source/@ember/object/index.js';
import Route from 'ember-source/@ember/routing/route.js';
import EmberRouter from 'ember-source/@ember/routing/router.js';
import { service } from 'ember-source/@ember/service/index.js';
import { run } from 'ember-source/@ember/runloop/index.js';
import RSVP from 'ember-source/@ember/-internals/runtime/lib/ext/rsvp.js';
import { setTesting } from 'ember-source/@ember/debug/lib/testing.js';
import { precompile } from 'ember-source/ember-template-compiler/index.js';
import { createTemplateFactory } from 'ember-source/@ember/template-factory/index.js';

function compile(templateString, options) {
  let templateSpec = precompile(templateString, options);
  return createTemplateFactory(JSON.parse(templateSpec));
}

export async function createAppContext() {
  setTesting(true);

  const ctx = {
    compile,
    setComponentTemplate,
    templateOnlyComponent: templateOnly,
    run,
    all: RSVP.all.bind(RSVP),
    registry: {},
    routesCallback: null,
    app: null,
  };

  ctx.register = function (containerKey, klass) {
    ctx.registry[containerKey] = klass;
  };

  ctx.template = function (name, templateContents) {
    ctx.register('template:' + name, ctx.compile(templateContents));
  };

  ctx.component = function (name, componentProps, templateContents) {
    let component = ctx.setComponentTemplate(
      ctx.compile(templateContents),
      componentProps
        ? Component.extend(componentProps)
        : ctx.templateOnlyComponent()
    );
    ctx.register('component:' + name, component);
  };

  ctx.controller = function (name, controllerProps) {
    let controller = Controller.extend(controllerProps);
    ctx.register('controller:' + name, controller);
  };

  ctx.route = function (name, routeProps) {
    let route = Route.extend({
      router: service('router'),
      ...routeProps,
    });
    ctx.register('route:' + name, route);
  };

  ctx.service = function (name, serviceProps) {
    let service = EmberObject.extend(serviceProps);
    ctx.register('service:' + name, service);
  };

  ctx.routes = function (cb) {
    ctx.routesCallback = cb;
  };

  ctx.createApplication = function () {
    if (ctx.app) return ctx.app;

    let app = class extends Application {}.create({
      autoboot: false,
      Resolver: {
        create: () => {
          return null;
        },
      },
    });

    let Router = class extends EmberRouter {
      location = 'none';
    };

    if (ctx.routesCallback) {
      Router.map(ctx.routesCallback);
    }

    ctx.register('router:main', Router);

    // Register application classes via initializer
    app.initializer({
      name: 'register-application-classes',
      initialize: function (application) {
        for (let key in ctx.registry) {
          application.register(key, ctx.registry[key]);
        }
      },
    });

    run(app, 'boot');
    ctx.app = app;

    return app;
  };

  ctx.visit = function (url) {
    let app = ctx.createApplication();
    let dom = new SimpleDOM.Document();

    return run(app, 'visit', url, {
      isBrowser: false,
      document: dom,
      rootElement: dom.body,
    }).catch(function (error) {
      console.error(error.stack);
    });
  };

  ctx.renderToHTML = function (url) {
    let app = ctx.createApplication();
    let dom = new SimpleDOM.Document();
    let root = dom.body;

    return run(app, 'visit', url, {
      isBrowser: false,
      document: dom,
      rootElement: root,
    }).then(function () {
      let serializer = new SimpleDOM.HTMLSerializer(SimpleDOM.voidMap);
      return serializer.serialize(root);
    });
  };

  ctx.destroy = function () {
    if (ctx.app) {
      run(ctx.app, 'destroy');
    }
    setTesting(false);
  };

  return ctx;
}
