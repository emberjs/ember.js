/**
@module ember
*/
import Mixin from '@ember/object/mixin';
const ViewStateSupport = Mixin.create({
  _transitionTo(state) {
    let priorState = this._currentState;
    let currentState = this._currentState = this._states[state];
    this._state = state;
    if (priorState && priorState.exit) {
      priorState.exit(this);
    }
    if (currentState.enter) {
      currentState.enter(this);
    }
  }
});
export default ViewStateSupport;