// ==========================================================================
// Project:   SproutCore
// Copyright: @2012 7x7 Software, Inc.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
sc_require("views/view");

// When in debug mode, developers can log the design mode.
//@if (debug)
SC.LOG_DESIGN_MODE = false;
//@endif

// The class names assigned to view elements depending on the current design
// mode.
SC.DESIGN_MODE_CLASS_NAMES = {
  s: 'sc-small',
  m: 'sc-medium',
  l: 'sc-large',
  xl: 'sc-xlarge'
};

/** @private This adds design modes support to SC.View. */
SC.View.reopen(
  /** @scope SC.View.prototype */ {

  // ------------------------------------------------------------------------
  // Properties
  //

  /**
    The current design mode of the application and this view.

    If the application has designModes specified, this property will be set
    automatically when the view is created and as the window size changes
    across the design mode boundaries.

    @property {String}
    @default null
  */
  designMode: null,

  /**
    The dynamic adjustments to apply to this view depending on the current
    design mode.

    If you specify designModes on the application, this hash will be checked
    for a matching adjustment to apply for the current design mode.

    @property {Object}
    @default null
  */
  modeAdjust: null,

  // ------------------------------------------------------------------------
  // Methods
  //

  /** @private Recursively set the designMode on each child view. */
  adjustChildDesignModes: function (lastDesignMode, designMode) {
    var childViews = this.get('childViews');

    var i, len = childViews.get('length');
    for (i = 0; i < len; i++) {
      var childView = childViews.objectAt(i);

      childView.updateDesignMode(lastDesignMode, designMode);
    }
  },

  /**
    Updates the design mode for this view.

    This method is called automatically by the view's pane whenever the pane
    determines that the design mode, as specified in the pane's designModes
    property, has changed.  You should likely never need to call it manually.

    This method updates the designMode property of the view, adjusts
    the layout if a matching design adjustment in the view's designAdjustments
    property is found and adds a class name to the view for the current
    design mode.

    Note that updating the design mode also updates all child views of this
    view.

    @param {String} lastDesignMode the previously applied design mode
    @param {String} [designMode] the name of the design mode
   */
  updateDesignMode: function (lastDesignMode, designMode) {
    // Fast path.
    if (lastDesignMode === designMode) { return; }

    var classNames = this.get('classNames'),
      modeAdjust,
      elem,
      key,
      layer,
      newProperties,
      prevProperties,
      size;

    this.set('designMode', designMode);

    // Get the size name portion of the mode.
    if (designMode) {
      size = designMode.split('_')[0];
    }

    modeAdjust = this.get('modeAdjust');
    if (modeAdjust) {
      // Stop observing changes for a moment.
      this.beginPropertyChanges();

      // Unset any previous properties.
      prevProperties = this._originalProperties;
      if (prevProperties) {
        //@if(debug)
        if (SC.LOG_DESIGN_MODE) {
          SC.Logger.log('%@ — Removing previous design property overrides from "%@":'.fmt(this, lastDesignMode));
        }
        //@endif

        for (key in prevProperties) {
          //@if(debug)
          if (SC.LOG_DESIGN_MODE) {
            SC.Logger.log('  - Resetting %@ to %@'.fmt(key, prevProperties[key]));
          }
          //@endif
          this.set(key, prevProperties[key]);
        }

        // Remove the cache.
        this._originalProperties = null;
      }

      if (designMode) {
        // Apply new properties. The orientation specific properties override the size properties.
        if (modeAdjust[size] || modeAdjust[designMode]) {
          newProperties = SC.merge(modeAdjust[size], modeAdjust[designMode]);

          //@if(debug)
          if (SC.LOG_DESIGN_MODE) {
            SC.Logger.log('%@ — Applying design properties for "%@":'.fmt(this, designMode));
          }
          //@endif

          // Cache the original properties for reset.
          this._originalProperties = {};
          for (key in newProperties) {
            // Cache the original value for reset.
            this._originalProperties[key] = this.get(key);

            //@if(debug)
            if (SC.LOG_DESIGN_MODE) {
              SC.Logger.log('  - Setting %@: %@'.fmt(key, newProperties[key]));
            }
            //@endif

            // Apply the override.
            if (key === 'layout') {
              this.adjust(newProperties[key]);
            } else {
              this.set(key, newProperties[key]);
            }
          }
        }
      }

      // Resume observing.
      this.endPropertyChanges();
    }

    // Apply the design mode as a class name.
    // This is done here rather than through classNameBindings, because we can
    // do it here without needing to setup a designMode observer for each view.
    var designClass;
    layer = this.get('layer');
    if (layer) {
      elem = this.$();

      // If we had previously added a class to the element, remove it.
      if (lastDesignMode) {
        designClass = SC.DESIGN_MODE_CLASS_NAMES[lastDesignMode.split('_')[0]];
        elem.removeClass(designClass);
        classNames.removeObject(designClass);
      }

      // If necessary, add a new class.
      if (designMode) {
        designClass = SC.DESIGN_MODE_CLASS_NAMES[size];
        elem.addClass(designClass);
        classNames.push(designClass);
      }
    } else {
      if (designMode) {
        designClass = SC.DESIGN_MODE_CLASS_NAMES[size];
        // Ensure that it gets into the classNames array
        // so it is displayed when we render.
        classNames.push(designClass);
      }
    }

    // Set the designMode on each child view (may be null).
    this.adjustChildDesignModes(lastDesignMode, designMode);
  }

});
