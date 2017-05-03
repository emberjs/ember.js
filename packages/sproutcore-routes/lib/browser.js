// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

window.SC = window.SC || { MODULE_INFO: {}, LAZY_INSTANTIATION: {} };

SC._detectBrowser = function(userAgent, language) {
  var version, webkitVersion, browser = {};

  userAgent = (userAgent || navigator.userAgent).toLowerCase();
  language = language || navigator.language || navigator.browserLanguage;

  // Gibberish at the end is to determine when the browser version is done
  version = browser.version = (userAgent.match( /.*(?:rv|chrome|webkit|opera|ie)[\/: ](.+?)([ \);]|$)/ ) || [])[1];
  webkitVersion = (userAgent.match( /webkit\/(.+?) / ) || [])[1];

  /**
    @name SC.browser.isWindows
    @type Boolean
  */
  browser.windows = browser.isWindows = !!/windows/.test(userAgent);

  /**
    @name SC.browser.isMac
    @type Boolean
  */
  browser.mac = browser.isMac = !!/macintosh/.test(userAgent) || (/mac os x/.test(userAgent) && !/like mac os x/.test(userAgent));

  /**
    @name SC.browser.isiPhone
    @type Boolean
  */
  browser.iPhone = browser.isiPhone = !!/iphone/.test(userAgent);

  /**
    @name SC.browser.isiPod
    @type Boolean
  */
  browser.iPod = browser.isiPod = !!/ipod/.test(userAgent);

  /**
    @name SC.browser.isiPad
    @type Boolean
  */
  browser.iPad = browser.isiPad = !!/ipad/.test(userAgent);

  /**
    @name SC.browser.isiOS
    @type Boolean
  */
  browser.iOS = browser.isiOS = browser.iPhone || browser.iPod || browser.iPad;

  /**
    @name SC.browser.isAndroid
    @type Boolean
  */
  browser.android = browser.isAndroid = !!/android/.test(userAgent);

  /**
    @name SC.browser.opera
    @type String
  */
  browser.opera = /opera/.test(userAgent) ? version : 0;

  /**
    @name SC.browser.isOpera
    @type Boolean
  */
  browser.isOpera = !!browser.opera;

  /**
    @name SC.browser.msie
    @type String
  */
  browser.msie = /msie/.test(userAgent) && !browser.opera ? version : 0;

  /**
    @name SC.browser.isIE
    @type Boolean
  */
  browser.isIE = !!browser.msie;

  /**
    @name SC.browser.isIE8OrLower
    @type Boolean
  */
  browser.isIE8OrLower = !!(browser.msie && parseInt(browser.msie, 10) <= 8);

  /**
    @name SC.browser.mozilla
    @type String
  */
  browser.mozilla = /mozilla/.test(userAgent) && !/(compatible|webkit|msie)/.test(userAgent) ? version : 0;

  /**
    @name SC.browser.isMozilla
    @type Boolean
  */
  browser.isMozilla = !!browser.mozilla;

  /**
    @name SC.browser.webkit
    @type String
  */
  browser.webkit = /webkit/.test(userAgent) ? webkitVersion : 0;

  /**
    @name SC.browser.isWebkit
    @type Boolean
  */
  browser.isWebkit = !!browser.webkit;

  /**
    @name SC.browser.chrome
    @type String
  */
  browser.chrome = /chrome/.test(userAgent) ? version: 0;

  /**
    @name SC.browser.isChrome
    @type Boolean
  */
  browser.isChrome = !!browser.chrome;

  /**
    @name SC.browser.mobileSafari
    @type String
  */
  browser.mobileSafari = /apple.*mobile/.test(userAgent) && browser.iOS ? webkitVersion : 0;

  /**
    @name SC.browser.isMobileSafari
    @type Boolean
  */
  browser.isMobileSafari = !!browser.mobileSafari;

  /**
    @name SC.browser.iPadSafari
    @type String
  */
  browser.iPadSafari = browser.iPad && browser.isMobileSafari ? webkitVersion : 0;

  /**
    @name SC.browser.isiPadSafari
    @type Boolean
  */
  browser.isiPadSafari = !!browser.iPadSafari;

  /**
    @name SC.browser.iPhoneSafari
    @type String
  */
  browser.iPhoneSafari = browser.iPhone && browser.isMobileSafari ? webkitVersion : 0;

  /**
    @name SC.browser.isiPhoneSafari
    @type Boolean
  */
  browser.isiPhoneSafari = !!browser.iphoneSafari;

  /**
    @name SC.browser.iPodSafari
    @type String
  */
  browser.iPodSafari = browser.iPod && browser.isMobileSafari ? webkitVersion : 0;

  /**
    @name SC.browser.isiPodSafari
    @type Boolean
  */
  browser.isiPodSafari = !!browser.iPodSafari;

  /**
    @name SC.browser.isiOSHomeScreen
    @type Boolean
  */
  browser.isiOSHomeScreen = browser.isMobileSafari && !/apple.*mobile.*safari/.test(userAgent);

  /**
    @name SC.browser.safari
    @type String
  */
  browser.safari = browser.webkit && !browser.chrome && !browser.iOS && !browser.android ? webkitVersion : 0;

  /**
    @name SC.browser.isSafari
    @type Boolean
  */
  browser.isSafari = !!browser.safari;

  /**
    @name SC.browser.language
    @type String
  */
  browser.language = language.split('-', 1)[0];

  /**
    Possible values:

      - 'msie'
      - 'mozilla'
      - 'chrome'
      - 'safari'
      - 'opera'
      - 'mobile-safari'
      - 'unknown'

    @name SC.browser.current
    @type String
    @default 'unknown'
  */
  browser.current = browser.msie ? 'msie' : browser.mozilla ? 'mozilla' : browser.chrome ? 'chrome' : browser.safari ? 'safari' : browser.opera ? 'opera' : browser.mobileSafari ? 'mobile-safari' : browser.android ? 'android' : 'unknown';
  return browser;
};


/** @class

  Contains information about the browser environment that SproutCore
  is running in. String properties, such as `SC.browser.webkit` or
  `SC.browser.msie`, will have a value that represents the browser build
  number if that browser is being used. Otherwise, they will have a
  falsey value. For convenience, Boolean counterparts for all of the
  versioned properties are provided.

  @since SproutCore 1.0
*/
SC.browser = SC._detectBrowser();
