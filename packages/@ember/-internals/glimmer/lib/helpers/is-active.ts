import RouteHelper, { type RouteNamed, type RoutePositional } from './-route-helper';

/**
  The `isActive` helper returns `true` when the given route is active.
  It uses the same logic as the `active` class of `<LinkTo>`.

  ```gjs
  import { isActive, urlFor } from '@ember/routing';

  <template>
    <a href={{urlFor "about"}} class={{if (isActive "about") "active"}}>About</a>
  </template>
  ```

  The helper takes the same arguments as `urlFor`.

  ```gjs
  import { isActive } from '@ember/routing';
  import { hash } from '@ember/helper';

  <template>
    {{isActive "post" @post.id}}
    {{isActive "post.comment" models=(Array.of @post.id @comment.id)}}
    {{isActive "posts" queryParams=(hash page=2)}}
  </template>
  ```

  The helper returns `false` when the route name or a model is missing.

  @method isActive
  @for @ember/routing
  @static
  @param {String} routeName the name of the route
  @param {...String|Number} models the values of the dynamic segments of the route
  @param {Object} [named] the `models` and `queryParams` named arguments
  @return {Boolean} `true` when the route is active
  @public
*/
export default class IsActiveHelper extends RouteHelper<boolean> {
  protected helperName = 'isActive';

  compute(positional: RoutePositional, named: RouteNamed): boolean {
    return this.isActive(this.routeStateArgs(positional, named));
  }
}
