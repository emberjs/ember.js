import { Promise } from 'rsvp';
import { Dict } from './core';
import InternalRouteInfo, { Route, ResolvedRouteInfo } from './route-info';
import Transition from './transition';
import { forEach, promiseLabel } from './utils';
import { throwIfAborted } from './transition-aborted-error';

interface IParams {
  [key: string]: unknown;
}

function handleError<R extends Route>(
  currentState: TransitionState<R>,
  transition: Transition<R>,
  error: Error
): never {
  // This is the only possible
  // reject value of TransitionState#resolve
  let routeInfos = currentState.routeInfos;
  let errorHandlerIndex =
    transition.resolveIndex >= routeInfos.length ? routeInfos.length - 1 : transition.resolveIndex;

  let wasAborted = transition.isAborted;

  throw new TransitionError(
    error,
    currentState.routeInfos[errorHandlerIndex].route!,
    wasAborted,
    currentState
  );
}

function resolveOneRouteInfo<R extends Route>(
  currentState: TransitionState<R>,
  transition: Transition<R>
): void | Promise<void> {
  if (transition.resolveIndex === currentState.routeInfos.length) {
    // This is is the only possible
    // fulfill value of TransitionState#resolve
    return;
  }

  let routeInfo = currentState.routeInfos[transition.resolveIndex];

  let callback = proceed.bind(null, currentState, transition) as (
    resolvedRouteInfo: ResolvedRouteInfo<R>
  ) => void | Promise<void>;

  return routeInfo.resolve(transition).then(callback, null, currentState.promiseLabel('Proceed'));
}

function proceed<R extends Route>(
  currentState: TransitionState<R>,
  transition: Transition<R>,
  resolvedRouteInfo: ResolvedRouteInfo<R>
): void | Promise<void> {
  let wasAlreadyResolved = currentState.routeInfos[transition.resolveIndex].isResolved;

  // Swap the previously unresolved routeInfo with
  // the resolved routeInfo
  currentState.routeInfos[transition.resolveIndex++] = resolvedRouteInfo;

  if (!wasAlreadyResolved) {
    // Call the redirect hook. The reason we call it here
    // vs. afterModel is so that redirects into child
    // routes don't re-run the model hooks for this
    // already-resolved route.
    let { route } = resolvedRouteInfo;
    if (route !== undefined) {
      if (route.redirect) {
        route.redirect(resolvedRouteInfo.context, transition);
      }
    }
  }

  // Proceed after ensuring that the redirect hook
  // didn't abort this transition by transitioning elsewhere.
  throwIfAborted(transition);

  return resolveOneRouteInfo(currentState, transition);
}

export default class TransitionState<R extends Route> {
  routeInfos: InternalRouteInfo<R>[] = [];
  queryParams: Dict<unknown> = {};
  params: IParams = {};

  promiseLabel(label: string) {
    let targetName = '';
    forEach(this.routeInfos, function (routeInfo) {
      if (targetName !== '') {
        targetName += '.';
      }
      targetName += routeInfo.name;
      return true;
    });
    return promiseLabel("'" + targetName + "': " + label);
  }

  resolve(transition: Transition<R>): Promise<TransitionState<R>> {
    // First, calculate params for this state. This is useful
    // information to provide to the various route hooks.
    let params = this.params;
    forEach(this.routeInfos, (routeInfo) => {
      params[routeInfo.name] = routeInfo.params || {};
      return true;
    });

    transition.resolveIndex = 0;

    let callback = resolveOneRouteInfo.bind(null, this, transition);
    let errorHandler = handleError.bind(null, this, transition);

    // The prelude RSVP.resolve() async moves us into the promise land.
    return Promise.resolve(null, this.promiseLabel('Start transition'))
      .then(callback, null, this.promiseLabel('Resolve route'))
      .catch(errorHandler, this.promiseLabel('Handle error'))
      .then(() => this);
  }
}

export class TransitionError {
  constructor(
    public error: Error,
    public route: Route,
    public wasAborted: boolean,
    public state: TransitionState<any>
  ) {}
}
