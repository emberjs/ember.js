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

  @since Ember 2.0
  @extends Ember.Object
*/
Ember.Application = Ember.Namespace.extend(
/** @scope Ember.Application.prototype */{

  /**
    @type DOMElement
    @default document
  */
  rootElement: document,

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

    var self = this;
    Ember.$(document).ready(function() {
      self.ready();
    });

    this._super();
  },

  ready: function() {
    var eventDispatcher = get(this, 'eventDispatcher'),
        customEvents    = get(this, 'customEvents');

    eventDispatcher.setup(customEvents);
  },

  /** @private */
  destroy: function() {
    get(this, 'eventDispatcher').destroy();
    return this._super();
  }
});


