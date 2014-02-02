// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

sc_require("views/workspace");

/**
  @static
  @type String
  @constant
*/
SC.TO_LEFT = "TOLEFT";

/**
  @static
  @type String
  @constant
*/
SC.TO_RIGHT = "TORIGHT";


/** @class

  NavigationView is very loosely based on UINavigationController:
  that is, it implements a push/pop based API. 
  
  NavigationView checks if the view is NavigationBuildable--that is, if it has 
  
  Views may specify a topToolbar or bottomToolbar property. These will become the
  top or bottom toolbars of the NavigationView (which is, incidentally, a WorkspaceView).
  
  Of course, this process is animated...
  
  @author Alex Iskander
  @extends SC.WorkspaceView
  @since SproutCore 1.4
*/
SC.NavigationView = SC.WorkspaceView.extend(
/** @scope SC.NavigationView.prototype */ {
  
  /** @private */
  _views: null,
  
  /** @private */
  _current: null,
  
  /**
    @type SC.View
    @default SC.View
  */
  navigationContentView: SC.View,
  
  /** @private */
  init: function() {
    sc_super();
    this._views = [];
  },
  
  /** @private */
  createChildViews: function() {
    sc_super();
    
    // get the content
    var content = this.get("navigationContentView");
    
    // instantiate if needed
    if (content.isClass) content = this.createChildView(content);
    
    // set internal values
    this._defaultContent = this.navigationContentView = content;
    
    // append to the content view
    this.contentView.appendChild(content);
  },
  
  /** @private */
  changeNavigationContent: function(view) {
    var top = null, bottom = null;
    
    // find top and bottom toolbars if we are setting it to a view
    if (view) {
      top = view.get("topToolbar"); 
      bottom = view.get("bottomToolbar");
    }
    
    // instantiate top if needed
    if (top && top.isClass) {
      view.set("topToolbar", top = top.create());
    }
    
    // and now bottom
    if (bottom && bottom.isClass) {
      view.set("bottomToolbar", bottom = bottom.create());
    }
    
    
    // batch property changes for efficiency
    this.beginPropertyChanges();
    
    // update current, etc. etc.
    this._current = view;
    this.set("navigationContentView", view ? view : this._defaultContent);
    
    // set the top/bottom appropriately
    this.set("topToolbar", top);
    this.set("bottomToolbar", bottom);
    
    // and we are done
    this.endPropertyChanges();
  },
  
  /**
    Pushes a view into the navigation view stack. The view may have topToolbar and bottomToolbar properties.
    
    @param {SC.View} view The view to display
  */
  push: function(view) {
    this._currentDirection = this._current ? SC.TO_LEFT : null;
    
    // add current view to the stack (if needed)
    if (this._current) this._views.push(this._current);
    
    // update content now...
    this.changeNavigationContent(view);
  },
  
  /**
    Pops the current view off the navigation view stack.
  */
  pop: function() {
    this._currentDirection = SC.TO_RIGHT;
    
    // pop the view
    var view = this._views.pop();
    
    // set new (old) content view
    this.changeNavigationContent(view);
  },
  
  /**
    Pops to the specified view on the navigation view stack; the view you pass will become the current view.
    
    @param {SC.View} toView The view to display
  */
  popToView: function(toView) {
    this._currentDirection = SC.TO_RIGHT;
    var views = this._views,
        idx = views.length - 1, 
        view = views[idx];
    
    // loop back from end
    while (view && view !== toView) {
      this._views.pop();
      idx--;
      view = views[idx];
    }
    
    // and change the content
    this.changeNavigationContent(view);
  },
  
  /** @private */
  topToolbarDidChange: function() {
    var active = this.activeTopToolbar, replacement = this.get("topToolbar");
    
    // if we have an active toolbar, set the build direction and build out
    if (active) {
      if (this._currentDirection !== null) {
        active.set("buildDirection", this._currentDirection);
        this.buildOutChild(active);
      } else {
        this.removeChild(active);
      }
    }
    
    // if we have a new toolbar, set the build direction and build in
    if (replacement) {
      if (this._currentDirection !== null) {
        replacement.set("buildDirection", this._currentDirection);
        this.buildInChild(replacement);
      } else {
        this.appendChild(replacement);
      }
    }
    
    // update, and queue retiling
    this.activeTopToolbar = replacement;
    this.invokeOnce("childDidChange");
  }.observes("topToolbar"),
  
  /** @private */
  bottomToolbarDidChange: function() {
    var active = this.activeBottomToolbar, replacement = this.get("bottomToolbar");
    
    if (active) {
      if (this._currentDirection !== null) {
        active.set("buildDirection", this._currentDirection);
        this.buildOutChild(active);
      } else {
        this.removeChild(active);
      }
    }
    if (replacement) {
      if (this._currentDirection !== null) {
        replacement.set("buildDirection", this._currentDirection);
        this.buildInChild(replacement);
      } else {
        this.appendChild(replacement);
      }
    }
    
    this.activeBottomToolbar = replacement;
    this.invokeOnce("childDidChange");
  }.observes("topToolbar"),
  
  /** @private */
  contentViewDidChange: function() {
    var active = this.activeNavigationContentView, replacement = this.get("navigationContentView");
    
    // mix in navigationbuilder if needed
    if (!replacement.isNavigationBuilder) {
      replacement.mixin(SC.NavigationBuilder);
    }
    
    // tiling really needs to happen _before_ animation
    // so, we set "pending" and queue tiling.
    this._pendingBuildOut = active;
    this._pendingBuildIn = replacement;
    
    this.activeNavigationContentView = replacement;
    this.invokeOnce("childDidChange");
  }.observes("navigationContentView"),
  
  /** @private */
  childDidChange: function() {
    var replacement = this._pendingBuildIn, active = this._pendingBuildOut;
    if (active) {
      if (this._currentDirection !== null) {
        active.set("buildDirection", this._currentDirection);
        this.contentView.buildOutChild(active);
      } else {
        this.contentView.removeChild(active);
      }
    }

    this._scws_tile();
    
    if (replacement) {
      if (this._currentDirection !== null) {
        replacement.set("buildDirection", this._currentDirection);
        this.contentView.buildInChild(replacement);
      } else {
        this.contentView.appendChild(replacement);
      }
    }
  }
  
});
