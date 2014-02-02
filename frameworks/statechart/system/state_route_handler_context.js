// ==========================================================================
// Project:   SC.Statechart - A Statechart Framework for SproutCore
// Copyright: ©2010, 2011 Michael Cohen, and contributors.
//            Portions @2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/*globals SC */

/**
  @class

  Represents contextual information for whenever a state handles a triggered
  route. In additional to retaining contextual information, you can also
  use the object to retry trigging the state's route handler. Useful in cases
  where you need to defer the handling of the route for a later time.

  @see SC.State

  @extends SC.Object
  @author Michael Cohen
*/
SC.StateRouteHandlerContext = SC.Object.extend(
  /** @scope SC.StateRouteContext.prototype */{

  /**
    The state that constructed this context object.

    @property {SC.State}
  */
  state: null,

  /**
    The location that caused the state's route to be
    triggered.

    @type String
  */
  location: null,

  /**
    The parameters that were supplied to the state's
    handler when the state's route was triggered.

    @type Hash
  */
  params: null,

  /**
    The handler that got invoked when the state's
    route was triggered. This can either be a reference
    to the actual method or a name of the method.

    @property {Function|String}
  */
  handler: null,

  /**
    Used to retry invoking the state's handler for when
    the state's route gets triggered. When called this will
    essentially perform the same call as when the handler
    was originally triggered on state.
  */
  retry: function() {
    var state = this.get('state'),
        params = this.get('params'),
        handler = this.get('handler');

    if (SC.typeOf(handler) === SC.T_STRING) {
      handler = state[handler];
    }

    if (SC.typeOf(handler) === SC.T_FUNCTION) {
      handler.apply(state, [params]);
    }
  }

});
