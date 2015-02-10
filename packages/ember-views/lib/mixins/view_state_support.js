import Ember from 'ember-metal/core';
import { Mixin } from "ember-metal/mixin";

var ViewStateSupport = Mixin.create({
  transitionTo: function(state, children) {
    Ember.deprecate("Ember.View#transitionTo has been deprecated, it is for internal use only");
    this._transitionTo(state, children);
  },

  _transitionTo: function(state, children) {
    var priorState = this.currentState;
    var currentState = this.currentState = this._states[state];
    this._state = state;

    if (priorState && priorState.exit) { priorState.exit(this); }
    if (currentState.enter) { currentState.enter(this); }
  }
});

export default ViewStateSupport;
