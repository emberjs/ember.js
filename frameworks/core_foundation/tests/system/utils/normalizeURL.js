// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
// ========================================================================
// SC.normalizeURL Tests
// ========================================================================

var url,url1,url2;

module("SC.normalizeURL");

test("should normalize the url passed as the parameter",function(){
 url = '/desktop/mydocuments/music';
 equals(SC.normalizeURL(url), 'http://'+window.location.host+'/desktop/mydocuments/music','Path with slash');
 
 url1 = 'desktop/mydocuments/music';
 equals(SC.normalizeURL(url1), '%@/desktop/mydocuments/music'.fmt(window.location.href),'Path without slash');  

 url2 = 'http:';
 equals(YES,SC.normalizeURL(url2) === url2,'Path with http:');	
});