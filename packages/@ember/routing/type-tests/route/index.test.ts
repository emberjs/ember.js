import type Owner from '@ember/owner';
import type Controller from '@ember/controller';
import type EmberObject from '@ember/object';
import Route from '@ember/routing/route';
import { expectTypeOf } from 'expect-type';
import type { Transition } from 'router_js';

// NOTE: This is invalid, but acceptable for type tests
let owner = {} as Owner;
let route = new Route(owner);

expectTypeOf(route).toMatchTypeOf<EmberObject>();

expectTypeOf(route.templateName).toEqualTypeOf<string | null>();

expectTypeOf(route.controllerName).toEqualTypeOf<string | null>();

expectTypeOf(route.controller).toEqualTypeOf<Controller>();

expectTypeOf(route.routeName).toEqualTypeOf<string>();

expectTypeOf(route.fullRouteName).toEqualTypeOf<string>();

// TODO: Review this return type. It is always string or undefined?
expectTypeOf(route.paramsFor('foo')).toEqualTypeOf<Record<string, unknown>>();

let aPost = {};
let aComment = {};

expectTypeOf(route.intermediateTransitionTo('blogPosts')).toEqualTypeOf<void>();

route.intermediateTransitionTo('blogPosts.recentEntries');
route.intermediateTransitionTo('blogPost', aPost);
route.intermediateTransitionTo('blogPost', 1);
route.intermediateTransitionTo('blogComment', aPost, aComment);
route.intermediateTransitionTo('blogComment', 1, 13);
route.intermediateTransitionTo('/');
route.intermediateTransitionTo('blogPost', 1, { queryParams: { showComments: 'true' } });
// @ts-expect-error Requires a name
route.intermediateTransitionTo({ queryParams: { showComments: 'true' } });

expectTypeOf(route.refresh()).toEqualTypeOf<Transition>();

expectTypeOf(route.controllerFor('foo')).toEqualTypeOf<Controller>();
// The second argument is undocumented
expectTypeOf(route.controllerFor('foo', true)).toEqualTypeOf<Controller | undefined>();
expectTypeOf(route.controllerFor('foo', false)).toEqualTypeOf<Controller>();

expectTypeOf(route.modelFor('foo')).toEqualTypeOf<unknown>();
