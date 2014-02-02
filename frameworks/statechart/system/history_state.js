// ==========================================================================
// Project:   SC.Statechart - A Statechart Framework for SproutCore
// Copyright: ©2010, 2011 Michael Cohen, and contributors.
//            Portions @2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/*globals SC */

sc_require('system/state');

/**
  @class

  Represents a history state that can be assigned to a SC.State object's
  initialSubstate property.

  If a SC.HistoryState object is assigned to a state's initial substate,
  then after a state is entered the statechart will refer to the history
  state object to determine the next course of action. If the state has
  its historyState property assigned then the that state will be entered,
  otherwise the default state assigned to history state object will be entered.

  An example of how to use:

    stateA: SC.State.design({

      initialSubstate: SC.HistoryState({
        defaultState: 'stateB'
      }),

      stateB: SC.State.design({ ... }),

      stateC: SC.State.design({ ... })

    })

  @author Michael Cohen
  @extends SC.Object
*/
SC.HistoryState = SC.Object.extend(
  /** @scope SC.HistoryState.prototype */{

  /**
    Used to indicate if the statechart should recurse the
    history states after entering the this object's parent state

    @type Boolean
  */
  isRecursive: NO,

  /**
    The default state to enter if the parent state does not
    yet have its historyState property assigned to something
    other than null.

    The value assigned to this property must be the name of an
    immediate substate that belongs to the parent state. The
    statechart will manage the property upon initialization.

    @type String
  */
  defaultState: null,

  /** @private
    Managed by the statechart

    The statechart that owns this object.
  */
  statechart: null,

  /** @private
    Managed by the statechart

    The state that owns this object
  */
  parentState: null,

  /**
    Used by the statechart during a state transition process.

    Returns a state to enter based on whether the parent state has
    its historyState property assigned. If not then this object's
    assigned default state is returned.
  */
  state: function() {
    var defaultState = this.get('defaultState'),
        historyState = this.getPath('parentState.historyState');
    return !!historyState ? historyState : defaultState;
  }.property().cacheable(),

  /** @private */
  parentHistoryStateDidChange: function() {
    this.notifyPropertyChange('state');
  }.observes('*parentState.historyState')

});
