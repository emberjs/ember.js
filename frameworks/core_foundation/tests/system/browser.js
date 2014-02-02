// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================


test("SC.browser.compare()", function() {
  var browser;

  // Use SC.browser.compare() to determine if the given OS is Mac OS 10.7 "Lion"
  // like as was/is in use in SC.TextFieldView.
  equals(SC.browser.compare('10.6.8', '10.7'), -1, "'10.6.8' compared to '10.7' should be -1");
  equals(SC.browser.compare('10.7', '10.7'), 0, "'10.7' compared to '10.7' should be 0");
  equals(SC.browser.compare('10.7.1', '10.7'), 0, "'10.7.1' compared to '10.7' should be 0");
  equals(SC.browser.compare('10.8', '10.7'), 1, "'10.8' compared to '10.7' should be 1");

  equals(SC.browser.compare('10.6.8', 10.7), -1, "'10.6.8' compared to 10.7 should be -1");
  equals(SC.browser.compare('10.7', 10.7), 0, "'10.7' compared to 10.7 should be 0");
  equals(SC.browser.compare('10.7.1', 10.7), 0, "'10.7.1' compared to 10.7 should be 0");
  equals(SC.browser.compare('10.8', 10.7), 1, "'10.8' compared to 10.7 should be 1");

  // Use SC.browser.compare() to determine if the given browser is Firefox 3.5
  // like as was/is in use in SC.RootResponder.
  equals(SC.browser.compare('1.8.10', '1.9.1'), -1, "'1.8.10' compared to '1.9.1' should be -1");
  equals(SC.browser.compare('1.9.0', '1.9.1'), -1, "'1.9.0' compared to '1.9.1' should be -1");
  equals(SC.browser.compare('1.9', '1.9.1'), 0, "'1.9' compared to '1.9.1' should be 0");
  equals(SC.browser.compare('1.9.1', '1.9.1'), 0, "'1.9.1' compared to '1.9.1' should be 0");
  equals(SC.browser.compare('1.10', '1.9.1'), 1, "'1.10' compared to '1.9.1' should be 1");

  equals(SC.browser.compare('1.9.0', 1.9), 0, "'1.9.0' compared to 1.9 should be 0");
  equals(SC.browser.compare('1.9', 1.9), 0, "'1.9' compared to 1.9 should be 0");
  equals(SC.browser.compare('1.9.1', 1.9), 0, "'1.9.1' compared to 1.9 should be 0");
  equals(SC.browser.compare('1.10', 1.9), 1, "'1.10' compared to 1.9 should be 1");

  // Use SC.browser.compare() to determine if the given browser is Safari 5.0.1
  // like as was/is in use in SC.Event.
  equals(SC.browser.compare('532.7', '533.7'), -1, "'532.7' compared to '533.7' should be -1");
  equals(SC.browser.compare('533.6', '533.7'), -1, "'533.6' compared to '533.7' should be -1");
  equals(SC.browser.compare('533.7', '533.7'), 0, "'533.7' compared to '533.7' should be 0");
  equals(SC.browser.compare('533', '533.7'), 0, "'533' compared to '533.7' should be 0");
  equals(SC.browser.compare('533.8', '533.7'), 1, "'533.8' compared to '533.7' should be 1");
  equals(SC.browser.compare('534.7', '533.7'), 1, "'534.7' compared to '533.7' should be 1");

  equals(SC.browser.compare('532.7', 533.7), -1, "'532.7' compared to 533.7 should be -1");
  equals(SC.browser.compare('533.6', 533.7), -1, "'533.6' compared to 533.7 should be -1");
  equals(SC.browser.compare('533.7', 533.7), 0, "'533.7' compared to 533.7 should be 0");
  equals(SC.browser.compare('533', 533.7), 0, "'533' compared to 533.7 should be 0");
  equals(SC.browser.compare('533.8', 533.7), 1, "'533.8' compared to 533.7 should be 1");
  equals(SC.browser.compare('534.7', 533.7), 1, "'534.7' compared to 533.7 should be 1");

  // Use SC.browser.compare() to determine if the given OS is IE7 like as
  // was/is in use in SC.Pane.
  equals(SC.browser.compare('6.0', '7.0'), -1, "'6.0' compared to '7.0' should be -1");
  equals(SC.browser.compare('7.0', '7.0'), 0, "'7.0' compared to '7.0' should be 0");
  equals(SC.browser.compare('7', '7.0'), 0, "'7' compared to '7.0' should be 0");
  equals(SC.browser.compare('7.1', '7.0'), 1, "'7.1' compared to '7.0' should be 1");
  equals(SC.browser.compare('8.0', '7.0'), 1, "'8.0' compared to '7.0' should be 1");

  equals(SC.browser.compare('6.0', 7.0), -1, "'6.0' compared to `7.0 should be -1");
  equals(SC.browser.compare('7.0', 7.0), 0, "'7.0' compared to 7.0 should be 0");
  equals(SC.browser.compare('7', 7.0), 0, "'7' compared to 7.0 should be 0");
  equals(SC.browser.compare('7.1', 7.0), 0, "'7.1' compared to 7.0 should be 0");
  equals(SC.browser.compare('8.0', 7.0), 1, "'8.0' compared to 7.0 should be 1");
});
