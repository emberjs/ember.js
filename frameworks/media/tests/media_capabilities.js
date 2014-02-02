// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

module("SC.mediaCapabilities", {});

/**
 * Is Flash supported?
 * 
 * These unit tests are largely meaningless, because we can't actually control
 * the navigator.plugins array or the window.ActiveXObject class, nor can we
 * manipulate the existence of the getUserMedia properties. Without being able
 * to toggle them dynamically, the best we can test is whether the return value
 * of the capabilities object is the same as is available via plugins... and
 * since that would consist of (at this time) the exact same code, it's somewhat
 * redundant. Still, this unit test is included in case something changes in the
 * future.
 * 
 * @see Department of Redundancy Department
 */
test("Test Flash Support", function() {
  
  doesFlashExist = NO;
  
  // Non-IE detection
  if(navigator.plugins) {
    for( var i = 0; i < navigator.plugins.length; i++) {
      if(navigator.plugins[i].name.indexOf("Shockwave Flash") >= 0) {
        doesFlashExist = YES;
      }
    }
  } else if(window.ActiveXObject) {
    try {
      var control = new ActiveXObject('ShockwaveFlash.ShockwaveFlash');
      delete control;
      doesFlashExist = YES;
    } catch(e) {
    }
  }
  
  equals(SC.mediaCapabilities.isFlashSupported, doesFlashExist, "Flash plugin result must match what the browser supports.");
});

/**
 * Is Quicktime supported?
 */
test("Test Quicktime Support", function() {
  
  doesQuicktimeExist = NO;
  
  // Non-IE detection
  if(navigator.plugins) {
    for( var i = 0; i < navigator.plugins.length; i++) {
      if(navigator.plugins[i].name.indexOf("Shockwave Flash") >= 0) {
        doesQuicktimeExist = YES;
      }
    }
  } else if(window.ActiveXObject) {
    try {
      var control = new ActiveXObject('QuickTime.QuickTime');
      delete control;
      doesQuicktimeExist = YES;
    } catch(e) {
    }
  }
  
  equals(SC.mediaCapabilities.isQuicktimeSupported, doesQuicktimeExist, "Quicktime plugin result must match what the browser supports.");
});

/**
 * Test version support for the HTML5 audio tag.
 */
test("Test HTML5 Audio Support", function() {
  var isAudioSupported = NO;
  try {
    if(SC.browser.isMozilla && SC.browser.compare(SC.browser.mozilla, "3.6") <= 0) {
      throw new Error();
    }
    
    var doc = document.createElement('Audio');
    isAudioSupported = !!doc.canPlayType;
    delete doc;
    
  } catch(e) {
  }
  
  equals(SC.mediaCapabilities.isHTML5AudioSupported, isAudioSupported, "Audio Support flag must match what we've been able to determine from the browser.");
});

/**
 * Test version support for the HTML5 video tag.
 */
test("Test HTML5 Video Support", function() {
  var isVideoSupported = NO;
  try {
    if(SC.browser.isMozilla && SC.browser.compare(SC.browser.mozilla, "3.6") <= 0) {
      throw new Error();
    }
    
    var doc = document.createElement('Video');
    isVideoSupported = !!doc.canPlayType;
    delete doc;
  } catch(e) {
  }
  
  equals(SC.mediaCapabilities.isHTML5VideoSupported, isVideoSupported, "Video Support flag must match what we've been able to determine from the browser.");
});

/**
 * Test version support for the HTML5 getUserMedia spec.
 */
test("Test HTML5 User Media Support", function() {
  var isMediaSupported = !!navigator.getUserMedia;
  equals(SC.mediaCapabilities.isHTML5StreamApiSupported, isMediaSupported, "Stream Support flag must match what we've been able to determine from the browser.");
});

/**
 * Check for video recording support. This test assumes all previous tests have
 * passed.
 */
test("Test Video Recording support", function() {
  // This is true if we either have flash available or if we support user media.
  var isRecordingSupported = SC.mediaCapabilities.get('isHTML5StreamApiSupported') || SC.mediaCapabilities.get('isFlashSupported');
  equals(SC.mediaCapabilities.hasVideoCamera, isRecordingSupported, "Camera support flag must match what we've found in the browser");
});

/**
 * Check for microphone support. This test assumes all previous tests have
 * passed.
 */
test("Test Microphone detection", function() {
  // This is true if we either have flash available or if we support user media.
  var isRecordingSupported = SC.mediaCapabilities.get('isHTML5StreamApiSupported') || SC.mediaCapabilities.get('isFlashSupported');
  equals(SC.mediaCapabilities.hasMicrophone, isRecordingSupported, "Microphone support flag must match what we've found in the browser");
});

/**
 * Check for video playback support. This test assumes all previous tests have
 * passed.
 */
test("Test Video Playback detection", function() {
  // This is true if we either have flash available or if we support user media.
  var isVideoPlaybackSupported = SC.mediaCapabilities.get('isHTML5VideoSupported') || SC.mediaCapabilities.get('isQuicktimeSupported') || SC.mediaCapabilities.get('isFlashSupported');
  equals(SC.mediaCapabilities.hasVideoPlayback, isVideoPlaybackSupported, "Video Playback support flag must match what we've found in the browser");
});

/**
 * Check for audio playback support. This test assumes all previous tests have
 * passed.
 */
test("Test Audio Playback detection", function() {
  // This is true if we either have flash available or if we support user media.
  var isAudioPlaybackSupported = SC.mediaCapabilities.get('isHTML5AudioSupported') || SC.mediaCapabilities.get('isQuicktimeSupported') || SC.mediaCapabilities.get('isFlashSupported');
  equals(SC.mediaCapabilities.hasAudioPlayback, isAudioPlaybackSupported, "Audio Playback support flag must match what we've found in the browser");
});

/**
 * Test for OGG support
 */
test("Test OGG Support", function() {
  // Only Mozilla, Chrome and Opera support OGG.
  var isOggSupported = SC.mediaCapabilities.hasVideoPlayback && (SC.browser.isMozilla || SC.browser.isChrome || SC.browser.isOpera);
  equals(SC.mediaCapabilities.isOggSupported, isOggSupported, "OGG Support support flag must match what we've found in the browser");
});

/**
 * Test for WebM support
 */
test("Test WebM Support", function() {
  // Only Mozilla, Chrome and Opera support WebM.
  var isWebMSupported = SC.mediaCapabilities.hasVideoPlayback && (SC.browser.isMozilla || SC.browser.isChrome || SC.browser.isOpera);
  equals(SC.mediaCapabilities.isWebMSupported, isWebMSupported, "WebM Support support flag must match what we've found in the browser");
});

/**
 * Test for FLV support
 */
test("Test FLV Support", function() {
  // Only Mozilla, Chrome and Opera support WebM.
  var isFLVSupported = SC.mediaCapabilities.isFlashSupported;
  equals(SC.mediaCapabilities.isFLVSupported, isFLVSupported, "FLV Support support flag must equal flash support");
});

/**
 * Test for MP4 support
 */
test("Test MP4 Support", function() {
  // Only IE, Chrome and Safari support MP4
  var isMP4Supported = SC.mediaCapabilities.hasVideoPlayback && (SC.browser.isIE || SC.browser.isChrome || SC.browser.isSafari)
  equals(SC.mediaCapabilities.isMP4Supported, isMP4Supported, "MP4 Support support flag must match what we've found in the browser");
});
