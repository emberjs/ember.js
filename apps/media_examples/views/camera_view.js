// ==========================================================================
// Project:   Media Examples - A Media Playback sandbox.
// Copyright: ©2012 Michael Krotscheck and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals MediaExamples */

/**
 *
 * (Document Your View Here)
 *
 * @extends SC.View
 */
MediaExamples.CameraView = SC.View.extend(
/** @scope MediaExamples.CameraView.prototype */
{
  childViews: ['infoBox', 'labelView'],

  infoBox: MediaExamples.CapabilitiesView.extend({
    layout: {
      right: 10,
      top: 10,
      height: 200,
      width: 150
    }
  }),

  labelView: SC.LabelView.extend({
    tagName: "h1",
    layout: {
      top: 10,
      left: 10,
      bottom: 10,
      right: 170
    },
    value: "This feature is not yet supported"
  })
});
