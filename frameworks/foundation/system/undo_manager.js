// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/**
  @class

  This is a simple undo manager. It manages groups of actions which return
  something to an earlier state. It's your responsibility to make sure that
  these functions successfully undo the action, and register an undo action
  of their own (allowing redo).

  ## Using SC.UndoManager

  You should create one SC.UndoManager instance for each thing you want to
  allow undo on. For example, if a controller manages a single record, but
  you have two fields that should each have their own undo stack, you should
  create two separate managers.

  Register undo functions via the `registerUndoAction`, which takes a target,
  action, context and optional human-readable action name. Trigger actions by
  calling the `undo` and `redo` methods. Actions will be called with `context`
  as their only argument.

  Optionally, you can group undo actions; groups of actions are triggered
  together.

  ### Simple Example: A single value

  This example attaches an undo manager to a controller and registers an undo
  function each time the value of `value` changes. It also exposes methods to
  trigger undos and redos, triggered via buttons in the included stub view class.

        // Controller:
        MyApp.myController = SC.ObjectController.create({
          // Content, with `value`.
          content: SC.Object.create({ value: 'Hello, World.' }),

          // Undo manager.
          valueUndoManager: SC.UndoManager.create(),

          // Undo action.
          _valueUndoAction(val) {
            // This call will trigger the controller's `value` observer, triggering the registration
            // of another undo; the UndoManager will automatically and correctly interpret this as
            // the registration of a redo method.
            this.set('value', val);
          },

          // Value observer; tracks `value` and registers undos.
          valueDidChange: function() {
            // Get the values.
            var value = this.get('value'),
                previousValue = this._previousValue,
                that = this;

            // Update previous value.
            this._previousValue = value;

            // GATEKEEP: If the current value is the same as the previous value, there's nothing to do.
            if (previousValue === value) return;

            // GATEKEEP: If there is no previous value, it's probably our initial spinup. We don't want
            // to register an undo-back-to-undefined method, so we should return. (Your situation may be
            // different.)
            if (SC.none(previousValue)) return;

            // Otherwise, register an undo function. (previousValue is accessed via the closure.)
            this.undoManager.registerUndoAction(this, this._valueUndoAction, previousValue);
          }.observes('value')
        });

        // Stub view:
        MyApp.UndoableValueView = SC.View.extend({
          childViews: ['labelView', 'undoButtonView', 'redoButtonView'],
          labelView: SC.LabelView.extend({
            layout: { height: 24 },
            isEdiable: YES,
            valueBinding: 'MyApp.myController.value'
          }),
          undoButtonView: SC.ButtonView.extend({
            layout: { height: 24, width: 60, bottom: 0 },
            title: 'Undo',
            isEnabledBinding: SC.Binding.oneWay('MyApp.myController.valueUndoManager.canUndo'),
            target: 'MyApp.myController.valueUndoManager',
            action: 'undo'
          }),
          redoButtonView: SC.ButtonView.extend({
            layout: { height: 24, width: 60, bottom: 0, right: 0 },
            title: 'Redo',
            isEnabledBinding: SC.Binding.oneWay('MyApp.myController.valueUndoManager.canRedo'),
            target: 'MyApp.myController.valueUndoManager',
            action: 'redo'
          })
        });

  ### Advanced: Grouping undos

  Undo events registered by `registerUndoAction` will undo or redo one at a time. If you wish,
  you can group undo events into groups (for example, if you wish to group all undos which happen
  within a short duration of each other). Groups are fired all at once when `undo` or `redo` is
  called.

  To start a new undo group, call `beginUndoGroup`; to register undo functions to the currently-
  open group, call `registerGroupedUndoAction`; finally, to mark the end of a grouped set of undo
  functions, call `endUndoGroup`. In most cases, you will not need to call `beginUndoGroup` and
  `endUndoGroup`: if you call `registerUndoAction`, any open group will be closed, and a new group
  will be created and left open; calling `registerGroupedUndoAction` will simply add to the
  currently-open group, creating a new one if necessary. This means that in practice, you can call
  `registerUndoAction` to close previous groups and begin a new one, and `registerGroupedUndoAction`
  to add to an existing group.

  If `undo` is called while an undo group is open, UndoManager will simply close the group for
  you before executing it. This allows you to safely leave groups open pending possible additional
  undo actions.

  @extends SC.Object
*/
SC.UndoManager = SC.Object.extend(
/** @scope SC.UndoManager.prototype */ {

  /** 
    If name arguments are passed into `registerUndoAction` or related methods, then this property
    will expose the last undo action's name. You can use this to show the user what type of action
    will be undone (for example "typing" or "delete").

    @field
    @readonly
    @type String
    @default null
  */
  undoActionName: function () { 
    return this.undoStack ? this.undoStack.name : null;
  }.property('undoStack').cacheable(),

  /** 
    Exposes the timestamp of the most recent undo action.

    @field
    @readonly
    @type SC.DateTime
    @default null
  */
  undoActionTimestamp: function() {
    return this.undoStack ? this.undoStack.timeStamp : null;
  }.property('undoStack').cacheable(),

  /** 
    If name arguments are passed into `registerUndoAction` or related methods, then this property
    will expose the last redo action's name. You can use this to show the user what type of
    action will be redone (for example "Redo typing" or "Redo delete").

    @field
    @readonly
    @type String
    @default null
  */
  redoActionName: function () { 
    return this.redoStack ? this.redoStack.name : null;
  }.property('redoStack').cacheable(),

  /** 
    Exposes the timestamp of the most recent redo action.

    @field
    @readonly
    @type SC.DateTime
    @default null
  */
  redoActionTimestamp: function() {
    return this.redoStack ? this.redoStack.timeStamp : null;
  }.property('redoStack').cacheable(),

  /** 
    True if there is an undo action on the stack. Use to validate your menu item or enable
    your button.
    
    @field
    @readonly
    @type Boolean
    @default NO
  */
  canUndo: function () { 
    return !SC.none(this.undoStack);
  }.property('undoStack').cacheable(),
  
  /** 
    True if there is an redo action on the stack. Use to validate your menu item or enable
    your button.
    
    @field
    @readonly
    @type Boolean
    @default NO
  */
  canRedo: function () {
    return !SC.none(this.redoStack);
  }.property('redoStack').cacheable(),
  
  /**
    Tries to undo the last action. Fails if an undo group is currently open.

    @returns {Boolean} YES if succeeded, NO otherwise.
  */
  undo: function () {
    this._undoOrRedo('undoStack','isUndoing');
  },

  /**
    Tries to redo the last action. Fails if a redo group is currently open.
    
    @returns {Boolean} YES if succeeded, NO otherwise.
  */
  redo: function () {
    this._undoOrRedo('redoStack','isRedoing');
  },

  /**
    Resets the undo and redo stacks.
  */
  reset: function () {
    this._activeGroup = null;
    this.set('undoStack', null);
    this.set('redoStack', null);
  },

  /**
    The maximum number of undo groups the receiver holds.
    The undo stack is unlimited by default.

    @type Number
    @default 0
  */
  maxStackLength: 0,
  
  /**
    @type Boolean
    @default NO
  */
  isUndoing: NO,
  
  /**
    @type Boolean
    @default NO
  */
  isRedoing: NO, 
  
  // --------------------------------
  // UNDO ACTION REGISTRATION
  //

  /**
    Registers an undo action. If called while an undo is in progress (i.e. from your
    undo method, or from observers which it triggers), registers a redo action instead.
    
    @param {String|Object} target The action's target (`this`).
    @param {String|Function} action The method on `target` to be called.
    @param {Object} context The context passed to the action when called.
    @param {String} name An optional human-readable name for the undo action.
  */
  registerUndoAction: function(target, action, context, name) {
    // Calls to registerUndoAction close any open undo groups, open a new one and register
    // to it. This means that a series of calls to registerUndo will simply open and close
    // a series of single-function groups, as intended.

    if (!this.isUndoing && !this.isRedoing) {
      if (this._activeGroup) {
        this.endUndoGroup();
      }
      this.beginUndoGroup(name);
    }
    
    this.registerGroupedUndoAction(target, action, context);
  },

  /**
    Registers an undo action to the current group. If no group is open, opens a new
    one.

    @param {String|Object} target The action's target (`this`).
    @param {String|Function} action The method on `target` to be called.
    @param {Object} context The context passed to the action when called.
    @param {String} name An optional human-readable name for the undo action. Sets or
      changes the current group's name.
  */
  registerGroupedUndoAction: function(target, action, context, name) {
    // If we don't have an active group, route the call through registerUndoAction, which will
    // handle creating a new group for us before returning here. (Slight hack.)
    if (!this._activeGroup) {
      this.registerUndoAction(target, action, context, name);
    }
    // Otherwise, register the action.
    else {
      if (name) this._activeGroup.name = name;
      this._activeGroup.targets.push(target);
      this._activeGroup.actions.push(action);
      this._activeGroup.contexts.push(context);
      this._activeGroup.timeStamp = SC.DateTime.create();

      // If we're not mid-undo or -redo, then we're registering a new undo, and should
      // clear out any redoStack.
      if (!this.isUndoing && !this.isRedoing) {
        this.set('redoStack', null);
      }
    }
  },

  /**
    Begins a new undo group.

    Whenever you start an action that you expect to need to bundle under a single
    undo action in the menu, you should begin an undo group.  This way any
    undo actions registered by other parts of the application will be
    automatically bundled into this one action.

    When you are finished performing the action, balance this with a call to
    `endUndoGroup()`. (You can call `undo` or `redo` with an open group; the group
    will simply be closed and processed as normal.)

    @param {String} name
  */
  beginUndoGroup: function (name) {
    if (this._activeGroup) {
      //@if(debug)
      SC.warn("SC.UndoManager#beginUndoGroup() called while inside group.");
      //@endif
      return;
    }

    var stack = this.isUndoing ? 'redoStack' : 'undoStack';

    this._activeGroup = {
      // The action's name (see undoActionName). Optional.
      name: name,
      // Ordered lists of targets, actions and contexts. (Nth items in each list go together.)
      targets: [],
      actions: [],
      contexts: [],
      // The previous undo action. When this group is triggered, prev will become the new stack.
      prev: this.get(stack),
      // When the action was registered. Useful for grouping undo actions by time.
      timeStamp: SC.DateTime.create()
    };

    this.set(stack, this._activeGroup);
  },
 
  /**
    Ends a group of undo functions. All functions in an undo group will be undone or redone
    together when `undo` or `redo` is called.

    @see beginUndoGroup()
  */
  endUndoGroup: function () {
    var maxStackLength = this.get('maxStackLength'),
      stackName = this.isUndoing ? 'redoStack' : 'undoStack';

    if (!this._activeGroup) {
      //@if(debug)
      SC.warn("SC.UndoManager#endUndoGroup() called outside group.");
      //@endif
      return;
    }

    this._activeGroup = null;
    this.notifyPropertyChange(stackName);

    // If we have a maxStackLength, trace back through stack.prev that many times and
    // null out anything older.
    if (maxStackLength > 0) {
      var stack = this[stackName],
        i = 1;
      while(stack = stack.prev) {
        i++;
        if (i >= maxStackLength) {
          stack.prev = null;
        }
      }
    }
  },

  /**
    Change the name of the current undo group.
    
    @param {String} name
  */
  setActionName: function (name) {
    if (!this._activeGroup) {
      //@if(debug)
      SC.warn("SC.UndoManager#setActionName() called without an active undo group.");
      //@endif
      return;
    }
    this._activeGroup.name = name;
  },
  
  // --------------------------------
  // PRIVATE
  //
  
  /** @private */
  _activeGroup: null,
  
  /** @private */
  undoStack: null,
  
  /** @private */
  redoStack: null, 
  
  /** @private */
  _undoOrRedo: function (stack, state) {
    // Close out any open undo groups.
    if (this._activeGroup) this.endUndoGroup();

    // Flag the state.
    this.set(state, true);

    // Run the group of actions!
    var group = this.get(stack);
    if (group) {
      // Roll back the stack to the previous item.
      this.set(stack, group.prev);
      // Open a new group of the opposite persuasion with the same name. This makes sure a redo
      // action will have the same name as its corresponding undo action.
      this.beginUndoGroup(group.name);

      // Run the actions backwards.
      var len = group.actions.length,
          target, action, context, i;
      for (i = len - 1; i >= 0; i--) {
        target = group.targets[i];
        action = group.actions[i];
        context = group.contexts[i];

        // Normalize (for convenience and backward-compatibility).
        // If target is a function, it's the action.
        if (SC.typeOf(target) === SC.T_FUNCTION) {
          action = target;
          target = null;
        }
        // If target is a string, see if it points to an object.
        if (SC.typeOf(target) === SC.T_STRING) target = SC.objectForPropertyPath(target);
        // If action is a string, see if it's the name of a method on target.
        if (target && SC.typeOf(action) === SC.T_STRING && SC.typeOf(target[action]) === SC.T_FUNCTION) action = target[action];

        // Call!
        if (SC.typeOf(action) === SC.T_FUNCTION) action.call(target, context);
      }

      // Close the opposite-persuasion group opened above.
      this.endUndoGroup();
    }
    this.set(state, false);
  },

  /** @private */
  destroy: function() {
    this._activeGroup = null;
    this.set('undoStack') = null;
    this.set('redoStack') = null;
    return sc_super();
  },

  /** @private Deprecated as of 1.11. Use registerUndoAction instead. */
  registerUndo: function (func, name) {
    //@if(debug)
    SC.warn('SC.UndoManager#registerUndo is deprecated and will be removed in a future version. Use registerUndoAction.');
    //@endif
    this.registerUndoAction(null, func, null, name);
  }

});
