/**
@module ember
@submodule ember-routing
*/


/**
  A TransitionEvent is passed as the argument for `transitionTo`
  events and contains information about an attempted transition 
  that can be modified or decorated by leafier `transitionTo` event
  handlers before the actual transition is committed by ApplicationRoute.

  @class TransitionEvent
  @namespace Ember
  @extends Ember.Deferred
 */
Ember.TransitionEvent = Ember.Object.extend({

  /**
    The Ember.Route method used to perform the transition.  Presently, 
    the only valid values are 'transitionTo' and 'replaceWith'.
   */
  transitionMethod: 'transitionTo',
  destinationRouteName: null,
  sourceRoute: null,
  contexts: null,

  init: function() {
    this._super();
    this.contexts = this.contexts || [];
  },

  /**
    Convenience method that returns an array that can be used for
    legacy `transitionTo` and `replaceWith`.
   */
  transitionToArgs: function() {
    return [this.destinationRouteName].concat(this.contexts);
  }
});


Ember.TransitionEvent.reopenClass({
  /**
    This is the default transition event handler that will be injected
    into ApplicationRoute. The context, like all route event handlers in
    the events hash, will be an `Ember.Route`.
   */
  defaultHandler: function(transitionEvent) {
    var router = this.router;
    router[transitionEvent.transitionMethod].apply(router, transitionEvent.transitionToArgs());
  }
});
