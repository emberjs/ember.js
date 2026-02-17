// This module contains utilities for converting signature types defined
// in userspace into our internal representation of an invokable's
// function type signature.

import { NamedArgs, UnwrapNamedArgs } from './integration';

/**
 * Given an "args hash" (e.g. `{ Named: {...}; Positional: [...] }`),
 * returns a tuple type representing the parameters
 */
export type InvokableArgs<Args> = [
  ...positional: Constrain<Get<Args, 'Positional'>, Array<unknown>, []>,
  ...named: MaybeNamed<NamedArgs<Get<Args, 'Named'>>>,
];

/** Given a signature `S`, get back the normalized `Args` type. */
export type ComponentSignatureArgs<S> = S extends {
  Args: infer Args;
}
  ? Args extends {
      Named?: object;
      Positional?: unknown[];
    }
    ? {
        Named: Get<S['Args'], 'Named', {}>;
        Positional: Get<S['Args'], 'Positional', []>;
      }
    : {
        Named: S['Args'];
        Positional: [];
      }
  : {
      Named: keyof S extends 'Args' | 'Blocks' | 'Element' ? {} : S;
      Positional: [];
    };

/** Given a signature `S`, get back the normalized `Blocks` type. */
export type ComponentSignatureBlocks<S> = S extends { Blocks: infer Blocks }
  ? {
      [Block in keyof Blocks]: Blocks[Block] extends unknown[]
        ? { Params: { Positional: Blocks[Block] } }
        : Blocks[Block];
    }
  : {};

/** Given a component signature `S`, get back the `Element` type. */
export type ComponentSignatureElement<S> = S extends { Element: infer Element }
  ? NonNullable<Element> extends never
    ? unknown
    : Element
  : unknown;

export type PrebindArgs<T, Args extends keyof UnwrapNamedArgs<T>> = NamedArgs<
  Omit<UnwrapNamedArgs<T>, Args> & Partial<Pick<UnwrapNamedArgs<T>, Args>>
>;

export type MaybeNamed<T> = T extends any
  ? {} extends UnwrapNamedArgs<T>
    ? keyof UnwrapNamedArgs<T> extends never
      ? []
      : [named?: T]
    : [named: T]
  : never;

export type Get<T, K, Otherwise = unknown> = K extends keyof T ? T[K] : Otherwise;
export type Constrain<T, Constraint, Otherwise = Constraint> = T extends Constraint ? T : Otherwise;

export type TupleOfSize<Len extends number, Acc extends unknown[] = []> = Acc['length'] extends Len
  ? Acc
  : TupleOfSize<Len, [any, ...Acc]>;

export type SliceTo<T extends unknown[], Index extends number> = T['length'] extends Index
  ? T
  : T extends [...infer Rest, any?]
    ? SliceTo<Rest, Index>
    : [];

export type SliceFrom<T extends unknown[], Index extends number> = T extends [
  ...TupleOfSize<Index>,
  ...infer Rest,
]
  ? Rest
  : [];
