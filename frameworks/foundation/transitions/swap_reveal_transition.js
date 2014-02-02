// ==========================================================================
// Project:   SproutCore
// Copyright: @2013 7x7 Software, Inc.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
sc_require('views/container');


SC.mixin(SC.ContainerView,
/** @scope SC.ContainerView */ {
  /** @class
    Provides reveal transitions to SC.ContainerView.  The old content will
    move out revealing the new content underneath.

    To modify the reveal animation, you can set the following transition
    options:

      - direction {String} The direction to move old content off.  Default: 'left'
        ** 'left' - moves old content off to the left
        ** 'right' - moves old content off to the right
        ** 'up' - moves old content off to the top
        ** 'down' - moves old content off to the bottom
      - duration {Number} the number of seconds for the animation.  Default: 0.4
      - timing {String} the animation timing function.  Default: 'ease'

    @extends SC.ViewTransitionProtocol
    @see SC.View#animate for other timing functions.
    @since Version 1.10
  */
  REVEAL: {

    /** @private */
    buildInToView: function (statechart, container, content, previousStatechart, options) {
      // This transition is unique in that we have to wait for the previous
      // content to finish building out entirely, before we can be considered
      // fully entered.
      // if (previousStatechart && previousStatechart.get('content')) {
      //   previousStatechart.addObserver('state', this, this.previousStateDidChange, statechart);
      // }
    },

    /** @private */
    // reverseBuildIn: function (statechart, container, content, options) {
    //   var nextStatechart = container._currentStatechart;

    //   // We were waiting for another view to remove itself previously, now
    //   // we are going out because someone else is coming in. If that someone
    //   // else was also going out, then we should stay put because they are
    //   // going to reverse.
    //   if (nextStatechart && nextStatechart.get('content')) {
    //     nextStatechart.addObserver('state', this, this.nextStateDidChange, statechart);
    //   }
    // },

    /** @private */
    // previousStateDidChange: function (previousStatechart, key, alwaysNull, statechart) {
    //   if (previousStatechart.state === 'exited') {
    //     statechart.entered();

    //     // Clean up.
    //     previousStatechart.removeObserver('state', this, this.previousStateDidChange);
    //   }
    // },

    /** @private */
    didBuildInToView: function (container, content, options) {
      // Convert to a flexible layout.
      content.adjust({ bottom: 0, right: 0, height: null, width: null, zIndex: null });
    },

    /** @private */
    willBuildOutFromView: function (container, content, options, exitCount) {
      var frame = container.get('frame'),
        height,
        width;

      height = frame.height;
      width = frame.width;

      // Convert to a fixed layout. Put this view on top.
      content.adjust({ bottom: null, right: null, height: height, width: width, zIndex: exitCount });
    },

    /** @private */
    buildOutFromView: function (statechart, container, content, options, exitCount) {
      // We can call this transition repeatedly without effecting the current exit transition.
      if (exitCount === 1) {
        var frame = container.get('frame'),
          key,
          value;

        switch (options.direction) {
        case 'right':
          key = 'left';
          value = -frame.width;
          break;
        case 'up':
          key = 'top';
          value = -frame.height;
          break;
        case 'down':
          key = 'top';
          value = frame.height;
          break;
        default:
          key = 'left';
          value = frame.width;
        }

        content.animate(key, value, {
          duration: options.duration || 0.4,
          timing: options.timing || 'ease'
        }, function (data) {
          if (!data.isCancelled) {
            statechart.exited();
          }
        });
      }
    },

    /** @private */
    // reverseBuildOut: function (statechart, container, content, options) {
    //   var key, value;

    //   // Cancel the animation in place.
    //   content.cancelAnimation(SC.LayoutState.CURRENT);

    //   switch (options.direction) {
    //   case 'up':
    //   case 'down':
    //     key = 'top';
    //     value = 0;
    //     break;
    //   default:
    //     key = 'left';
    //     value = 0;
    //   }

    //   content.animate(key, value, {
    //     duration: options.duration || 0.2,
    //     timing: options.timing || 'ease'
    //   }, function (data) {
    //     if (!data.isCancelled) {
    //       statechart.entered();
    //     }
    //   });
    // },

    /** @private */
    didBuildOutFromView: function (container, content, options) {
      // Convert to a flexible layout.
      content.adjust({ top: 0, left: 0, bottom: 0, right: 0, height: null, width: null, zIndex: null });
    }

  }

});
