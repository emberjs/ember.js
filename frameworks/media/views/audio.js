// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

sc_require('views/controls');
sc_require('views/mini_controls');
sc_require('media_capabilities');

/**
  @class

  Renders a audioView using different technologies like HTML5 audio tag,
  quicktime and flash.

  This view wraps the different technologies so you can use one standard and
  simple API to play audio.

  You can specify and array with the order of how the technologies will degrade
  depending on availability. For example you can set degradeList to be
  ['html5', 'flash'] and it will load your audio in an audio tag if the
  technology is available otherwise flash and if neither of the technologies
  are available it will show a message saying that your machine needs to install
  one of this technologies.

  @extends SC.View
  @since SproutCore 1.1
*/

SC.AudioView = SC.View.extend(
/** @scope SC.AudioView.prototype */{

  /**
    Audio view className.
    @type String
  */
  classNames: 'sc-audio-view',

  /**
    Properties that trigger a re render of the view. If the value changes, it
    means that the audio url changed.

    @type Array
  */
  displayProperties: ['value', 'shouldAutoResize'],

  /**
    Reference to the audio object once is created.
    @type Object
  */

  audioObject:null,

  /**
    Array containing the technologies and the order to load them depending
    availability

    @type Array
  */
  degradeList: ['html5','quicktime', 'flash'],

  /**
     Current time in secs

     @type Number
   */
  currentTime : function(key, value) {
    if (!SC.empty(value) && this._currentTime != value) {
      this._currentTime = value;
      this.seek(value);
    }

    return this._currentTime;
  }.property('_currentTime'),

  /**
     Current time in secs

     @type Number
     @private
   */
  _currentTime : 0,

  /**
    Duration in secs
    @type Number
  */
  duration: 0, //audio duration in secs

  /**
    Volume. The value should be between 0 and 1
    @type Number
  */
  volume:0, //volume value from 0 to 1

  /**
    Tells you if the audio is paused or not.
    @type Boolean
  */
  paused: YES, //is the audio paused

  /**
    Tells you if the audio is loaded.
    @type Boolean
  */

  loaded: NO, //has the audio loaded

  /**
    Indicates if the audio has reached the end
    @type Boolean
  */

  ended: NO, //did the audio finished playing

  /**
    Indicates if the audio is ready to be played.
    @type Boolean
  */

  canPlay: NO, //can the audio be played

  loadedTimeRanges:[], //loaded bits

  /**
    Formatted currentTime. (00:00)
    @type String
  */
  time: function(){
    var currentTime=this.get('currentTime'),
        totaltimeInSecs = this.get('duration');
    var formattedTime = this._addZeros(Math.floor(currentTime/60))+':'+this._addZeros(Math.floor(currentTime%60))+"/"+this._addZeros(Math.floor(totaltimeInSecs/60))+':'+this._addZeros(Math.floor(totaltimeInSecs%60));
    return formattedTime;
  }.property('currentTime', 'duration').cacheable(),

  /**
    Renders the appropriate HTML according for the technology to use.

    @param {SC.RenderContext} context the render context
    @param {Boolean} firstTime YES if this is creating a layer
    @returns {void}
  */
  render: function(context, firstTime) {
    var i, j, listLen, pluginsLen, id = SC.guidFor(this);
    if(firstTime){
      for(i=0, listLen = this.degradeList.length; i<listLen; i++){
        switch(this.degradeList[i]){
        case "html5":
          if(!SC.mediaCapabilities.get('isHTML5AudioSupported'))
          {
            break;
          }
          context.push('<audio src="'+this.get('value')+'"');
          if(this.poster){
            context.push(' poster="'+this.poster+'"');
          }
          context.push('/>');
          this.loaded='html5';
          return;
        case "quicktime":
          if(!SC.mediaCapabilities.get('isQuicktimeSupported'))
          {
            break;
          }
          // TODO: this doesn't seem like the best way to determine what tags to use!
          if(SC.browser.name === SC.BROWSER.ie){
            context.push('<object id="qt_event_source" '+
                        'classid="clsid:CB927D12-4FF7-4a9e-A169-56E4B8A75598" '+
                        'codebase="http://www.apple.com/qtactivex/qtplugin.cab#version=7,2,1,0"> '+
                        '</object> ');
          }
          context.push('<object width="100%" height="100%"');
          if(SC.browser.name === SC.BROWSER.ie){
            context.push('style="behavior:url(#qt_event_source);"');
          }
          context.push('classid="clsid:02BF25D5-8C17-4B23-BC80-D3488ABDDC6B" '+
                      'id="qt_'+id+'" '+
                      'codebase="http://www.apple.com/qtactivex/qtplugin.cab">'+
                      '<param name="src" value="'+this.get('value')+'"/>'+
                      '<param name="autoplay" value="false"/>'+
                      '<param name="loop" value="false"/>'+
                      '<param name="controller" value="false"/>'+
                      '<param name="postdomevents" value="true"/>'+
                      '<param name="kioskmode" value="true"/>'+
                      '<param name="bgcolor" value="000000"/>'+
                      '<param name="scale" value="aspect"/>'+
                      '<embed width="100%" height="100%" '+
                      'name="qt_'+id+'" '+
                      'src="'+this.get('value')+'" '+
                      'autostart="false" '+
                      'EnableJavaScript="true" '+
                      'postdomevents="true" '+
                      'kioskmode="true" '+
                      'controller="false" '+
                      'bgcolor="000000"'+
                      'scale="aspect" '+
                      'pluginspage="www.apple.com/quicktime/download">'+
                      '</embed></object>'+
                      '</object>');
          this.loaded='quicktime';
          return;
        case "flash":
          if(!SC.mediaCapabilities.get('isFlashSupported'))
          {
            break;
          }
          var flashURL= sc_static('videoCanvas.swf');

          var movieURL = this.get('value');
          if (!movieURL) return;

          if(movieURL.indexOf('http:')==-1){
            movieURL=location.protocol+'//'+location.host+movieURL;
          }
          if(movieURL.indexOf('?')!=-1){
            movieURL=movieURL.substring(0, movieURL.indexOf('?'));
          }
          movieURL = encodeURI(movieURL);
          context.push('<object classid="clsid:d27cdb6e-ae6d-11cf-96b8-444553540000" '+
                        'codebase="http://download.macromedia.com/pub/shockwave/cabs/flash/swflash.cab#version=8,0,0,0" '+
                        'width="100%" '+
                        'height="100%" '+
                        'id="flash_'+id+'" '+
                        'align="middle">'+
        	              '<param name="allowScriptAccess" value="sameDomain" />'+
        	              '<param name="allowFullScreen" value="true" />'+
        	              '<param name="movie" value="'+flashURL+'&src='+movieURL+'&scid='+id+'" />'+
        	              '<param name="quality" value="autohigh" />'+
        	              '<param name="scale" value="default" />'+
        	              '<param name="wmode" value="transparent" />'+
        	              '<param name="menu" value="false" />'+
                        '<param name="bgcolor" value="#000000" />	'+
        	              '<embed src="'+flashURL+'&src='+movieURL+'&scid='+id+'" '+
        	              'quality="autohigh" '+
        	              'scale="default" '+
        	              'wmode="transparent" '+
        	              'bgcolor="#000000" '+
        	              'width="100%" '+
        	              'height="100%" '+
        	              'name="flash_'+id+'" '+
        	              'align="middle" '+
        	              'allowScriptAccess="sameDomain" '+
        	              'allowFullScreen="true" '+
        	              'menu="false" '+
        	              'type="application/x-shockwave-flash" '+
        	              'pluginspage="http://www.adobe.com/go/getflashplayer" />'+
        	              '</object>');
          this.loaded='flash';
          SC.AudioView.addToAudioFlashViews(this);
          return;
        default:
          context.push('audio is not supported by your browser');
          return;
        }
      }
    }
  },

  valueObserver:function(){
    this.set('currentTime', 0);
    this.set('duration', 0);
    this.set('volume', 0);
    this.set('paused', YES);
    this.set('loaded', NO);
    this.set('ended', NO);
    this.set('canPlay', NO);
    this.set('loadedTimeRanges', []);
    this.replaceLayer();
  }.observes('value'),

  /**
    In didCreateLayer we add DOM events for audio tag or quicktime.

    @returns {void}
  */
  didCreateLayer :function(){
    if(this.loaded==="html5"){
      this.addAudioDOMEvents();
    }
    if(this.loaded==="quicktime"){
      this.addQTDOMEvents();
    }
  },

  didAppendToDocument :function(){
    if(this.loaded==="quicktime"){
      this.addQTDOMEvents();
    }
  },

  /**
    Adds all the necessary audio DOM elements.

    @returns {void}
  */
  addAudioDOMEvents: function() {
    var audioElem, view=this;
    audioElem = this.$('audio')[0];
    this.set('audioObject', audioElem);
    SC.Event.add(audioElem, 'durationchange', this, function () {
      SC.run(function() {
        view.set('duration', audioElem.duration);
      });
    }) ;

    SC.Event.add(audioElem, 'timeupdate', this, function() {
      SC.run(function() {
        view._currentTime = audioElem.currentTime;
        view.propertyDidChange('currentTime');
      });
    });

    SC.Event.add(audioElem, 'loadstart', this, function () {
      SC.run(function() {
        view.set('volume', audioElem.volume);
      });
    });

    SC.Event.add(audioElem, 'play', this, function () {
      SC.run(function() {
        view.set('paused', NO);
      });
    });

    SC.Event.add(audioElem, 'pause', this, function () {
      SC.run(function() {
        view.set('paused', YES);
      });
    });

    SC.Event.add(audioElem, 'canplay', this, function () {
      SC.run(function() {
        view.set('canPlay', YES);
      });
    });

    SC.Event.add(audioElem, 'ended', this, function () {
      SC.run(function() {
        view.set('ended', YES);
      });
    });

    SC.Event.add(audioElem, 'progress', this, function (e) {
      SC.run(function() {
        this.loadedTimeRanges=[];
        for (var j=0, jLen = audioElem.seekable.length; j<jLen; j++){
          this.loadedTimeRanges.push(audioElem.seekable.start(j));
          this.loadedTimeRanges.push(audioElem.seekable.end(j));
        }

        try {
          var trackCount=view.GetTrackCount(),i;
          for (i=1; i<=trackCount;i++){
            if ("Closed Caption"===this.GetTrackType(i)){
              view._closedCaptionTrackIndex=i;
            }
          }
        } catch (f) {}
      }, this);

    });
  },

  /**
     Adds all the necessary quicktime DOM elements.

     @returns {void}
   */
  addQTDOMEvents: function() {
    var media=this._getAudioObject(),
        audioElem = this.$()[0],
        view=this,
        dimensions;
    try{
      media.GetVolume();
    }catch(e){
//      SC.Logger.log('loaded fail trying later');
      this.invokeLater(this.didAppendToDocument, 100);
      return;
    }
    this.set('audioObject', media);
    view.set('duration', media.GetDuration()/media.GetTimeScale());
    view.set('volume', media.GetVolume()/256);

    SC.Event.add(audioElem, 'qt_durationchange', this, function () {
      SC.run(function() {
        view.set('duration', media.GetDuration()/media.GetTimeScale());
      });
    });

    SC.Event.add(audioElem, 'qt_begin', this, function () {
      SC.run(function() {
        view.set('volume', media.GetVolume()/256);
      });
    });

    SC.Event.add(audioElem, 'qt_loadedmetadata', this, function () {
      SC.run(function() {
        view.set('duration', media.GetDuration()/media.GetTimeScale());
      });
    });

    SC.Event.add(audioElem, 'qt_canplay', this, function () {
      SC.run(function() {
        view.set('canPlay', YES);
      });
    });

    SC.Event.add(audioElem, 'qt_ended', this, function () {
      SC.run(function() {
        view.set('ended', YES);
      });
    });

    SC.Event.add(audioElem, 'qt_pause', this, function () {
      SC.run(function() {
        view._currentTime = media.GetTime() / media.GetTimeScale();
        view.propertyDidChange('currentTime');
        view.set('paused', YES);
      });
    });

    SC.Event.add(audioElem, 'qt_play', this, function () {
      SC.run(function() {
        view._currentTime = media.GetTime() / media.GetTimeScale();
        view.propertyDidChange('currentTime');
        view.set('paused', NO);
      });
    });
  },


  /**
     For Quicktime we need to simulated the timer as there is no data,
     coming back from the plugin that reports back the currentTime of the
     audio.

     @returns {void}
   */
  _qtTimer:function(){
    if (this.loaded === 'quicktime' && !this.get('paused')) {
      this.incrementProperty('_currentTime');
      this.propertyDidChange('currentTime');
      this.invokeLater(this._qtTimer, 1000);
    }
  }.observes('paused'),

  /**
    Called when currentTime changes. Notifies the different technologies
    then new currentTime.

    @returns {void}
  */
  seek:function(){
    var timeInSecs, totaltimeInSecs, formattedTime, media=this._getAudioObject();
    if(this.loaded==='html5'){
      // also check for media && media.currentTime, because media.currentTime doesn't exist on value change
      if(media && media.currentTime) media.currentTime=this.get('currentTime');
    }
    if(this.loaded==='quicktime'){
      media.SetTime(this.get('currentTime')*media.GetTimeScale());
    }
    if(this.loaded==='flash'){
      media.setTime(this.get('currentTime'));
    }
  },

  /**
    Set the volume of the audio.

    @returns {void}
  */
  setVolume:function(){
    var media=this._getAudioObject();
    if(this.loaded==="html5") media.volume=this.get('volume');
    if(this.loaded==="quicktime") media.SetVolume(this.get('volume')*256);
    if(this.loaded==="flash") media.setVolume(this.get('volume'));
  }.observes('volume'),

  /**
    Calls the right play method depending on the technology.
    @returns {void}
  */
  play: function(){
    var media=this._getAudioObject();
    if(this.loaded==="html5") media.play();
    if(this.loaded==="quicktime") media.Play();
    if(this.loaded==="flash") media.playVideo();
    this.set('paused', NO);
  },

  /**
    Calls the right stop method depending on the technology.
    @returns {void}
  */
  stop: function(){
    var media=this._getAudioObject();
    if(this.loaded==="html5")  media.pause();
    if(this.loaded==="quicktime")  media.Stop();
    if(this.loaded==="flash")  media.pauseVideo();
    this.set('paused', YES);
  },

  /**
    Plays or stops the audio.
    @returns {void}
  */
  playPause: function(){
    if(this.get('paused')){
      this.play();
    }else{
      this.stop();
    }
  },

  /**
    Enables captions if available
    @returns {void}
  */
  closedCaption:function(){
    if(this.loaded==="html5"){
      try{
        if(this.get('captionsEnabled')){
          if(this._closedCaptionTrackIndex){
            this.SetTrackEnabled(this._closedCaptionTrackIndex,true);
            this.set('captionsEnabled', YES);
          }
        }else{
          this.SetTrackEnabled(this._closedCaptionTrackIndex,false);
          this.set('captionsEnabled', NO);
        }
      }catch(a){}
    }
    return;
  },

  /*private*/


  /**
    Gets the right audio object depending on the browser.
    @returns {void}
  */
  _getAudioObject:function(){
    if(this.loaded==="html5") return this.get('audioObject');
    if(this.loaded==="quicktime") return document['qt_'+SC.guidFor(this)];
    if(this.loaded==="flash") {
      var movieName='flash_'+SC.guidFor(this);
      if (window.document[movieName])
      {
        return window.document[movieName];
      }
      if (navigator.appName.indexOf("Microsoft Internet")==-1)
      {
        if (document.embeds && document.embeds[movieName]) {
          return document.embeds[movieName];
        }
      }
      else
      {
        return document.getElementById(movieName);
      }
    }
  },

  _addZeros:function(value){
    if(value.toString().length<2) return "0"+value;
    return value;
  }

});

/**
  Hash to store references to the different flash audios.
*/
SC.AudioView.flashViews={};

/**
  Adds the flash view to the flashViews hash.
*/
SC.AudioView.addToAudioFlashViews = function(view) {
  SC.AudioView.flashViews[SC.guidFor(view)]=view;
} ;

/**
  This function is called from flash to update the properties of the corresponding
  flash view.
*/
SC.AudioView.updateProperty = function(scid, property, value) {
  var view = SC.AudioView.flashViews[scid];
  if(view){
    SC.run(function() {
      view.set(property, value);
    });
  }
} ;

/**
  Function to log events coming from flash.
*/
SC.AudioView.logFlash = function(message) {
  SC.Logger.log("FLASHLOG: "+message);
} ;


SC.AudioPlayerView = SC.View.extend({
  classNames: 'sc-audio-view',

  childViews: ['audioView', 'mini'],

  value: null,

  degradeList: null,

  audioView:SC.AudioView.design({
    layout: { top: 0, left:0, width:100, height:100},
    degradeListBinding: '*parentView.degradeList',
    valueBinding: '*parentView.value'
  }),

  mini: SC.MiniMediaControlsView.design({
     layout: { bottom:0, left: 0, right: 0, height: 20 },
     targetBinding: '*parentView.audioView'
   })
});
