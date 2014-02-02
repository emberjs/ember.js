// ==========================================================================
// Project:   Media Examples - A Media Playback sandbox.
// Copyright: ©2012 Michael Krotscheck and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals MediaExamples */

MediaExamples.mainPage = SC.Page.design({
  
  mainPane: SC.MainPane.design({
    childViews: 'workspaceView'.w(),
    
    workspaceView: SC.WorkspaceView.design({
      topToolbar: SC.ToolbarView.extend({
        childViews: ['mediaToggle'],
        
        mediaToggle: SC.SegmentedView.design({
          layout: {
            height: 28,
            left: 20,
            centerY: 0
          },
          align: SC.ALIGN_LEFT,
          controlSize: SC.LARGE_CONTROL_SIZE,
          items: [SC.Object.create({
            title: "Audio Playback",
            value: "MediaExamples.AudioView",
            isEnabled: SC.mediaCapabilities.get('hasAudioPlayback')
          }), SC.Object.create({
            title: "Video Playback",
            value: "MediaExamples.VideoView",
            isEnabled: SC.mediaCapabilities.get('hasVideoPlayback')
          }), SC.Object.create({
            title: "Video Recording",
            value: "MediaExamples.CameraView",
            isEnabled: SC.mediaCapabilities.get('hasVideoCamera')
          }), SC.Object.create({
            title: "Microphone Recording",
            value: "MediaExamples.MicrophoneView",
            isEnabled: SC.mediaCapabilities.get('hasMicrophone')
          })],
          itemTitleKey: "title",
          itemValueKey: "value",
          itemIsEnabledKey: 'isEnabled',
          value: "MediaExamples.AudioView"
        })
      }),
      contentView: SC.ContainerView.extend({
        nowShowingBinding: SC.Binding.oneWay(".parentView.topToolbar.mediaToggle.value")
      })
    })
  })
});
