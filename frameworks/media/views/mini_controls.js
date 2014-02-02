// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals SC */

sc_require('views/media_slider');
/** @class
  @extends SC.View
*/
SC.MiniMediaControlsView = SC.View.extend(
/** @scope SC.MiniMediaControlsView.prototype */{

  target: null,

  childViews: ['playButton', 'timeView', 'minusLabelView', 'volumeView'],
  classNames: ['sc-media-controls'],

  playObserver: function(){
    if(this.getPath('target.paused')){
      this.get('playButton').set('icon', 'play');
    }else{
      this.get('playButton').set('icon', 'stop');
    }
  }.observes('*target.paused'),


  playButton: SC.ButtonView.design({
    title: '',
    titleMinWidth: 35,
    icon: 'play',
    noStyle: YES,
    layout: { top: 0, left: 0, width: 20, height:20},
    action: "playPause",
    targetBinding: "*owner.target",
    renderStyle: 'renderImage',
    theme: ''
  }),

  timeView: SC.LabelView.design({
    layout: { top: 0, left: 20, width: 60, height:20},
    classNames: 'time',
    valueBinding: '*owner.target.time'
  }),

  minusLabelView: SC.LabelView.design({
    layout: { top: 0, left: 80, width: 20, height:20},
    value: '',
    icon: 'minus'
  }),

  volumeView: SC.MediaSlider.design({
    layout: { top: 0, left: 100, right: 10, height:20},
    value:0,
    valueBinding: "*owner.target.volume" ,
    minimum: 0,
    maximum: 1,
    step: 0.01
  })
});
