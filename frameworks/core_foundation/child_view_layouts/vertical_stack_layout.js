// ==========================================================================
// Project:   SproutCore
// Copyright: @2013 7x7 Software, Inc.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
sc_require('views/view');


SC.mixin(SC.View,
  /** @scope SC.View */ {

  /**
    This child layout plugin automatically positions the view's child views in a
    vertical stack and optionally adjusts the parent view's height to fit.  It
    does this by checking the height of each child view and positioning the
    following child view accordingly.  By default any time that a child view's
    height changes, the view will use this plugin to re-adjust all other child
    views and its own height appropriately.

    A typical usage scenario is a long "form" made of multiple subsection
    views.  If we want to adjust the height of a subsection, to make space for
    an error label for example, it would be a lot of work to manually
    reposition all the following sections below it.  A much easier to code and
    cleaner solution is to just set the childViewLayout plugin on the wrapper
    view.

    For example,

        MyApp.MyView = SC.View.extend({

          // Child views will be stacked in order vertically.
          childViewLayout: SC.View.VERTICAL_STACK,

          // The order of child views is important!
          childViews: ['sectionA', 'sectionB', 'sectionC'],

          // Actual layout will become { left: 10, right: 10, top: 20, height: 270 }
          layout: { left: 10, right: 10, top: 20 }, // Don't need to specify layout.height, this is automatic.

          sectionA: SC.View.design({
            // Actual layout will become { left: 0, right: 0, top: 0, height: 100 }
            layout: { height: 100 } // Don't need to specify layout.top, this is automatic.
          }),

          sectionB: SC.View.design({
            // Actual layout will become { border: 1, left: 0, right: 0, top: 100, height: 50 }
            layout: { border: 1, height: 50 } // Don't need to specify layout.top, this is automatic.
          }),

          sectionC: SC.View.design({
            // Actual layout will become { left: 10, right: 10, top: 150, height: 120 }
            layout: { left: 10, right: 10, height: 120 } // Don't need to specify layout.top, this is automatic.
          })

        });

    ## Modify all child view layouts with `childViewLayoutOptions`

    To modify the plugin behavior for all child view layouts, you can set the
    following child view layout options in `childViewLayoutOptions` on the view:

      - paddingBefore - Adds padding before the first child view.  Default: 0
      - paddingAfter - Adds padding after the last child view.  Default: 0
      - spacing - Adds spacing between each child view.  Default: 0
      - resizeToFit - Whether to resize the view to fit the child views (requires that each child view has a layout height).  Default: true

    For example,

        MyApp.MyView = SC.View.extend({

          // Child views will be stacked in order vertically.
          childViewLayout: SC.View.VERTICAL_STACK,

          // Change the behavior of the VERTICAL_STACK plugin
          childViewLayoutOptions: {
            paddingBefore: 10,
            paddingAfter: 20,
            spacing: 5
          },

          // The order of child views is important!
          childViews: ['sectionA', 'sectionB', 'sectionC'],

          // Actual layout will become { left: 10, right: 10, top: 20, height: 310 }
          layout: { left: 10, right: 10, top: 20 }, // Don't need to specify layout.height, this is automatic.

          sectionA: SC.View.design({
            // Actual layout will become { left: 0, right: 0, top: 10, height: 100 }
            layout: { height: 100 } // Don't need to specify layout.top, this is automatic.
          }),

          sectionB: SC.View.design({
            // Actual layout will become { border: 1, left: 0, right: 0, top: 115, height: 50 }
            layout: { border: 1, height: 50 } // Don't need to specify layout.top, this is automatic.
          }),

          sectionC: SC.View.design({
            // Actual layout will become { left: 10, right: 10, top: 170, height: 120 }
            layout: { left: 10, right: 10, height: 120 } // Don't need to specify layout.top, this is automatic.
          })

        });

    If `resizeToFit` is set to `false`, the view will not adjust itself to fit
    its child views.  This means that when `resizeToFit` is false, the view should
    specify its height component in its layout.  This also means that you can
    ignore the last child view's layout height if you want the last child view
    to stretch to fill the parent view.

    For example,

        MyApp.MyView = SC.View.extend({

          // Child views will be stacked in order vertically.
          childViewLayout: SC.View.VERTICAL_STACK,

          // Change the behavior of the VERTICAL_STACK plugin
          childViewLayoutOptions: {
            paddingBefore: 10,
            paddingAfter: 20,
            spacing: 5,
            resizeToFit: false
          },

          // The order of child views is important!
          childViews: ['sectionA', 'sectionB', 'sectionC'],

          // Actual layout will become { left: 10, right: 10, top: 20, height: 500 }
          layout: { left: 10, right: 10, top: 20, height: 500 }, // Need to specify layout.height.

          sectionA: SC.View.design({
            // Actual layout will become { left: 0, right: 0, top: 10, height: 100 }
            layout: { height: 100 } // Don't need to specify layout.top, this is automatic.
          }),

          sectionB: SC.View.design({
            // Actual layout will become { border: 1, left: 0, right: 0, top: 115, height: 50 }
            layout: { border: 1, height: 50 } // Don't need to specify layout.top, this is automatic.
          }),

          sectionC: SC.View.design({
            // Actual layout will become { left: 10, right: 10, top: 170, bottom: 20 }
            layout: { left: 10, right: 10 } // Don't need to specify layout.top, layout.bottom or layout.height, this is automatic.
          })

        });

    ## Modify specific child view layouts

    To adjust the child layout on a granular level per child view, you can
    also set the following properties on each child view:

      - marginBefore - Specify the minimum spacing above the child view.
      - marginAfter - Specify the minimum spacing below the child view.
      - useAbsoluteLayout - Don't include this child view in automatic layout, use absolute positioning based on the child view's `layout` property.
      - useStaticLayout - Don't include this child view in automatic layout.  This child view uses relative positioning and is not eligible for automatic layout.
      - isVisible - Non-visible child views are not included in the stack.

    For example,

        MyApp.MyView = SC.View.extend({

          // Child views will be stacked in order vertically.
          childViewLayout: SC.View.VERTICAL_STACK,

          // Actual layout will become { left: 10, right: 10, top: 20, height: 570 }
          layout: { left: 10, right: 10, top: 20 },

          // Keep the child views ordered!
          childViews: ['sectionA', 'float', 'sectionB', 'sectionC'],

          sectionA: SC.View.design({
            // Actual layout will become { left: 0, right: 50, top: 0, height: 100 }
            layout: { right: 50, height: 100 },
            // The following child view will be at least 50px further down.
            marginAfter: 50
          }),

          float: SC.View.design({
            // This view will not be included in automatic layout and will not effect the stack.
            layout: { top: 5, right: 5, width: 50, height: 50 },
            useAbsoluteLayout: true
          }),

          sectionB: SC.View.design({
            // Actual layout will become { left: 0, right: 0, top: 150, height: 120 }
            layout: { height: 120 }
          }),

          sectionC: SC.View.design({
            // Actual layout will become { left: 0, bottom: 0, top: 470, height: 100 }
            layout: { height: 100 },
            // This child view will be at least 200px below the previous.
            marginBefore: 200
          })

        });

    ### A Note About Spacing

    Note that the spacing attribute in `childViewLayoutOptions` becomes the
    _minimum margin between child views, without explicitly overriding it from
    both sides using `marginAfter` and `marginBefore`_.  For example, if `spacing`
    is 25, setting `marginAfter` to 10 on a child view will not result in the
    next child view being 10px below it, unless the next child view also
    specified `marginBefore` as 10.

    What this means is that it takes less configuration if you set `spacing` to
    be the _smallest margin you wish to exist between child views_ and then use
    the overrides to grow the margin if necessary.  For example, if `spacing`
    is 5, setting `marginAfter` to 10 on a child view will result in the next
    child view being 10px below it, without having to also specify `marginBefore`
    on that next child view.

    @extends SC.ChildViewLayoutProtocol
    @since Version 1.10
  */
  VERTICAL_STACK: {

    /** @private Properties to observe on child views that affect the overall child view layout. */
    childLayoutProperties: ['marginBefore', 'marginAfter', 'isVisible'],

    /** @private */
    layoutChildViews: function (view) {
      var childViews = view.get('childViews'),
        options = view.get('childViewLayoutOptions') || {},
        resizeToFit = SC.none(options.resizeToFit) ? true : options.resizeToFit,
        lastMargin = 0, // Used to avoid adding spacing to the final margin.
        marginAfter = options.paddingBefore || 0,
        paddingAfter = options.paddingAfter || 0,
        position = 0,
        spacing = options.spacing || 0,
        i, len;

      for (i = 0, len = childViews.get('length'); i < len; i++) {
        var childView = childViews.objectAt(i),
          layout,
          marginBefore;

        // Ignore child views with useAbsoluteLayout true, useStaticLayout true or that are not visible.
        if (!childView.get('isVisible') ||
          childView.get('useAbsoluteLayout') ||
          childView.get('useStaticLayout')) {
          continue;
        }

        layout = childView.get('layout');
        //@if(debug)
        // Add some developer support.
        if (SC.none(layout.height) && (i < len - 1 || resizeToFit)) {
          SC.warn('Developer Warning: The SC.View.VERTICAL_STACK plugin requires that each childView layout contains at least a height and optionally also left and right, left and width, right and width or centerX and width.  The childView %@ has an invalid layout: %@'.fmt(childView, SC.stringFromLayout(layout)));
          return;
        }
        //@endif

        // Determine the top margin.
        marginBefore = childView.get('marginBefore') || 0;
        position += Math.max(marginAfter, marginBefore);

        if (layout.top !== position) {
          childView.adjust('top', position);

          // Allow the last child view to stretch.
          if (!resizeToFit && !layout.height && !layout.bottom) {
            childView.adjust('bottom', paddingAfter);
          }
        }
        position += childView.getPath('borderFrame.height');

        // Determine the bottom margin.
        lastMargin = childView.get('marginAfter') || 0;
        marginAfter = lastMargin || spacing;
      }

      // Adjust our frame to fit as well, this ensures that scrolling works.
      // If the current size is 0 (all children are hidden), it doesn't make sense to add the padding
      if (position !== 0)
        position += Math.max(lastMargin, paddingAfter);
      if (resizeToFit && view.getPath('layout.height') !== position) {
        view.adjust('height', position);
      }
    }

  }

});
