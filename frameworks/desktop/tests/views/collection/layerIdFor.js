// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            portions copyright @2011 Apple Inc.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

var view ;

module("SC.CollectionView.layerIdFor, contentIndexForLayerId", {
  setup: function() {
    view = SC.CollectionView.create();
  }
});

// ..........................................................
// TEST ROUND TRIP
// 

test("0 index", function() {
  var layerId = view.layerIdFor(0) ;
  ok(layerId, 'should return string');
  equals(view.contentIndexForLayerId(layerId), 0, 'should parse out idx');
});

test("10 index", function() {
  var layerId = view.layerIdFor(10) ;
  ok(layerId, 'should return string');
  equals(view.contentIndexForLayerId(layerId), 10, 'should parse out idx');
});

// ..........................................................
// TEST SPECIAL PARSING CASES
// 

test("parse null id", function() {
  equals(view.contentIndexForLayerId(null), null, 'should return null');
});

test("parse collection view's layerId", function() {
  equals(view.contentIndexForLayerId(view.get('layerId')), null, 'should return null');
});

test("parse layerId from other object", function() {
  var otherView = SC.CollectionView.create();
  var id = otherView.layerIdFor(20);
  equals(view.contentIndexForLayerId(id), null, 'should return null');
});

test("parse short arbitrary id", function() {
  equals(view.contentIndexForLayerId("sc242"), null, 'should return null');
});

test("parse long arbitrary id", function() {
  equals(view.contentIndexForLayerId("sc242-234-2453-sdf3"), null, 'should return null');
});

test("parse empty string", function() {
  equals(view.contentIndexForLayerId(""), null, 'should return null');
});

test("parse garbage", function() {
  equals(view.contentIndexForLayerId(234), null, 'should return null');
});

