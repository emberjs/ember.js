/* eslint-disable no-self-assign */

import { Owner } from '@ember/-internals/owner';
import { EmberLocation } from '@ember/-internals/routing';
import Route from '@ember/routing/route';
import RouterService, { RouteInfo, RouteInfoWithAttributes } from '@ember/routing/router-service';
import { expectTypeOf } from 'expect-type';
import { Transition } from 'router_js';

// Good enough for tests
let owner = {} as Owner;

class Post {}
class Comment {}

let router = new RouterService<Route<Post | Comment>>(owner);

let aPost = new Post();
let aComment = new Comment();

expectTypeOf(router.transitionTo('blogPosts')).toEqualTypeOf<Transition>();
router.transitionTo('blogPosts.recentEntries');
router.transitionTo('blogPost', aPost);
router.transitionTo('blogPost', 1);
router.transitionTo('blogComment', aPost, aComment);
router.transitionTo('blogComment', 1, 13);
router.transitionTo('/');
router.transitionTo('/blog/post/1/comment/13');
router.transitionTo('/blog/posts?sort=title');
router.transitionTo('blogPost', 1, { queryParams: { showComments: 'true' } });
router.transitionTo({ queryParams: { showComments: 'true' } });

expectTypeOf(router.replaceWith('blogPosts')).toEqualTypeOf<Transition>();
router.replaceWith('blogPosts.recentEntries');
router.replaceWith('blogPost', aPost);
router.replaceWith('blogPost', 1);
router.replaceWith('blogComment', aPost, aComment);
router.replaceWith('blogComment', 1, 13);
router.replaceWith('/');
router.replaceWith('/blog/post/1/comment/13');
router.replaceWith('/blog/posts?sort=title');
router.replaceWith('blogPost', 1, { queryParams: { showComments: 'true' } });
router.replaceWith({ queryParams: { showComments: 'true' } });

expectTypeOf(router.urlFor('blogPosts')).toEqualTypeOf<string>();
router.urlFor('blogPost', aPost);
router.urlFor('blogPost', aPost, { queryParams: { showComments: 'true' } });

expectTypeOf(router.isActive('blogPost')).toEqualTypeOf<boolean>();
router.isActive('blogPosts.recentEntries');
router.isActive('blogPost', aPost);
router.isActive('blogPost', 1);
router.isActive('blogComment', aPost, aComment);
router.isActive('blogComment', 1, 13);
router.isActive('blogPost', 1, { queryParams: { showComments: 'true' } });
router.isActive({ queryParams: { showComments: 'true' } });

expectTypeOf(router.recognize('/blog/post/1/comment/13')).toEqualTypeOf<RouteInfo | null>();
// @ts-expect-error it shouldn't be a RouteInfoWithAttributes
router.recognize('/').attributes;
// @ts-expect-error requires a string
router.recognize(aPost);

expectTypeOf(router.recognizeAndLoad('/blog/post/1/comment/13')).toEqualTypeOf<
  Promise<RouteInfoWithAttributes>
>();
// @ts-expect-error requires a string
router.recognizeAndLoad(aPost);

// NOTE: We can't currently infer the type
router.on('routeWillChange', (_transition: unknown) => {});
router.on('routeDidChange', (_transition: unknown) => {});

// Canary
if (router.refresh) {
  expectTypeOf(router.refresh()).toEqualTypeOf<Transition>();
  expectTypeOf(router.refresh('blogPost')).toEqualTypeOf<Transition>();
}

expectTypeOf(router.currentRouteName).toEqualTypeOf<string | null>();
// @ts-expect-error readonly
router.currentRouteName = router.currentRouteName;

expectTypeOf(router.currentURL).toEqualTypeOf<string | null>();
// @ts-expect-error readonly
router.currentURL = router.currentURL;

expectTypeOf(router.location).toEqualTypeOf<string | EmberLocation>();
// @ts-expect-error readonly
router.location = router.location;

expectTypeOf(router.rootURL).toEqualTypeOf<string>();
// @ts-expect-error readonly
router.rootURL = router.rootURL;

expectTypeOf(router.currentRoute).toEqualTypeOf<RouteInfo | RouteInfoWithAttributes | null>();
// @ts-expect-error readonly
router.currentRoute = router.currentRoute;
