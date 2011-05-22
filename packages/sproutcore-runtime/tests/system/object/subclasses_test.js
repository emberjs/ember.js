// ==========================================================================
// Project:  SproutCore Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

module('system/object/subclasses');

test('SC.Object should have a subclass set', function() {
  ok(SC.Object.subclasses instanceof SC.Set);
});

test('defining a new subclass should add it to set of parent', function() {
  var Subclass = SC.Object.extend();
  ok(SC.Object.subclasses.contains(Subclass));
});

test('defining sub-sub class should only go to parent', function() {
  var Sub = SC.Object.extend();
  var SubSub = Sub.extend();
  
  ok(SC.Object.subclasses.contains(Sub), 'SC.Object contains Sub');
  ok(Sub.subclasses.contains(SubSub), 'Sub contains SubSub');
});

