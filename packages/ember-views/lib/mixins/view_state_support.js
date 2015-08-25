import { deprecate } from 'ember-metal/debug';
import { Mixin } from 'ember-metal/mixin';

var ViewStateSupport = Mixin.create({
  transitionTo(state) {
    deprecate(
      'Ember.View#transitionTo has been deprecated, it is for internal use only',
      false,
      { id: 'ember-views.view-transition-to', until: '2.4.0' }
    );
    this._transitionTo(state);
  },

  _transitionTo(state) {
    var priorState = this._currentState;
    var currentState = this._currentState = this._states[state];
    this._state = state;

    if (priorState && priorState.exit) { priorState.exit(this); }
    if (currentState.enter) { currentState.enter(this); }
  }
});

export default ViewStateSupport;
