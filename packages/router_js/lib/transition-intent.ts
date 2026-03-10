import { Route } from './route-info';
import Router from './router';
import TransitionState from './transition-state';

export type OpaqueIntent = TransitionIntent<any>;

export abstract class TransitionIntent<R extends Route> {
  data: {};
  router: Router<R>;
  constructor(router: Router<R>, data: {} = {}) {
    this.router = router;
    this.data = data;
  }
  preTransitionState?: TransitionState<R>;
  abstract applyToState(oldState: TransitionState<R>, isIntermediate: boolean): TransitionState<R>;
}
