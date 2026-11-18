import { DirectInvokable, Invokable, NamedArgs, UnwrapNamedArgs } from '../integration';
import { MaybeNamed, PrebindArgs, SliceFrom, SliceTo } from '../signature';

type PrefixOf<T extends unknown[]> = T extends [arg: infer Arg, ...rest: infer Rest]
  ? [] | [Arg, ...PrefixOf<Rest>]
  : T;

export type BindInvokableKeyword<Prefix extends number, Kind> = DirectInvokable<{
  // {{bind invokable}}
  <Args extends unknown[], T extends Kind>(
    invokable: (...args: Args) => T,
  ): Invokable<(...args: Args) => T>;
  <Args extends unknown[], T extends Kind>(
    invokable: ((...args: Args) => T) | null | undefined,
  ): null | Invokable<(...args: Args) => T>;
  // {{bind invokableWithOnlyNamedArgs name="foo"}}
  <Named, Return extends Kind, GivenNamed>(
    invokable: (named: NamedArgs<Named>) => Return,
    named: NamedArgs<Partial<Named> & GivenNamed>,
  ): Invokable<
    (
      ...named: MaybeNamed<
        PrebindArgs<NonNullable<Named>, keyof GivenNamed & keyof UnwrapNamedArgs<Named>>
      >
    ) => Return
  >;
  <Named, Return extends Kind, GivenNamed>(
    invokable: null | undefined | ((named: NamedArgs<Named>) => Return),
    named: NamedArgs<Partial<Named> & GivenNamed>,
  ): null | Invokable<
    (
      ...named: MaybeNamed<
        PrebindArgs<NonNullable<Named>, keyof GivenNamed & keyof UnwrapNamedArgs<Named>>
      >
    ) => Return
  >;
  // {{bind invokableWithNamedAndPositionalArgs name="foo"}}
  <Named, Positional extends unknown[], Return extends Kind, GivenNamed extends Partial<Named>>(
    invokable: (...args: [...Positional, NamedArgs<Named>]) => Return,
    named: GivenNamed,
  ): Invokable<
    (
      ...args: [
        ...Positional,
        ...MaybeNamed<
          PrebindArgs<NonNullable<Named>, keyof GivenNamed & keyof UnwrapNamedArgs<Named>>
        >,
      ]
    ) => Return
  >;
  <Named, Positional extends unknown[], Return extends Kind, GivenNamed extends Partial<Named>>(
    invokable: (...args: [...Positional, NamedArgs<Named>]) => Return,
    named: GivenNamed,
  ): Invokable<
    (
      ...args: [
        ...Positional,
        ...MaybeNamed<
          PrebindArgs<NonNullable<Named>, keyof GivenNamed & keyof UnwrapNamedArgs<Named>>
        >,
      ]
    ) => Return
  >;
  // {{bind invokable positional}}
  <
    Positional extends any[],
    Return extends Kind,
    GivenPositional extends PrefixOf<SliceFrom<Positional, Prefix>>,
  >(
    invokable: (...args: [...Positional]) => Return,
    ...args: GivenPositional
  ): Invokable<
    (
      ...args: [
        ...SliceTo<Positional, Prefix>,
        ...SliceFrom<SliceFrom<Positional, Prefix>, GivenPositional['length']>,
      ]
    ) => Return
  >;
  <
    Positional extends any[],
    Return extends Kind,
    GivenPositional extends PrefixOf<SliceFrom<Positional, Prefix>>,
  >(
    invokable: null | undefined | ((...args: [...Positional]) => Return),
    ...args: GivenPositional
  ): null | Invokable<
    (
      ...args: [
        ...SliceTo<Positional, Prefix>,
        ...SliceFrom<SliceFrom<Positional, Prefix>, GivenPositional['length']>,
      ]
    ) => Return
  >;
}>;
