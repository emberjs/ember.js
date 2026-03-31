import type { FunctionBasedHelper } from '@ember/-internals/glimmer';
import { helper } from '@ember/component/helper';
import { getOwner } from '@ember/owner';
import { expectTypeOf } from 'expect-type';

// NOTE: The types for `helper` are not actually safe. Glint helps with this.

let myHelper = helper(function ([cents]: [number], { currency }: { currency: string }) {
  return `${currency}${cents * 0.01}`;
});
expectTypeOf(myHelper).toEqualTypeOf<
  FunctionBasedHelper<{
    Args: { Positional: [number]; Named: { currency: string } };
    Return: string;
  }>
>();

let ownerHelper = helper(function () {
  let owner = getOwner(); // should type check
  return owner;
});
expectTypeOf(ownerHelper).toEqualTypeOf<
  FunctionBasedHelper<{ Args: { Positional: []; Named: {} }; Return: any }>
>();

// @ts-expect-error invalid named params
helper(function ([cents]: [number], named: number) {});

// @ts-expect-error invalid params
helper(function (params: number) {});
