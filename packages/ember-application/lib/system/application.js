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

      var stateManager = Ember.StateManager.create({
        ...
      });

      App.initialize(stateManager);

      stateManager.get('postsController')     // <App.PostsController:ember1234>
      stateManager.get('commentsController')  // <App.CommentsController:ember1235>

      stateManager.getPath('postsController.stateManager') // stateManager
  */
  initialize: function(stateManager) {
    var properties = Ember.A(Ember.keys(this)),
        injections = get(this.constructor, 'injections'),
        namespace = this, controller, name;

    Ember.runLoadHooks('application', this);

    properties.forEach(function(property) {
      injections.forEach(function(injection) {
        injection(namespace, stateManager, property);
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

    if (stateManager) {
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
    var location = get(stateManager, 'location');

    stateManager.route(location.getURL());
    location.onUpdateURL(function(url) {
      stateManager.route(url);
    });
  },

  /**
    Called when the Application has become ready.
    The call will be delayed until the DOM has become ready.
  */
  ready: Ember.K,

  /** @private */
  destroy: function() {
    get(this, 'eventDispatcher').destroy();
    return this._super();
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

Ember.Application.registerInjection(function(app, stateManager, property) {
  if (!/^[A-Z].*Controller$/.test(property)) { return; }

  var name = property[0].toLowerCase() + property.substr(1),
      controller = app[property].create();

  stateManager.set(name, controller);
  controller.set('target', stateManager);
});
