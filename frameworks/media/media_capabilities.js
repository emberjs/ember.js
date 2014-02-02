// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2012 Michael Krotscheck and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/**
 * @class
 * 
 * An easy-to-reference list of media capabilities which the current running
 * browser supports such as HTML5 and Plugin detection. It is modeled after
 * Flash Player's browser capabilities class, with all the non-media related
 * properties removed. Rather than performing specific browser checks, we
 * instead test by creating some basic DOM elements. It's both more reliable and
 * easier to maintain than browser version checks.
 * 
 * To see whether your target browser will support what you're trying to do,
 * check http://caniuse.com/
 * 
 * @see http://caniuse.com/
 * @since SproutCore 1.8.1
 * @author Michael Krotscheck
 */
SC.mediaCapabilities = SC.Object.create({});

/**
 * Automatic detection of various browser media capabilities.
 */
(function() {
  /**
   * Specifies whether the browser supports the HTML5 <audio> tag.
   * 
   * @name SC.mediaCapabilities.isHTML5AudioSupported
   * @type Boolean
   */
  SC.mediaCapabilities.isHTML5AudioSupported = NO;
  try {
    // Firefox 3.6 doesn't support the W3C API. Disable support.
    if(SC.browser.isMozilla && SC.browser.compare(SC.browser.mozilla, "3.6") <= 0) {
      throw new Error('Browser not supported');
    }
    
    var doc = document.createElement('audio');
    var isAudioSupported = !!doc.canPlayType;
    delete doc;
    SC.mediaCapabilities.isHTML5AudioSupported = isAudioSupported;
    
  } catch(e) {
  }
  
  /**
   * Specifies whether the browser supports the HTML5 <video> tag.
   * 
   * @name SC.mediaCapabilities.isHTML5AudioSupported
   * @type Boolean
   */
  SC.mediaCapabilities.isHTML5VideoSupported = NO;
  try {
    // Firefox 3.6 doesn't support the W3C API. Disable support.
    if(SC.browser.isMozilla && SC.browser.compare(SC.browser.mozilla, "3.6") <= 0) {
      throw new Error('Browser not supported');
    }
    
    var doc = document.createElement('video');
    var isVideoSupported = !!doc.canPlayType;
    delete doc;
    SC.mediaCapabilities.isHTML5VideoSupported = isVideoSupported;
  } catch(e) {
  }
  
  /**
   * Specifies whether the browser supports the Adobe Flash plugin.
   * 
   * @name SC.mediaCapabilities.isHTML5AudioSupported
   * @type Boolean
   */
  SC.mediaCapabilities.isFlashSupported = NO;
  // Non-IE detection
  if(navigator.plugins) {
    for( var i = 0; i < navigator.plugins.length; i++) {
      if(navigator.plugins[i].name.indexOf("Shockwave Flash") >= 0) {
        SC.mediaCapabilities.isFlashSupported = YES;
      }
    }
  }
  // IE ActiveX detection
  if(window.ActiveXObject) {
    try {
      var control = new ActiveXObject('ShockwaveFlash.ShockwaveFlash');
      delete control;
      SC.mediaCapabilities.isFlashSupported = YES;
    } catch(e) {
      // Do nothing- The ActiveX object isn't available.
    }
  }
  
  /**
   * Specifies whether the browser supports quicktime media playback.
   * 
   * @type Boolean
   */
  SC.mediaCapabilities.isQuicktimeSupported = NO;
  
  // Non-IE detection
  if(navigator.plugins) {
    for( var i = 0; i < navigator.plugins.length; i++) {
      if(navigator.plugins[i].name.indexOf("QuickTime") >= 0) {
        SC.mediaCapabilities.isQuicktimeSupported = YES;
      }
    }
  }
  // IE ActiveX detection
  if(window.ActiveXObject) {
    var control = null;
    try {
      control = new ActiveXObject('QuickTime.QuickTime');
      delete control;
      SC.mediaCapabilities.isQuicktimeSupported = YES;
    } catch(e) {
      // Do nothing- the ActiveX object isn't available.
    }
    
    try {
      // This generates a user prompt in Internet Explorer 7
      control = new ActiveXObject('QuickTimeCheckObject.QuickTimeCheck');
      delete control;
      SC.mediaCapabilities.isQuicktimeSupported = YES;
    } catch(e) {
      // Do nothing- The ActiveX object isn't available.
    }
  }
  
  /**
   * Specifies whether the browser supports the HTML5 getUserMedia/Stream API.
   * 
   * NOTE: As of February 2012, this feature is still in Draft status and is
   * likely to change frequently. It's included here for the sake of
   * completeness, however concrete implementations don't yet exist.
   * 
   * @name SC.mediaCapabilities.isHTML5StreamApiSupported
   * @type Boolean
   */
  SC.mediaCapabilities.isHTML5StreamApiSupported = !!navigator.getUserMedia;
  
  /**
   * Specifies whether the browser supports audio recording via the HTML5 stream
   * API or the Adobe Flash plugin.
   * 
   * @name SC.mediaCapabilities.hasMicrophone
   * @type Boolean
   */
  SC.mediaCapabilities.hasMicrophone = SC.mediaCapabilities.isHTML5StreamApiSupported || SC.mediaCapabilities.isFlashSupported;
  
  /**
   * Specifies whether the browser supports video recording via the HTML5 stream
   * API or the Adobe Flash Plugin.
   * 
   * @name SC.mediaCapabilities.hasMicrophone
   * @type Boolean
   */
  SC.mediaCapabilities.hasVideoCamera = SC.mediaCapabilities.isHTML5StreamApiSupported || SC.mediaCapabilities.isFlashSupported;
  
  /**
   * Specifies whether the browser has audio playback capabilities.
   * 
   * @name SC.mediaCapabilities.hasAudioPlayback
   * @type Boolean
   */
  SC.mediaCapabilities.hasAudioPlayback = SC.mediaCapabilities.isHTML5AudioSupported || SC.mediaCapabilities.isQuicktimeSupported || SC.mediaCapabilities.isFlashSupported;
  
  /**
   * Specifies whether the browser has video playback capabilities.
   * 
   * @name SC.mediaCapabilities.hasVideoPlayback
   * @type Boolean
   */
  SC.mediaCapabilities.hasVideoPlayback = SC.mediaCapabilities.isHTML5VideoSupported || SC.mediaCapabilities.isQuicktimeSupported || SC.mediaCapabilities.isFlashSupported;
  
  /**
   * Specifies whether the browser supports Ogg Vorbis.
   * 
   * @name SC.mediaCapabilities.isOggSupported
   * @type Boolean
   */
  SC.mediaCapabilities.isOggSupported = SC.mediaCapabilities.hasVideoPlayback && (SC.browser.isMozilla || SC.browser.isChrome || SC.browser.isOpera);
  
  /**
   * Specifies whether the browser supports the WebM/VP8 Video format.
   * 
   * @name SC.mediaCapabilities.isWebMSupported
   * @type Boolean
   */
  SC.mediaCapabilities.isWebMSupported = SC.mediaCapabilities.hasVideoPlayback && (SC.browser.isMozilla || SC.browser.isChrome || SC.browser.isOpera);
  
  /**
   * Specifies whether the browser supports the Adobe FLV compression format.
   * 
   * @name isFLVSupported
   * @type Boolean
   */
  SC.mediaCapabilities.isFLVSupported = SC.mediaCapabilities.isFlashSupported;
  
  /**
   * Specifies whether the browser supports the MPEG-4/H.264 Video format
   * 
   * @name isMP4Supported
   * @type Boolean
   */
  SC.mediaCapabilities.isMP4Supported = SC.mediaCapabilities.hasVideoPlayback && (SC.browser.isIE || SC.browser.isChrome || SC.browser.isSafari);
  
})();
