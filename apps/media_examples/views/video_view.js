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
MediaExamples.VideoView = SC.View.extend(
/** @scope MediaExamples.VideoView.prototype */
{

  childViews: ['infoBox', 'mediaControlsContainer'],

  infoBox: MediaExamples.CapabilitiesView.extend({
    layout: {
      right: 10,
      top: 10,
      height: 200,
      width: 150
    }
  }),

  mediaControlsContainer: SC.View.extend(SC.FlowedLayout, {

    defaultFlowSpacing: {
      bottom: 10
    },

    layout: {
      left: 10,
      top: 10,
      right: 320,
      bottom: 10,
    },

    layoutDirection: SC.LAYOUT_VERTICAL,

    fillWidth: YES,

    childViews: ['videoPlayer', 'mediaControlsLabel', 'mediaControls', 'miniControlsLabel', 'miniControls', 'simpleControlsLabel', 'simpleControls'],

    videoPlayer: SC.VideoView.extend({
      value: (function() {
        if(SC.mediaCapabilities.isOggSupported) {
          return 'http://clips.vorwaerts-gmbh.de/big_buck_bunny.ogv';
        } else {
          return 'http://clips.vorwaerts-gmbh.de/big_buck_bunny.mp4';
        }
      })(),

      layout: {
        height: 204,
        width: 480
      },
    }),

    mediaControlsLabel: SC.LabelView.extend({
      value: "SC.MediaControlsView",
      layout: {
        height: 22
      }
    }),

    mediaControls: SC.MediaControlsView.extend({
      targetBinding: SC.Binding.oneWay('.parentView.videoPlayer'),
      layout: {
        height: 20,
      },
    }),

    miniControlsLabel: SC.LabelView.extend({
      value: "SC.MiniMediaControlsView",
      layout: {
        height: 22
      }
    }),

    miniControls: SC.MiniMediaControlsView.extend({
      targetBinding: SC.Binding.oneWay('.parentView.videoPlayer'),
      layout: {
        height: 20,
      },
    }),

    simpleControlsLabel: SC.LabelView.extend({
      value: "SC.SimpleMediaControlsView",
      layout: {
        height: 22
      }
    }),

    simpleControls: SC.SimpleMediaControlsView.extend({
      targetBinding: SC.Binding.oneWay('.parentView.videoPlayer'),
      layout: {
        height: 20,
      },
    }),
  })

});
