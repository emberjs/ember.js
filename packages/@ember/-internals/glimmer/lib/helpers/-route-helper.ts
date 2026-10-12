import type Route from '@ember/routing/route';
import type { RouterState, RoutingService } from '@ember/routing/-internals';
import { getOwner } from '@ember/-internals/owner';
import { assert } from '@ember/debug';
import { getEngineParent } from '@ember/engine/parent';
import type EngineInstance from '@ember/engine/instance';
import { service } from '@ember/service';
import type { Maybe } from '@glimmer/interfaces';
import type { Nullable } from '@ember/-internals/utility-types';
import Helper from '../helper';
import { isMissing } from '../utils/is-missing';

export interface RouteHelperSignature<Return> {
  Args: {
    Positional: [route?: Maybe<string>, ...models: unknown[]];
    Named: {
      models?: unknown;
      queryParams?: Maybe<Record<string, unknown>>;
    };
  };
  Return: Return;
}

export type RoutePositional = RouteHelperSignature<unknown>['Args']['Positional'];
export type RouteNamed = RouteHelperSignature<unknown>['Args']['Named'];

export interface RouteArgs {
  route: Maybe<string>;
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  models: {}[];
  queryParams: Record<string, unknown> | undefined;
}

/**
  The base class of the router helpers of RFC 391.

  It reads the arguments in the same way for each helper,
  and it holds the route state logic of `<LinkTo>`.

  @private
*/
export default abstract class RouteHelper<Return> extends Helper<RouteHelperSignature<Return>> {
  @service('-routing') declare protected routing: RoutingService<Route>;

  /**
    The name of the helper in assertion messages.
  */
  protected abstract helperName: string;

  protected routeArgs(positional: RoutePositional, named: RouteNamed): RouteArgs {
    let [route, ...models] = positional;

    assert(
      `The route name of the \`${this.helperName}\` helper must be a string.`,
      isMissing(route) || typeof route === 'string'
    );

    if ('models' in named) {
      assert(
        `You cannot provide both positional models and the \`models\` argument to the \`${this.helperName}\` helper.`,
        models.length === 0
      );

      let { models: namedModels } = named;

      models = Array.isArray(namedModels) ? namedModels : [namedModels];
    }

    let { queryParams } = named;

    assert(
      `The \`queryParams\` argument to the \`${this.helperName}\` helper must be an object.`,
      isMissing(queryParams) || typeof queryParams === 'object'
    );

    return {
      route: isMissing(route) ? route : this.namespaceRoute(route),
      // eslint-disable-next-line @typescript-eslint/no-empty-object-type
      models: models as {}[],
      queryParams: isMissing(queryParams) ? undefined : { ...queryParams },
    };
  }

  /**
    `<LinkTo>` uses the same condition for its `loading` class.
  */
  protected isLoading({ route, models }: RouteArgs): boolean {
    return isMissing(route) || models.some(isMissing);
  }

  protected isActive(args: RouteArgs): boolean {
    return this.isActiveForState(args, this.routing.currentState);
  }

  /**
    The result is `null` when no transition is in progress.
  */
  protected willBeActive(args: RouteArgs): Nullable<boolean> {
    let { currentState, targetState } = this.routing;

    if (currentState === targetState) {
      return null;
    }

    return this.isActiveForState(args, targetState);
  }

  private isActiveForState(args: RouteArgs, state: Maybe<RouterState>): boolean {
    if (isMissing(state) || this.isLoading(args)) {
      return false;
    }

    let { route, models, queryParams } = args;

    return this.routing.isActiveForRoute(models, queryParams, route as string, state);
  }

  /**
    In an engine, route names are relative to the mount point of the engine.
  */
  private namespaceRoute(route: string): string {
    let owner = getOwner(this) as EngineInstance;
    let { mountPoint } = owner;

    assert(
      `You attempted to use the \`${this.helperName}\` helper within a routeless engine, this is not supported.`,
      mountPoint !== undefined || getEngineParent(owner) === undefined
    );

    if (mountPoint === undefined) {
      return route;
    } else if (route === 'application') {
      return mountPoint;
    } else {
      return `${mountPoint}.${route}`;
    }
  }
}
