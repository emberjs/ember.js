// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2010 Strobe Inc. All rights reserved.
// Author:    Peter Wagenet
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

var cleanBrowser = {
  version: 0,
  windows: 0,
  mac: 0,
  iOS: 0,
  iPhone: 0,
  iPod: 0,
  iPad: 0,
  android: 0,
  opera: 0,
  msie: 0,
  mozilla: 0,
  webkit: 0,
  chrome: 0,
  mobileSafari: 0,
  iPadSafari: 0,
  iPodSafari: 0,
  iPhoneSafari: 0,
  safari: 0
};

// quick and dirty function to combine passed browser props
// with cleanBrowser
function combine(hash) {
  var ret = {},
      key;
  
  for (key in cleanBrowser) {
    if (!cleanBrowser.hasOwnProperty(key)) continue;
    ret[key] = cleanBrowser[key];
  }
  
  for (key in hash) {
    if (!hash.hasOwnProperty(key)) continue;
    ret[key] = hash[key];
  }
  
  return ret;
}

function testUserAgent(userAgent, matchers) {
  var browser = SC._detectBrowser(userAgent), key;
  matchers = combine(matchers);
  for (key in matchers) equals(browser[key], matchers[key], "'" + key + "' should be '" + matchers[key] + "'");
}

test("Chrome Mac 9.0.572.1 with Webkit v534.12", function() {
  var userAgent = "Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10_6_5; en-US) AppleWebKit/534.12 (KHTML, like Gecko) Chrome/9.0.572.1 Safari/534.12";
  testUserAgent(userAgent, { version: '9.0.572.1', chrome: '9.0.572.1', webkit: '534.12', current: 'chrome', mac: true });
});

test("Safari Windows with Webkit v533.18.1", function() {
  var userAgent = "Mozilla/5.0 (Windows; U; Windows NT 6.1; zh-HK) AppleWebKit/533.18.1 (KHTML, like Gecko) Version/5.0.2 Safari/533.18.5";
  testUserAgent(userAgent, { version: '533.18.1', safari: '533.18.1', webkit: '533.18.1', current: 'safari', windows: true });
});

test("Safari Mac with Webkit v533.19.4", function() {
  var userAgent = "Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10_6_6; en-us) AppleWebKit/533.19.4 (KHTML, like Gecko) Version/5.0.3 Safari/533.19.4";
  testUserAgent(userAgent, { version: '533.19.4', safari: '533.19.4', webkit: '533.19.4', current: 'safari', mac: true });
});

test("Safari Windows with Webkit v533.19.4", function() {
  var userAgent = "Mozilla/5.0 (Windows; U; Windows NT 6.0; en-us) AppleWebKit/533.19.4 (KHTML, like Gecko) Version/5.0.3 Safari/533.19.4";
  testUserAgent(userAgent, { version: '533.19.4', safari: '533.19.4', webkit: '533.19.4', current: 'safari', windows: true });
});

test("Opera Linux 9.0", function() {
  var userAgent = "Opera/9.00 (X11; Linux i686; U; pl)";
  testUserAgent(userAgent, { version: '9.00', opera: '9.00', current: 'opera' });
});

test("Opera Windows 8.65", function() {
  var userAgent = "Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1; SV1) Opera 8.65 [en]";
  testUserAgent(userAgent, { version: '8.65', opera: '8.65', current: 'opera', windows: true });
});

test("Opera Mac 10.62", function() {
  var userAgent = "Opera/9.80 (Macintosh; Intel Mac OS X; U; en) Presto/2.6.30 Version/10.62";
  testUserAgent(userAgent, { version: '9.80', opera: '9.80', current: 'opera', mac: true });
});

test("Opera Windows 10.62", function() {
  var userAgent = "Opera/9.80 (Windows NT 6.1; U; en) Presto/2.6.30 Version/10.62";
  testUserAgent(userAgent, { version: '9.80', opera: '9.80', current: 'opera', windows: true });
});

test("Internet Explorer 7.0", function() {
  var userAgent = "Mozilla/4.0 (compatible; MSIE 7.0; Windows NT 6.0)";
  testUserAgent(userAgent, { version: '7.0', msie: '7.0', current: 'msie', windows: true });
});

test("Internet Explorer 8.0", function() {
  var userAgent = "Mozilla/4.0 (compatible; MSIE 8.0; Windows NT 6.0; Trident/4.0)";
  testUserAgent(userAgent, { version: '8.0', msie: '8.0', current: 'msie', windows: true });
});

test("Internet Explorer 9.0", function() {
  var userAgent = "Mozilla/5.0 (Windows; U; MSIE 9.0; Windows NT 9.0; en-US))";
  testUserAgent(userAgent, { version: '9.0', msie: '9.0', current: 'msie', windows: true });
});

test("Mozilla Windows 2.0b4", function() {
  var userAgent;
  userAgent = "Mozilla/5.0 (Windows; U; Windows NT 6.1; it; rv:2.0b4) Gecko/20100818";
  testUserAgent(userAgent, { version: '2.0b4', mozilla: '2.0b4', current: 'mozilla', windows: true });
});

test("Firefox Mac 3.5.13", function() {
  var userAgent = "Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10.6; en-US; rv:1.9.1.13) Gecko/20100914 Firefox/3.5.13";
  testUserAgent(userAgent, { version: '1.9.1.13', mozilla: '1.9.1.13', current: 'mozilla', mac: true });
});

test("Firefox Windows 3.5.13", function() {
  var userAgent = "Mozilla/5.0 (Windows; U; Windows NT 6.1; en-US; rv:1.9.1.13) Gecko/20100914 Firefox/3.5.13";
  testUserAgent(userAgent, { version: '1.9.1.13', mozilla: '1.9.1.13', current: 'mozilla', windows: true });
});

test("Firefox Mac 3.6.10", function() {
  var userAgent = "Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10.6; en-US; rv:1.9.2.10) Gecko/20100914 Firefox/3.6.10";
  testUserAgent(userAgent, { version: '1.9.2.10', mozilla: '1.9.2.10', current: 'mozilla', mac: true });
});

test("Firefox Windows 3.6.10", function() {
  var userAgent = "Mozilla/5.0 (Windows; U; Windows NT 6.1; en-US; rv:1.9.2.10) Gecko/20100914 Firefox/3.6.10";
  testUserAgent(userAgent, { version: '1.9.2.10', mozilla: '1.9.2.10', current: 'mozilla', windows: true });
});

test("Firefox Windows 4.0b7pre", function() {
  var userAgent = "Mozilla/5.0 (Windows NT 6.1; rv:2.0b7pre) Gecko/20100921 Firefox/4.0b7pre";
  testUserAgent(userAgent, { version: '2.0b7pre', mozilla: '2.0b7pre', current: 'mozilla', windows: true });
});

test("Mobile Safari - iOS 3.2.2 iPad", function() {
  var userAgent = "Mozilla/5.0 (iPad; U; CPU OS 3_2_2 like Mac OS X; en-us) AppleWebKit/531.21.10 (KHTML, like Gecko) Version/4.0.4 Mobile/7B500 Safari/531.21.10";
  testUserAgent(userAgent, { version: '531.21.10', webkit: '531.21.10', mobileSafari: '531.21.10', iPadSafari: '531.21.10', current: 'mobile-safari', iOS: true, iPad: true });
});

test("Mobile Safari - iOS 4.0 iPhone", function() {
  var userAgent = "Mozilla/5.0 (iPhone; U; CPU iPhone OS 4_0 like Mac OS X; en-us) AppleWebKit/532.9 (KHTML, like Gecko) Version/4.0.5 Mobile/8A293 Safari/6531.22.7";
  testUserAgent(userAgent, { version: '532.9', webkit: '532.9', mobileSafari: '532.9', iPhoneSafari: '532.9', current: 'mobile-safari', iOS: true, iPhone: true });
});

test("Mobile Safari - iOS 4.1 iPhone", function() {
  var userAgent = "Mozilla/5.0 (iPhone; U; CPU iPhone OS 4_1 like Mac OS X; en-us) AppleWebKit/532.9 (KHTML, like Gecko) Version/4.0.5 Mobile/8B117 Safari/6531.22.7";
  testUserAgent(userAgent, { version: '532.9', webkit: '532.9', mobileSafari: '532.9', iPhoneSafari: '532.9', current: 'mobile-safari', iOS: true, iPhone: true });
});

test("iOS WebView - iOS 4.1 iPhone", function() {
  var userAgent = "Mozilla/5.0 (iPhone; U; CPU iPhone OS 4_1 like Mac OS X; en-us) AppleWebKit/532.9 (KHTML, like Gecko) Mobile/8B117";
  testUserAgent(userAgent, { version: '532.9', webkit: '532.9', current: 'unknown', iOS: true, iPhone: true });
});

test("iOS WebView - iOS 4.2.1 iPhone", function() {
  var userAgent = "Mozilla/5.0 (iPhone; U; CPU iPhone OS 4_2_1 like Mac OS X; en-us) AppleWebKit/533.17.9 (KHTML, like Gecko) Mobile/8C14";
  testUserAgent(userAgent, { version: '533.17.9', webkit: '533.17.9', current: 'unknown', iOS: true, iPhone: true });
});

test("Unknown", function() {
  var userAgent = "Mozilla/5.0 (compatible; Konqueror/4.4; Linux) KHTML/4.4.1 (like Gecko) Fedora/4.4.1-1.fc12";
  testUserAgent(userAgent, { version: undefined, current: 'unknown' });
});

test("Windows - using Safari with Webkit v533.17.8", function(){
  var userAgent = "Mozilla/5.0 (Windows; U; Windows NT 5.2; en-US) AppleWebKit/533.17.8 (KHTML, like Gecko) Version/5.0.1 Safari/533.17.8";
  testUserAgent(userAgent, { windows: true, version: '533.17.8', safari: '533.17.8', webkit: '533.17.8' });
});

test("Mac - using Chrome 9.0.572.1 with Webkit v534.12", function(){
  var userAgent = "Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10_6_5; en-US) AppleWebKit/534.12 (KHTML, like Gecko) Chrome/9.0.572.1 Safari/534.12";
  testUserAgent(userAgent, { mac: true, version: '9.0.572.1', chrome: '9.0.572.1', webkit: '534.12', current: 'chrome' });
});

test("Android - using Samsung Galaxy S on Android 2.1", function() {
  var userAgent = "Mozilla/5.0 (Linux; U; Android 2.1-update1; en-us; SCH-I500 Build/ECLAIR) AppleWebKit/530.17 (KHTML, like Gecko) Version/4.0 Mobile Safari/530.17";
  testUserAgent(userAgent, {android: true, version: '530.17', webkit: '530.17'});
});

test("Language", function(){
  equals(SC._detectBrowser(undefined, 'en-US').language, 'en', "should only show base language part");
});
