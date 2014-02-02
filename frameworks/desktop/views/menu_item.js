// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

sc_require('views/button');
sc_require('views/separator');

/**
  @class

  An SC.MenuItemView is created for every item in a menu.

  @extends SC.ButtonView
  @since SproutCore 1.0
*/
SC.MenuItemView = SC.View.extend(SC.ContentDisplay,
/** @scope SC.MenuItemView.prototype */ {

  /**
    @type Array
    @default ['sc-menu-item']
    @see SC.View#classNames
  */
  classNames: ['sc-menu-item'],

  /**
    @type Array
    @default ['title', 'isEnabled', 'isSeparator', 'isChecked']
    @see SC.View#displayProperties
  */
  displayProperties: ['title', 'isEnabled', 'isSeparator', 'isChecked'],


  /**
    The WAI-ARIA role for menu items.

    @type String
    @default 'menuitem'
    @readOnly
  */
  ariaRole: 'menuitem',

  /**
    @type Boolean
    @default YES
  */
  escapeHTML: YES,

  /**
    @type Boolean
    @default YES
  */
  acceptsFirstResponder: YES,

  /**
    IE only attribute to block blurring of other controls

    @type Boolean
    @default YES
  */
  blocksIEDeactivate: YES,

  /**
    @type Boolean
    @default NO
  */
  isContextMenuEnabled: NO,


  // ..........................................................
  // KEY PROPERTIES
  //

  /**
    The content object the menu view will display.

    @type Object
    @default null
  */
  content: null,

  /**
    YES if this menu item represents a separator, NO otherwise.

    @field
    @type Boolean
    @observes content
  */
  isSeparator: function () {
    return this.getContentProperty('itemSeparatorKey') === YES;
  }.property('content').cacheable(),

  /**
    @field
    @type Boolean
    @observes content.isEnabled
  */
  isEnabled: function () {
    return this.getContentProperty('itemIsEnabledKey') !== NO &&
           this.getContentProperty('itemSeparatorKey') !== YES;
  }.property('content.isEnabled').cacheable(),

  /**
    YES if the menu item should include a check next to it.

    @type Boolean
    @property
  */
  isChecked: function () {
    return this.getContentProperty('itemCheckboxKey');
  }.property(),

  /**
    This menu item's submenu, if it exists.

    @field
    @type SC.MenuView
    @observes content
  */
  subMenu: function () {
    var content = this.get('content'), menuItems, parentMenu;

    if (!content) return null;

    parentMenu = this.get('parentMenu');
    menuItems = content.get(parentMenu.itemSubMenuKey);
    if (menuItems) {
      if (SC.kindOf(menuItems, SC.MenuPane)) {
        menuItems.set('isModal', NO);
        menuItems.set('isSubMenu', YES);
        menuItems.set('parentMenu', parentMenu);
        return menuItems;
      } else {
        return SC.MenuPane.create({
          layout: { width: 200 },
          items: menuItems,
          isModal: NO,
          isSubMenu: YES,
          parentMenu: parentMenu,
          controlSize: parentMenu.get('controlSize'),
          exampleView: parentMenu.get('exampleView')
        });
      }
    }

    return null;
  }.property('content').cacheable(),

  /**
    @type Boolean
    @default NO
    @observes subMenu
  */
  hasSubMenu: function () {
    return !!this.get('subMenu');
  }.property('subMenu').cacheable(),

  /** @private */
  init: function () {
    sc_super();
    this.contentDidChange();
  },

  /** SC.MenuItemView is not able to update itself in place at this time. */
  // TODO: add update: support.
  isReusable: false,

  /** @private
    Fills the passed html-array with strings that can be joined to form the
    innerHTML of the receiver element.  Also populates an array of classNames
    to set on the outer element.

    @param {SC.RenderContext} context
    @param {Boolean} firstTime
    @returns {void}
  */
  render: function (context) {
    var content = this.get('content'),
        val,
        menu = this.get('parentMenu'),
        itemWidth = this.get('itemWidth') || menu.layout.width,
        itemHeight = this.get('itemHeight') || SC.DEFAULT_MENU_ITEM_HEIGHT;

    this.set('itemWidth', itemWidth);
    this.set('itemHeight', itemHeight);

    //addressing accessibility
    if (this.get('isSeparator')) {
      //assign the role of separator
      context.setAttr('role', 'separator');
    } else if (this.get('isChecked')) {
      //assign the role of menuitemcheckbox
      context.setAttr('role', 'menuitemcheckbox');
      context.setAttr('aria-checked', true);
    }

    context = context.begin('a').addClass('menu-item');

    if (this.get('isSeparator')) {
      context.push('<span class="separator"></span>');
      context.addClass('disabled');
    } else {
      val = content.get(menu.itemIconKey);
      if (val) {
        this.renderImage(context, val);
        context.addClass('has-icon');
      }

      val = this.get('title');
      if (SC.typeOf(val) !== SC.T_STRING) val = val.toString();
      this.renderLabel(context, val);

      if (this.get('isChecked')) {
        context.push('<div class="checkbox"></div>');
      }

      if (this.get('hasSubMenu')) {
        this.renderBranch(context);
      }

      val = this.getContentProperty('itemShortCutKey');
      if (val) {
        this.renderShortcut(context, val);
      }
    }

    context = context.end();
  },

  /** @private
   Generates the image used to represent the image icon. override this to
   return your own custom HTML

   @param {SC.RenderContext} context the render context
   @param {String} the source path of the image
   @returns {void}
  */
  renderImage: function (context, image) {
    // get a class name and url to include if relevant

    var url, className;
    if (image && SC.ImageView.valueIsUrl(image)) {
      url = image;
      className = '';
    } else {
      className = image;
      url = SC.BLANK_IMAGE_URL;
    }
    // generate the img element...
    context.begin('img').addClass('image').addClass(className).setAttr('src', url).end();
  },

  /** @private
   Generates the label used to represent the menu item. override this to
   return your own custom HTML

   @param {SC.RenderContext} context the render context
   @param {String} menu item name
   @returns {void}
  */

  renderLabel: function (context, label) {
    if (this.get('escapeHTML')) {
      label = SC.RenderContext.escapeHTML(label);
    }
    context.push("<span class='value ellipsis'>" + label + "</span>");
  },

  /** @private
   Generates the string used to represent the branch arrow. override this to
   return your own custom HTML

   @param {SC.RenderContext} context the render context
   @returns {void}
  */
  renderBranch: function (context) {
    context.push('<span class="has-branch"></span>');
  },

  /** @private
   Generates the string used to represent the short cut keys. override this to
   return your own custom HTML

   @param {SC.RenderContext} context the render context
   @param {String} the shortcut key string to be displayed with menu item name
   @returns {void}
  */
  renderShortcut: function (context, shortcut) {
    context.push('<span class = "shortcut">' + shortcut + '</span>');
  },

  /**
    This method will check whether the current Menu Item is still
    selected and then create a submenu accordingly.
  */
  showSubMenu: function () {
    var subMenu = this.get('subMenu');
    if (subMenu) {
      subMenu.set('mouseHasEntered', NO);
      subMenu.popup(this, [0, 0, 0]);
    }

    this._subMenuTimer = null;
  },

  /**
    The title from the content property.

    @field
    @type String
    @observes content.title
  */
  title: function () {
    var ret = this.getContentProperty('itemTitleKey'),
        localize = this.getPath('parentMenu.localize');

    if (localize && ret) ret = SC.String.loc(ret);

    return ret || '';
  }.property('content.title').cacheable(),

  /** @private */
  getContentProperty: function (property) {
    var content = this.get('content'),
        menu = this.get('parentMenu');

    if (content) {
      return content.get(menu.get(property));
    }
  },


  //..........................................
  // Mouse Events Handling
  //

  /** @private */
  mouseUp: function (evt) {
    // SproutCore's event system will deliver the mouseUp event to the view
    // that got the mouseDown event, but for menus we want to track the mouse,
    // so we'll do our own dispatching.
    var targetMenuItem;

    targetMenuItem = this.getPath('parentMenu.rootMenu.targetMenuItem');

    if (targetMenuItem) targetMenuItem.performAction();
    return YES;
  },

  /** @private
    Called on mouse down to send the action to the target.

    This method will start flashing the menu item to indicate to the user that
    their selection has been received, unless disableMenuFlash has been set to
    YES on the menu item.

    @returns {Boolean}
  */
  performAction: function () {
    // Clicking on a disabled menu item should close the menu.
    if (!this.get('isEnabled')) {
      this.getPath('parentMenu.rootMenu').remove();
      return YES;
    }

    // Menus that contain submenus should ignore clicks
    if (this.get('hasSubMenu')) return NO;

    var disableFlash = this.getContentProperty('itemDisableMenuFlashKey'),
        menu;

    if (disableFlash) {
      // Menu flashing has been disabled for this menu item, so perform
      // the action immediately.
      this.sendAction();
    } else {
      // Flash the highlight of the menu item to indicate selection,
      // then actually send the action once its done.
      this._flashCounter = 0;

      // Set a flag on the root menu to indicate that we are in a
      // flashing state. In the flashing state, no other menu items
      // should become selected.
      menu = this.getPath('parentMenu.rootMenu');
      menu._isFlashing = YES;
      this.invokeLater(this.flashHighlight, 25);
      this.invokeLater(this.sendAction, 150);
    }

    return YES;
  },

  /** @private
    Actually sends the action of the menu item to the target.
  */
  sendAction: function () {
    var action = this.getContentProperty('itemActionKey'),
        target = this.getContentProperty('itemTargetKey'),
        rootMenu = this.getPath('parentMenu.rootMenu'),
        responder;

    // Close the menu
    this.getPath('parentMenu.rootMenu').remove();
    // We're no longer flashing
    rootMenu._isFlashing = NO;

    action = (action === undefined) ? rootMenu.get('action') : action;
    target = (target === undefined) ? rootMenu.get('target') : target;

    // Notify the root menu pane that the selection has changed
    rootMenu.set('selectedItem', this.get('content'));

    // Legacy support for actions that are functions
    if (SC.typeOf(action) === SC.T_FUNCTION) {
      action.apply(target, [rootMenu]);
      //@if (debug)
      SC.Logger.warn('Support for menu item action functions has been deprecated. Please use target and action.');
      //@endif
    } else {
      responder = this.getPath('pane.rootResponder') || SC.RootResponder.responder;

      if (responder) {
        // Send the action down the responder chain
        responder.sendAction(action, target, rootMenu);
      }
    }

  },

  /** @private
    Toggles the focus class name on the menu item layer to quickly flash the
    highlight. This indicates to the user that a selection has been made.

    This is initially called by performAction(). flashHighlight then keeps
    track of how many flashes have occurred, and calls itself until a maximum
    has been reached.
  */
  flashHighlight: function () {
    var flashCounter = this._flashCounter, layer = this.$();
    if (flashCounter % 2 === 0) {
      layer.addClass('focus');
    } else {
      layer.removeClass('focus');
    }

    if (flashCounter <= 2) {
      this.invokeLater(this.flashHighlight, 50);
      this._flashCounter++;
    }
  },

  /** @private*/
  mouseDown: function (evt) {
    return YES;
  },

  /** @private */
  mouseEntered: function (evt) {
    var menu = this.get('parentMenu'),
        rootMenu = menu.get('rootMenu');

    // Ignore mouse entering if we're in the middle of
    // a menu flash.
    if (rootMenu._isFlashing) return;

    menu.set('mouseHasEntered', YES);
    this.set('mouseHasEntered', YES);
    menu.set('currentMenuItem', this);

    // Become first responder to show highlight
    if (this.get('isEnabled')) {
      this.becomeFirstResponder();
    }

    if (this.get('hasSubMenu')) {
      this._subMenuTimer = this.invokeLater(this.showSubMenu, 100);
    }

    return YES;
  },

  /** @private
    Set the focus based on whether the current menu item is selected or not.
  */
  mouseExited: function (evt) {
    var parentMenu, timer;

    // If we have a submenu, we need to give the user's mouse time to get
    // to the new menu before we remove highlight.
    if (this.get('hasSubMenu')) {
      // If they are exiting the view before we opened the submenu,
      // make sure we don't open it once they've left.
      timer = this._subMenuTimer;
      if (timer) {
        timer.invalidate();
      } else {
        this.invokeLater(this.checkMouseLocation, 100);
      }
    } else {
      parentMenu = this.get('parentMenu');

      if (parentMenu.get('currentMenuItem') === this) {
        parentMenu.set('currentMenuItem', null);
      }
    }

    return YES;
  },

  /** @private */
  touchStart: function (evt) {
    this.mouseEntered(evt);
    return YES;
  },

  /** @private */
  touchEnd: function (evt) {
    return this.mouseUp(evt);
  },

  /** @private */
  touchEntered: function (evt) {
    return this.mouseEntered(evt);
  },

  /** @private */
  touchExited: function (evt) {
    return this.mouseExited(evt);
  },

  /** @private */
  checkMouseLocation: function () {
    var subMenu = this.get('subMenu'), parentMenu = this.get('parentMenu'),
        currentMenuItem, previousMenuItem;

    if (!subMenu.get('mouseHasEntered')) {
      currentMenuItem = parentMenu.get('currentMenuItem');
      if (currentMenuItem === this || currentMenuItem === null) {
        previousMenuItem = parentMenu.get('previousMenuItem');

        if (previousMenuItem) {
          previousMenuItem.resignFirstResponder();
        }
        this.resignFirstResponder();
        subMenu.remove();
      }
    }
  },

  /** @private
    Call the moveUp function on the parent Menu
  */
  moveUp: function (sender, evt) {
    var menu = this.get('parentMenu');
    if (menu) {
      menu.moveUp(this);
    }
    return YES;
  },

  /** @private
    Call the moveDown function on the parent Menu
  */
  moveDown: function (sender, evt) {
    var menu = this.get('parentMenu');
    if (menu) {
      menu.moveDown(this);
    }
    return YES;
  },

  /** @private
    Call the function to create a branch
  */
  moveRight: function (sender, evt) {
    this.showSubMenu();
    return YES;
  },

  /** @private
    Proxies insertText events to the parent menu so items can be selected
    by typing their titles.
  */
  insertText: function (chr, evt) {
    var menu = this.get('parentMenu');
    if (menu) {
      menu.insertText(chr, evt);
    }
  },

  /** @private*/
  keyDown: function (evt) {
    return this.interpretKeyEvents(evt);
  },

  /** @private*/
  keyUp: function (evt) {
    return YES;
  },

  /** @private*/
  cancel: function (evt) {
    this.getPath('parentMenu.rootMenu').remove();
    return YES;
  },

  /** @private*/
  didBecomeFirstResponder: function (responder) {
    if (responder !== this) return;
    var parentMenu = this.get('parentMenu');
    if (parentMenu) {
      parentMenu.set('currentSelectedMenuItem', this);
    }
  },

  /** @private*/
  willLoseFirstResponder: function (responder) {
    if (responder !== this) return;
    var parentMenu = this.get('parentMenu');
    if (parentMenu) {
      parentMenu.set('currentSelectedMenuItem', null);
      parentMenu.set('previousSelectedMenuItem', this);
    }
  },

  /** @private*/
  insertNewline: function (sender, evt) {
    this.mouseUp(evt);
  },

  /**
    Close the parent Menu and remove the focus of the current Selected
    Menu Item
  */
  closeParent: function () {
    this.$().removeClass('focus');
    var menu = this.get('parentMenu');
    if (menu) {
      menu.remove();
    }
  },

  /** @private*/
  clickInside: function (frame, evt) {
    return SC.pointInRect({ x: evt.pageX, y: evt.pageY }, frame);
  },


  // ..........................................................
  // CONTENT OBSERVING
  //

  /** @private
    Add an observer to ensure that we invalidate our cached properties
    whenever the content object’s associated property changes.
  */
  contentDidChange: function () {
    var content    = this.get('content'),
        oldContent = this._content;

    if (content === oldContent) return;

    var f = this.contentPropertyDidChange;
    // remove an observer from the old content if necessary
    if (oldContent  &&  oldContent.removeObserver) oldContent.removeObserver('*', this, f);

    // add observer to new content if necessary.
    this._content = content;
    if (content  &&  content.addObserver) content.addObserver('*', this, f);

    // notify that value did change.
    this.contentPropertyDidChange(content, '*') ;
  }.observes('content'),


  /** @private
    Invalidate our cached property whenever the content object’s associated
    property changes.
  */
  contentPropertyDidChange: function (target, key) {
    // If the key that changed in the content is one of the fields for which
    // we (potentially) cache a value, update our cache.
    var menu = this.get('parentMenu');
    if (!menu) return;

    var mapping           = SC.MenuItemView._contentPropertyToMenuItemPropertyMapping,
        contentProperties = SC.keys(mapping),
        i, len, contentProperty, menuItemProperty;


    // Are we invalidating all keys?
    if (key === '*') {
      for (i = 0, len = contentProperties.length;  i < len;  ++i) {
        contentProperty  = contentProperties[i];
        menuItemProperty = mapping[contentProperty];
        this.notifyPropertyChange(menuItemProperty);
      }
    }
    else {
      for (i = 0, len = contentProperties.length;  i < len;  ++i) {
        contentProperty  = contentProperties[i];
        if (menu.get(contentProperty) === key) {
          menuItemProperty = mapping[contentProperty];
          this.notifyPropertyChange(menuItemProperty);

          // Note:  We won't break here in case the menu is set up to map
          //        multiple properties to the same content key.
        }
      }
    }
  }

});


// ..........................................................
// CLASS PROPERTIES
//

/** @private
  A mapping of the "content property key" keys to the properties we use to
  wrap them.  This hash is used in 'contentPropertyDidChange' to ensure that
  when the content changes a property that is locally cached inside the menu
  item, the cache is properly invalidated.

  Implementor note:  If you add such a cached property, you must add it to
                     this mapping.
*/
SC.MenuItemView._contentPropertyToMenuItemPropertyMapping = {
  itemTitleKey:     'title',
  itemIsEnabledKey: 'isEnabled',
  itemSeparatorKey: 'isSeparator',
  itemSubMenuKey:   'subMenu'
};
