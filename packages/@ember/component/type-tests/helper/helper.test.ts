import { HelperFactory, SimpleHelper } from '@ember/-internals/glimmer/lib/helper';
import { helper } from '@ember/component/helper';
import { expectTypeOf } from 'expect-type';

// NOTE: The types for `helper` are not actually safe. Glint helps with this.

let myHelper = helper(function ([cents]: [number], { currency }: { currency: string }) {
  return `${currency}${cents * 0.01}`;
});
expectTypeOf(myHelper).toEqualTypeOf<
  HelperFactory<SimpleHelper<string, [number], { currency: string }>>
>();

// @ts-expect-error invalid named params
helper(function ([cents]: [number], named: number) {});

// @ts-expect-error invalid params
helper(function (params: number) {});
