// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/** @class

  Provides common methods for sending events down a responder chain.
  Responder chains are used most often to deliver events to user interface
  elements in your application, but you can also use them to deliver generic
  events to any part of your application, including controllers.

  @extends SC.Object
  @since SproutCore 1.0
*/
SC.Responder = SC.Object.extend( /** @scope SC.Responder.prototype */ {

  isResponder: YES,

  /** @property
    The pane this responder belongs to.  This is used to determine where you
    belong to in the responder chain.  Normally you should leave this property
    set to null.
  */
  pane: null,

  /** @property
    The app this responder belongs to.  For non-user-interface responder
    chains, this is used to determine the context.  Usually this
    is the property you will want to work with.
  */
  responderContext: null,

  /** @property
    This is the nextResponder in the responder chain.  If the receiver does
    not implement a particular event handler, it will bubble to the next
    responder.

    This can point to an object directly or it can be a string, in which case
    the path will be resolved from the responderContext root.
  */
  nextResponder: null,

  /** @property
    YES if the view is currently first responder.  This property is always
    edited by the pane during its makeFirstResponder() method.
  */
  isFirstResponder: NO,

  /** @property

    YES the responder is somewhere in the responder chain.  This currently
    only works when used with a ResponderContext.

    @type {Boolean}
  */
  hasFirstResponder: NO,

  /** @property
    Set to YES if your view is willing to accept first responder status.  This is used when calculating key responder loop.
  */
  acceptsFirstResponder: YES,

  becomingFirstResponder: NO,

  /**
    Call this method on your view or responder to make it become first
    responder.

    @returns {SC.Responder} receiver
  */
  becomeFirstResponder: function () {
    var pane = this.get('pane') || this.get('responderContext') ||
              this.pane();
    if (pane && this.get('acceptsFirstResponder')) {
      if (pane.get('firstResponder') !== this) pane.makeFirstResponder(this);
    }
    return this;
  },

  /**
    Call this method on your view or responder to resign your first responder
    status. Normally this is not necessary since you will lose first responder
    status automatically when another view becomes first responder.

    @param {Event} the original event that caused this method to be called
    @returns {SC.Responder} receiver
  */
  resignFirstResponder: function (evt) {
    var pane = this.get('pane') || this.get('responderContext');
    if (pane && (pane.get('firstResponder') === this)) {
      pane.makeFirstResponder(null, evt);
    }
    return YES;
  },

  /**
    Called just before the responder or any of its subresponder's are about to
    lose their first responder status.  The passed responder is the responder
    that is about to lose its status.

    Override this method to provide any standard teardown when the first
    responder changes.

    @param {SC.Responder} responder the responder that is about to change
    @returns {void}
  */
  willLoseFirstResponder: function (responder) {},

  /**
    Called just after the responder or any of its subresponder's becomes a
    first responder.

    Override this method to provide any standard setup when the first
    responder changes.

    @param {SC.Responder} responder the responder that changed
    @returns {void}
  */
  didBecomeFirstResponder: function (responder) {},

  /** SC.Object.prototype.destroy */
  destroy: function () {
    this.resignFirstResponder();

    sc_super();
  }

});
