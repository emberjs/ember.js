// ==========================================================================
// Project:   Media Examples - A Media Playback sandbox.
// Copyright: ©2012 Michael Krotscheck and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals MediaExamples */

sc_require('views/capabilities_view');

/**
 *
 * (Document Your View Here)
 *
 * @extends SC.View
 */
MediaExamples.AudioView = SC.View.extend(
/** @scope MediaExamples.AudioView.prototype */
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

    childViews: ['audioPlayer', 'mediaControlsLabel', 'mediaControls', 'miniControlsLabel', 'miniControls', 'simpleControlsLabel', 'simpleControls'],

    audioPlayer: SC.AudioView.extend({
      value: 'http://www.hyperion-records.co.uk/audiotest/8bec43dfc57e3cd7/1%20Sullivan%20The%20Lost%20Chord,%20Seated%20one%20day%20at%20the%20organ.MP3',
      layout: {
        height: 0,
      },
    }),

    mediaControlsLabel: SC.LabelView.extend({
      value: "SC.MediaControlsView",
      layout: {
        height: 22
      }
    }),

    mediaControls: SC.MediaControlsView.extend({
      targetBinding: SC.Binding.oneWay('.parentView.audioPlayer'),
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
      targetBinding: SC.Binding.oneWay('.parentView.audioPlayer'),
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
      targetBinding: SC.Binding.oneWay('.parentView.audioPlayer'),
      layout: {
        height: 20,
      },
    }),
  })

});
