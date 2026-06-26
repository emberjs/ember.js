import { expectTypeOf } from 'expect-type';
import SumType from 'sums-up';
import {
  emitComponent,
  emitContent,
  NamedArgsMarker,
  resolve,
  resolveOrReturn,
} from '../-private/dsl';
import { ComponentLike } from '../-private/index';

///////////////////////////////////////////////////////////////////////////////
// This module exercises what's possible when declaring a signature for a
// complex third-party (i.e. non-built-in) helper.
// Real-world, this is actually implemented via an AST transform to a series
// of conditionals and helper invocations that are efficient but not
// particularly ergonomic to write by hand.

class Maybe<T> extends SumType<{ Nothing: []; Just: [T] }> {}

const maybeValue = new Maybe<number>('Just', 123);

type SumVariants<T extends SumType<never>> = T extends SumType<infer V> ? V : never;

// Used to do pattern matching against sum type values using
// https://github.com/hojberg/sums-up
// It doesn't (can't) do exhaustiveness checking, but it does plumb through
// type parameters correctly
declare const caseOf: abstract new <T extends SumType<never>>() => InstanceType<
  ComponentLike<{
    Args: { Positional: [value: T] };
    Blocks: {
      default: [
        when: abstract new <K extends keyof SumVariants<T>>() => InstanceType<
          ComponentLike<{
            Args: { Positional: [key: K] };
            Blocks: {
              default: SumVariants<T>[K];
              else: [];
            };
          }>
        >,
      ];
    };
  }>
>;

/**
 * ```hbs
 * {{#case-of maybeValue as |when|}}
 *   {{#when 'Just' as |n|}}
 *     {{n}}
 *   {{else when 'Nothing'}}
 *     {{! nothin }}
 *   {{/when}}
 * {{/case-of}}
 * ```
 */
{
  const component = emitComponent(resolve(caseOf)(maybeValue));
  {
    const [when] = component.blockParams.default;
    {
      const component = emitComponent(resolve(when)('Just'));
      {
        const [n] = component.blockParams.default;
        expectTypeOf(n).toEqualTypeOf<number>();
        emitContent(resolveOrReturn(n)());
      }
      {
        component.blockParams.else;
        {
          const component = emitComponent(resolve(when)('Nothing'));
          expectTypeOf(component.blockParams.default).toEqualTypeOf<[]>();
        }
      }
    }
  }
}

// Below is an alternative formulation using named block syntax.
// This is a bit weird as it's really a control structure and looks here
// more like it would emit DOM since it's using angle brackets, but
// you do get exhaustiveness checking with this approach (though it's
// arguable whether that's necessarily a good thing in template-land)

declare const CaseOf: abstract new <T extends SumType<any>>() => InstanceType<
  ComponentLike<{
    Args: { value: T };
    Blocks: SumVariants<T>;
  }>
>;

/**
 * ```hbs
 * <CaseOf @value={{maybeValue}}>
 *   <:Just as |value|>
 *     {{value}}
 *   </:Just>
 *   <:Nothing>
 *     {{! nothin }}
 *   </:Nothing>
 * </CaseOf>
 * ```
 */
{
  const component = emitComponent(resolve(CaseOf)({ value: maybeValue, ...NamedArgsMarker }));

  {
    const [value] = component.blockParams.Just;
    expectTypeOf(value).toEqualTypeOf<number>();
    emitContent(resolveOrReturn(value)());
  }

  {
    component.blockParams.Nothing;
  }
}
