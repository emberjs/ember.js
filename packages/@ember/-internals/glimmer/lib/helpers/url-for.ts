import type RouterService from '@ember/routing/router-service';
import { service } from '@ember/service';
import RouteHelper, { type RouteNamed, type RoutePositional } from './-route-helper';

/**
  The `urlFor` helper returns the URL of a route.
  The URL includes the `rootURL` of the application.

  ```gjs
  import { urlFor } from '@ember/routing';

  <template>
    <a href={{urlFor "about"}}>About</a>
  </template>
  ```

  Pass the values of the dynamic segments as positional arguments,
  or as the `models` argument. You cannot use both.
  Each value is a string or a number. A model object is not a valid value.

  ```gjs
  import { urlFor } from '@ember/routing';

  <template>
    <a href={{urlFor "post.comment" @post.id @comment.id}}>Comment</a>
    <a href={{urlFor "post.comment" models=(Array.of @post.id @comment.id)}}>Comment</a>
  </template>
  ```

  The helper adds only the query params that you pass.
  It does not add the query params of the controller.

  ```gjs
  import { urlFor } from '@ember/routing';
  import { hash } from '@ember/helper';

  <template>
    <a href={{urlFor "posts" queryParams=(hash page=2)}}>Page 2</a>
  </template>
  ```

  The helper gives its arguments to the `urlFor` method of the `router` service.
  The helper has no special case for a model that is `null` or `undefined`.

  The helper uses the `router` service.
  In an engine, the engine must supply that service.

  @method urlFor
  @for @ember/routing
  @static
  @param {String} routeName the name of the route
  @param {...String|Number} models the values of the dynamic segments of the route
  @param {Object} [named] the `models` and `queryParams` named arguments
  @return {String} the URL of the route
  @public
*/
export default class UrlForHelper extends RouteHelper<string> {
  @service('router') private router!: RouterService;

  protected helperName = 'urlFor';

  compute(positional: RoutePositional, named: RouteNamed): string {
    let { router } = this;
    let { route, models, queryParams } = this.routeArgs(positional, named);

    /**
      The URL can contain dynamic segments and query params of the active routes.
    */
    void router.currentURL;

    return router.urlFor(route as string, ...models, { queryParams: queryParams ?? {} });
  }
}
