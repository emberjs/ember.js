// ==========================================================================
// Project:   SC.Statechart - A Statechart Framework for SproutCore
// Copyright: ©2010, 2011 Michael Cohen, and contributors.
//            Portions @2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/*globals SC */

sc_require('system/state');

/** 
  The default name given to an empty state
*/
SC.EMPTY_STATE_NAME = "__EMPTY_STATE__";

/**
  @class
  
  Represents an empty state that gets assigned as a state's initial substate 
  if the state does not have an initial substate defined.

  @extends SC.State
*/
SC.EmptyState = SC.State.extend(/** @scope SC.EmptyState.prototype */{
  
  name: SC.EMPTY_STATE_NAME,
  
  enterState: function() {
    var msg = "No initial substate was defined for state %@. Entering default empty state";
    this.stateLogWarning(msg.fmt(this.get('parentState')));
  }
  
});
