import RouteHelper, { type RouteNamed, type RoutePositional } from './-route-helper';

/**
  The `isLoading` helper returns `true` while the application goes to the given route.
  This is the time from the start of a transition to its end,
  and it includes a loading substate.

  ```gjs
  import { isLoading, urlFor } from '@ember/routing';

  <template>
    <a href={{urlFor "post" @post.id}} class={{if (isLoading "post" @post.id) "loading"}}>
      Post
    </a>
  </template>
  ```

  The helper takes the same arguments as `urlFor`.
  The models are the values of the dynamic segments, not model objects.
  The models and the query params must match the target of the transition.

  ```gjs
  import { isLoading } from '@ember/routing';
  import { hash } from '@ember/helper';

  <template>
    {{isLoading "post.comment" models=(Array.of @post.id @comment.id)}}
    {{isLoading "posts" queryParams=(hash page=2)}}
  </template>
  ```

  A parent route of the target route is also loading.
  For example, `(isLoading "application")` is `true` during each transition.

  The helper returns `false` when the route name or a model is missing,
  because it cannot compare them with the target.

  @method isLoading
  @for @ember/routing
  @static
  @param {String} routeName the name of the route
  @param {...String|Number} models the values of the dynamic segments of the route
  @param {Object} [named] the `models` and `queryParams` named arguments
  @return {Boolean} `true` while the application goes to the route
  @public
*/
export default class IsLoadingHelper extends RouteHelper<boolean> {
  protected helperName = 'isLoading';

  compute(positional: RoutePositional, named: RouteNamed): boolean {
    let args = this.routeStateArgs(positional, named);

    return this.willBeActive(args) === true;
  }
}
