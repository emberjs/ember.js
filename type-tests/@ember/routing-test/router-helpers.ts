import {
  isActive,
  isLoading,
  isTransitioningIn,
  isTransitioningOut,
  rootUrl,
  urlFor,
} from '@ember/routing';
import type { HelperLike } from '@glint/template';
import { NamedArgsMarker, resolve } from '@glint/template/-private/dsl';
import { expectTypeOf } from 'expect-type';

/**
  Glint has this declaration for each class-based helper.
  With it, `resolve(helper)(...)` has the types of a call in a template.
*/
declare module '@ember/component/helper' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  export default interface Helper<S> extends InstanceType<HelperLike<S>> {}
}

declare let model: { id: string };
declare let id: string | undefined;

/**
  `{{urlFor "post" model.id}}`
*/
expectTypeOf(resolve(urlFor)('about')).toBeString();
expectTypeOf(resolve(urlFor)('post', model.id)).toBeString();
expectTypeOf(resolve(urlFor)('post', id)).toBeString();
expectTypeOf(resolve(urlFor)('post.comment', model.id, 7)).toBeString();
expectTypeOf(resolve(urlFor)('post', { models: [model.id], ...NamedArgsMarker })).toBeString();
expectTypeOf(
  resolve(urlFor)('post', model.id, { queryParams: { page: 2 }, ...NamedArgsMarker })
).toBeString();

resolve(urlFor)(
  // @ts-expect-error the route name is a string
  42
);
resolve(urlFor)(
  'post',
  // @ts-expect-error a model object is not the value of a dynamic segment
  model
);
resolve(urlFor)('post', {
  // @ts-expect-error a model object is not the value of a dynamic segment
  models: [model],
  ...NamedArgsMarker,
});
resolve(urlFor)('post', {
  // @ts-expect-error the query params are an object
  queryParams: 'page=2',
  ...NamedArgsMarker,
});

/**
  `{{rootUrl}}`
*/
expectTypeOf(resolve(rootUrl)()).toBeString();

resolve(rootUrl)(
  // @ts-expect-error the helper has no arguments
  'about'
);

/**
  `{{isActive "post" model.id}}`
*/
expectTypeOf(resolve(isActive)('about')).toBeBoolean();
expectTypeOf(resolve(isActive)('post', model.id)).toBeBoolean();
expectTypeOf(
  resolve(isActive)('post', {
    models: [model.id],
    queryParams: { page: 2 },
    ...NamedArgsMarker,
  })
).toBeBoolean();

/**
  The models and the route name can be missing while the data loads.
*/
expectTypeOf(resolve(isLoading)('post', undefined)).toBeBoolean();
expectTypeOf(resolve(isLoading)(null)).toBeBoolean();
expectTypeOf(resolve(isLoading)('post', { models: [null], ...NamedArgsMarker })).toBeBoolean();

expectTypeOf(resolve(isTransitioningIn)('post', model.id)).toBeBoolean();
expectTypeOf(resolve(isTransitioningOut)('post', model.id)).toBeBoolean();
