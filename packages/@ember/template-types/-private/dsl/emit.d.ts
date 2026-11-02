import { AttrValue, ContentValue } from '..';
import {
  ComponentReturn,
  AnyContext,
  AnyFunction,
  ModifierReturn,
  HasContext,
  InvokableInstance,
  TemplateContext,
  NamedArgs,
} from '../integration';
import {
  AttributesForElement,
  ElementForTagName,
  MathMlElementForTagName,
  SVGElementForTagName,
} from './types';

/**
 * Used during emit to denote an object literal that corresponds
 * to the use of named args rather than passing an object value
 * directly.
 */
export declare const NamedArgsMarker: NamedArgs<unknown>;

/*
 * Emits the given value as top-level content to the DOM. This:
 *
 *     Hello, {{world}}
 *
 * Would produce code like:
 *
 *     emitContent(resolveOrReturn(value)({}))
 */
export declare function emitContent(value: ContentValue): void;

/*
 * Emits an element of the given name, providing a value to the
 * given handler of an appropriate type for the DOM node that will
 * be produced. This:
 *
 *     <div ...attributes class="hello" {{on "click" this.clicked}}></div>
 *
 * Would produce code like:
 *
 *     emitElement('div', (__glintY__) => {
 *       applySplattributes(__glintRef__.element, __glintY__.element);
 *       applyAttributes(__glintY__.element, { class: 'hello' });
 *       applyModifier(__glintY__.element, resolve(on)({}, 'click', this.clicked));
 *     });
 */
export declare function emitElement<Name extends string | 'math' | 'svg'>(
  name: Name,
): {
  element: Name extends 'math'
    ? MathMlElementForTagName<'math'>
    : Name extends 'svg'
      ? SVGElementForTagName<'svg'>
      : ElementForTagName<Name>;
};

export declare function emitSVGElement<Name extends keyof SVGElementTagNameMap>(
  name: Name,
): { element: SVGElementForTagName<Name> };

export declare function emitMathMlElement<Name extends keyof MathMLElementTagNameMap>(
  name: Name,
): { element: MathMlElementForTagName<Name> };

/*
 * Emits the given value as an entity that expects to receive blocks
 * rather than return a value. This corresponds to a block-form mustache
 * statement or any angle-bracket component invocation, i.e.:
 *
 *     {{#value foo=bar}}{{/value}}
 *     <Value @foo={{bar}} {{baz}}></Value>
 *     <Value @foo={{bar}} {{baz}} />
 *
 * This form of invocation is the only one in a template that may have
 * blocks bound to it. The final line above would produce code like:
 *
 *     emitComponent(resolve(Value)({ foo: bar })), (__glintY__) => {
 *       applyModifier(__glintY__.element, resolve(baz)({}));
 *     });
 */
export declare function emitComponent<T extends ComponentReturn<any, any>>(
  component: T,
): {
  element: T extends ComponentReturn<any, infer El> ? El : any;
  blockParams: T extends ComponentReturn<infer Yields, any> ? Required<Yields> : any;
};

/*
 * Wraps a template body that appears as a standalone expression and is therefore not
 * associated with any backing value.
 *
 * The given callback accepts a template context value as well as an instance of the
 * environment's DSL export.
 */
export declare function templateExpression<
  Signature extends AnyFunction = () => ComponentReturn<{}>,
  Context extends AnyContext = TemplateContext<void, {}, {}, void>,
>(
  f: (__glintRef__: Context, __glintDSL__: never) => void,
): new () => InvokableInstance<Signature> & HasContext<Context>;

/*
 * Wraps a template body that's backed by a known value (typically a class), either
 * via a `.hbs` association to a default export or via embedding e.g. with `<template>`.
 *
 * The given callback accepts a template context value as well as an instance of the
 * environment's DSL export.
 *
 * Note that this signature is structured carefully to trigger TypeScript's higher-order function
 * type inference so that any type parameters on the given backing value (if it's a class) will
 * be preserved and reflected in the template body. Both the `Args` type and the constructor return
 * value are necessary for this, despite the fact that we don't actually do anything with those
 * types (see https://github.com/microsoft/TypeScript/pull/30215).
 */
export declare function templateForBackingValue<Args extends unknown[], Context extends AnyContext>(
  backingValue: abstract new (...args: Args) => HasContext<Context>,
  body: (__glintRef__: Context, __glintDSL__: never) => void,
): abstract new () => unknown;

/*
 * Used in template bodies to encode a `{{yield}}` statement.
 *
 *     {{yield foo bar to='name'}}
 *
 * Is equivalent to:
 *
 *     yieldToBlock(__glintRef__, 'name')(foo, bar);
 */
export declare function yieldToBlock<Context extends AnyContext, K extends keyof Context['blocks']>(
  __glintRef__: Context,
  to: K,
): (...values: NonNullable<Context['blocks'][K]>) => void;

/*
 * Applies `...attributes` that were passed to a component down
 * to an element or child component invocation in its template.
 *
 *     <div ...attributes></div>
 *     <AnotherComponent ...attributes />
 */
export declare function applySplattributes<
  SourceElement extends Element,
  TargetElement extends SourceElement,
>(source: SourceElement, target: TargetElement): void;

/*
 * Applies named attributes to an element or component.
 *
 *     <div foo={{bar}}></div>
 *     <AnotherComponent foo={{bar}} />
 */
export declare function applyAttributes<T extends Element>(
  element: T,
  attrs: Partial<AttributesForElement<T>>,
): void;

/*
 * Applies a modifier to an element or component.
 *
 *     <div {{someModifier}}></div>
 *     <AnotherComponent {{someModifier}} />
 */
export declare function applyModifier(boundModifier: ModifierReturn): void;

/*
 * Used to consume imported identifiers like `hash` or `array` when
 * we treat them as a special form to be translated into native
 * syntax.
 */
export declare function noop(value: unknown): void;
