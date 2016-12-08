/**
@module ember
@submodule ember-views
*/
import { Mixin } from 'ember-metal';

export default Mixin.create({
  _transitionTo(state) {
    var priorState = this._currentState;
    var currentState = this._currentState = this._states[state];
    this._state = state;

    if (priorState && priorState.exit) { priorState.exit(this); }
    if (currentState.enter) { currentState.enter(this); }
  }
});
