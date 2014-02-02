// ==========================================================================
// Project:   SproutCore
// Copyright: @2013 7x7 Software, Inc.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================


/** @namespace
  This protocol defines the allowable transition plugin methods.

  SC.ContainerView uses transition plugins to setup, execute and cleanup the
  swapping between views and expects the given transition plugin object
  to implement the methods in this protocol.
*/
SC.SwapTransitionProtocol = {

  /**
    This optional method is called to set up the entrance transition.

    Use this method to adjust the layout of the container and new content so
    that it may be properly animated.  For example, you may need to adjust the
    content from a flexible layout (i.e. { left: 0, top: 0, right: 0, bottom: 0 })
    to a fixed layout (i.e. { left: 0, top: 0, width: 100, height: 200 })
    so that it can be moved.

    @param {SC.ContainerView} container The SC.ContainerView using this plugin.
    @param {SC.View} content The new view added to the container.
    @param {SC.View} previousStatechart The current content statechart in the container.
    @param {Object} options Options to modify the transition.
  */
  willBuildInToView: function (container, content, previousStatechart, options) {},

  /**
    This optional method is called to transition the new content in.

    When the transition completes, the function must call the entered()
    method on the statechart.

    @param {SC.ContainerContentStatechart} statechart The statechart for the content view.
    @param {SC.ContainerView} container The SC.ContainerView using this plugin.
    @param {SC.View} content The new view added to the container.
    @param {SC.View} previousStatechart The current content statechart in the container.
    @param {Object} options Options to modify the transition.
  */
  buildInToView: function (statechart, container, content, previousStatechart, options) {},

  /**
    This optional method is called to cancel an active entrance transition.

    Use this method to stop the animation and immediately clean up the views.

    @param {SC.ContainerView} container The SC.ContainerView using this plugin.
    @param {SC.View} content The new view in the container, which is still transitioning in.
    @param {Object} options Options to modify the transition.
  */
  buildInDidCancel:  function (container, content, options) {},

  /**
    This optional method is called to clean up the entrance the transition.

    Use this method to adjust the layout of the container and new content after
    the transition completes.  For example, you may need to adjust the layout
    from a fixed layout (i.e. { left: 0, top: 0, width: 100, height: 200 })
    to a flexible layout (i.e. { left: 0, top: 0, right: 0, bottom: 0 }).

    @param {SC.ContainerView} container The SC.ContainerView using this plugin.
    @param {SC.View} content The new view added to the container.
    @param {Object} options Options that were used to modify the transition.
  */
  didBuildInToView: function (container, content, options) {},

  /**
    This optional method is called to set up the exit transition.

    Use this method to adjust the layout of the container and new content so
    that it may be properly animated.  For example, you may need to adjust the
    content from a flexible layout (i.e. { left: 0, top: 0, right: 0, bottom: 0 })
    to a fixed layout (i.e. { left: 0, top: 0, width: 100, height: 200 })
    so that it can be moved.

    @param {SC.ContainerView} container The SC.ContainerView using this plugin.
    @param {SC.View} content The old view being removed from the container.
    @param {Object} options Options to modify the transition.
  */
  willBuildOutFromView: function (container, content, options) {},

  /**
    This optional method is called to transition the old content out.

    When the transition completes, the function must call the exited()
    method on the statechart.

    Note that a view may be repeatedly built out before it has completed.  In
    order to accelerate the build out transition, the exitCount parameter will
    be incremented each time buildOutFromView is called.  The initial value
    will always be 1.

    @param {SC.ContainerContentStatechart} statechart The statechart for the content view.
    @param {SC.ContainerView} container The SC.ContainerView using this plugin.
    @param {SC.View} content The old view being removed from the container.
    @param {Object} options Options to modify the transition.
    @param {Number} exitCount The number of times the content is being built out.
  */
  buildOutFromView: function (statechart, container, content, options, exitCount) {},

  /**
    This optional method is called to cancel an active exit transition.

    Use this method to stop the animation and immediately clean up the views.

    @param {SC.ContainerView} container The SC.ContainerView using this plugin.
    @param {SC.View} content The old view being removed from the container, which is still transitioning out.
    @param {Object} options Options to modify the transition.
  */
  buildOutDidCancel: function (container, content, options) {},

  /**
    This optional method is called to clean up the entrance the transition.

    Use this method to adjust the layout of the container and new content after
    the transition completes.  For example, you may need to adjust the layout
    from a fixed layout (i.e. { left: 0, top: 0, width: 100, height: 200 })
    to a flexible layout (i.e. { left: 0, top: 0, right: 0, bottom: 0 }).

    @param {SC.ContainerView} container The SC.ContainerView using this plugin.
    @param {SC.View} content The new view added to the container.
    @param {Object} options Options that were used to modify the transition.
  */
  didBuildOutFromView: function (container, content, options) {},

  /**
    This optional method is called to adjust the clippingFrame during the
    transition.

    Because some childViews are altered by the clippingFrame of their parent
    views (notably collection views), we may need to provide a modified
    clipping frame while the transition is in process.

    For example, a push transition should double the regular clippingFrame
    of the container to fit both the new and current content while the
    transition is in progress.

    @param {SC.ContainerView} container The SC.ContainerView using this plugin.
    @param {Object} clippingFrame The current clippingFrame of the container.
    @param {Object} options Options used to modify the transition.
    @returns clippingFrame
  */
  transitionClippingFrame: function (container, clippingFrame, options) {}

};
