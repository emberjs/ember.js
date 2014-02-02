// ==========================================================================
// Project:   SC.Statechart - A Statechart Framework for SproutCore
// Copyright: ©2010, 2011 Michael Cohen, and contributors.
//            Portions @2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/*globals SC */

/**
  @class

  Represents a call that is intended to be asynchronous. This is
  used during a state transition process when either entering or
  exiting a state.

  @extends SC.Object
  @author Michael Cohen
*/
SC.Async = SC.Object.extend(
  /** @scope SC.Async.prototype */{

  func: null,

  arg1: null,

  arg2: null,

  /** @private
    Called by the statechart
  */
  tryToPerform: function(state) {
    var func = this.get('func'),
        arg1 = this.get('arg1'),
        arg2 = this.get('arg2'),
        funcType = SC.typeOf(func);

    if (funcType === SC.T_STRING) {
      state.tryToPerform(func, arg1, arg2);
    }
    else if (funcType === SC.T_FUNCTION) {
      func.apply(state, [arg1, arg2]);
    }
  }

});

/**
  Singleton
*/
SC.Async.mixin(/** @scope SC.Async */{

  /**
    Call in either a state's enterState or exitState method when you
    want a state to perform an asynchronous action, such as an animation.

    Examples:

      SC.State.extend({

        enterState: function() {
          return SC.Async.perform('foo');
        },

        exitState: function() {
          return SC.Async.perform('bar', 100);
        }

        foo: function() { ... },

        bar: function(arg) { ... }

      });

    @param func {String|Function} the function to be invoked on a state
    @param arg1 Optional. An argument to pass to the given function
    @param arg2 Optional. An argument to pass to the given function
    @return {SC.Async} a new instance of a SC.Async
  */
  perform: function(func, arg1, arg2) {
    return SC.Async.create({ func: func, arg1: arg1, arg2: arg2 });
  }

});
