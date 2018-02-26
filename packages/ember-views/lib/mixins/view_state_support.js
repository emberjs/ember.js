/**
@module ember
*/
import { Mixin } from 'ember-metal';

export default Mixin.create({
  _transitionTo(state) {
    let priorState = this._currentState;
    let currentState = this._currentState = this._states[state];
    this._state = state;

    if (priorState && priorState.exit) { priorState.exit(this); }
    if (currentState.enter) { currentState.enter(this); }
  }
});
