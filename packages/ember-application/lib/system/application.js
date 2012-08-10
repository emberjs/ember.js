// ==========================================================================
// Project:   Ember - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

var get = Ember.get, set = Ember.set;

/**
  @class

  An Ember.Application instance serves as the namespace in which you define your
  application's classes. You can also override the configuration of your
  application.

  By default, Ember.Application will begin listening for events on the document.
  If your application is embedded inside a page, instead of controlling the
  entire document, you can specify which DOM element to attach to by setting
  the `rootElement` property to a CSS selector.

      MyApp = Ember.Application.create({
        rootElement: '#my-app'
      });

  The root of an Ember.Application must not be removed during the course of the
  page's lifetime. If you have only a single conceptual application for the
  entire page, and are not embedding any third-party Ember applications
  in your page, use the default document root for your application.

  You only need to specify the root if your page contains multiple instances
  of Ember.Application.

  @extends Ember.Object
*/
Ember.Application = Ember.Namespace.extend(
/** @scope Ember.Application.prototype */{

  /**
    The root DOM element of the Application.

    Can be specified as DOMElement or a selector string.

    @type DOMElement
    @default 'body'
  */
  rootElement: 'body',

  /**
    @type Ember.EventDispatcher
    @default null
  */
  eventDispatcher: null,

  /**
    @type Object
    @default null
  */
  customEvents: null,

  /** @private */
  init: function() {
    var eventDispatcher,
        rootElement = get(this, 'rootElement');
    this._super();

    eventDispatcher = Ember.EventDispatcher.create({
      rootElement: rootElement
    });

    set(this, 'eventDispatcher', eventDispatcher);

    // jQuery 1.7 doesn't call the ready callback if already ready
    if (Ember.$.isReady) {
      Ember.run.once(this, this.didBecomeReady);
    } else {
      var self = this;
      Ember.$(document).ready(function() {
        Ember.run.once(self, self.didBecomeReady);
      });
    }
  },

  /**
    Instantiate all controllers currently available on the namespace
    and inject them onto a router.

    Example:

        App.PostsController = Ember.ArrayController.extend();
        App.CommentsController = Ember.ArrayController.extend();

        var router = Ember.Router.create({
          ...
        });

        App.initialize(router);

        router.get('postsController')     // <App.PostsController:ember1234>
        router.get('commentsController')  // <App.CommentsController:ember1235>

        router.get('postsController.router') // router
  */
  initialize: function(router) {
    var properties = Ember.A(Ember.keys(this)),
        injections = get(this.constructor, 'injections'),
        namespace = this, controller, name;

    if (!router && Ember.Router.detect(namespace['Router'])) {
      router = namespace['Router'].create();
      this._createdRouter = router;
    }

    if (router) {
      set(this, 'router', router);

      // By default, the router's namespace is the current application.
      //
      // This allows it to find model classes when a state has a
      // route like `/posts/:post_id`. In that case, it would first
      // convert `post_id` into `Post`, and then look it up on its
      // namespace.
      set(router, 'namespace', this);
    }

    Ember.runLoadHooks('application', this);

    injections.forEach(function(injection) {
      properties.forEach(function(property) {
        injection[1](namespace, router, property);
      });
    });

    if (router && router instanceof Ember.Router) {
      this.startRouting(router);
    }
  },

  /** @private */
  didBecomeReady: function() {
    var eventDispatcher = get(this, 'eventDispatcher'),
        customEvents    = get(this, 'customEvents');

    eventDispatcher.setup(customEvents);

    this.ready();
  },

  /**
    @private

    If the application has a router, use it to route to the current URL, and
    trigger a new call to `route` whenever the URL changes.
  */
  startRouting: function(router) {
    var location = get(router, 'location'),
        rootElement = get(this, 'rootElement'),
        applicationController = get(router, 'applicationController');

    Ember.assert("ApplicationView and ApplicationController must be defined on your application", (this.ApplicationView && applicationController) );

    var applicationView = this.ApplicationView.create({
      controller: applicationController
    });
    this._createdApplicationView = applicationView;

    applicationView.appendTo(rootElement);

    router.route(location.getURL());
    location.onUpdateURL(function(url) {
      router.route(url);
    });
  },

  /**
    Called when the Application has become ready.
    The call will be delayed until the DOM has become ready.
  */
  ready: Ember.K,

  /** @private */
  willDestroy: function() {
    get(this, 'eventDispatcher').destroy();
    if (this._createdRouter)          { this._createdRouter.destroy(); }
    if (this._createdApplicationView) { this._createdApplicationView.destroy(); }
  },

  registerInjection: function(options) {
    this.constructor.registerInjection(options);
  }
});

Ember.Application.reopenClass({
  concatenatedProperties: ['injections'],
  injections: Ember.A(),
  registerInjection: function(options) {
    var injections = get(this, 'injections'),
        before = options.before,
        name = options.name,
        injection = options.injection,
        location;

    if (before) {
      location = injections.find(function(item) {
        if (item[0] === before) { return true; }
      });
      location = injections.indexOf(location);
    } else {
      location = get(injections, 'length');
    }

    injections.splice(location, 0, [name, injection]);
  }
});

Ember.Application.registerInjection({
  name: 'controllers',
  injection: function(app, router, property) {
    if (!/^[A-Z].*Controller$/.test(property)) { return; }

    var name = property.charAt(0).toLowerCase() + property.substr(1),
        controller = app[property].create();

    router.set(name, controller);

    controller.setProperties({
      target: router,
      controllers: router,
      namespace: app
    });
  }
});
