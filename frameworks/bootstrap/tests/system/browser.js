// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2010 Strobe Inc. All rights reserved.
// Author:    Peter Wagenet
// License:   Licensed under MIT license (see license.js)
// ==========================================================================


var userAgents = {

// CHROME

  "Mozilla/5.0 (compatible; Konqueror/4.4; Linux) KHTML/4.4.1 (like Gecko) Fedora/4.4.1-1.fc12": {
    device: SC.DEVICE.desktop,
    name: SC.BROWSER.unknown,
    version: '0',
    os: SC.OS.linux,
    osVersion: '0',
    engine: SC.BROWSER.unknown,
    engineVersion: '0'
  },
  "Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10_6_5; en-US) AppleWebKit/534.12 (KHTML, like Gecko) Chrome/9.0.572.1 Safari/534.12": {
    device: SC.DEVICE.desktop,
    name: SC.BROWSER.chrome,
    version: '9.0.572.1',
    os: SC.OS.mac,
    osVersion: '10.6.5',
    engine: SC.ENGINE.webkit,
    engineVersion: '534.12'
  },
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_7_2) AppleWebKit/535.7 (KHTML, like Gecko) Chrome/16.0.912.63 Safari/535.7": {
    device: SC.DEVICE.desktop,
    name: SC.BROWSER.chrome,
    version: '16.0.912.63',
    os: SC.OS.mac,
    osVersion: '10.7.2',
    engine: SC.ENGINE.webkit,
    engineVersion: '535.7'
  },
  "Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/535.7 (KHTML, like Gecko) Chrome/16.0.912.36 Safari/535.7": {
    device: SC.DEVICE.desktop,
    name: SC.BROWSER.chrome,
    version: '16.0.912.36',
    os: SC.OS.win,
    osVersion: '6.1',
    engine: SC.ENGINE.webkit,
    engineVersion: '535.7'
  },

// OPERA

  "Opera/9.00 (X11; Linux i686; U; pl)": {
    device: SC.DEVICE.desktop,
    name: SC.BROWSER.opera,
    version: '9.00',
    os: SC.OS.linux,
    osVersion: '0',
    engine: SC.ENGINE.opera,
    engineVersion: '9.00'
  },
  "Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1; SV1) Opera 8.65 [en]": {
    device: SC.DEVICE.desktop,
    name: SC.BROWSER.opera,
    version: '8.65',
    os: SC.OS.win,
    osVersion: '5.1',
    engine: SC.ENGINE.opera,
    engineVersion: '8.65'
  },
  "Opera/9.80 (Windows NT 6.1; U; en) Presto/2.6.30 Version/10.62": {
    device: SC.DEVICE.desktop,
    name: SC.BROWSER.opera,
    version: '10.62',
    os: SC.OS.win,
    osVersion: '6.1',
    engine: SC.ENGINE.presto,
    engineVersion: '2.6.30'
  },
  "Opera/9.80 (Windows NT 5.1; U; en) Presto/2.9.168 Version/11.51": {
    device: SC.DEVICE.desktop,
    name: SC.BROWSER.opera,
    version: '11.51',
    os: SC.OS.win,
    osVersion: '5.1',
    engine: SC.ENGINE.presto,
    engineVersion: '2.9.168'
  },
  "Opera/9.80 (Windows NT 6.1; U; es-ES) Presto/2.9.181 Version/12.00": {
    device: SC.DEVICE.desktop,
    name: SC.BROWSER.opera,
    version: '12.00',
    os: SC.OS.win,
    osVersion: '6.1',
    engine: SC.ENGINE.presto,
    engineVersion: '2.9.181'
  },
  "Opera/9.80 (Macintosh; Intel Mac OS X; U; en) Presto/2.6.30 Version/10.62": {
    device: SC.DEVICE.desktop,
    name: SC.BROWSER.opera,
    version: '10.62',
    os: SC.OS.mac,
    osVersion: '0',
    engine: SC.ENGINE.presto,
    engineVersion: '2.6.30'
  },
  "Opera/9.80 (Macintosh; Intel Mac OS X 10.6.8; U; fr) Presto/2.9.168 Version/11.52": {
    device: SC.DEVICE.desktop,
    name: SC.BROWSER.opera,
    version: '11.52',
    os: SC.OS.mac,
    osVersion: '10.6.8',
    engine: SC.ENGINE.presto,
    engineVersion: '2.9.168'
  },

// INTERNET EXPLORER

  "Mozilla/4.0 (compatible; MSIE 7.0; Windows NT 6.0)": {
    device: SC.DEVICE.desktop,
    name: SC.BROWSER.ie,
    version: '7.0',
    os: SC.OS.win,
    osVersion: '6.0',
    engine: SC.ENGINE.trident,
    engineVersion: '7.0'
  },
  "Mozilla/4.0 (compatible; MSIE 8.0; Windows NT 6.0; Trident/4.0)": {
    device: SC.DEVICE.desktop,
    name: SC.BROWSER.ie,
    version: '8.0',
    os: SC.OS.win,
    osVersion: '6.0',
    engine: SC.ENGINE.trident,
    engineVersion: '4.0'
  },
  "Mozilla/5.0 (Windows; U; MSIE 9.0; Windows NT 9.0; en-US))": {
    device: SC.DEVICE.desktop,
    name: SC.BROWSER.ie,
    version: '9.0',
    os: SC.OS.win,
    osVersion: '9.0',
    engine: SC.ENGINE.trident,
    engineVersion: '9.0'
  },
  "Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.1; Trident/5.0)": {
    device: SC.DEVICE.desktop,
    name: SC.BROWSER.ie,
    version: '9.0',
    os: SC.OS.win,
    osVersion: '6.1',
    engine: SC.ENGINE.trident,
    engineVersion: '5.0'
  },
  "Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.1; WOW64; Trident/6.0)": {
    device: SC.DEVICE.desktop,
    name: SC.BROWSER.ie,
    version: '10.0',
    os: SC.OS.win,
    osVersion: '6.1',
    engine: SC.ENGINE.trident,
    engineVersion: '6.0'
  },
  "Mozilla/5.0 (compatible; MSIE 10.6; Windows NT 6.1; Trident/5.0; InfoPath.2; SLCC1; .NET CLR 3.0.4506.2152; .NET CLR 3.5.30729; .NET CLR 2.0.50727) 3gpp-gba UNTRUSTED/1.0": {
    device: SC.DEVICE.desktop,
    name: SC.BROWSER.ie,
    version: '10.6',
    os: SC.OS.win,
    osVersion: '6.1',
    engine: SC.ENGINE.trident,
    engineVersion: '5.0'
  },
  "Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.2; Win64; x64; Trident/6.0)": {
    device: SC.DEVICE.desktop,
    name: SC.BROWSER.ie,
    version: '10.0',
    os: SC.OS.win,
    osVersion: '6.2',
    engine: SC.ENGINE.trident,
    engineVersion: '6.0'
  },
  "Mozilla/5.0 (compatible; MSIE 10.6; Windows NT 6.1; Trident/5.0; InfoPath.2; SLCC1; .NET CLR 3.0.4506.2152; .NET CLR 3.5.30729; .NET CLR 2.0.50727) 3gpp-gba UNTRUSTED/1.0": {
    device: SC.DEVICE.desktop,
    name: SC.BROWSER.ie,
    version: '10.6',
    os: SC.OS.win,
    osVersion: '6.1',
    engine: SC.ENGINE.trident,
    engineVersion: '5.0'
  },
  "Mozilla/5.0 (Windows NT 6.3; Trident/7.0; rv:11.0) like Gecko": {
    device: SC.DEVICE.desktop,
    name: SC.BROWSER.ie,
    version: '11.0',
    os: SC.OS.win,
    osVersion: '6.3',
    engine: SC.ENGINE.trident,
    engineVersion: '7.0'
  },

// MOZILLA

  "Mozilla/5.0 (Windows; U; Windows NT 6.1; it; rv:2.0b4) Gecko/20100818": {
    device: SC.DEVICE.desktop,
    name: SC.ENGINE.gecko,
    version: '0',
    os: SC.OS.win,
    osVersion: '6.1',
    engine: SC.ENGINE.gecko,
    engineVersion: '2.0b4'
  },

// FIREFOX

  "Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10.6; en-US; rv:1.9.1.13) Gecko/20100914 Firefox/3.5.13": {
    device: SC.DEVICE.desktop,
    name: SC.BROWSER.firefox,
    version: '3.5.13',
    os: SC.OS.mac,
    osVersion: '10.6',
    engine: SC.ENGINE.gecko,
    engineVersion: '1.9.1.13'
  },
  "Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10.6; en-US; rv:1.9.2.10) Gecko/20100914 Firefox/3.6.10": {
    device: SC.DEVICE.desktop,
    name: SC.BROWSER.firefox,
    version: '3.6.10',
    os: SC.OS.mac,
    osVersion: '10.6',
    engine: SC.ENGINE.gecko,
    engineVersion: '1.9.2.10'
  },
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.6; rv:9.0) Gecko/20100101 Firefox/9.0": {
    device: SC.DEVICE.desktop,
    name: SC.BROWSER.firefox,
    version: '9.0',
    os: SC.OS.mac,
    osVersion: '10.6',
    engine: SC.ENGINE.gecko,
    engineVersion: '9.0'
  },
  "Mozilla/5.0 (Windows; U; Windows NT 6.1; en-US; rv:1.9.1.13) Gecko/20100914 Firefox/3.5.13": {
    device: SC.DEVICE.desktop,
    name: SC.BROWSER.firefox,
    version: '3.5.13',
    os: SC.OS.win,
    osVersion: '6.1',
    engine: SC.ENGINE.gecko,
    engineVersion: '1.9.1.13'
  },
  "Mozilla/5.0 (Windows; U; Windows NT 6.1; en-US; rv:1.9.2.10) Gecko/20100914 Firefox/3.6.10": {
    device: SC.DEVICE.desktop,
    name: SC.BROWSER.firefox,
    version: '3.6.10',
    os: SC.OS.win,
    osVersion: '6.1',
    engine: SC.ENGINE.gecko,
    engineVersion: '1.9.2.10'
  },
  "Mozilla/5.0 (Windows NT 6.1; rv:2.0b7pre) Gecko/20100921 Firefox/4.0b7pre": {
    device: SC.DEVICE.desktop,
    name: SC.BROWSER.firefox,
    version: '4.0b7pre',
    os: SC.OS.win,
    osVersion: '6.1',
    engine: SC.ENGINE.gecko,
    engineVersion: '2.0b7pre'
  },
  "Mozilla/5.0 (Windows NT 6.1; rv:6.0) Gecko/20110814 Firefox/6.0": {
    device: SC.DEVICE.desktop,
    name: SC.BROWSER.firefox,
    version: '6.0',
    os: SC.OS.win,
    osVersion: '6.1',
    engine: SC.ENGINE.gecko,
    engineVersion: '6.0'
  },

// SAFARI

  "Mozilla/5.0 (Macintosh; U; PPC Mac OS X; sv-se) AppleWebKit/419 (KHTML, like Gecko) Safari/419.3": {
    device: SC.DEVICE.desktop,
    name: SC.BROWSER.safari,
    version: '0',
    os: SC.OS.mac,
    osVersion: '0',
    engine: SC.ENGINE.webkit,
    engineVersion: '419'
  },
  "Mozilla/5.0 (Macintosh; U; PPC Mac OS X 10_5_8; ja-jp) AppleWebKit/530.19.2 (KHTML, like Gecko) Version/3.2.3 Safari/525.28.3": {
    device: SC.DEVICE.desktop,
    name: SC.BROWSER.safari,
    version: '3.2.3',
    os: SC.OS.mac,
    osVersion: '10.5.8',
    engine: SC.ENGINE.webkit,
    engineVersion: '530.19.2'
  },
  "Mozilla/5.0 (Macintosh; U; PPC Mac OS X 10_4_11; nl-nl) AppleWebKit/533.16 (KHTML, like Gecko) Version/4.1 Safari/533.16": {
    device: SC.DEVICE.desktop,
    name: SC.BROWSER.safari,
    version: '4.1',
    os: SC.OS.mac,
    osVersion: '10.4.11',
    engine: SC.ENGINE.webkit,
    engineVersion: '533.16'
  },
  "Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10_6_6; en-us) AppleWebKit/533.19.4 (KHTML, like Gecko) Version/5.0.3 Safari/533.19.4": {
    device: SC.DEVICE.desktop,
    name: SC.BROWSER.safari,
    version: '5.0.3',
    os: SC.OS.mac,
    osVersion: '10.6.6',
    engine: SC.ENGINE.webkit,
    engineVersion: '533.19.4'
  },
  "Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10_6_8; de-at) AppleWebKit/533.21.1 (KHTML, like Gecko) Version/5.0.5 Safari/533.21.1": {
    device: SC.DEVICE.desktop,
    name: SC.BROWSER.safari,
    version: '5.0.5',
    os: SC.OS.mac,
    osVersion: '10.6.8',
    engine: SC.ENGINE.webkit,
    engineVersion: '533.21.1'
  },
  "Mozilla/5.0 (Windows; U; Windows NT 5.0; en-en) AppleWebKit/533.16 (KHTML, like Gecko) Version/4.1 Safari/533.16": {
    device: SC.DEVICE.desktop,
    name: SC.BROWSER.safari,
    version: '4.1',
    os: SC.OS.win,
    osVersion: '5.0',
    engine: SC.ENGINE.webkit,
    engineVersion: '533.16'
  },
  "Mozilla/5.0 (Windows; U; Windows NT 5.2; en-US) AppleWebKit/533.17.8 (KHTML, like Gecko) Version/5.0.1 Safari/533.17.8": {
    device: SC.DEVICE.desktop,
    name: SC.BROWSER.safari,
    version: '5.0.1',
    os: SC.OS.win,
    osVersion: '5.2',
    engine: SC.ENGINE.webkit,
    engineVersion: '533.17.8'
  },
  "Mozilla/5.0 (Windows; U; Windows NT 6.1; zh-HK) AppleWebKit/533.18.1 (KHTML, like Gecko) Version/5.0.2 Safari/533.18.5": {
    device: SC.DEVICE.desktop,
    name: SC.BROWSER.safari,
    version: '5.0.2',
    os: SC.OS.win,
    osVersion: '6.1',
    engine: SC.ENGINE.webkit,
    engineVersion: '533.18.1'
  },
  "Mozilla/5.0 (Windows; U; Windows NT 6.0; en-us) AppleWebKit/533.19.4 (KHTML, like Gecko) Version/5.0.3 Safari/533.19.4": {
    device: SC.DEVICE.desktop,
    name: SC.BROWSER.safari,
    version: '5.0.3',
    os: SC.OS.win,
    osVersion: '6.0',
    engine: SC.ENGINE.webkit,
    engineVersion: '533.19.4'
  },
  "Mozilla/5.0 (Windows; U; Windows NT 6.1; tr-TR) AppleWebKit/533.20.25 (KHTML, like Gecko) Version/5.0.4 Safari/533.20.27": {
    device: SC.DEVICE.desktop,
    name: SC.BROWSER.safari,
    version: '5.0.4',
    os: SC.OS.win,
    osVersion: '6.1',
    engine: SC.ENGINE.webkit,
    engineVersion: '533.20.25'
  },

// BLACKBERRY

  "Mozilla/5.0 (BlackBerry; U; BlackBerry 9850; en-US) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.0.0.115 Mobile Safari/534.11+": {
    device: SC.DEVICE.blackberry,
    name: SC.BROWSER.blackberry,
    version: '7.0.0.115',
    os: SC.OS.blackberry,
    osVersion: '0',
    engine: SC.ENGINE.webkit,
    engineVersion: '534.11+'
  },

// MOBILE SAFARI

  "Mozilla/5.0 (iPhone; U; CPU iPhone OS 4_0 like Mac OS X; en-us) AppleWebKit/532.9 (KHTML, like Gecko) Version/4.0.5 Mobile/8A293 Safari/6531.22.7": {
    device: SC.DEVICE.iphone,
    name: SC.BROWSER.safari,
    version: '4.0.5',
    os: SC.OS.ios,
    osVersion: '4.0',
    engine: SC.ENGINE.webkit,
    engineVersion: '532.9'
  },
  "Mozilla/5.0 (iPhone; U; CPU iPhone OS 4_1 like Mac OS X; en-us) AppleWebKit/532.9 (KHTML, like Gecko) Version/4.0.5 Mobile/8B117 Safari/6531.22.7": {
    device: SC.DEVICE.iphone,
    name: SC.BROWSER.safari,
    version: '4.0.5',
    os: SC.OS.ios,
    osVersion: '4.1',
    engine: SC.ENGINE.webkit,
    engineVersion: '532.9'
  },
  "Mozilla/5.0 (iPhone; U; CPU iPhone OS 4_1 like Mac OS X; en-us) AppleWebKit/532.9 (KHTML, like Gecko) Mobile/8B117": {
    device: SC.DEVICE.iphone,
    name: SC.BROWSER.safari,
    version: '0',
    os: SC.OS.ios,
    osVersion: '4.1',
    engine: SC.ENGINE.webkit,
    engineVersion: '532.9'
  },
  "Mozilla/5.0 (iPhone; U; CPU iPhone OS 4_2_1 like Mac OS X; en-us) AppleWebKit/533.17.9 (KHTML, like Gecko) Mobile/8C14": {
    device: SC.DEVICE.iphone,
    name: SC.BROWSER.safari,
    version: '0',
    os: SC.OS.ios,
    osVersion: '4.2.1',
    engine: SC.ENGINE.webkit,
    engineVersion: '533.17.9'
  },
  "Mozilla/5.0 (iPhone; CPU iPhone OS 5_0_1 like Mac OS X) AppleWebKit/534.46 (KHTML, like Gecko) Version/5.1 Mobile/9A405 Safari/7534.48.3": {
    device: SC.DEVICE.iphone,
    name: SC.BROWSER.safari,
    version: '5.1',
    os: SC.OS.ios,
    osVersion: '5.0.1',
    engine: SC.ENGINE.webkit,
    engineVersion: '534.46'
  },
  "Mozilla/5.0 (iPad; U; CPU OS 3_2_2 like Mac OS X; en-us) AppleWebKit/531.21.10 (KHTML, like Gecko) Version/4.0.4 Mobile/7B500 Safari/531.21.10": {
    device: SC.DEVICE.ipad,
    name: SC.BROWSER.safari,
    version: '4.0.4',
    os: SC.OS.ios,
    osVersion: '3.2.2',
    engine: SC.ENGINE.webkit,
    engineVersion: '531.21.10'
  },
  "Mozilla/5.0(iPad; U; CPU OS 4_3 like Mac OS X; en-us) AppleWebKit/533.17.9 (KHTML, like Gecko) Version/5.0.2 Mobile/8F191 Safari/6533.18.5": {
    device: SC.DEVICE.ipad,
    name: SC.BROWSER.safari,
    version: '5.0.2',
    os: SC.OS.ios,
    osVersion: '4.3',
    engine: SC.ENGINE.webkit,
    engineVersion: '533.17.9'
  },
  "Mozilla/5.0 (iPad; CPU OS 7_0 like Mac OS X) AppleWebKit/537.51.1 (KHTML, like Gecko) Version/7.0 Mobile/11A465 Safari/9537.53": {
    device: SC.DEVICE.ipad,
    name: SC.BROWSER.safari,
    version: '7.0',
    os: SC.OS.ios,
    osVersion: '7.0',
    engine: SC.ENGINE.webkit,
    engineVersion: '537.51.1'
  },

// Android

  "Mozilla/5.0 (Linux; U; Android 2.1-update1; en-us; SCH-I500 Build/ECLAIR) AppleWebKit/530.17 (KHTML, like Gecko) Version/4.0 Mobile Safari/530.17": {
    device: SC.DEVICE.android,
    name: SC.BROWSER.android,
    version: '4.0',
    os: SC.OS.android,
    osVersion: '2.1-update1',
    engine: SC.ENGINE.webkit,
    engineVersion: '530.17'
  },
  "Mozilla/5.0 (Linux; U; Android 2.3.4; en-us; T-Mobile myTouch 3G Slide Build/GRI40) AppleWebKit/533.1 (KHTML, like Gecko) Version/4.0 Mobile Safari/533.1": {
    device: SC.DEVICE.android,
    name: SC.BROWSER.android,
    version: '4.0',
    os: SC.OS.android,
    osVersion: '2.3.4',
    engine: SC.ENGINE.webkit,
    engineVersion: '533.1'
  },
  "Mozilla/5.0 (Linux; U; Android 2.3.4; fr-fr; HTC Desire Build/GRJ22) AppleWebKit/533.1 (KHTML, like Gecko) Version/4.0 Mobile Safari/533.1": {
    device: SC.DEVICE.android,
    name: SC.BROWSER.android,
    version: '4.0',
    os: SC.OS.android,
    osVersion: '2.3.4',
    engine: SC.ENGINE.webkit,
    engineVersion: '533.1'
  },
  "Mozilla/5.0 (Linux; U; Android 2.3.5; en-us; HTC Vision Build/GRI40) AppleWebKit/533.1 (KHTML, like Gecko) Version/4.0 Mobile Safari/533.1": {
    device: SC.DEVICE.android,
    name: SC.BROWSER.android,
    version: '4.0',
    os: SC.OS.android,
    osVersion: '2.3.5',
    engine: SC.ENGINE.webkit,
    engineVersion: '533.1'
  },

// KINDLE

  "Mozilla/5.0 (Linux; U; Android 2.3.4; en-us; Kindle Fire Build/GINGERBREAD) AppleWebKit/533.1 (KHTML, like Gecko) Version/4.0 Mobile Safari/533.1": {
    device: SC.DEVICE.android,
    name: SC.BROWSER.android,
    version: '4.0',
    os: SC.OS.android,
    osVersion: '2.3.4',
    engine: SC.ENGINE.webkit,
    engineVersion: '533.1'
  }

};

// Cycle through all the given user agents and test them individually against their expected
// values.
for (var userAgent in userAgents) {

  test(userAgent, function() {
    var userAgent,
        browser,
        expected;

    userAgent = this.working.test;
    browser = SC.detectBrowser(userAgent);
    expected = userAgents[userAgent];
    for (var key in expected) {
      if ( !browser.hasOwnProperty(key) || browser[key] == null) {
        ok(false,"Property %@ not set, expected %@".fmt(key, expected[key]));
      }
      if (browser[key] && typeof browser[key] !== "function") {
        equals(browser[key], expected[key], "'" + key + "' should be '" + expected[key] + "'");
      }
    }
  });

}

// COMMON

test("Language", function(){
  equals(SC.detectBrowser(undefined, 'fr').language, 'fr', "should only show base language part");
  equals(SC.detectBrowser(undefined, 'en-US').language, 'en', "should only show base language part");
  equals(SC.detectBrowser(undefined, 'es-ES').language, 'es', "should only show base language part");
});

test("CountyCode", function(){
  equals(SC.detectBrowser(undefined, 'fr').countryCode, undefined, "should not have a countryCode if the language doesn't indicate it");
  equals(SC.detectBrowser(undefined, 'en-US').countryCode, 'us', "should only show ISO 639-1 countryCode part");
  equals(SC.detectBrowser(undefined, 'es-ES').countryCode, 'es', "should only show ISO 639-1 countryCode part");
});

