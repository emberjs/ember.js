import RouteHelper, { type RouteNamed, type RoutePositional } from './-route-helper';

/**
  The `isLoading` helper returns `true` when the route name or a model
  is `null` or `undefined`.
  It uses the same logic as the `loading` class of `<LinkTo>`.

  ```gjs
  import { isLoading, urlFor } from '@ember/routing';

  <template>
    <a href={{urlFor "post" @post}} class={{if (isLoading "post" @post) "loading"}}>
      Post
    </a>
  </template>
  ```

  The helper takes the same arguments as `urlFor`.
  It does not use the query params.

  @method isLoading
  @for @ember/routing
  @static
  @param {String} routeName the name of the route
  @param {...Object} models the model(s) for the route
  @param {Object} [named] the `models` and `queryParams` named arguments
  @return {Boolean} `true` when the route name or a model is missing
  @public
*/
export default class IsLoadingHelper extends RouteHelper<boolean> {
  protected helperName = 'isLoading';

  compute(positional: RoutePositional, named: RouteNamed): boolean {
    return this.isLoading(this.routeArgs(positional, named));
  }
}
