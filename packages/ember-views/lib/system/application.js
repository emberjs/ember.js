// ==========================================================================
// Project:   Ember - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

require("ember-views/system/event_dispatcher");

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

  isApplication: true,

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
    this._super();

    var eventDispatcher,
        rootElement = get(this, 'rootElement');

    eventDispatcher = Ember.EventDispatcher.create({
      rootElement: rootElement
    });

    set(this, 'eventDispatcher', eventDispatcher);

    if (!get(Ember, 'defaultApplication') || get(this, 'isDefaultApplication')) {
      set(Ember, 'defaultApplication', this);
    }

    // jQuery 1.7 doesn't call the ready callback if already ready
    if (Ember.$.isReady) {
      this.didBecomeReady();
    } else {
      var self = this;
      Ember.$(document).ready(function() {
        self.didBecomeReady();
      });
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
    Called when the Application has become ready.
    The call will be delayed until the DOM has become ready.
  */
  ready: Ember.K,

  /** @private */
  destroy: function() {
    get(this, 'eventDispatcher').destroy();
    if (get(Ember, 'defaultApplication') === this) {
      var applications = Ember.Namespace.NAMESPACES;
      var nextApp;
      // get next Ember.Application which is not this one
      for (var i=0, len = applications.length; i < len && !nextApp; i++) {
        var app = applications[i];
        if (app.isApplication && app !== this) { nextApp = app; }
      }
      set(Ember, 'defaultApplication', nextApp);
    }
    return this._super();
  }
});
