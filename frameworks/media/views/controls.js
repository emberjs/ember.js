// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals SC */

sc_require('views/media_slider');
/** @class

  (Document Your View Here)

  @extends SC.View
*/
SC.MediaControlsView = SC.View.extend(
/** @scope SC.MediaControlsView.prototype */{

  target: null,

  childViews: ['playButton', 'progressView', 'timeView', 'minusLabelView', 'volumeView', 'plusLabelView', 'theaterButton'],
  classNames: ['sc-media-controls'],

  playObserver: function(){
    if(this.getPath('target.paused')){
      this.get('playButton').set('icon', 'play');
    }else{
      this.get('playButton').set('icon', 'stop');
    }
  }.observes('*target.paused'),

  playButton: SC.ButtonView.extend({
    title: '',
    icon: 'play',
    layout: { top: 0, left: 0, width: 20, height:20},
    action: "playPause",
    targetBinding: "*owner.target"
  }),

  progressView: SC.MediaSlider.extend({
    layout: { top: 0, left: 25, right: 230, height:20},
    value:0,
    minimum: 0,
    step:0.1,
    valueBinding: "*owner.target.currentTime" ,
    maximumBinding: "*owner.target.duration",
    mediaViewBinding: "*owner.target"
  }),

  timeView: SC.LabelView.extend({
    layout: { top: 0, right: 160, width: 60, height:20},
    classNames: 'time',
    valueBinding: '*owner.target.time'
  }),

  theaterButton: SC.ButtonView.extend({
    title: '',
    icon: 'theater',
    titleMinWidth: 35,
    layout: { top: 0, right: 140, width: 20, height:20},
    action: "fullScreen",
    targetBinding: "*owner.target"
  }),

  minusLabelView: SC.LabelView.extend({
    layout: { top: 0, right: 120, width: 20, height:20},
    value: '',
    icon: 'minus'
  }),

  volumeView: SC.MediaSlider.extend({
    layout: { top: 0, right: 25, width: 90, height:20},
    value:0,
    valueBinding: "*owner.target.volume" ,
    minimum: 0,
    maximum: 1,
    step: 0.01
  }),

  plusLabelView: SC.LabelView.extend({
    layout: { top: 0, right: 0, width: 20, height:20},
    value: '',
    icon: 'plus'
  })
});
