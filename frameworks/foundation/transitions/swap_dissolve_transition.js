// ==========================================================================
// Project:   SproutCore
// Copyright: @2013 7x7 Software, Inc.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
sc_require('views/container');


SC.mixin(SC.ContainerView,
/** @scope SC.ContainerView */ {

  /** @class
    Provides dissolve transitions for SC.ContainerView.  The new content will
    fade in as the old content fades out of the view.

    To modify the dissolve animation, you can set the following transition
    options:

      - duration {Number} the number of seconds for the animation.  Default: 0.4
      - timing {String} the animation timing function.  Default: 'ease'

    @extends SC.ViewTransitionProtocol
    @see SC.View#animate for other timing functions.
    @since Version 1.10
  */
  DISSOLVE: {

    /** @private */
    willBuildInToView: function (container, content, previousStatechart, options) {
      content.adjust({ opacity: 0 });
    },

    /** @private */
    buildInToView: function (statechart, container, content, previousStatechart, options) {
      content.animate('opacity', 1, {
        duration: options.duration || 0.4,
        timing: options.timing || 'ease'
      }, function (data) {
        // We may already be in exiting state by the time we transition in.
        if (statechart.get('state') === 'entering') {
          statechart.entered();
        }
      });
    },

    /** @private */
    buildOutFromView: function (statechart, container, content, options, exitCount) {
      // We can call this transition repeatedly without effecting the current exit transition.
      if (exitCount == 1) {
        // Fade the current content at the same time.
        content.animate('opacity', 0, {
          duration: options.duration || 0.4,
          timing: options.timing || 'ease'
        }, function (data) {
          statechart.exited();
        });
      }
    },

    /** @private */
    didBuildOutFromView: function (container, content, options) {
      // Reset the opacity in case this view is used elsewhere.
      content.adjust({ opacity: 1 });
    }

  }
});
