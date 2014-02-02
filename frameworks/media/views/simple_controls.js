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
SC.SimpleMediaControlsView = SC.View.extend(
/** @scope SC.SimpleMediaControlsView.prototype */{

  target: null,
  
  childViews: ['playButton', 'progressView'],
  
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
    layout: { top: 0, left: 0, width: 20, height:20 },
    action: "playPause",
    targetBinding: "*owner.target"
  }),
  
  progressView: SC.MediaSlider.design({
    layout: { top: 0, left: 25, right: 10, height:20 },
    value:0,
    minimum: 0,
    step:0.1,
    valueBinding: "*owner.target.currentTime" ,
    maximumBinding: "*owner.target.duration",
    mediaViewBinding: "*owner.target"
  })
});
