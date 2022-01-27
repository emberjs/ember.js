import { Owner } from '@ember/-internals/owner';
import EmberObject from '@ember/object';
import Evented from '@ember/object/evented';
import { ILocation } from '@ember/routing/location';
import Router from '@ember/routing/router';
import { expectTypeOf } from 'expect-type';
import { Transition } from 'router_js';

expectTypeOf<Router>().toMatchTypeOf<EmberObject>();
expectTypeOf<Router>().toMatchTypeOf<Evented>();

// NOTE: This is invalid, but acceptable for type tests
let owner = {} as Owner;
let router = new Router(owner);

expectTypeOf(router.rootURL).toEqualTypeOf<string>();

expectTypeOf(router.location).toEqualTypeOf<string | ILocation>();

let aPost = {};
let aComment = {};
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
