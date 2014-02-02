// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2012 7x7 Software, Inc.
// License:   Licensed under MIT license
// ==========================================================================
/*globals module, test, ok, isObj, equals, expects, start, stop*/


module('SC.appCache');

test("hasNewVersion is computed properly", function() {
  if (SC.platform.supportsApplicationCache) {
    SC.appCache.set('status', 0);
    equals(SC.appCache.get('hasNewVersion'), undefined, "When status is 0, hasNewVersion should be");

    SC.appCache.set('status', 1);
    equals(SC.appCache.get('hasNewVersion'), false, "When status is 1, hasNewVersion should be");

    SC.appCache.set('status', 2);
    equals(SC.appCache.get('hasNewVersion'), undefined, "When status is 2, hasNewVersion should be");

    SC.appCache.set('status', 3);
    equals(SC.appCache.get('hasNewVersion'), undefined, "When status is 3, hasNewVersion should be");

    SC.appCache.set('status', 4);
    equals(SC.appCache.get('hasNewVersion'), true, "When status is 4, hasNewVersion should be");

    SC.appCache.set('status', 5);
    equals(SC.appCache.get('hasNewVersion'), true, "When status is 5, hasNewVersion should be");
  } else {
    equals(SC.appCache.get('hasNewVersion'), false, "When supportsApplicationCache is false, hasNewVersion should be");
  }
});

test("isNewVersionValid is computed properly", function() {
  if (SC.platform.supportsApplicationCache) {
    SC.appCache.set('status', 0);
    equals(SC.appCache.get('isNewVersionValid'), undefined, "When status is 0, isNewVersionValid should be");

    SC.appCache.set('status', 1);
    equals(SC.appCache.get('isNewVersionValid'), undefined, "When status is 1, isNewVersionValid should be");

    SC.appCache.set('status', 2);
    equals(SC.appCache.get('isNewVersionValid'), undefined, "When status is 2, isNewVersionValid should be");

    SC.appCache.set('status', 3);
    equals(SC.appCache.get('isNewVersionValid'), undefined, "When status is 3, isNewVersionValid should be");

    SC.appCache.set('status', 4);
    equals(SC.appCache.get('isNewVersionValid'), true, "When status is 4, isNewVersionValid should be");

    SC.appCache.set('status', 5);
    equals(SC.appCache.get('isNewVersionValid'), false, "When status is 5, isNewVersionValid should be");
  } else {
    equals(SC.appCache.get('isNewVersionValid'), false, "When supportsApplicationCache is false, isNewVersionValid should be");
  }
});

test("isReadyForOffline is computed properly", function() {
  if (SC.platform.supportsApplicationCache) {
    SC.appCache.set('status', 0);
    equals(SC.appCache.get('isReadyForOffline'), false, "When status is 0, isReadyForOffline should be");

    SC.appCache.set('status', 1);
    equals(SC.appCache.get('isReadyForOffline'), true, "When status is 1, isReadyForOffline should be");

    SC.appCache.set('status', 2);
    equals(SC.appCache.get('isReadyForOffline'), undefined, "When status is 2, isReadyForOffline should be");

    SC.appCache.set('status', 3);
    equals(SC.appCache.get('isReadyForOffline'), undefined, "When status is 3, isReadyForOffline should be");

    SC.appCache.set('status', 4);
    equals(SC.appCache.get('isReadyForOffline'), true, "When status is 4, isReadyForOffline should be");

    SC.appCache.set('status', 5);
    equals(SC.appCache.get('isReadyForOffline'), false, "When status is 5, isReadyForOffline should be");
  } else {
    equals(SC.appCache.get('isReadyForOffline'), false, "When supportsApplicationCache is false, isReadyForOffline should be");
  }
});
