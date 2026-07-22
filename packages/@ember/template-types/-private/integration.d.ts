// While everything in the `@glint/template` package other than its main
// entrypoint is "private", this module exports the symbols and types
// necessary to declare a class or other entity as integrating with Glint's
// template system.
// In most cases it should be possible to declare integrations in terms of
// `ComponentLike`/`HelperLike`/`ModifierLike`, but these declarations are
// the primitives on which those types are built.

/** Any function, which is the tighest bound we can put on an object's `[Invoke]` field. */
export type AnyFunction = (...params: any) => any;

/** Any type loosely fitting the shape of a template context */
export type AnyContext = TemplateContext<any, any, any, any>;

/** The loosest shape of a "blocks hash" */
export type AnyBlocks = Partial<Record<string, any[]>>;

export declare const InvokeDirect: unique symbol;
export type DirectInvokable<T extends AnyFunction = AnyFunction> = { [InvokeDirect]: T };

export declare const Invoke: unique symbol;
export type InvokableInstance<T extends AnyFunction = AnyFunction> = { [Invoke]: T };
export type Invokable<F extends AnyFunction> = abstract new (...args: any) => InvokableInstance<F>;

export declare const Context: unique symbol;
export type HasContext<T extends AnyContext = AnyContext> = { [Context]: T };

declare const Element: unique symbol;
declare const Modifier: unique symbol;
declare const Blocks: unique symbol;

/** Denotes a modifier whose arguments have been bound and is ready to be attached to an element. */
export type ModifierReturn = { [Modifier]: true };

/**
 * Denotes that the associated entity may be invoked with the given
 * blocks, yielding params of the appropriate type.
 */
export type ComponentReturn<BlockDefs, El = null> = {
  [Blocks]: BlockDefs;
  [Element]: El extends Element ? El : null;
};

/**
 * Determines the type of `this` and any `@arg`s used in a template,
 * as well as valid `{{yield}}` invocations and `...attributes` usage.
 */
export type TemplateContext<This, Args, Blocks, Element> = {
  this: This;
  args: Args;
  blocks: Blocks;
  element: Element;
};

/**
 * Flattens the fully expanded signature format for Blocks down to a mapping from
 * each block name to a corresponding tuple of parameter types.
 */
export type FlattenBlockParams<T> = {
  [K in keyof T]: T[K] extends { Params: { Positional: infer U } } ? U : T[K];
};

// This trio of declarations allows us to distinguish explicit named
// argument invocation from "final positional argument is a hash"
// situations.
export declare const NamedArgs: unique symbol;
export type NamedArgs<T> = T & NamedArgsMarker;
export interface NamedArgsMarker {
  [NamedArgs]: true;
}

export type NamedArgNames<T extends Invokable<AnyFunction>> =
  T extends Invokable<(...args: infer A) => any>
    ? A extends [...positional: infer _, named?: infer N]
      ? Exclude<keyof NonNullable<N>, typeof NamedArgs>
      : never
    : never;

export type UnwrapNamedArgs<T> = T extends NamedArgs<infer U> ? U : T;
