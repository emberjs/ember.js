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
  the `rootElement` property:

      MyApp = Ember.Application.create({
        rootElement: $('#my-app')
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
    and inject them onto a state manager.

    Example:

        App.PostsController = Ember.ArrayController.extend();
        App.CommentsController = Ember.ArrayController.extend();

        var router = Ember.Router.create({
          ...
        });

        App.initialize(router);

        router.get('postsController')     // <App.PostsController:ember1234>
        router.get('commentsController')  // <App.CommentsController:ember1235>

        router.getPath('postsController.router') // router
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
      set(this, 'stateManager', router);
    }

    // By default, the router's namespace is the current application.
    //
    // This allows it to find model classes when a state has a
    // route like `/posts/:post_id`. In that case, it would first
    // convert `post_id` into `Post`, and then look it up on its
    // namespace.
    set(router, 'namespace', this);

    Ember.runLoadHooks('application', this);

    properties.forEach(function(property) {
      injections.forEach(function(injection) {
        injection(namespace, router, property);
      });
    });
  },

  /** @private */
  didBecomeReady: function() {
    var eventDispatcher = get(this, 'eventDispatcher'),
        stateManager    = get(this, 'stateManager'),
        customEvents    = get(this, 'customEvents');

    eventDispatcher.setup(customEvents);

    this.ready();

    if (stateManager && stateManager instanceof Ember.Router) {
      this.setupStateManager(stateManager);
    }
  },

  /**
    @private

    If the application has a state manager, use it to route
    to the current URL, and trigger a new call to `route`
    whenever the URL changes.
  */
  setupStateManager: function(stateManager) {
    var location = get(stateManager, 'location'),
        rootElement = get(this, 'rootElement'),
        applicationController = get(stateManager, 'applicationController');

    if (typeof location === 'string') {
      location = Ember.Location.create({implementation: location});
      set(stateManager, 'location', location);
      this._createdLocation = location;
    }

    if (this.ApplicationView && applicationController) {
      var applicationView = this.ApplicationView.create({
        controller: applicationController
      });
      this._createdApplicationView = applicationView;

      applicationView.appendTo(rootElement);
    }

    stateManager.route(location.getURL());
    location.onUpdateURL(function(url) {
      stateManager.transitionTo('root');
      stateManager.route(url);
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
    if (this._createdLocation)        { this._createdLocation.destroy(); }
    if (this._createdApplicationView) { this._createdApplicationView.destroy(); }
  },

  registerInjection: function(callback) {
    this.constructor.registerInjection(callback);
  }
});

Ember.Application.reopenClass({
  concatenatedProperties: ['injections'],
  injections: Ember.A(),
  registerInjection: function(callback) {
    get(this, 'injections').pushObject(callback);
  }
});

Ember.Application.registerInjection(function(app, router, property) {
  if (!/^[A-Z].*Controller$/.test(property)) { return; }

  var name = property[0].toLowerCase() + property.substr(1),
      controller = app[property].create();

  router.set(name, controller);

  controller.set('target', router);
  controller.set('controllers', router);
});
