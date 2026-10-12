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

/**
  `{{urlFor "post" model}}`
*/
expectTypeOf(resolve(urlFor)('about')).toBeString();
expectTypeOf(resolve(urlFor)('post', model)).toBeString();
expectTypeOf(resolve(urlFor)('post.comment', model, 7)).toBeString();
expectTypeOf(resolve(urlFor)('post', { models: [model], ...NamedArgsMarker })).toBeString();
expectTypeOf(
  resolve(urlFor)('post', model, { queryParams: { page: 2 }, ...NamedArgsMarker })
).toBeString();

resolve(urlFor)(
  // @ts-expect-error the route name is a string
  42
);

/**
  `{{rootUrl}}`
*/
expectTypeOf(resolve(rootUrl)()).toBeString();

resolve(rootUrl)(
  // @ts-expect-error the helper has no arguments
  'about'
);

/**
  `{{isActive "post" model}}`
*/
expectTypeOf(resolve(isActive)('about')).toBeBoolean();
expectTypeOf(resolve(isActive)('post', model)).toBeBoolean();
expectTypeOf(
  resolve(isActive)('post', {
    models: [model],
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

expectTypeOf(resolve(isTransitioningIn)('post', model)).toBeBoolean();
expectTypeOf(resolve(isTransitioningOut)('post', model)).toBeBoolean();
