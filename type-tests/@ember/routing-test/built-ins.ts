import {
  LinkTo,
  isActive,
  isLoading,
  isTransitioningIn,
  isTransitioningOut,
  rootUrl,
  urlFor,
} from '@ember/routing';
import { expectTypeOf } from 'expect-type';

// Basic check taht we export both type and value correctly.
expectTypeOf(LinkTo).not.toBeUndefined();
expectTypeOf<LinkTo>().not.toBeUndefined();

// And that it is opaquified as we expect.
expectTypeOf(LinkTo.create()).toEqualTypeOf<never>();
expectTypeOf(LinkTo.toString()).toBeString();

// The router helpers of RFC 391.
expectTypeOf(urlFor.prototype.compute).returns.toBeString();
expectTypeOf(rootUrl.prototype.compute).returns.toBeString();
expectTypeOf(isActive.prototype.compute).returns.toBeBoolean();
expectTypeOf(isLoading.prototype.compute).returns.toBeBoolean();
expectTypeOf(isTransitioningIn.prototype.compute).returns.toBeBoolean();
expectTypeOf(isTransitioningOut.prototype.compute).returns.toBeBoolean();

expectTypeOf(urlFor.prototype.compute).parameter(0).toEqualTypeOf<
  [route?: string | null | undefined, ...models: unknown[]]
>();
expectTypeOf(urlFor.prototype.compute).parameter(1).toEqualTypeOf<{
  models?: unknown;
  queryParams?: Record<string, unknown> | null | undefined;
}>();
