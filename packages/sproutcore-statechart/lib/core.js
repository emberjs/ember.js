// ==========================================================================
// Project:   SproutCore Statechart
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

SC.handleActions = function(func) {
  var args = Array.prototype.slice.call(arguments);
  // remove func
  args.shift();

  func.isActionHandler = YES;
  func.actions = args;
  return func;
};

SC.stateObserves = function(func) {
  var args = Array.prototype.slice.call(arguments);
  // remove func
  args.shift();

  func.isStateObserveHandler = YES;
  func.args = args;
  return func;
};