// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/*globals module test equals createCookie readCookie eraseCookies */

var setCookies = ['cookie', 'cookie2', 'cookie-hashincreate', 'cookie-number', 'cookie-usingset', 'cookie-2-1', 'cookie-2-2', 'cookie-2-3', 'cookie-expires', 'cookie-destroy', 'cookie-find'];
eraseCookies();
setCookies = [];

if (document.cookie !== "") {
  SC.Logger.warn("document.cookie not empty -- test results may be contaminated -- %@".fmt(document.cookie));
}

module("SC.Cookie", {
  setup: function() {
    setCookies = [];
  },
  teardown: function() {
    eraseCookies();
  }
});


// functions borrowed from http://www.quirksmode.org/js/cookies.html
// should be good to test against

function createCookie(name,value,days) {
  var expires;
	if (days) {
		var date = new Date();
		date.setTime(date.getTime()+(days*24*60*60*1000));
		expires = "; expires="+date.toGMTString();
	}
	else expires = "";
	document.cookie = name+"="+value+expires+"; path=/";
}

function readCookie(name) {
	var nameEQ = name + "=";
	var ca = document.cookie.split(';');
	for(var i=0;i < ca.length;i++) {
		var c = ca[i];
		while (c.charAt(0)==' ') c = c.substring(1,c.length);
		if (c.indexOf(nameEQ) === 0) return decodeURIComponent(c.substring(nameEQ.length,c.length));
	}
	return null;
}

function eraseCookies() {
  setCookies.forEach(function(cookie) {
    createCookie(cookie, "", -1);
  });
}


test("Setting a cookie - hash in create", function() {
  var date = new Date();
  date.setTime(date.getTime() + 1000);
  var cookie = SC.Cookie.create({name: "cookie-hashincreate", value: "testing value", expires: date}).write();
  
  var result = readCookie('cookie-hashincreate');
  equals(result, "testing value", "value from document.cookie should match what we set");
  
  setCookies = ["cookie-hashincreate"];
});

test("Setting a cookie - using set", function() {
  var date = new Date();
  date.setTime(date.getTime() + 1000);
  var cookie = SC.Cookie.create({expires: date}).set('name', 'cookie-usingset').set('value', "testing value").write();
  
  var result = readCookie('cookie-usingset');
  equals(result, "testing value", "value from document.cookie should match what we set");
  
  setCookies = ["cookie-usingset"];
});

test("Setting a cookie - no write", function() {
  var date = new Date();
  date.setTime(date.getTime() + 1000);
  var cookie = SC.Cookie.create({name: "cookie-nowrite", value: "testing value", expires: date});
  
  var result = readCookie('cookie-nowrite');
  equals(result, null, "value from document.cookie should be null");
  
  setCookies = ["cookie-nowrite"];
});

test("Setting a cookie - using an numeral expires", function() {
  var cookie = SC.Cookie.create({name: "cookie-number", value: "testing value", expires: 1}).write();
  var result = readCookie('cookie-number');
  equals(result, "testing value", "value from document.cookie should be 'testing value'");
  
  setCookies = ["cookie-number"];
});

test("Setting 2 cookies", function() {
  var date = new Date();
  date.setTime(date.getTime() + 1000);
  var cookie = SC.Cookie.create({name: "cookie-2-1", value: "testing value", expires: date}).write();
  var cookie2 = SC.Cookie.create({name: "cookie-2-2", value: "testing value for second", expires: date}).write();
  
  var value = readCookie('cookie-2-1');
  equals(value, "testing value", "value from first cookie");
  var value2 = readCookie('cookie-2-2');
  equals(value2, "testing value for second", "value from second cookie");
  
  setCookies = ['cookie-2-1', 'cookie-2-2'];
});

test("Setting 2 cookies - overwriting", function() {
  var date = new Date();
  date.setTime(date.getTime() + 1000);
  var cookie = SC.Cookie.create({name: "cookie-2-3", value: "testing value", expires: date}).write();
  
  var value = readCookie('cookie-2-3');
  equals(value, "testing value", "value from first cookie");

  var cookie2 = SC.Cookie.create({name: "cookie-2-3", value: "testing value for second", expires: date}).write();
  
  var value2 = readCookie('cookie-2-3');
  equals(value2, "testing value for second", "value from second cookie");
  
  setCookies = ['cookie-2-3'];
});

test("Destroying a cookie - expires", function() {
  var date = new Date();
  date.setTime(date.getTime() + 1000);
  var cookie = SC.Cookie.create({name: "cookie-expires", value: "testing value", expires: date}).write();
  
  var result = readCookie('cookie-expires');
  equals(result, "testing value", "value from document.cookie should match what we set");
  
  cookie.set('expires', -1).write();
  
  var result2 = readCookie('cookie-expires');
  equals(result2, null, "value from document.cookie should be null");
  
  setCookies = ["cookie-expires"]; // make sure we get rid of it
});

test("Destroying a cookie - destroy", function() {
  var date = new Date();
  date.setTime(date.getTime() + 1000);
  var cookie = SC.Cookie.create({name: "cookie-destroy", value: "testing value", expires: date}).write();
  
  var result = readCookie('cookie-destroy');
  equals(result, "testing value", "value from document.cookie should match what we set");
  
  cookie.destroy();
  
  var result2 = readCookie('cookie-destroy');
  equals(result2, null, "value from document.cookie should be null");
  
  setCookies = ["cookie-destroy"]; // make sure we get rid of it
});


test("find", function() {
  var date = new Date();
  date.setTime(date.getTime() + 1000);
  var cookie = SC.Cookie.create({name: "cookie-find", value: "testing value", expires: date}).write();
  
  var result = SC.Cookie.find("cookie-find");
  equals(result.get('name'), cookie.get('name'), "cookie names should be equal");
  equals(result.get('value'), cookie.get('value'), "cookie values should be equal");
  
  setCookies = ["cookie-find"];
});

test("Coooooooookie", function() {
  var cookie = SC.Cookie.create({name: "yummy!"}),
      FakeCookie = SC.Object.extend();
  
  ok(SC.CookieMonster.nomNomNom(cookie) == null, "SC.CookieMonster nom nomed cookie");
  equals(SC.CookieMonster.nomNomNom(FakeCookie.create()), NO, "SC.CookieMonster doesn't like fake cookies!");
});