import type Router from 'router_js';
import type { InternalRouteInfo, InternalTransition, TransitionState } from 'router_js';
import type Route from '@ember/routing/route';
import type { ModelFor } from '@ember/routing/route';
import { expectTypeOf } from 'expect-type';

interface Post {
  id: string;
  title: string;
}

expectTypeOf<InternalRouteInfo['context']>().toEqualTypeOf<unknown>();
expectTypeOf<Router['currentRouteInfos']>().toEqualTypeOf<
  InternalRouteInfo<unknown>[] | undefined
>();
expectTypeOf<InternalTransition['resolvedModels']>().toEqualTypeOf<{ [key: string]: unknown }>();

expectTypeOf<InternalRouteInfo<Post>['context']>().toEqualTypeOf<
  Post | PromiseLike<Post> | undefined
>();
expectTypeOf<Router<Post>['currentRouteInfos']>().toEqualTypeOf<
  InternalRouteInfo<Post>[] | undefined
>();
expectTypeOf<Router<Post>['state']>().toEqualTypeOf<TransitionState<Post> | undefined>();
expectTypeOf<TransitionState<Post>['routeInfos']>().toEqualTypeOf<InternalRouteInfo<Post>[]>();
expectTypeOf<InternalTransition<Post>['resolvedModels']>().toEqualTypeOf<{
  [key: string]: Post | undefined;
}>();
expectTypeOf<Parameters<Router<Post>['applyIntent']>[1]>().toEqualTypeOf<Post[]>();

expectTypeOf<ModelFor<Route<Post>>>().toEqualTypeOf<Post>();
expectTypeOf<Router<ModelFor<Route<Post>>>['currentRouteInfos']>().toEqualTypeOf<
  InternalRouteInfo<Post>[] | undefined
>();

expectTypeOf<InternalRouteInfo<string>[]>().not.toMatchTypeOf<
  NonNullable<Router<Post>['currentRouteInfos']>
>();
