// ==========================================================================
// Project:   SC.Statechart - A Statechart Framework for SproutCore
// Copyright: ©2010, 2011 Michael Cohen, and contributors.
//            Portions @2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/*global SC */

sc_require('system/state');
sc_require('mixins/statechart_delegate');

/**
  @class

  The startchart manager mixin allows an object to be a statechart. By becoming a statechart, the
  object can then be manage a set of its own states.

  This implementation of the statechart manager closely follows the concepts stated in D. Harel's
  original paper "Statecharts: A Visual Formalism For Complex Systems"
  (www.wisdom.weizmann.ac.il/~harel/papers/Statecharts.pdf).

  The statechart allows for complex state heircharies by nesting states within states, and
  allows for state orthogonality based on the use of concurrent states.

  At minimum, a statechart must have one state: The root state. All other states in the statechart
  are a decendents (substates) of the root state.

  The following example shows how states are nested within a statechart:

      MyApp.Statechart = SC.Object.extend(SC.StatechartManager, {
        rootState: SC.State.design({
          initialSubstate: 'stateA',

          stateA: SC.State.design({
            // ... can continue to nest further states
          }),

          stateB: SC.State.design({
            // ... can continue to nest further states
          })
        })
      });

  Note how in the example above, the root state as an explicit initial substate to enter into. If no
  initial substate is provided, then the statechart will default to the the state's first substate.

  You can also defined states without explicitly defining the root state. To do so, simply create properties
  on your object that represents states. Upon initialization, a root state will be constructed automatically
  by the mixin and make the states on the object substates of the root state. As an example:

      MyApp.Statechart = SC.Object.extend(SC.StatechartManager, {
        initialState: 'stateA',

        stateA: SC.State.design({
          // ... can continue to nest further states
        }),

        stateB: SC.State.design({
          // ... can continue to nest further states
        })
      });

  If you liked to specify a class that should be used as the root state but using the above method to defined
  states, you can set the rootStateExample property with a class that extends from SC.State. If the
  rootStateExample property is not explicitly assigned the then default class used will be SC.State.

  To provide your statechart with orthogonality, you use concurrent states. If you use concurrent states,
  then your statechart will have multiple current states. That is because each concurrent state represents an
  independent state structure from other concurrent states. The following example shows how to provide your
  statechart with concurrent states:

      MyApp.Statechart = SC.Object.extend(SC.StatechartManager, {
        rootState: SC.State.design({
          substatesAreConcurrent: YES,

          stateA: SC.State.design({
            // ... can continue to nest further states
          }),

          stateB: SC.State.design({
            // ... can continue to nest further states
          })
        })
      });

  Above, to indicate that a state's substates are concurrent, you just have to set the substatesAreConcurrent to
  YES. Once done, then stateA and stateB will be independent of each other and each will manage their
  own current substates. The root state will then have more then one current substate.

  To define concurrent states directly on the object without explicitly defining a root, you can do the
  following:

      MyApp.Statechart = SC.Object.extend(SC.StatechartManager, {
        statesAreConcurrent: YES,

        stateA: SC.State.design({
          // ... can continue to nest further states
        }),

        stateB: SC.State.design({
          // ... can continue to nest further states
        })
      });

  Remember that a startchart can have a mixture of nested and concurrent states in order for you to
  create as complex of statecharts that suite your needs. Here is an example of a mixed state structure:

      MyApp.Statechart = SC.Object.extend(SC.StatechartManager, {
        rootState: SC.State.design({
          initialSubstate: 'stateA',

          stateA: SC.State.design({
            substatesAreConcurrent: YES,

            stateM: SC.State.design({ ... })
            stateN: SC.State.design({ ... })
            stateO: SC.State.design({ ... })
          }),

          stateB: SC.State.design({
            initialSubstate: 'stateX',

            stateX: SC.State.design({ ... })
            stateY: SC.State.design({ ... })
          })
        })
      });

  Depending on your needs, a statechart can have lots of states, which can become hard to manage all within
  one file. To modularize your states and make them easier to manage and maintain, you can plug-in states
  into other states. Let's say we are using the statechart in the last example above, and all the code is
  within one file. We could update the code and split the logic across two or more files like so:

      // state_a.js

      MyApp.StateA = SC.State.extend({
        substatesAreConcurrent: YES,

        stateM: SC.State.design({ ... })
        stateN: SC.State.design({ ... })
        stateO: SC.State.design({ ... })
      });

      // state_b.js

      MyApp.StateB = SC.State.extend({
        substatesAreConcurrent: YES,

        stateM: SC.State.design({ ... })
        stateN: SC.State.design({ ... })
        stateO: SC.State.design({ ... })
      });

      // statechart.js

      MyApp.Statechart = SC.Object.extend(SC.StatechartManager, {
        rootState: SC.State.design({
          initialSubstate: 'stateA',
          stateA: SC.State.plugin('MyApp.StateA'),
          stateB: SC.State.plugin('MyApp.StateB')
        })
      });

  Using state plug-in functionality is optional. If you use the plug-in feature you can break up your statechart
  into as many files as you see fit.

  @author Michael Cohen
*/

SC.StatechartManager = /** @scope SC.StatechartManager.prototype */{

  //@if(debug)
  /* BEGIN DEBUG ONLY PROPERTIES AND METHODS */

  /** @private @property */
  allowStatechartTracing: function () {
    var key = this.get('statechartTraceKey');
    return this.get(key);
  }.property().cacheable(),

  /** @private */
  _statechartTraceDidChange: function () {
    this.notifyPropertyChange('allowStatechartTracing');
  },

  /**
    @property

    Returns an object containing current detailed information about
    the statechart. This is primarily used for diagnostic/debugging
    purposes.

    Detailed information includes:

      - current states
      - state transition information
      - event handling information

    NOTE: This is only available in debug mode!

    @returns {Hash}
  */
  details: function () {
    var details = {
      'initialized': this.get('statechartIsInitialized')
    };

    if (this.get('name')) {
      details.name = this.get('name');
    }

    if (!this.get('statechartIsInitialized')) {
      return details;
    }

    details['current-states'] = [];
    this.get('currentStates').forEach(function (state) {
      details['current-states'].push(state.get('fullPath'));
    });

    var stateTransition = {
      active: this.get('gotoStateActive'),
      suspended: this.get('gotoStateSuspended')
    };

    if (this._gotoStateActions) {
      stateTransition['transition-sequence'] = [];
      var actions = this._gotoStateActions,
          actionToStr = function (action) {
            var actionName = action.action === SC.ENTER_STATE ? "enter" : "exit";
            return "%@ %@".fmt(actionName, action.state.get('fullPath'));
          };

      actions.forEach(function (action) {
        stateTransition['transition-sequence'].push(actionToStr(action));
      });

      stateTransition['current-transition'] = actionToStr(this._currentGotoStateAction);
    }

    details['state-transition'] = stateTransition;

    if (this._stateHandleEventInfo) {
      var info = this._stateHandleEventInfo;
      details['handling-event'] = {
        state: info.state.get('fullPath'),
        event: info.event,
        handler: info.handler
      };
    } else {
      details['handling-event'] = false;
    }

    return details;
  }.property(),

  /**
    Returns a formatted string of detailed information about this statechart. Useful
    for diagnostic/debugging purposes.

    @returns {String}

    NOTE: This is only available in debug mode!

    @see #details
  */
  toStringWithDetails: function () {
    var str = "",
        header = this.toString(),
        details = this.get('details');

    str += header + "\n";
    str += this._hashToString(details, 2);

    return str;
  },

  /** @private */
  _hashToString: function (hash, indent) {
    var str = "";

    for (var key in hash) {
      var value = hash[key];
      if (value instanceof Array) {
        str += this._arrayToString(key, value, indent) + "\n";
      }
      else if (value instanceof Object) {
        str += "%@%@:\n".fmt(' '.mult(indent), key);
        str += this._hashToString(value, indent + 2);
      }
      else {
        str += "%@%@: %@\n".fmt(' '.mult(indent), key, value);
      }
    }

    return str;
  },

  /** @private */
  _arrayToString: function (key, array, indent) {
    if (array.length === 0) {
      return "%@%@: []".fmt(' '.mult(indent), key);
    }

    var str = "%@%@: [\n".fmt(' '.mult(indent), key);

    array.forEach(function (item, idx) {
      str += "%@%@\n".fmt(' '.mult(indent + 2), item);
    }, this);

    str += ' '.mult(indent) + "]";

    return str;
  },

  /**
    Indicates whether to use a monitor to monitor that statechart's activities. If true then
    the monitor will be active, otherwise the monitor will not be used. Useful for debugging
    purposes.

    NOTE: This is only available in debug mode!

    @type Boolean
  */
  monitorIsActive: NO,

  /**
    A statechart monitor that can be used to monitor this statechart. Useful for debugging purposes.
    A monitor will only be used if monitorIsActive is true.

    NOTE: This is only available in debug mode!

    @property {SC.StatechartMonitor}
  */
  monitor: null,

  /**
    Used to specify what property (key) on the statechart should be used as the trace property. By
    default the property is 'trace'.

    NOTE: This is only available in debug mode!

    @type String
  */
  statechartTraceKey: 'trace',

  /**
    Indicates whether to trace the statecharts activities. If true then the statechart will output
    its activites to the browser's JS console. Useful for debugging purposes.

    NOTE: This is only available in debug mode!

    @see #statechartTraceKey

    @type Boolean
  */
  trace: NO,

  /**
    Used to log a statechart trace message

    NOTE: This is only available in debug mode!
  */
  statechartLogTrace: function (msg, style) {
    if (style) {
      SC.Logger.log("%c%@: %@".fmt(this.get('statechartLogPrefix'), msg), style);
    } else {
      SC.Logger.info("%@: %@".fmt(this.get('statechartLogPrefix'), msg));
    }
  },

  /* END DEBUG ONLY PROPERTIES AND METHODS */
  //@endif

  // Walk like a duck
  isResponderContext: YES,

  // Walk like a duck
  isStatechart: YES,

  /**
    Indicates if this statechart has been initialized

    @type Boolean
  */
  statechartIsInitialized: NO,

  /**
    Optional name you can provide the statechart with. If set this will be included
    in tracing and error output as well as detail output. Useful for
    debugging/diagnostic purposes
  */
  name: null,

  /**
    The root state of this statechart. All statecharts must have a root state.

    If this property is left unassigned then when the statechart is initialized
    it will used the rootStateExample, initialState, and statesAreConcurrent
    properties to construct a root state.

    @see #rootStateExample
    @see #initialState
    @see #statesAreConcurrent

    @property {SC.State}
  */
  rootState: null,

  /**
    Represents the class used to construct a class that will be the root state for
    this statechart. The class assigned must derive from SC.State.

    This property will only be used if the rootState property is not assigned.

    @see #rootState

    @property {SC.State}
  */
  rootStateExample: SC.State,

  /**
    Indicates what state should be the initial state of this statechart. The value
    assigned must be the name of a property on this object that represents a state.
    As well, the statesAreConcurrent must be set to NO.

    This property will only be used if the rootState property is not assigned.

    @see #rootState

    @type String
  */
  initialState: null,

  /**
    Indicates if properties on this object representing states are concurrent to each other.
    If YES then they are concurrent, otherwise they are not. If the YES, then the
    initialState property must not be assigned.

    This property will only be used if the rootState property is not assigned.

    @see #rootState

    @type Boolean
  */
  statesAreConcurrent: NO,

  /**
    Used to specify what property (key) on the statechart should be used as the owner property. By
    default the property is 'owner'.

    @type String
  */
  statechartOwnerKey: 'owner',

  /**
    Sets who the owner is of this statechart. If null then the owner is this object otherwise
    the owner is the assigned object.

    @see #statechartOwnerKey

    @type SC.Object
  */
  owner: null,

  /**
    Indicates if the statechart should be automatically initialized by this
    object after it has been created. If YES then initStatechart will be
    called automatically, otherwise it will not.

    @type Boolean
  */
  autoInitStatechart: YES,

  /**
    If yes, any warning messages produced by the statechart or any of its states will
    not be logged, otherwise all warning messages will be logged.

    While designing and debugging your statechart, it's best to keep this value false.
    In production you can then suppress the warning messages.

    @type Boolean
  */
  suppressStatechartWarnings: NO,

  /**
    A statechart delegate used by the statechart and the states that the statechart
    manages. The value assigned must adhere to the {@link SC.StatechartDelegate} mixin.

    @type SC.Object

    @see SC.StatechartDelegate
  */
  delegate: null,

  /**
    Computed property that returns an objects that adheres to the
    {@link SC.StatechartDelegate} mixin. If the {@link #delegate} is not
    assigned then this object is the default value returned.

    @see SC.StatechartDelegate
    @see #delegate
  */
  statechartDelegate: function () {
    var del = this.get('delegate');
    return this.delegateFor('isStatechartDelegate', del);
  }.property('delegate'),

  initMixin: function () {
    if (this.get('autoInitStatechart')) {
      this.initStatechart();
    }
  },

  destroyMixin: function () {
    var root = this.get('rootState');

    //@if(debug)
    var traceKey = this.get('statechartTraceKey');

    this.removeObserver(traceKey, this, '_statechartTraceDidChange');
    //@endif

    root.destroy();
    this.set('rootState', null);
    this.notifyPropertyChange('currentStates');
  },

  /**
    Initializes the statechart. By initializing the statechart, it will create all the states and register
    them with the statechart. Once complete, the statechart can be used to go to states and send events to.
  */
  initStatechart: function () {
    if (this.get('statechartIsInitialized')) return;

    this._gotoStateLocked = NO;
    this._sendEventLocked = NO;
    this._pendingStateTransitions = [];
    this._pendingSentEvents = [];

    this.sendAction = this.sendEvent;

    //@if(debug)
    if (this.get('monitorIsActive')) {
      this.set('monitor', SC.StatechartMonitor.create({ statechart: this }));
    }

    var traceKey = this.get('statechartTraceKey'),
      trace = this.get('allowStatechartTracing');

    this.addObserver(traceKey, this, '_statechartTraceDidChange');
    this._statechartTraceDidChange();

    if (trace) this.statechartLogTrace("BEGIN initialize statechart", SC.TRACE_STATECHART_STYLE.init);
    //@endif

    var rootState = this.get('rootState'),
        msg;

    // If no root state was explicitly defined then try to construct
    // a root state class
    if (!rootState) {
      rootState = this._constructRootStateClass();
    }
    else if (SC.typeOf(rootState) === SC.T_FUNCTION && rootState.statePlugin) {
      rootState = rootState.apply(this);
    }

    if (!(SC.kindOf(rootState, SC.State) && rootState.isClass)) {
      msg = "Unable to initialize statechart. Root state must be a state class";
      this.statechartLogError(msg);
      throw msg;
    }

    rootState = this.createRootState(rootState, {
      statechart: this,
      name: SC.ROOT_STATE_NAME
    });

    this.set('rootState', rootState);
    rootState.initState();

    if (SC.kindOf(rootState.get('initialSubstate'), SC.EmptyState)) {
      msg = "Unable to initialize statechart. Root state must have an initial substate explicitly defined";
      this.statechartLogError(msg);
      throw msg;
    }

    if (!SC.empty(this.get('initialState'))) {
      var key = 'initialState';
      this.set(key, rootState.get(this.get(key)));
    }

    this.set('statechartIsInitialized', YES);
    this.gotoState(rootState);

    //@if(debug)
    if (trace) this.statechartLogTrace("END initialize statechart", SC.TRACE_STATECHART_STYLE.init);
    //@endif
  },

  /**
    Will create a root state for the statechart
  */
  createRootState: function (state, attrs) {
    if (!attrs) attrs = {};
    state = state.create(attrs);
    return state;
  },

  /**
    Returns an array of all the current states for this statechart

    @returns {Array} the current states
  */
  currentStates: function () {
    return this.getPath('rootState.currentSubstates');
  }.property().cacheable(),

  /**
    Returns the first current state for this statechart.

    @return {SC.State}
  */
  firstCurrentState: function () {
    var cs = this.get('currentStates');
    return cs ? cs.objectAt(0) : null;
  }.property('currentStates').cacheable(),

  /**
    Returns the count of the current states for this statechart

    @returns {Number} the count
  */
  currentStateCount: function () {
    return this.getPath('currentStates.length');
  }.property('currentStates').cacheable(),

  /**
    Checks if a given state is a current state of this statechart.

    @param state {State|String} the state to check
    @returns {Boolean} true if the state is a current state, otherwise fals is returned
  */
  stateIsCurrentState: function (state) {
    return this.get('rootState').stateIsCurrentSubstate(state);
  },

  /**
    Returns an array of all the states that are currently entered for
    this statechart.

    @returns {Array} the currently entered states
  */
  enteredStates: function () {
    return this.getPath('rootState.enteredSubstates');
  }.property().cacheable(),

  /**
    Checks if a given state is a currently entered state of this statechart.

    @param state {State|String} the state to check
    @returns {Boolean} true if the state is a currently entered state, otherwise false is returned
  */
  stateIsEntered: function (state) {
    return this.get('rootState').stateIsEnteredSubstate(state);
  },

  /**
    Checks if the given value represents a state is this statechart

    @param value {State|String} either a state object or the name of a state
    @returns {Boolean} true if the state does belong ot the statechart, otherwise false is returned
  */
  doesContainState: function (value) {
    return !SC.none(this.getState(value));
  },

  /**
    Gets a state from the statechart that matches the given value

    @param value {State|String} either a state object of the name of a state
    @returns {State} if a match then the matching state is returned, otherwise null is returned
  */
  getState: function (state) {
    var root = this.get('rootState');
    return root === state ? root : root.getSubstate(state);
  },

  /**
    When called, the statechart will proceed with making state transitions in the statechart starting from
    a current state that meet the statechart conditions. When complete, some or all of the statechart's
    current states will be changed, and all states that were part of the transition process will either
    be exited or entered in a specific order.

    The state that is given to go to will not necessarily be a current state when the state transition process
    is complete. The final state or states are dependent on factors such an initial substates, concurrent
    states, and history states.

    Because the statechart can have one or more current states, it may be necessary to indicate what current state
    to start from. If no current state to start from is provided, then the statechart will default to using
    the first current state that it has; depending of the make up of the statechart (no concurrent state vs.
    with concurrent states), the outcome may be unexpected. For a statechart with concurrent states, it is best
    to provide a current state in which to start from.

    When using history states, the statechart will first make transitions to the given state and then use that
    state's history state and recursively follow each history state's history state until there are no
    more history states to follow. If the given state does not have a history state, then the statechart
    will continue following state transition procedures.

    Method can be called in the following ways:

        // With one argument.
        gotoState(<state>)

        // With two argument.
        gotoState(<state>, <state | boolean | hash>)

        // With three argument.
        gotoState(<state>, <state>, <boolean | hash>)
        gotoState(<state>, <boolean>, <hash>)

        // With four argument.
        gotoState(<state>, <state>, <boolean>, <hash>)

    where <state> is either a SC.State object or a string and <hash> is a regular JS hash object.

    @param state {SC.State|String} the state to go to (may not be the final state in the transition process)
    @param fromCurrentState {SC.State|String} Optional. The current state to start the transition process from.
    @param useHistory {Boolean} Optional. Indicates whether to include using history states in the transition process
    @param context {Hash} Optional. A context object that will be passed to all exited and entered states
  */
  gotoState: function (state, fromCurrentState, useHistory, context) {
    if (!this.get('statechartIsInitialized')) {
      this.statechartLogError("can not go to state %@. statechart has not yet been initialized".fmt(state));
      return;
    }

    if (this.get('isDestroyed')) {
      this.statechartLogError("can not go to state %@. statechart is destroyed".fmt(this));
      return;
    }

    var args = this._processGotoStateArgs(arguments);

    state = args.state;
    fromCurrentState = args.fromCurrentState;
    useHistory = args.useHistory;
    context = args.context;

    var pivotState = null,
        exitStates = [],
        enterStates = [],
        paramState = state,
        paramFromCurrentState = fromCurrentState,
        msg;

    state = this.getState(state);

    if (SC.none(state)) {
      this.statechartLogError("Can not to goto state %@. Not a recognized state in statechart".fmt(paramState));
      return;
    }

    if (this._gotoStateLocked) {
      // There is a state transition currently happening. Add this requested state
      // transition to the queue of pending state transitions. The request will
      // be invoked after the current state transition is finished.
      this._pendingStateTransitions.push({
        state: state,
        fromCurrentState: fromCurrentState,
        useHistory: useHistory,
        context: context
      });

      return;
    }

    // Lock the current state transition so that no other requested state transition
    // interferes.
    this._gotoStateLocked = YES;

    if (fromCurrentState) {
      // Check to make sure the current state given is actually a current state of this statechart
      fromCurrentState = this.getState(fromCurrentState);
      if (SC.none(fromCurrentState) || !fromCurrentState.get('isCurrentState')) {
        msg = "Can not to goto state %@. %@ is not a recognized current state in statechart";
        this.statechartLogError(msg.fmt(paramState, paramFromCurrentState));
        this._gotoStateLocked = NO;
        return;
      }
    }
    else {
      // No explicit current state to start from; therefore, need to find a current state
      // to transition from.
      fromCurrentState = state.findFirstRelativeCurrentState();
      if (!fromCurrentState) fromCurrentState = this.get('firstCurrentState');
    }

    //@if(debug)
    var trace = this.get('allowStatechartTracing');
    if (trace) {
      this.statechartLogTrace("BEGIN gotoState: %@".fmt(state), SC.TRACE_STATECHART_STYLE.gotoState);
      msg = "  starting from current state: %@";
      msg = msg.fmt(fromCurrentState ? fromCurrentState : '-- none --');
      this.statechartLogTrace(msg, SC.TRACE_STATECHART_STYLE.gotoStateInfo);

      var len = this.getPath('currentStates.length');
      // For many states, we list each on its own line.
      if (len > 2) {
        msg = "current states before:\n%@";
        msg = msg.fmt(this.get('currentStates').getEach('fullPath').join('\n'));        
      }
      // For a few states, all on one line.
      else if (len > 0) {
        msg = "  current states before: %@";
        msg = msg.fmt(this.get('currentStates').getEach('fullPath').join(', '));
      }
      // For no states, no states.
      else {
        msg = "  current states before: --none--";
      }
      this.statechartLogTrace(msg, SC.TRACE_STATECHART_STYLE.gotoStateInfo);
    }
    //@endif

    // If there is a current state to start the transition process from, then determine what
    // states are to be exited
    if (!SC.none(fromCurrentState)) {
      exitStates = this._createStateChain(fromCurrentState);
    }

    // Now determine the initial states to be entered
    enterStates = this._createStateChain(state);

    // Get the pivot state to indicate when to go from exiting states to entering states
    pivotState = this._findPivotState(exitStates, enterStates);

    if (pivotState) {
      //@if(debug)
      if (trace) this.statechartLogTrace("  pivot state = %@".fmt(pivotState), SC.TRACE_STATECHART_STYLE.gotoStateInfo);
      //@endif
      if (pivotState.get('substatesAreConcurrent') && pivotState !== state) {
        this.statechartLogError("Can not go to state %@ from %@. Pivot state %@ has concurrent substates.".fmt(state, fromCurrentState, pivotState));
        this._gotoStateLocked = NO;
        return;
      }
    }

    // Collect what actions to perform for the state transition process
    var gotoStateActions = [];


    // Go ahead and find states that are to be exited
    this._traverseStatesToExit(exitStates.shift(), exitStates, pivotState, gotoStateActions);

    // Now go find states that are to be entered
    if (pivotState !== state) {
      this._traverseStatesToEnter(enterStates.pop(), enterStates, pivotState, useHistory, gotoStateActions);
    } else {
      this._traverseStatesToExit(pivotState, [], null, gotoStateActions);
      this._traverseStatesToEnter(pivotState, null, null, useHistory, gotoStateActions);
    }

    // Collected all the state transition actions to be performed. Now execute them.
    this._gotoStateActions = gotoStateActions;
    this._executeGotoStateActions(state, gotoStateActions, null, context);
  },

  /**
    Indicates if the statechart is in an active goto state process
  */
  gotoStateActive: function () {
    return this._gotoStateLocked;
  }.property(),

  /**
    Indicates if the statechart is in an active goto state process
    that has been suspended
  */
  gotoStateSuspended: function () {
    return this._gotoStateLocked && !!this._gotoStateSuspendedPoint;
  }.property(),

  /**
    Resumes an active goto state transition process that has been suspended.
  */
  resumeGotoState: function () {
    if (!this.get('gotoStateSuspended')) {
      this.statechartLogError("Can not resume goto state since it has not been suspended");
      return;
    }

    var point = this._gotoStateSuspendedPoint;
    this._executeGotoStateActions(point.gotoState, point.actions, point.marker, point.context);
  },

  /** @private */
  _executeGotoStateActions: function (gotoState, actions, marker, context) {
    var action = null,
        len = actions.length,
        actionResult = null;

    marker = SC.none(marker) ? 0 : marker;

    for (; marker < len; marker += 1) {
      this._currentGotoStateAction = action = actions[marker];
      switch (action.action) {
      case SC.EXIT_STATE:
        actionResult = this._exitState(action.state, context);
        break;

      case SC.ENTER_STATE:
        actionResult = this._enterState(action.state, action.currentState, context);
        break;
      }

      //
      // Check if the state wants to perform an asynchronous action during
      // the state transition process. If so, then we need to first
      // suspend the state transition process and then invoke the
      // asynchronous action. Once called, it is then up to the state or something
      // else to resume this statechart's state transition process by calling the
      // statechart's resumeGotoState method.
      //
      if (SC.kindOf(actionResult, SC.Async)) {
        this._gotoStateSuspendedPoint = {
          gotoState: gotoState,
          actions: actions,
          marker: marker + 1,
          context: context
        };

        actionResult.tryToPerform(action.state);
        return;
      }
    }

    this.beginPropertyChanges();
    this.notifyPropertyChange('currentStates');
    this.notifyPropertyChange('enteredStates');
    this.endPropertyChanges();

    //@if(debug)
    if (this.get('allowStatechartTracing')) {
      if (this.getPath('currentStates.length') > 2) {
        this.statechartLogTrace("  current states after:\n%@".fmt(this.get('currentStates').getEach('fullPath').join('  \n')), SC.TRACE_STATECHART_STYLE.gotoStateInfo);
      } else {
        this.statechartLogTrace("  current states after: %@".fmt(this.get('currentStates').getEach('fullPath').join(', ')), SC.TRACE_STATECHART_STYLE.gotoStateInfo);
      }
      this.statechartLogTrace("END gotoState: %@".fmt(gotoState), SC.TRACE_STATECHART_STYLE.gotoState);
    }
    //@endif

    this._cleanupStateTransition();
  },

  /** @private */
  _cleanupStateTransition: function () {
    this._currentGotoStateAction = null;
    this._gotoStateSuspendedPoint = null;
    this._gotoStateActions = null;
    this._gotoStateLocked = NO;
    this._flushPendingStateTransition();
    // Check the flags so we only flush if the events will actually get sent.
    if (!this._sendEventLocked && !this._gotoStateLocked) { this._flushPendingSentEvents(); }
  },

  /** @private */
  _exitState: function (state, context) {
    var parentState;

    if (state.get('currentSubstates').indexOf(state) >= 0) {
      parentState = state.get('parentState');
      while (parentState) {
        parentState.get('currentSubstates').removeObject(state);
        parentState = parentState.get('parentState');
      }
    }

    parentState = state;
    while (parentState) {
      parentState.get('enteredSubstates').removeObject(state);
      parentState = parentState.get('parentState');
    }

    //@if(debug)
    if (this.get('allowStatechartTracing')) {
      this.statechartLogTrace("<-- exiting state: %@".fmt(state), SC.TRACE_STATECHART_STYLE.exit);
    }
    //@endif

    state.set('currentSubstates', []);

    state.stateWillBecomeExited(context);
    var result = this.exitState(state, context);
    state.stateDidBecomeExited(context);

    //@if(debug)
    if (this.get('monitorIsActive')) this.get('monitor').pushExitedState(state);
    //@endif

    state._traverseStatesToExit_skipState = NO;

    return result;
  },

  /**
    What will actually invoke a state's exitState method.

    Called during the state transition process whenever the gotoState method is
    invoked.

    @param state {SC.State} the state whose enterState method is to be invoked
    @param context {Hash} a context hash object to provide the enterState method
  */
  exitState: function (state, context) {
    return state.exitState(context);
  },

  /** @private */
  _enterState: function (state, current, context) {
    var parentState = state.get('parentState');
    if (parentState && !state.get('isConcurrentState')) parentState.set('historyState', state);

    if (current) {
      parentState = state;
      while (parentState) {
        parentState.get('currentSubstates').pushObject(state);
        parentState = parentState.get('parentState');
      }
    }

    parentState = state;
    while (parentState) {
      parentState.get('enteredSubstates').pushObject(state);
      parentState = parentState.get('parentState');
    }

    //@if(debug)
    if (this.get('allowStatechartTracing')) {
      if (state.enterStateByRoute && SC.kindOf(context, SC.StateRouteHandlerContext)) {
        this.statechartLogTrace("--> entering state (by route): %@".fmt(state), SC.TRACE_STATECHART_STYLE.enter);
      } else {
        this.statechartLogTrace("--> entering state: %@".fmt(state), SC.TRACE_STATECHART_STYLE.enter);
      }
    }
    //@endif

    state.stateWillBecomeEntered(context);
    var result = this.enterState(state, context);
    state.stateDidBecomeEntered(context);

    //@if(debug)
    if (this.get('monitorIsActive')) this.get('monitor').pushEnteredState(state);
    //@endif

    return result;
  },

  /**
    What will actually invoke a state's enterState method.

    Called during the state transition process whenever the gotoState method is
    invoked.

    If the context provided is a state route context object
    ({@link SC.StateRouteContext}), then if the given state has a enterStateByRoute
    method, that method will be invoked, otherwise the state's enterState method
    will be invoked by default. The state route context object will be supplied to
    both enter methods in either case.

    @param state {SC.State} the state whose enterState method is to be invoked
    @param context {Hash} a context hash object to provide the enterState method
  */
  enterState: function (state, context) {
    if (state.enterStateByRoute && SC.kindOf(context, SC.StateRouteHandlerContext)) {
      return state.enterStateByRoute(context);
    } else {
      return state.enterState(context);
    }
  },

  /**
    When called, the statechart will proceed to make transitions to the given state then follow that
    state's history state.

    You can either go to a given state's history recursively or non-recursively. To go to a state's history
    recursively means to following each history state's history state until no more history states can be
    followed. Non-recursively means to just to the given state's history state but do not recusively follow
    history states. If the given state does not have a history state, then the statechart will just follow
    normal procedures when making state transitions.

    Because a statechart can have one or more current states, depending on if the statechart has any concurrent
    states, it is optional to provided current state in which to start the state transition process from. If no
    current state is provided, then the statechart will default to the first current state that it has; which,
    depending on the make up of that statechart, can lead to unexpected outcomes. For a statechart with concurrent
    states, it is best to explicitly supply a current state.

    Method can be called in the following ways:

        // With one arguments.
        gotoHistoryState(<state>)

        // With two arguments.
        gotoHistoryState(<state>, <state | boolean | hash>)

        // With three arguments.
        gotoHistoryState(<state>, <state>, <boolean | hash>)
        gotoHistoryState(<state>, <boolean>, <hash>)

        // With four argumetns
        gotoHistoryState(<state>, <state>, <boolean>, <hash>)

    where <state> is either a SC.State object or a string and <hash> is a regular JS hash object.

    @param state {SC.State|String} the state to go to and follow it's history state
    @param fromCurrentState {SC.State|String} Optional. the current state to start the state transition process from
    @param recursive {Boolean} Optional. whether to follow history states recursively.
  */
  gotoHistoryState: function (state, fromCurrentState, recursive, context) {
    if (!this.get('statechartIsInitialized')) {
      this.statechartLogError("can not go to state %@'s history state. Statechart has not yet been initialized".fmt(state));
      return;
    }

    var args = this._processGotoStateArgs(arguments);

    state = args.state;
    fromCurrentState = args.fromCurrentState;
    recursive = args.useHistory;
    context = args.context;

    state = this.getState(state);

    if (!state) {
      this.statechartLogError("Can not to goto state %@'s history state. Not a recognized state in statechart".fmt(state));
      return;
    }

    var historyState = state.get('historyState');

    if (!recursive) {
      if (historyState) {
        this.gotoState(historyState, fromCurrentState, context);
      } else {
        this.gotoState(state, fromCurrentState, context);
      }
    } else {
      this.gotoState(state, fromCurrentState, YES, context);
    }
  },

  /**
    Sends a given event to all the statechart's current states.

    If a current state does can not respond to the sent event, then the current state's parent state
    will be tried. This process is recursively done until no more parent state can be tried.

    Note that a state will only be checked once if it can respond to an event. Therefore, if
    there is a state S that handles event foo and S has concurrent substates, then foo will
    only be invoked once; not as many times as there are substates.

    @param event {String} name of the event
    @param arg1 {Object} optional argument
    @param arg2 {Object} optional argument
    @returns {SC.Responder} the responder that handled it or null

    @see #stateWillTryToHandleEvent
    @see #stateDidTryToHandleEvent
  */
  sendEvent: function (event, arg1, arg2) {

    if (this.get('isDestroyed')) {
      this.statechartLogError("can not send event %@. statechart is destroyed".fmt(event));
      return;
    }

    var statechartHandledEvent = NO,
        result = this,
        eventHandled = NO,
        currentStates = this.get('currentStates').slice(),
        checkedStates = {},
        len = 0,
        i = 0,
        state = null;

    if (this._sendEventLocked || this._gotoStateLocked) {
      // Want to prevent any actions from being processed by the states until
      // they have had a chance to handle the most immediate action or completed
      // a state transition
      this._pendingSentEvents.push({
        event: event,
        arg1: arg1,
        arg2: arg2
      });

      return;
    }

    this._sendEventLocked = YES;

    //@if(debug)
    var trace = this.get('allowStatechartTracing');
    if (trace) {
      this.statechartLogTrace("BEGIN sendEvent: '%@'".fmt(event), SC.TRACE_STATECHART_STYLE.action);
    }
    //@endif

    len = currentStates.get('length');
    for (; i < len; i += 1) {
      eventHandled = NO;
      state = currentStates[i];
      if (!state.get('isCurrentState')) continue;
      while (!eventHandled && state) {
        if (!checkedStates[state.get('fullPath')]) {
          eventHandled = state.tryToHandleEvent(event, arg1, arg2);
          checkedStates[state.get('fullPath')] = YES;
        }
        if (!eventHandled) state = state.get('parentState');
        else statechartHandledEvent = YES;
      }
    }

    // Now that all the states have had a chance to process the
    // first event, we can go ahead and flush any pending sent events.
    this._sendEventLocked = NO;

    //@if(debug)
    if (trace) {
      if (!statechartHandledEvent) this.statechartLogTrace("No state was able handle event %@".fmt(event), SC.TRACE_STATECHART_STYLE.action);
      this.statechartLogTrace("END sendEvent: '%@'".fmt(event), SC.TRACE_STATECHART_STYLE.action);
    }
    //@endif

    // Check if the flags are unlocked. These means any pending events
    // will successfully send, so go ahead and flush. Otherwise, events
    // would become out of order since the first event would get shifted,
    // then pushed.
    if (!this._sendEventLocked && !this._gotoStateLocked) {
      result = this._flushPendingSentEvents();
    }

    return statechartHandledEvent ? this : (result ? this : null);
  },

  /**
    Used to notify the statechart that a state will try to handle event that has been passed
    to it.

    @param {SC.State} state the state that will try to handle the event
    @param {String} event the event the state will try to handle
    @param {String} handler the name of the method on the state that will try to handle the event
  */
  stateWillTryToHandleEvent: function (state, event, handler) {
    this._stateHandleEventInfo = {
      state: state,
      event: event,
      handler: handler
    };
  },

  /**
    Used to notify the statechart that a state did try to handle event that has been passed
    to it.

    @param {SC.State} state the state that did try to handle the event
    @param {String} event the event the state did try to handle
    @param {String} handler the name of the method on the state that did try to handle the event
    @param {Boolean} handled indicates if the handler was able to handle the event
  */
  stateDidTryToHandleEvent: function (state, event, handler, handled) {
    this._stateHandleEventInfo = null;
  },

  /** @private

    Creates a chain of states from the given state to the greatest ancestor state (the root state). Used
    when perform state transitions.
  */
  _createStateChain: function (state) {
    var chain = [];

    while (state) {
      chain.push(state);
      state = state.get('parentState');
    }

    return chain;
  },

  /** @private

    Finds a pivot state from two given state chains. The pivot state is the state indicating when states
    go from being exited to states being entered during the state transition process. The value
    returned is the fist matching state between the two given state chains.
  */
  _findPivotState: function (stateChain1, stateChain2) {
    if (stateChain1.length === 0 || stateChain2.length === 0) return null;

    var pivot = stateChain1.find(function (state, index) {
      if (stateChain2.indexOf(state) >= 0) return YES;
    });

    return pivot;
  },

  /** @private

    Recursively follow states that are to be exited during a state transition process. The exit
    process is to start from the given state and work its way up to when either all exit
    states have been reached based on a given exit path or when a stop state has been reached.

    @param state {State} the state to be exited
    @param exitStatePath {Array} an array representing a path of states that are to be exited
    @param stopState {State} an explicit state in which to stop the exiting process
  */
  _traverseStatesToExit: function (state, exitStatePath, stopState, gotoStateActions) {
    if (!state || state === stopState) return;

    // This state has concurrent substates. Therefore we have to make sure we
    // exit them up to this state before we can go any further up the exit chain.
    if (state.get('substatesAreConcurrent')) {
      var i = 0,
          currentSubstates = state.get('currentSubstates'),
          len = currentSubstates.length,
          currentState = null;

      for (; i < len; i += 1) {
        currentState = currentSubstates[i];
        if (currentState._traverseStatesToExit_skipState === YES) continue;
        var chain = this._createStateChain(currentState);
        this._traverseStatesToExit(chain.shift(), chain, state, gotoStateActions);
      }
    }

    gotoStateActions.push({ action: SC.EXIT_STATE, state: state });
    if (state.get('isCurrentState')) state._traverseStatesToExit_skipState = YES;
    this._traverseStatesToExit(exitStatePath.shift(), exitStatePath, stopState, gotoStateActions);
  },

  /** @private

    Recursively follow states that are to be entered during the state transition process. The
    enter process is to start from the given state and work its way down a given enter path. When
    the end of enter path has been reached, then continue entering states based on whether
    an initial substate is defined, there are concurrent substates or history states are to be
    followed; when none of those condition are met then the enter process is done.

    @param state {State} the sate to be entered
    @param enterStatePath {Array} an array representing an initial path of states that are to be entered
    @param pivotState {State} The state pivoting when to go from exiting states to entering states
    @param useHistory {Boolean} indicates whether to recursively follow history states
  */
  _traverseStatesToEnter: function (state, enterStatePath, pivotState, useHistory, gotoStateActions) {
    if (!state) return;

    // We do not want to enter states in the enter path until the pivot state has been reached. After
    // the pivot state has been reached, then we can go ahead and actually enter states.
    if (pivotState) {
      if (state !== pivotState) {
        this._traverseStatesToEnter(enterStatePath.pop(), enterStatePath, pivotState, useHistory, gotoStateActions);
      } else {
        this._traverseStatesToEnter(enterStatePath.pop(), enterStatePath, null, useHistory, gotoStateActions);
      }
    }

    // If no more explicit enter path instructions, then default to enter states based on
    // other criteria
    else if (!enterStatePath || enterStatePath.length === 0) {
      var gotoStateAction = { action: SC.ENTER_STATE, state: state, currentState: NO };
      gotoStateActions.push(gotoStateAction);

      var initialSubstate = state.get('initialSubstate'),
          historyState = state.get('historyState');

      // State has concurrent substates. Need to enter all of the substates
      if (state.get('substatesAreConcurrent')) {
        this._traverseConcurrentStatesToEnter(state.get('substates'), null, useHistory, gotoStateActions);
      }

      // State has substates and we are instructed to recursively follow the state's
      // history state if it has one.
      else if (state.get('hasSubstates') && historyState && useHistory) {
        this._traverseStatesToEnter(historyState, null, null, useHistory, gotoStateActions);
      }

      // State has an initial substate to enter
      else if (initialSubstate) {
        if (SC.kindOf(initialSubstate, SC.HistoryState)) {
          if (!useHistory) useHistory = initialSubstate.get('isRecursive');
          initialSubstate = initialSubstate.get('state');
        }
        this._traverseStatesToEnter(initialSubstate, null, null, useHistory, gotoStateActions);
      }

      // Looks like we hit the end of the road. Therefore the state has now become
      // a current state of the statechart.
      else {
        gotoStateAction.currentState = YES;
      }
    }

    // Still have an explicit enter path to follow, so keep moving through the path.
    else if (enterStatePath.length > 0) {
      gotoStateActions.push({ action: SC.ENTER_STATE, state: state });
      var nextState = enterStatePath.pop();
      this._traverseStatesToEnter(nextState, enterStatePath, null, useHistory, gotoStateActions);

      // We hit a state that has concurrent substates. Must go through each of the substates
      // and enter them
      if (state.get('substatesAreConcurrent')) {
        this._traverseConcurrentStatesToEnter(state.get('substates'), nextState, useHistory, gotoStateActions);
      }
    }
  },

  /** @override

    Returns YES if the named value translates into an executable function on
    any of the statechart's current states or the statechart itself.

    @param event {String} the property name to check
    @returns {Boolean}
  */
  respondsTo: function (event) {
    // Fast path!
    if (this.get('isDestroyed')) {
      this.statechartLogError("can not respond to event %@. statechart is destroyed".fmt(event));
      return false;
    }

    var currentStates = this.get('currentStates'),
        len = currentStates.get('length'),
        i = 0, state = null;

    for (; i < len; i += 1) {
      state = currentStates.objectAt(i);
      while (state) {
        if (state.respondsToEvent(event)) return true;
        state = state.get('parentState');
      }
    }

    // None of the current states can respond. Now check the statechart itself
    return SC.typeOf(this[event]) === SC.T_FUNCTION;
  },

  /** @override

    Attempts to handle a given event against any of the statechart's current states and the
    statechart itself. If any current state can handle the event or the statechart itself can
    handle the event then YES is returned, otherwise NO is returned.

    @param event {String} what to perform
    @param arg1 {Object} Optional
    @param arg2 {Object} Optional
    @returns {Boolean} YES if handled, NO if not handled
  */
  tryToPerform: function (event, arg1, arg2) {
    if (!this.respondsTo(event)) return NO;

    if (SC.typeOf(this[event]) === SC.T_FUNCTION) {
      var result = this[event](arg1, arg2);
      if (result !== NO) return YES;
    }

    return !!this.sendEvent(event, arg1, arg2);
  },

  /**
    Used to invoke a method on current states. If the method can not be executed
    on a current state, then the state's parent states will be tried in order
    of closest ancestry.

    A few notes:

     1. Calling this is not the same as calling sendEvent or sendAction.
        Rather, this should be seen as calling normal methods on a state that
        will *not* call gotoState or gotoHistoryState.
     2. A state will only ever be invoked once per call. So if there are two
        or more current states that have the same parent state, then that parent
        state will only be invoked once if none of the current states are able
        to invoke the given method.

    When calling this method, you are able to supply zero ore more arguments
    that can be pass onto the method called on the states. As an example

        invokeStateMethod('render', context, firstTime);

    The above call will invoke the render method on the current states
    and supply the context and firstTime arguments to the method.

    Because a statechart can have more than one current state and the method
    invoked may return a value, the addition of a callback function may be provided
    in order to handle the returned value for each state. As an example, let's say
    we want to call a calculate method on the current states where the method
    will return a value when invoked. We can handle the returned values like so:

        invokeStateMethod('calculate', value, function (state, result) {
          // .. handle the result returned from calculate that was invoked
          //    on the given state
        })

    If the method invoked does not return a value and a callback function is
    supplied, then result value will simply be undefined. In all cases, if
    a callback function is given, it must be the last value supplied to this
    method.

    invokeStateMethod will return a value if only one state was able to have
    the given method invoked on it, otherwise no value is returned.

    @param methodName {String} methodName a method name
    @param args {Object...} Optional. any additional arguments
    @param func {Function} Optional. a callback function. Must be the last
           value supplied if provided.

    @returns a value if the number of current states is one, otherwise undefined
             is returned. The value is the result of the method that got invoked
             on a state.
  */
  invokeStateMethod: function (methodName, args, func) {
    if (methodName === 'unknownEvent') {
      this.statechartLogError("can not invoke method unkownEvent");
      return;
    }

    args = SC.A(arguments);
    args.shift();

    var len = args.length,
        arg = len > 0 ? args[len - 1] : null,
        callback = SC.typeOf(arg) === SC.T_FUNCTION ? args.pop() : null,
        currentStates = this.get('currentStates'),
        i = 0, state = null,
        checkedStates = {},
        method, result,
        calledStates = 0;

    len = currentStates.get('length');

    for (; i < len; i += 1) {
      state = currentStates.objectAt(i);
      while (state) {
        if (checkedStates[state.get('fullPath')]) break;
        checkedStates[state.get('fullPath')] = YES;
        method = state[methodName];
        if (SC.typeOf(method) === SC.T_FUNCTION && !method.isEventHandler) {
          result = method.apply(state, args);
          if (callback) callback.call(this, state, result);
          calledStates += 1;
          break;
        }
        state = state.get('parentState');
      }
    }

    return calledStates === 1 ? result : undefined;
  },

  /** @private

    Iterate over all the given concurrent states and enter them
  */
  _traverseConcurrentStatesToEnter: function (states, exclude, useHistory, gotoStateActions) {
    var i = 0,
        len = states.length,
        state = null;

    for (; i < len; i += 1) {
      state = states[i];
      if (state !== exclude) this._traverseStatesToEnter(state, null, null, useHistory, gotoStateActions);
    }
  },

  /** @private

    Called by gotoState to flush a pending state transition at the front of the
    pending queue.
  */
  _flushPendingStateTransition: function () {
    if (!this._pendingStateTransitions) {
      this.statechartLogError("Unable to flush pending state transition. _pendingStateTransitions is invalid");
      return;
    }
    var pending = this._pendingStateTransitions.shift();
    if (!pending) return;
    this.gotoState(pending.state, pending.fromCurrentState, pending.useHistory, pending.context);
  },

  /** @private

     Called by sendEvent to flush a pending actions at the front of the pending
     queue
   */
  _flushPendingSentEvents: function () {
    var pending = this._pendingSentEvents.shift();
    if (!pending) return null;
    return this.sendEvent(pending.event, pending.arg1, pending.arg2);
  },

  /** @private */
  //@if(debug)
  _monitorIsActiveDidChange: function () {
    if (this.get('monitorIsActive') && SC.none(this.get('monitor'))) {
      this.set('monitor', SC.StatechartMonitor.create());
    }
  }.observes('monitorIsActive'),
  //@endif

  /** @private
    Will process the arguments supplied to the gotoState method.

    TODO: Come back to this and refactor the code. It works, but it
          could certainly be improved
  */
  _processGotoStateArgs: function (args) {
    var processedArgs = {
        state: null,
        fromCurrentState: null,
        useHistory: false,
        context: null
      },
      len = null,
      value = null;

    args = SC.$A(args);
    args = args.filter(function (item) {
      return item !== undefined;
    });
    len = args.length;

    if (len < 1) return processedArgs;

    processedArgs.state = args[0];

    if (len === 2) {
      value = args[1];
      switch (SC.typeOf(value)) {
      case SC.T_BOOL:
        processedArgs.useHistory = value;
        break;
      case SC.T_HASH:
      case SC.T_OBJECT:
        if (!SC.kindOf(value, SC.State)) {
          processedArgs.context = value;
        }
        break;
      default:
        processedArgs.fromCurrentState = value;
      }
    }
    else if (len === 3) {
      value = args[1];
      if (SC.typeOf(value) === SC.T_BOOL) {
        processedArgs.useHistory = value;
        processedArgs.context = args[2];
      } else {
        processedArgs.fromCurrentState = value;
        value = args[2];
        if (SC.typeOf(value) === SC.T_BOOL) {
          processedArgs.useHistory = value;
        } else {
          processedArgs.context = value;
        }
      }
    }
    else {
      processedArgs.fromCurrentState = args[1];
      processedArgs.useHistory = args[2];
      processedArgs.context = args[3];
    }

    return processedArgs;
  },

  /** @private

    Will return a newly constructed root state class. The root state will have substates added to
    it based on properties found on this state that derive from a SC.State class. For the
    root state to be successfully built, the following much be met:

     - The rootStateExample property must be defined with a class that derives from SC.State
     - Either the initialState or statesAreConcurrent property must be set, but not both
     - There must be one or more states that can be added to the root state

  */
  _constructRootStateClass: function () {
    var rsExampleKey = 'rootStateExample',
        rsExample = this.get(rsExampleKey),
        initialState = this.get('initialState'),
        statesAreConcurrent = this.get('statesAreConcurrent'),
        stateCount = 0,
        key, value, valueIsFunc, attrs = {};

    if (SC.typeOf(rsExample) === SC.T_FUNCTION && rsExample.statePlugin) {
      rsExample = rsExample.apply(this);
    }

    if (!(SC.kindOf(rsExample, SC.State) && rsExample.isClass)) {
      this._logStatechartCreationError("Invalid root state example");
      return null;
    }

    if (statesAreConcurrent && !SC.empty(initialState)) {
      this._logStatechartCreationError("Can not assign an initial state when states are concurrent");
    } else if (statesAreConcurrent) {
      attrs.substatesAreConcurrent = YES;
    } else if (SC.typeOf(initialState) === SC.T_STRING) {
      attrs.initialSubstate = initialState;
    } else {
      this._logStatechartCreationError("Must either define initial state or assign states as concurrent");
      return null;
    }

    for (key in this) {
      if (key === rsExampleKey) continue;

      value = this[key];
      valueIsFunc = SC.typeOf(value) === SC.T_FUNCTION;

      if (valueIsFunc && value.statePlugin) {
        value = value.apply(this);
      }

      if (SC.kindOf(value, SC.State) && value.isClass && this[key] !== this.constructor) {
        attrs[key] = value;
        stateCount += 1;
      }
    }

    if (stateCount === 0) {
      this._logStatechartCreationError("Must define one or more states");
      return null;
    }

    return rsExample.extend(attrs);
  },

  /** @private */
  _logStatechartCreationError: function (msg) {
    SC.Logger.error("Unable to create statechart for %@: %@.".fmt(this, msg));
  },

  /**
    Used to log a statechart error message
  */
  statechartLogError: function (msg) {
    SC.Logger.error("ERROR %@: %@".fmt(this.get('statechartLogPrefix'), msg));
  },

  /**
    Used to log a statechart warning message
  */
  statechartLogWarning: function (msg) {
    if (this.get('suppressStatechartWarnings')) return;
    SC.Logger.warn("WARN %@: %@".fmt(this.get('statechartLogPrefix'), msg));
  },

  /** @property */
  statechartLogPrefix: function () {
    var className = SC._object_className(this.constructor),
        name = this.get('name'), prefix;

    if (SC.empty(name)) prefix = "%@<%@>".fmt(className, SC.guidFor(this));
    else prefix = "%@<%@, %@>".fmt(className, name, SC.guidFor(this));

    return prefix;
  }.property().cacheable()

};

SC.mixin(SC.StatechartManager, SC.StatechartDelegate, SC.DelegateSupport);

/**
  The default name given to a statechart's root state
*/
SC.ROOT_STATE_NAME = "__ROOT_STATE__";

/**
  Constants used during the state transition process
*/
SC.EXIT_STATE = 0;
SC.ENTER_STATE = 1;

/**
  A Statechart class.
*/
SC.Statechart = SC.Object.extend(SC.StatechartManager, {
  autoInitStatechart: NO
});

SC.Statechart.design = SC.Statechart.extend;
