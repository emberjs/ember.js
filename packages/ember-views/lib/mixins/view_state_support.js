import { Mixin } from 'ember-metal/mixin';

var ViewStateSupport = Mixin.create({
  _transitionTo(state) {
    var priorState = this._currentState;
    var currentState = this._currentState = this._states[state];
    this._state = state;

    if (priorState && priorState.exit) { priorState.exit(this); }
    if (currentState.enter) { currentState.enter(this); }
  }
});

export default ViewStateSupport;
