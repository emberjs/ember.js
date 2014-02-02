// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

sc_require("views/toolbar");

/** @class
  WorkspaceView manages a content view and two optional toolbars (top and bottom).
  You want to use WorkspaceView in one of two situations: iPhone apps where the toolbars
  need to change size automatically based on orientation (this does that, isn't that
  handy!) and iPad apps where you would like the masterIsHidden property to pass through.

  @since SproutCore 1.2
  @extends SC.View
  @author Alex Iskander
*/
SC.WorkspaceView = SC.View.extend(
/** @scope SC.WorkspaceView.prototype */ {

  /**
    @type Array
    @default ['sc-workspace-view']
    @see SC.View#classNames
  */
  classNames: ["sc-workspace-view"],

  /**
    @type Array
    @default "hasTopToolbar hasBottomToolbar".w()
    @see SC.View#displayProperties
  */
  displayProperties: ["hasTopToolbar", "hasBottomToolbar"],

  /**
    @type String
    @default 'workspaceRenderDelegate'
  */
  renderDelegateName: 'workspaceRenderDelegate',

  /**
    @type SC.View
    @default SC.ToolbarView
  */
  topToolbar: SC.ToolbarView.extend(),

  /**
    @type SC.View
    @default null
  */
  bottomToolbar: null,

  /**
    The content. Must NOT be null.

    @type SC.View
    @default SC.View
  */
  contentView: SC.View.extend(),

  /**
    If you want to automatically resize the toolbars like iPhone
    apps should, set to YES.

    @type Boolean
    @default NO
  */
  autoResizeToolbars: NO,

  /**
    @type Number
    @default 44
  */
  defaultToolbarSize: 44,

  /**
    @type Number
    @default 44
  */
  largeToolbarSize: 44,

  /**
    @type Number
    @default 30
  */
  smallToolbarSize: 30,

  /**
    @field
    @type Number
  */
  toolbarSize: function() {
    if (!this.get("autoResizeToolbars")) return this.get("defaultToolbarSize");
    if (this.get("orientation") === SC.HORIZONTAL_ORIENTATION) return this.get("smallToolbarSize");
    return this.get("largeToolbarSize");
  }.property("autoHideMaster", "orientation"),

  /**
    Tracks the orientation of the view. Possible values:

      - SC.HORIZONTAL_ORIENTATION
      - SC.PORTRAIT_ORIENTATION

    @field
    @type String
    @default SC.HORIZONTAL_ORIENTATION
  */
  orientation: function() {
    var f = this.get("frame");
    if (f.width > f.height) return SC.HORIZONTAL_ORIENTATION;
    else return SC.VERTICAL_ORIENTATION;
  }.property("frame").cacheable(),

  /**
    @type Boolean
    @default NO
  */
  masterIsHidden: NO,

  /** @private */
  masterIsHiddenDidChange: function() {
    var t, mih = this.get("masterIsHidden");
    if (t = this.get("topToolbar")) t.set("masterIsHidden", mih);
    if (t = this.get("bottomToolbar")) t.set("masterIsHidden", mih);
  }.observes("masterIsHidden"),

  /// INTERNAL CODE. HERE, THERE BE MONSTERS!

  /**
    @private
    Whenever something that affects the tiling changes (for now, just toolbarSize, but if
    we allow dynamic changing of toolbars in future, this could include toolbars themselves),
    we need to update the tiling.
  */
  _scmd_tilePropertyDidChange: function() {
    this.invokeOnce("_scws_tile");
  }.observes("toolbarSize"),

  /** @private
    Creates the child views. Specifically, instantiates master and detail views.
  */
  createChildViews: function() {
    sc_super();

    var topToolbar = this.get("topToolbar");
    if (topToolbar) {
      topToolbar = this.topToolbar = this.activeTopToolbar = this.createChildView(topToolbar);
      this.appendChild(topToolbar);
    }

    var bottomToolbar = this.get("bottomToolbar");
    if (bottomToolbar) {
      bottomToolbar = this.bottomToolbar = this.activeBottomToolbar = this.createChildView(bottomToolbar);
      this.appendChild(bottomToolbar);
    }

    var content = this.get("contentView");
    content = this.contentView = this.activeContentView = this.createChildView(content);
    this.appendChild(content);

    this.invokeOnce("_scws_tile");
  },

  /**
    @private
    Tiles the views as necessary.
  */
  _scws_tile: function() {
    var contentTop = 0, contentBottom = 0,
        topToolbar = this.get("topToolbar"),
        bottomToolbar = this.get("bottomToolbar"),
        content = this.get("contentView"),
        toolbarSize = this.get("toolbarSize");

      // basically, if there is a top toolbar, we position it and change contentTop.
    if (topToolbar) {
      topToolbar.set("layout", {
        left: 0, right: 0, top: 0, height: toolbarSize
      });
      contentTop += toolbarSize;
    }

    // same for bottom
    if (bottomToolbar) {
      bottomToolbar.set("layout", {
        left: 0, right: 0, bottom: 0, height: toolbarSize
      });
      contentBottom += toolbarSize;
    }

    // finally, position content
    this.contentView.set("layout", {
      left: 0, right: 0, top: contentTop, bottom: contentBottom
    });
  },

  /** @private
    Returns YES if a top toolbar is present.
  */
  hasTopToolbar: function() {
    if (this.get("topToolbar")) return YES;
    return NO;
  }.property("topToolbar").cacheable(),

  /** @private
    Returns YES if a bottom toolbar is present.
  */
  hasBottomToolbar: function() {
    if (this.get("bottomToolbar")) return YES;
    return NO;
  }.property("bottomToolbar").cacheable(),

  /** @private
    Called by the individual toolbar/contentView observers at runloop end when the toolbars change.
  */
  childDidChange: function() {
    this._scws_tile();
  },

  /** @private
    For subclassing, this is the currently displaying top toolbar.
  */
  activeTopToolbar: null,

  /** @private
    For subclassing, this is the currently displaying bottom toolbar.
  */
  activeBottomToolbar: null,

  /** @private
    For subclassing, this is the currently displaying content view.
  */
  activeContentView: null,

  /** @private
    Called when the top toolbar changes. It appends it, removes any old ones, and calls toolbarsDidChange.

    You may want to override this if, for instance, you want to add transitions of some sort (should be trivial).
  */
  topToolbarDidChange: function() {
    var active = this.activeTopToolbar, replacement = this.get("topToolbar");
    if (active) {
      if (active.createdByParent) {
        container.removeChildAndDestroy(active);
      } else {
        container.removeChild(active);
      }
    }
    if (replacement) {
      this.appendChild(replacement);
    }

    this.activeTopToolbar = replacement;
    this.invokeLast("childDidChange");
  }.observes("topToolbar"),

  /**
    @private
  */
  bottomToolbarDidChange: function() {
    var active = this.activeBottomToolbar, replacement = this.get("bottomToolbar");
    if (active) {
      if (active.createdByParent) {
        container.removeChildAndDestroy(active);
      } else {
        container.removeChild(active);
      }
    }
    if (replacement) {
      this.appendChild(replacement);
    }

    this.activeBottomToolbar = replacement;
    this.invokeLast("childDidChange");
  }.observes("bottomToolbar"),

  /** @private */
  contentViewDidChange: function() {
    var active = this.activeContentView, replacement = this.get("contentView");
    if (active) {
      if (active.createdByParent) {
        container.removeChildAndDestroy(active);
      } else {
        container.removeChild(active);
      }
    }
    if (replacement) {
      this.appendChild(replacement);
    }

    this.activeContentView = replacement;
    this.invokeLast("childDidChange");
  }.observes("contentView")

});
