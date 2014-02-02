// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/**
  @class

  Implements basic target and action support for views.

  @author Erich Ocean
  @author Colin Campbell (colin@sproutcore.com)
  @since SproutCore 1.7
*/
SC.ActionSupport =
/** @scope SC.ActionSupport.prototype */ {

  /**
    The target object to invoke the action on when fireAction() is called.

    If you set this target, the action will be called on the target object
    directly when fireAction() is called. If you leave this property set to
    null, then the responder chain will be searched for a view that implements
    the action.

    @type Object
    @default null
  */
  target: null,

  /**
    The name of the action you want triggered when fireAction() is called.

    This property is used in conjunction with the target property to execute
    a method when fireAction() is called.

    If you do not set a target, then calling fireAction() will cause the
    responder chain to search for a view that implements the action you name
    here.  If you set a target, then fireAction() will try to call the
    method on the target itself.

    @type String
    @default null
  */
  action: null,

  /**
    Will be sent along with the action to provide the context of the action.
    This is an easy way to include information along with the action.

    @type Object
    @default null
  */
  actionContext: null,

   /**
     Perform the action. If an action parameter is not provided, then
     the action defaults to the `action` property.

     @param {String} [action] The action to fire.

     @returns {Boolean} true if successful
     @returns {Boolean} false otherwise
  */
  fireAction: function(action) {
    var target = this.get('target') || null,
        rootResponder = this.getPath('pane.rootResponder');

    if (action === undefined) { action = this.get('action'); }

    if (action && rootResponder) {
      return rootResponder.sendAction(action, target, this, this.get('pane'), this.get('actionContext'), this);
    }

    return false;
  }

};