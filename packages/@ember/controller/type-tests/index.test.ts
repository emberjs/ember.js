import { Owner } from '@ember/-internals/owner';
import Controller, { inject } from '@ember/controller';

import { expectTypeOf } from 'expect-type';

// Good enough for tests
let owner = {} as Owner;

class Foo {}

let foo = new Foo();
let foo2 = new Foo();

let controller = new Controller<Foo>(owner);

expectTypeOf(controller).toEqualTypeOf<Controller<Foo>>();

// Has observable methods
expectTypeOf(controller.get).toBeFunction();
expectTypeOf(controller.set).toBeFunction();

expectTypeOf(controller.target).toEqualTypeOf<unknown | undefined>();

expectTypeOf(controller.model).toEqualTypeOf<Foo>();

expectTypeOf(controller.concatenatedProperties).toEqualTypeOf<string[]>();

expectTypeOf(controller.queryParams).toEqualTypeOf<
  Array<string | Record<string, { type: 'boolean' | 'number' | 'array' | 'string' }>>
>();

controller.transitionToRoute('blogPosts');
controller.transitionToRoute('blogPosts', foo);
controller.transitionToRoute('blogPosts', 1);
controller.transitionToRoute('blogPosts', 'one');
controller.transitionToRoute('blogComment', foo, foo2);
controller.transitionToRoute('blogComment', 1, 13);
controller.transitionToRoute('blogComment', 'one', 'thirteen');
controller.transitionToRoute('/blog/posts/1/comment/13');
controller.transitionToRoute('blogPost', 1, { queryParams: { showComments: true } });
controller.transitionToRoute({ queryParams: { showComments: true } });

// Ideally, these would fail, but we can't distinguish it from a model
controller.transitionToRoute('blogPost', 1, { queryParams: { 1: true } });
controller.transitionToRoute({ queryParams: { 1: true } });

controller.replaceRoute('blogPosts');
controller.replaceRoute('blogPosts', foo);
controller.replaceRoute('blogPosts', 1);
controller.replaceRoute('blogPosts', 'one');
controller.replaceRoute('blogComment', foo, foo2);
controller.replaceRoute('blogComment', 1, 13);
controller.replaceRoute('blogComment', 'one', 'thirteen');
controller.replaceRoute('/blog/posts/1/comment/13');
controller.replaceRoute('blogPost', 1, { queryParams: { showComments: true } });
controller.replaceRoute({ queryParams: { showComments: true } });

// Ideally, these would fail, but we can't distinguish it from a model
controller.replaceRoute('blogPost', 1, { queryParams: { 1: true } });
controller.replaceRoute({ queryParams: { 1: true } });

expectTypeOf(inject('foo')).toMatchTypeOf<PropertyDecorator>();

// Allows inferred name
expectTypeOf(inject()).toMatchTypeOf<PropertyDecorator>();

// @ts-expect-error Doesn't allow invalid types
inject(1);
