// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

SC.mixin(Function.prototype, /** @scope Function.prototype */ {

  /**
    Creates a timer that will execute the function after a specified 
    period of time.
    
    If you pass an optional set of arguments, the arguments will be passed
    to the function as well.  Otherwise the function should have the 
    signature:
    
        function functionName(timer)

    @param target {Object} optional target object to use as this
    @param interval {Number} the time to wait, in msec
    @returns {SC.Timer} scheduled timer
  */
  invokeLater: function(target, interval) {
    if (interval === undefined) interval = 1 ;
    var f = this;
    if (arguments.length > 2) {
      var args = SC.$A(arguments).slice(2,arguments.length);
      args.unshift(target);
      // f = f.bind.apply(f, args) ;
      var func = f ;
      // Use "this" in inner func because it get its scope by 
      // outer func f (=target). Could replace "this" with target for clarity.
      f = function() { return func.apply(this, args.slice(1)); } ;
    }
    return SC.Timer.schedule({ target: target, action: f, interval: interval });
  }

});
