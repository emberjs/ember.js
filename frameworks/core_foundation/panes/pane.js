// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

sc_require('views/view');
sc_require('views/view/acceleration');
sc_require('views/view/cursor');
sc_require('views/view/enabled');
sc_require('views/view/keyboard');
sc_require('views/view/layout');
sc_require('views/view/manipulation');
sc_require('views/view/theming');
sc_require('views/view/touch');
sc_require('views/view/visibility');
sc_require('mixins/responder_context');


/**
  Indicates a value has a mixed state of both on and off.

  @type String
*/
SC.MIXED_STATE = '__MIXED__' ;

/** @class
  A Pane is like a regular view except that it does not need to live within a
  parent view.  You usually use a Pane to form the root of a view hierarchy in
  your application, such as your main application view or for floating
  palettes, popups, menus, etc.

  Usually you will not work directly with the SC.Pane class, but with one of
  its subclasses such as SC.MainPane, SC.Panel, or SC.PopupPane.

  ## Showing a Pane

  To make a pane visible, you need to add it to your HTML document.  The
  simplest way to do this is to call the append() method:

      myPane = SC.Pane.create();
      myPane.append(); // adds the pane to the document

  This will insert your pane into the end of your HTML document body, causing
  it to display on screen.  It will also register your pane with the
  SC.RootResponder for the document so you can start to receive keyboard,
  mouse, and touch events.

  If you need more specific control for where you pane appears in the
  document, you can use several other insertion methods such as appendTo(),
  prependTo(), before() and after().  These methods all take a an element to
  indicate where in your HTML document you would like you pane to be inserted.

  Once a pane is inserted into the document, it will be sized and positioned
  according to the layout you have specified.  It will then automatically
  resize with the window if needed, relaying resize notifications to children
  as well.

  ## Hiding a Pane

  When you are finished with a pane, you can hide the pane by calling the
  remove() method.  This method will actually remove the Pane from the
  document body, as well as deregistering it from the RootResponder so that it
  no longer receives events.

  The isVisibleInWindow method will also change to NO for the Pane and all of
  its childViews and the views will no longer have their updateDisplay methods
  called.

  You can readd a pane to the document again any time in the future by using
  any of the insertion methods defined in the previous section.

  ## Receiving Events

  Your pane and its child views will automatically receive any mouse or touch
  events as long as it is on the screen.  To receive keyboard events, however,
  you must focus the keyboard on your pane by calling makeKeyPane() on the
  pane itself.  This will cause the RootResponder to route keyboard events to
  your pane.  The pane, in turn, will route those events to its current
  keyView, if there is any.

  Note that all SC.Views (anything that implements SC.ClassicResponder,
  really) will be notified when it is about or gain or lose keyboard focus.
  These notifications are sent both when the view is made keyView of a
  particular pane and when the pane is made keyPane for the entire
  application.

  You can prevent your Pane from becoming key by setting the acceptsKeyPane
  to NO on the pane.  This is useful when creating palettes and other popups
  that should not steal keyboard control from another view.

  @extends SC.View
  @extends SC.ResponderContext
  @since SproutCore 1.0
*/
SC.Pane = SC.View.extend(SC.ResponderContext,
/** @scope SC.Pane.prototype */ {

  /**
    Returns YES for easy detection of when you reached the pane.
    @type Boolean
  */
  isPane: YES,

  /**
    Set to the current page when the pane is instantiated from a page object.
    @property {SC.Page}
  */
  page: null,

  // .......................................................
  // ROOT RESPONDER SUPPORT
  //

  /**
    The rootResponder for this pane.  Whenever you add a pane to a document,
    this property will be set to the rootResponder that is now forwarding
    events to the pane.

    @property {SC.Responder}
  */
  rootResponder: null,

  /**
    Attempts to send the event down the responder chain for this pane.  If you
    pass a target, this method will begin with the target and work up the
    responder chain.  Otherwise, it will begin with the current rr
    and walk up the chain looking for any responder that implements a handler
    for the passed method and returns YES when executed.

    @param {String} action
    @param {SC.Event} evt
    @param {Object} target
    @returns {Object} object that handled the event
  */
  sendEvent: function(action, evt, target) {
    var handler;

    // walk up the responder chain looking for a method to handle the event
    if (!target) target = this.get('firstResponder') ;
    while(target) {
      if (action === 'touchStart') {
        // first, we must check that the target is not already touch responder
        // if it is, we don't want to have "found" it; that kind of recursion is sure to
        // cause really severe, and even worse, really odd bugs.
        if (evt.touchResponder === target) {
          target = null;
          break;
        }

        // now, only pass along if the target does not already have any touches, or is
        // capable of accepting multitouch.
        if (!target.get("hasTouch") || target.get("acceptsMultitouch")) {
          if (target.tryToPerform("touchStart", evt)) break;
        }
      } else if (action === 'touchEnd' && !target.get("acceptsMultitouch")) {
        if (!target.get("hasTouch")) {
          if (target.tryToPerform("touchEnd", evt)) break;
        }
      } else {
        if (target.tryToPerform(action, evt)) break;
      }

      // even if someone tries to fill in the nextResponder on the pane, stop
      // searching when we hit the pane.
      target = (target === this) ? null : target.get('nextResponder') ;
    }

    // if no handler was found in the responder chain, try the default
    if (!target && (target = this.get('defaultResponder'))) {
      if (typeof target === SC.T_STRING) {
        target = SC.objectForPropertyPath(target);
      }

      if (!target) target = null;
      else target = target.tryToPerform(action, evt) ? target : null ;
    }

    // if we don't have a default responder or no responders in the responder
    // chain handled the event, see if the pane itself implements the event
    else if (!target && !(target = this.get('defaultResponder'))) {
      target = this.tryToPerform(action, evt) ? this : null ;
    }

    return (evt && evt.mouseHandler) || target;
  },

  // .......................................................
  // RESPONDER CONTEXT
  //

  /**
    Pane's never have a next responder.

    @property {SC.Responder}
    @readOnly
  */
  nextResponder: function() {
    return null;
  }.property().cacheable(),

  /**
    The first responder.  This is the first view that should receive action
    events.  Whenever you click on a view, it will usually become
    firstResponder.

    @property {SC.Responder}
  */
  firstResponder: null,

  /**
    If YES, this pane can become the key pane.  You may want to set this to NO
    for certain types of panes.  For example, a palette may never want to
    become key.  The default value is YES.

    @type Boolean
  */
  acceptsKeyPane: YES,

  /**
    This is set to YES when your pane is currently the target of key events.

    @type Boolean
  */
  isKeyPane: NO,

  /**
    Make the pane receive key events.  Until you call this method, the
    keyView set for this pane will not receive key events.

    @returns {SC.Pane} receiver
  */
  becomeKeyPane: function() {
    if (this.get('isKeyPane')) return this ;
    if (this.rootResponder) this.rootResponder.makeKeyPane(this) ;

    return this ;
  },

  /**
    Remove the pane view status from the pane.  This will simply set the
    keyPane on the rootResponder to null.

    @returns {SC.Pane} receiver
  */
  resignKeyPane: function() {
    if (!this.get('isKeyPane')) return this ;
    if (this.rootResponder) this.rootResponder.makeKeyPane(null);

    return this ;
  },

  /**
    Makes the passed view (or any object that implements SC.Responder) into
    the new firstResponder for this pane.  This will cause the current first
    responder to lose its responder status and possibly keyResponder status as
    well.

    @param {SC.View} view
    @param {Event} evt that cause this to become first responder
    @returns {SC.Pane} receiver
  */
  makeFirstResponder: function(original, view, evt) {
    // firstResponder should never be null
    if(!view) view = this;

    var current = this.get('firstResponder'),
      isKeyPane = this.get('isKeyPane');

    if (current === view) return this ; // nothing to do
    if (SC.platform.touch && view && view.kindOf(SC.TextFieldView) && !view.get('focused')) return this;

    // if we are currently key pane, then notify key views of change also
    if (isKeyPane) {
      if (current) { current.tryToPerform('willLoseKeyResponderTo', view); }
      if (view) {
        view.tryToPerform('willBecomeKeyResponderFrom', current);
      }
    }

    if (current) {
      current.beginPropertyChanges();
      current.set('isKeyResponder', NO);
    }

    if (view) {
      view.beginPropertyChanges();
      view.set('isKeyResponder', isKeyPane);
    }

    original(view, evt);

    if(current) current.endPropertyChanges();
    if(view) view.endPropertyChanges();

    // and notify again if needed.
    if (isKeyPane) {
      if (view) {
        view.tryToPerform('didBecomeKeyResponderFrom', current);
      }
      if (current) {
        current.tryToPerform('didLoseKeyResponderTo', view);
      }
    }

    return this ;
  }.enhance(),

  /**
    Called just before the pane loses it's keyPane status.  This will notify
    the current keyView, if there is one, that it is about to lose focus,
    giving it one last opportunity to save its state.

    @param {SC.Pane} pane
    @returns {SC.Pane} receiver
  */
  willLoseKeyPaneTo: function(pane) {
    this._forwardKeyChange(this.get('isKeyPane'), 'willLoseKeyResponderTo', pane, NO);
    return this ;
  },

  /**
    Called just before the pane becomes keyPane.  Notifies the current keyView
    that it is about to gain focus.  The keyView can use this opportunity to
    prepare itself, possibly stealing any value it might need to steal from
    the current key view.

    @param {SC.Pane} pane
    @returns {SC.Pane} receiver
  */
  willBecomeKeyPaneFrom: function(pane) {
    this._forwardKeyChange(!this.get('isKeyPane'), 'willBecomeKeyResponderFrom', pane, YES);
    return this ;
  },


  didBecomeKeyResponderFrom: function(responder) {},

  /**
    Called just after the pane has lost its keyPane status.  Notifies the
    current keyView of the change.  The keyView can use this method to do any
    final cleanup and changes its own display value if needed.

    @param {SC.Pane} pane
    @returns {SC.Pane} receiver
  */
  didLoseKeyPaneTo: function(pane) {
    var isKeyPane = this.get('isKeyPane');
    this.set('isKeyPane', NO);
    this._forwardKeyChange(isKeyPane, 'didLoseKeyResponderTo', pane);
    return this ;
  },

  /**
    Called just after the keyPane focus has changed to the receiver.  Notifies
    the keyView of its new status.  The keyView should use this method to
    update its display and actually set focus on itself at the browser level
    if needed.

    @param {SC.Pane} pane
    @returns {SC.Pane} receiver

  */
  didBecomeKeyPaneFrom: function(pane) {
    var isKeyPane = this.get('isKeyPane');
    this.set('isKeyPane', YES);
    this._forwardKeyChange(!isKeyPane, 'didBecomeKeyResponderFrom', pane, YES);
    return this ;
  },

  // .......................................................
  // MAIN PANE SUPPORT
  //

  /**
    Returns YES whenever the pane has been set as the main pane for the
    application.

    @type Boolean
  */
  isMainPane: NO,

  /**
    Invoked when the pane is about to become the focused pane.  Override to
    implement your own custom handling.

    @param {SC.Pane} pane the pane that currently have focus
    @returns {void}
  */
  focusFrom: function(pane) {},

  /**
    Invoked when the the pane is about to lose its focused pane status.
    Override to implement your own custom handling

    @param {SC.Pane} pane the pane that will receive focus next
    @returns {void}
  */
  blurTo: function(pane) {},

  /**
    Invoked when the view is about to lose its mainPane status.  The default
    implementation will also remove the pane from the document since you can't
    have more than one mainPane in the document at a time.

    @param {SC.Pane} pane
    @returns {void}
  */
  blurMainTo: function(pane) {
    this.set('isMainPane', NO) ;
  },

  /**
    Invokes when the view is about to become the new mainPane.  The default
    implementation simply updates the isMainPane property.  In your subclass,
    you should make sure your pane has been added to the document before
    trying to make it the mainPane.  See SC.MainPane for more information.

    @param {SC.Pane} pane
    @returns {void}
  */
  focusMainFrom: function(pane) {
    this.set('isMainPane', YES);
  },

  // .......................................................
  // ADDING/REMOVE PANES TO SCREEN
  //

  /**
    Inserts the pane at the end of the document.  This will also add the pane
    to the rootResponder.

    @param {SC.RootResponder} rootResponder
    @returns {SC.Pane} receiver
  */
  append: function() {
    return this.appendTo(document.body) ;
  },

  /**
    Removes the pane from the document.

    This will *not* destroy the pane's layer or destroy the pane itself.

    @returns {SC.Pane} receiver
  */
  remove: function() {
    this._doDetach();

    return this ;
  },

  /**
    Inserts the current pane into the page. The actual DOM insertion is done
    by a function passed into `insert`, which receives the layer as a
    parameter. This function is responsible for making sure a layer exists,
    is not already attached, and for calling `paneDidAttach` when done.

        pane = SC.Pane.create();
        pane.insert(function(layer) {
          jQuery(layer).insertBefore("#otherElement");
        });

    @param {Function} fn function which performs the actual DOM manipulation
      necessary in order to insert the pane's layer into the DOM.
    @returns {SC.Pane} receiver
   */
  insert: function(fn) {
    // Render the layer.
    this.createLayer();

    // Pass the layer to the callback (TODO: why?)
    var layer = this.get('layer');
    fn(layer);

    return this;
  },

  /**
    Inserts the pane into the DOM.

    @param {DOMElement|jQuery|String} elem the element to append the pane's layer to.
      This is passed to `jQuery()`, so any value supported by `jQuery()` will work.
    @returns {SC.Pane} receiver
  */
  appendTo: function(elem) {
    var self = this;

    return this.insert(function () {
      self._doAttach(jQuery(elem)[0]);
    });
  },

  /**
    This has been deprecated and may cause issues when used.  Please use
    didAppendToDocument instead, which is not defined by SC.Pane (i.e. you
    don't need to call sc_super when implementing didAppendToDocument in direct
    subclasses of SC.Pane).

    @deprecated Version 1.10
  */
  paneDidAttach: function() {
    // Does nothing.  Left here so that subclasses that implement the method
    // and call sc_super() won't fail.
  },

  /**
    This method is called after the pane is attached and before child views
    are notified that they were appended to the document. Override this
    method to recompute properties that depend on the pane's existence
    in the document but must be run prior to child view notification.
   */
  recomputeDependentProperties: function() {},

  /**
    YES when the pane is currently attached to a document DOM.  Read only.

    @type Boolean
    @readOnly
  */
  isPaneAttached: NO,

  /**
    If YES, a touch intercept pane will be added above this pane when on
    touch platforms.
  */
  wantsTouchIntercept: NO,

  /**
    Returns YES if wantsTouchIntercept and this is a touch platform.
  */
  hasTouchIntercept: function(){
    return this.get('wantsTouchIntercept') && SC.platform.touch;
  }.property('wantsTouchIntercept').cacheable(),

  /**
    The Z-Index of the pane. Currently, you have to match this in CSS.
    TODO: ALLOW THIS TO AUTOMATICALLY SET THE Z-INDEX OF THE PANE (as an option).
  */
  zIndex: 0,

  /**
    The amount over the pane's z-index that the touch intercept should be.
  */
  touchZ: 99,

  /** @private */
  _addIntercept: function() {
    if (this.get('hasTouchIntercept')) {
      var div = document.createElement("div");
      var divStyle = div.style;
      divStyle.position = "absolute";
      divStyle.left = "0px";
      divStyle.top = "0px";
      divStyle.right = "0px";
      divStyle.bottom = "0px";
      divStyle.webkitTransform = "translateZ(0px)";
      divStyle.zIndex = this.get("zIndex") + this.get("touchZ");
      div.className = "touch-intercept";
      div.id = "touch-intercept-" + SC.guidFor(this);
      this._touchIntercept = div;
      document.body.appendChild(div);
    }
  },

  /** @private */
  _removeIntercept: function() {
    if (this._touchIntercept) {
      document.body.removeChild(this._touchIntercept);
      this._touchIntercept = null;
    }
  },

  /** @private */
  hideTouchIntercept: function() {
    if (this._touchIntercept) this._touchIntercept.style.display = "none";
  },

  /** @private */
  showTouchIntercept: function() {
    if (this._touchIntercept) this._touchIntercept.style.display = "block";
  },

  /** @private */
  // updateLayerLocation: function () {
  //   if(this.get('designer') && SC.suppressMain) return sc_super();
  //   // note: the normal code here to update node location is removed
  //   // because we don't need it for panes.
  //   return this;
  // },

  /** @private */
  init: function() {
    // Backwards compatibility
    // TODO: REMOVE THIS
    if (this.hasTouchIntercept === YES) {
      SC.Logger.warn("Do not set hasTouchIntercept directly. Use wantsTouchIntercept instead.");
      this.hasTouchIntercept = SC.platform.touch;
    }

    // if a layer was set manually then we will just attach to existing
    // HTML.
    var hasLayer = !!this.get('layer') ;
    sc_super() ;
    if (hasLayer) {
      this._attached();
    }
  },

  /** @private */
  classNames: ['sc-pane']

}) ;
