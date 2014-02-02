// ==========================================================================
// Project:   SproutCore
// Copyright: @2013 7x7 Software, Inc.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
sc_require('views/container');


SC.mixin(SC.ContainerView,
/** @scope SC.ContainerView */ {

 /** @class
    Provides fade through color transitions to SC.ContainerView.  The old
    content will fade out to a color and the new content will then fade in.

    To modify the fade through color animation, you can set the following
    transition options:

      - color {String} any valid CSS Color.  Default: 'black'
      - duration {Number} the number of seconds for the animation.  Default: 0.4
      - timing {String} the animation timing function.  Default: 'ease'

    @extends SC.ViewTransitionProtocol
    @see SC.View#animate for other timing functions.
    @since Version 1.10
  */
  FADE_COLOR: {

    /** @private */
    willBuildInToView: function (container, content, previousStatechart, options) {
      var color,
        colorView;

      content.adjust({ opacity: 0 });

      // Create a color view to fade through.
      color = SC.Color.from(options.color || 'black');
      colorView = SC.View.create({
        layout: { opacity: 0, zIndex: 1 },
        render: function (context) {
          context.addStyle('background-color', color.get('cssText'));
        }
      });
      container.appendChild(colorView);
    },

    /** @private */
    buildInToView: function (statechart, container, content, previousStatechart, options) {
      var childViews = container.get('childViews'),
        colorView;

      colorView = childViews.objectAt(childViews.get('length') - 1);

      // Fade the color in (uses half the total duration)
      colorView.animate('opacity', 1, {
        duration: options.duration * 0.5 || 0.4,
        timing: options.timing || 'ease-in'
      }, function () {
        // Show new content, then fade the color out.
        content.adjust('opacity', 1);

        colorView.animate('opacity', 0, {
          duration: options.duration * 0.5 || 0.4,
          timing: options.timing || 'ease-in'
        }, function (data) {
          // It's best to clean up the colorView here rather than try to find it again on teardown,
          // since multiple color views could be added.
          container.removeChild(this);
          this.destroy();

          // We may already be in exiting state by the time we transition in.
          if (statechart.get('state') === 'entering') {
            statechart.entered();
          }
        });
      });
    },

    /** @private */
    buildOutFromView: function (statechart, container, content, options, exitCount) {
      // Do nothing.
    }

  }

});
