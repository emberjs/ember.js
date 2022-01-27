import { Owner } from '@ember/-internals/owner';
import Controller from '@ember/controller';
import EmberObject from '@ember/object';
import Route from '@ember/routing/route';
import { expectTypeOf } from 'expect-type';
import { Transition } from 'router_js';

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
expectTypeOf(route.transitionTo('blogPosts')).toEqualTypeOf<Transition>();
route.transitionTo('blogPosts.recentEntries');
route.transitionTo('blogPost', aPost);
route.transitionTo('blogPost', 1);
route.transitionTo('blogComment', aPost, aComment);
route.transitionTo('blogComment', 1, 13);
route.transitionTo('/');
route.transitionTo('/blog/post/1/comment/13');
route.transitionTo('/blog/posts?sort=title');
route.transitionTo('blogPost', 1, { queryParams: { showComments: 'true' } });
route.transitionTo({ queryParams: { showComments: 'true' } });

expectTypeOf(route.replaceWith('blogPosts')).toEqualTypeOf<Transition>();
route.replaceWith('blogPosts.recentEntries');
route.replaceWith('blogPost', aPost);
route.replaceWith('blogPost', 1);
route.replaceWith('blogComment', aPost, aComment);
route.replaceWith('blogComment', 1, 13);
route.replaceWith('/');
route.replaceWith('/blog/post/1/comment/13');
route.replaceWith('/blog/posts?sort=title');
route.replaceWith('blogPost', 1, { queryParams: { showComments: 'true' } });
route.replaceWith({ queryParams: { showComments: 'true' } });

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
