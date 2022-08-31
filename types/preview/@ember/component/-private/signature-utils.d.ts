declare module '@ember/component/-private/signature-utils' {
  /**
   * @module Type utilities for signatures
   */

  // Type-only "symbol" to use with `EmptyObject` below, so that it is *not*
  // equivalent to an empty interface.
  const Empty: unique symbol;

  /**
   * This provides us a way to have a "fallback" which represents an empty object,
   * without the downsides of how TS treats `{}`. Specifically: this will
   * correctly leverage "excess property checking" so that, given a component
   * which has no named args, if someone invokes it with any named args, they will
   * get a type error.
   *
   * @internal This is exported so declaration emit works (if it were not emitted,
   *   declarations which fall back to it would not work). It is *not* intended for
   *   public usage, and the specific mechanics it uses may change at any time.
   *   The location of this export *is* part of the public API, because moving it
   *   will break existing declarations, but is not legal for end users to import
   *   themselves, so ***DO NOT RELY ON IT***.
   */
  export interface EmptyObject {
    [Empty]?: true;
  }

  type DefaultPositional = unknown[];
  type DefaultNamed = EmptyObject;

  type GetOrElse<Obj, K, Fallback> = K extends keyof Obj ? Obj[K] : Fallback;

  /** Given a signature `S`, get back the `Args` type. */
  type ArgsFor<S> = 'Args' extends keyof S
    ? {
        Named: GetOrElse<S['Args'], 'Named', DefaultNamed>;
        Positional: GetOrElse<S['Args'], 'Positional', []>;
      }
    : { Named: DefaultNamed; Positional: [] };

  interface LegacyArgsFor<T> {
    Named: GetOrElse<T, 'NamedArgs', DefaultNamed>;
    Positional: GetOrElse<T, 'PositionalArgs', DefaultPositional>;
  }

  // This type allows us to present a slightly-less-obtuse error message
  // when attempting to resolve the signature of a helper that doesn't have
  // one declared from within a tool like Glint.
  const BadType: unique symbol;
  /** @internal This is *only* exported to use in tests! */
  export interface BadType<Message> {
    [BadType]: Message;
  }

  interface MissingSignatureArgs {
    Named: BadType<'This helper is missing a signature'>;
    Positional: unknown[];
  }

  /**
   * Given any allowed shorthand form of a signature, desugars it to its full
   * expanded type.
   *
   * @internal This is only exported so we can avoid duplicating it in
   *   [Glint](https://github.com/typed-ember/glint) or other such tooling. It is
   *   *not* intended for public usage, and the specific mechanics it uses may
   *   change at any time. Although the signature produced by is part of Glimmer's
   *   public API the existence and mechanics of this specific symbol are *not*,
   *   so ***DO NOT RELY ON IT***.
   */
  // This is similar but not identical to the `ExpandSignature` type used in the
  // Glimmer Component API: it uses the same basic mechanics, but does not have
  // an identical signature because we had not yet normalized the `Signature` when
  // we designed the first pass of this. In the future, we will be able to make
  // all `ExpandSignature` types fully general to work with *any* invokable. But
  // "future" here probably means Ember v5. :sobbing:
  // prettier-ignore
  export interface ExpandSignature<T> {
  Args:
    // Is this the default (i.e. unspecified) signature?
    // Then return our special "missing signature" type
    unknown extends T ? MissingSignatureArgs :
    // Is this a `Signature`? Then use `Signature` args
    keyof T extends 'Args' | 'Return' ? ArgsFor<T> :
    // Otherwise fall back to classic `Args`.
    LegacyArgsFor<T>;
  Return: 'Return' extends keyof T ? T['Return'] : unknown;
}

  // The `unknown extends S` checks on both of these are here to preserve backward
  // compatibility with the existing non-`Signature` definition. When migrating
  // into Ember or otherwise making a breaking change, we can drop the "default"
  // in favor of just using `ExpandSignature`.
  // prettier-ignore
  export type NamedArgs<S> =
  unknown extends S
  ? Record<string, unknown>
  : ExpandSignature<S>['Args']['Named'];

  // prettier-ignore
  export type PositionalArgs<S> =
  unknown extends S
  ? unknown[]
  : ExpandSignature<S>['Args']['Positional'];

  export type Return<S> = GetOrElse<S, 'Return', unknown>;
}
