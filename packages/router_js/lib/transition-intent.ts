import type { BaseRoute } from './route-info';
import type Router from './router';
import type TransitionState from './transition-state';

export type OpaqueIntent = TransitionIntent<any>;

export abstract class TransitionIntent<R extends BaseRoute> {
  data: object;
  router: Router<R>;
  constructor(router: Router<R>, data: object = {}) {
    this.router = router;
    this.data = data;
  }
  preTransitionState?: TransitionState<R>;
  abstract applyToState(oldState: TransitionState<R>, isIntermediate: boolean): TransitionState<R>;
}
