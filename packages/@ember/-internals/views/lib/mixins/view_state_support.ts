/**
@module ember
*/
import Mixin from '@ember/object/mixin';
import type Component from '@ember/component';
import type states from '../views/states';

interface ViewStateSupport {
  /** @internal */
  _transitionTo(state: keyof typeof states): void;
}
const ViewStateSupport = Mixin.create({
  _transitionTo(this: Component, state: keyof typeof states) {
    let priorState = this._currentState;
    let currentState = (this._currentState = this._states[state]);
    this._state = state;

    if (priorState && priorState.exit) {
      priorState.exit(this);
    }
    if (currentState.enter) {
      currentState.enter(this);
    }
  },
});

export default ViewStateSupport;
