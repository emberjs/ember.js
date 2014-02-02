// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

sc_require('views/button');

/** @class

  SC.PopupButtonView displays a pop-up menu when clicked, from which the user
  can select an item.

  To use, create the SC.PopupButtonView as you would a standard SC.ButtonView,
  then set the menu property to an instance of SC.MenuPane. For example:

      SC.PopupButtonView.design({
        layout: { width: 200, height: 18 },
        menuBinding: 'MyApp.menuController.menuPane'
      });

  You would then have your MyApp.menuController return an instance of the menu
  to display.

  @extends SC.ButtonView
  @author Santosh Shanbhogue
  @author Tom Dale
  @copyright 2008-2011, Strobe Inc. and contributors.
  @version 1.0
*/
SC.PopupButtonView = SC.ButtonView.extend(
/** @scope SC.PopupButtonView.prototype */ {

  /**
    @type Array
    @default ['sc-popup-button']
    @see SC.View#classNames
  */
  classNames: ['sc-popup-button'],

  /**
    @type String
    @default 'popupButtonRenderDelegate'
  */
  renderDelegateName: 'popupButtonRenderDelegate',


  // ..........................................................
  // PROPERTIES
  //

  /**
    The prefer matrix to use when displaying the menu.

    @property
  */
  preferMatrix: null,

  /**
    The SC.MenuPane that should be displayed when the button is clicked.

    @type {SC.MenuPane}
    @default null
  */
  menu: null,

  /**
    If YES and the menu is a class, this will cause a task that will instantiate the menu
    to be added to SC.backgroundTaskQueue.

    @type Boolean
    @default NO
  */
  shouldLoadInBackground: NO,

  // ..........................................................
  // INTERNAL SUPPORT
  //

  /** @private
    If necessary, adds the loading of the menu to the background task queue.
  */
  init: function() {
    sc_super();
    this._setupMenu();
    if (this.get('shouldLoadInBackground')) {
      SC.backgroundTaskQueue.push(SC.PopupButtonMenuLoader.create({ popupButton: this }));
    }
  },

  /** @private
    Sets up binding on the menu, removing any old ones if necessary.
  */
  _setupMenu: function() {
    var menu = this.get('instantiatedMenu');

    // clear existing bindings
    if (this.isActiveBinding) this.isActiveBinding.disconnect();
    this.isActiveBinding = null;

    // if there is a menu
    if (menu && !menu.isClass) {
      this.isActiveBinding = this.bind('isActive', menu, 'isVisibleInWindow');
    }
  },

  /** @private
    Setup the bindings for menu...
  */
  _popup_menuDidChange: function() {
    this._setupMenu();
  }.observes('menu'),

  /** @private
    isActive is NO, but when the menu is instantiated, it is bound to the menu's isVisibleInWindow property.
  */
  isActive: NO,

  /** @private
    Instantiates the menu if it is not already instantiated.
  */
  _instantiateMenu: function() {
    // get menu
    var menu = this.get('menu');

    // if it is already instantiated or does not exist, we cannot do anything
    if (!menu || !menu.isClass) return;

    // create
    this.menu = menu.create();

    // setup
    this._setupMenu();
  },

  /** @private
    The guaranteed-instantiated menu.
  */
  instantiatedMenu: function() {
    // get the menu
    var menu = this.get('menu');

    // if it is a class, we need to instantiate it
    if (menu && menu.isClass) {
      // do so
      this._instantiateMenu();

      // get the new version of the local
      menu = this.get('menu');
    }

    // return
    return menu;
  }.property('menu').cacheable(),

  /** @private
    Displays the menu.

    @param {SC.Event} evt
  */
  action: function(evt) {
    var menu = this.get('instantiatedMenu') ;

    if (!menu) {
      // @if (debug)
      SC.Logger.warn("SC.PopupButton - Unable to show menu because the menu property is set to %@.".fmt(menu));
      // @endif
      return NO ;
    }

    menu.popup(this, this.get('preferMatrix')) ;
    return YES;
  },

  /** @private
    On mouse down, we set the state of the button, save some state for further
    processing, then call the button's action method.

    @param {SC.Event} evt
    @returns {Boolean}
  */
  mouseDown: function(evt) {
    // If disabled, handle mouse down but ignore it.
    if (!this.get('isEnabledInPane')) return YES ;

    this._isMouseDown = YES;

    this._action() ;

    // Store the current timestamp. We register the timestamp after a setTimeout
    // so that the menu has been rendered, in case that operation
    // takes more than a few hundred milliseconds.

    // One mouseUp, we'll use this value to determine how long the mouse was
    // pressed.

    // we need to keep track that we opened it just now in case we get the
    // mouseUp before render finishes. If it is 0, then we know we have not
    // waited long enough.
    this._menuRenderedTimestamp = 0;

    var self = this;

    // setTimeout guarantees that all rendering is done. The browser will even
    // have rendered by this point.
    setTimeout(function() {
      SC.run(function(){
        // a run loop might be overkill here but what if Date.now fails?
        self._menuRenderedTimestamp = Date.now();
      });
    }, 1);

    this.becomeFirstResponder();

    return YES ;
  },

  /** @private
    Because we responded YES to the mouseDown event, we have responsibility
    for handling the corresponding mouseUp event.

    However, the user may click on this button, then drag the mouse down to a
    menu item, and release the mouse over the menu item. We therefore need to
    delegate any mouseUp events to the menu's menu item, if one is selected.

    We also need to differentiate between a single click and a click and hold.
    If the user clicks and holds, we want to close the menu when they release.
    Otherwise, we should wait until they click on the menu's modal pane before
    removing our active state.

    @param {SC.Event} evt
    @returns {Boolean}
  */
  mouseUp: function(evt) {
    var timestamp = new Date().getTime(),
        previousTimestamp = this._menuRenderedTimestamp,
        menu = this.get('instantiatedMenu'),
        touch = SC.platform.touch,
        targetMenuItem;

    // normalize the previousTimestamp: if it is 0, it might as well be now.
    // 0 means that we have not even triggered the nearly-immediate saving of timestamp.
    if (previousTimestamp === 0) previousTimestamp = Date.now();

    if (menu) {
      // Get the menu item the user is currently hovering their mouse over
      targetMenuItem = menu.getPath('rootMenu.targetMenuItem');

      if (targetMenuItem) {
        // Have the menu item perform its action.
        // If the menu returns NO, it had no action to
        // perform, so we should close the menu immediately.
        if (!targetMenuItem.performAction()) menu.remove();
      } else {
        // If the user waits more than certain amount of time between
        // mouseDown and mouseUp, we can assume that they are clicking and
        // dragging to the menu item, and we should close the menu if they
        //mouseup anywhere not inside the menu.
        if (!touch && (timestamp - previousTimestamp > SC.ButtonView.CLICK_AND_HOLD_DELAY)) {
          menu.remove();
        }
      }
    }

    // Reset state.
    this._isMouseDown = NO;
    sc_super();
    return YES;
  },

  /** @private
    Overrides ButtonView's mouseExited method to remove the behavior where the
    active state is removed on mouse exit. We want the button to remain active
    as long as the menu is visible.

    @param {SC.Event} evt
    @returns {Boolean}
  */
  mouseExited: function(evt) {
    return YES;
  },

  /** @private
    Overrides performKeyEquivalent method to pass any keyboard shortcuts to
    the menu.

    @param {String} charCode string corresponding to shortcut pressed (e.g.,
    alt_shift_z)
    @param {SC.Event} evt
  */
  performKeyEquivalent: function(charCode, evt) {
    if (!this.get('isEnabledInPane')) return NO ;
    var menu = this.get('instantiatedMenu') ;

    return (!!menu && menu.performKeyEquivalent(charCode, evt, YES)) ;
  },

  /** @private */
  touchStart: function(evt) {
    return this.mouseDown(evt);
  },

  /** @private */
  touchEnd: function(evt) {
    return this.mouseUp(evt);
  }

});

/**
  @private
  Handles lazy instantiation of popup button menu.
*/
SC.PopupButtonMenuLoader = SC.Task.extend({
  popupButton: null,
  run: function() {
    if (this.popupButton) this.popupButton._instantiateMenu();
  }
});
