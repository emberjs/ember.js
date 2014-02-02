// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
// ========================================================================
// SC.imageQueue Test for queue stalling (https://github.com/sproutcore/sproutcore/pull/716)
// ========================================================================
/*globals module, test, ok, isObj, equals, expects, start, stop*/

var guardTimeout, firstGoodImageURL, secondGoodImageURL, badImageURL;
module("Image Queue", {
  setup: function() {
		guardTimeout = 30000;
		firstGoodImageURL = sc_static('images/sproutcore-32.png');
		secondGoodImageURL = sc_static('images/sproutcore-48.png');
		badImageURL = "http://www.sproutcore.com/images/foobar.png";
	}
});

test("Ensure queue is in known state.", function() {
	SC.imageQueue._images = {};
	SC.imageQueue._loading = [] ;
	SC.imageQueue._foregroundQueue = [];
	SC.imageQueue._backgroundQueue = [];
	SC.imageQueue.set('isLoading', NO);

  equals(SC.imageQueue.activeRequests, 0, "There should be no active requests");
});

test("Attempt to load a non-existent image.", function() {
	SC.run(function() {
		SC.imageQueue.loadImage(badImageURL, {
			action: function(imageUrl, imageOrError) {
		    // verify request loaded OK
		    ok(SC.typeOf(imageOrError) === "error", "Image retrieval should fail with error.");
		    // resume executing tests
		    start();
		  }}, 'action', NO);
	});

	stop(guardTimeout);
});

test("Load a valid image successfully.", function() {
	SC.run(function() {
		SC.imageQueue.loadImage(firstGoodImageURL, {
			action: function(imageUrl, imageOrError) {
		    // verify request loaded OK
		    ok(SC.typeOf(imageOrError) !== "error", "Image should be retrieved successfully.");
		    // resume executing tests
		    start();
		  }}, 'action', NO);
	});

  stop(guardTimeout);
});

test("Attempt to reload previous non-existent image.", function() {
	SC.run(function() {
		SC.imageQueue.loadImage(badImageURL, {
			action: function(imageUrl, imageOrError) {
		    // verify request loaded OK
		    ok(SC.typeOf(imageOrError) === "error", "Image retrieval should fail with error.");
		    // resume executing tests
		    start();
		  }}, 'action', NO);
	});

	stop(guardTimeout);
});

test("Reload previous valid image (now cached) successfully.", function() {
	SC.run(function() {
		SC.imageQueue.loadImage(firstGoodImageURL, {
			action: function(imageUrl, imageOrError) {
		    // verify request loaded OK
		    ok(SC.typeOf(imageOrError) !== "error", "Image should be retrieved successfully.");
		    // resume executing tests
		    start();
		  }}, 'action', NO);
	});

	stop(guardTimeout);
});

test("Load a second non-cached image successfully.", function() {
	SC.run(function() {
		SC.imageQueue.loadImage(secondGoodImageURL, {
			action: function(imageUrl, imageOrError) {
		    // verify request loaded OK
		    ok(SC.typeOf(imageOrError) !== "error", "Image should be retrieved successfully.");
		    // resume executing tests
		    start();
		  }}, 'action', NO);
	});

	stop(guardTimeout);
});


test("Release all images.", function() {
	SC.run(function() {
		SC.imageQueue.releaseImage(firstGoodImageURL);
		SC.imageQueue.releaseImage(secondGoodImageURL);
	});
});
