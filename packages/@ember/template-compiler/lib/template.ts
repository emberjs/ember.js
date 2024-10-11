import templateOnly, { type TemplateOnlyComponent } from '@ember/component/template-only';
import { assert } from '@ember/debug';
import { precompile as glimmerPrecompile } from '@glimmer/compiler';
import type { SerializedTemplateWithLazyBlock } from '@glimmer/interfaces';
import { setComponentTemplate } from '@glimmer/manager';
import { templateFactory } from '@glimmer/opcode-compiler';
import compileOptions from './compile-options';
import type { EmberPrecompileOptions } from './types';

type ComponentClass = abstract new (...args: any[]) => object;

/**
 * All possible options passed to `template()` may specify a `moduleName`.
 */
export interface BaseTemplateOptions {
  moduleName?: string;
}

/**
 * When using `template` in a class, you call it in a `static` block and pass
 * the class as the `component` option.
 *
 * ```ts
 * class MyComponent extends Component {
 *   static {
 *     template('{{this.greeting}}, {{@place}}!',
 *       { component: this },
 *       // explicit or implicit option goes here
 *     );
 *   }
 * }
 * ```
 *
 * For the full explicit form, see {@linkcode ExplicitClassOptions}. For the
 * full implicit form, see {@linkcode ImplicitClassOptions}.
 */
export interface BaseClassTemplateOptions<C extends ComponentClass> extends BaseTemplateOptions {
  component: C;
}

/**
 * When using `template` outside of a class (i.e. a "template-only component"), you can pass
 * a `scope` option that explicitly provides the lexical scope for the template.
 *
 * This is called the "explicit form".
 *
 * ```ts
 * const greeting = 'Hello';
 * const HelloWorld = template('{{greeting}} World!', { scope: () => ({ greeting }) });
 * ```
 */
export interface ExplicitTemplateOnlyOptions extends BaseTemplateOptions {
  scope(): Record<string, unknown>;
}

/**
 * When using `template` *inside* a class (see
 * {@linkcode BaseClassTemplateOptions}), you can pass a `scope` option that
 * explicitly provides the lexical scope for the template, just like a template-only
 * component (see {@linkcode ExplicitTemplateOnlyOptions}).
 *
 * ```ts
 * class MyComponent extends Component {
 *   static {
 *     template('{{this.greeting}}, {{@place}}!',
 *       { component: this },
 *       // explicit or implicit option goes here
 *     );
 *   }
 * }
 * ```
 *
 * ## The Scope Function's `instance` Parameter
 *
 * However, the explicit `scope` function in a *class* also takes an `instance` option
 * that provides access to the component's instance.
 *
 * Once it's supported in Handlebars, this will make it possible to represent private
 * fields when using the explicit form.
 *
 * ```ts
 * class MyComponent extends Component {
 *   static {
 *     template('{{this.#greeting}}, {{@place}}!',
 *       { component: this },
 *       scope: (instance) => ({ '#greeting': instance.#greeting }),
 *     );
 *   }
 * }
 * ```
 */
export interface ExplicitClassOptions<C extends ComponentClass>
  extends BaseClassTemplateOptions<C> {
  scope(instance?: InstanceType<C>): Record<string, unknown>;
}

/**
 * The *implicit* form of the `template` function takes an `eval` option that
 * allows the runtime compiler to evaluate local template variables without
 * needing to maintain an explicit list of the local variables used in the
 * template scope.
 *
 * The eval options *must* be passed in the following form:
 *
 * ```ts
 * {
 *   eval() { return eval(arguments[0]) }
 * }
 * ```
 *
 * ## Requirements of the `eval` Option
 *
 * **The syntactic form presented above is the only form you should use when
 * passing an `eval` option.**
 *
 * This is _required_ if you want your code to be compatible with the
 * compile-time implementation of `@ember/template-compiler`. While the runtime
 * compiler offers a tiny bit of additional wiggle room, you still need to follow
 * very strict rules.
 *
 * We don't recommend trying to memorize the rules. Instead, we recommend using
 * the snippet presented above and supported by the compile-time implementation.
 *
 * ### The Technical Requirements of the `eval` Option
 *
 * The `eval` function is passed a single parameter that is a JavaScript
 * identifier. This will be extended in the future to support private fields.
 *
 * Since keywords in JavaScript are contextual (e.g. `await` and `yield`), the
 * parameter might be a keyword. The `@ember/template-compiler/runtime` expects
 * the function to throw a `SyntaxError` if the identifier name is not valid in
 * the current scope. (The direct `eval` function takes care of this out of the
 * box.)
 *
 * Requirements:
 *
 * 1. The `eval` method must receive its parameter as `arguments[0]`, which
 *    ensures that the variable name passed to `eval()` is not shadowed by the
 *    function's parameter name.
 * 2. The `eval` option must be a function or concise method, and not an arrow.
 *    This is because arrows do not have their own `arguments`, which breaks
 *    (1).
 * 3. The `eval` method must call "*direct* `eval`", and not an alias of `eval`.
 *    Direct `eval` evaluates the code in the scope it was called from, while
 *    aliased versions of `eval` (including `new Function`) evaluate the code in
 *    the global scope.
 * 4. The `eval` method must return the result of calling "direct `eval`".
 *
 * The easiest way to achieve these requirements is to use the exact syntax
 * presented above. This is *also* the only way to be compatible
 *
 * ## Rationale
 *
 * This is useful for two reasons:
 *
 * 1. This form is a useful _intermediate_ form for the compile-time toolchain.
 *    It allows the content-tag preprocessor to convert the `<template>` syntax
 *    into valid JavaScript without needing to involve full-fledged lexical
 *    analysis.
 * 2. This form is a convenient form for manual prototyping when using the
 *    runtime compiler directly. While it requires some extra typing relative to
 *    `<template>`, it's a mechanical 1:1 transformation of the syntax.
 *
 * In practice, implementations that use a runtime compiler (for example, a
 * playground running completely in the browser) should probably use the
 * `content-tag` preprocessor to convert the template into the implicit form,
 * and then rely on `@ember/template-compiler/runtime` to evaluate the template.
 */
export interface ImplicitEvalOption {
  // the real type is (value: string) => unknown, but RFC #0921 specifies that
  // the syntax is `eval() { return eval(arguments[1]) }`, which won't type
  // check. If we need to verify this, a linter rule would probably be more
  // helpful than types because of the peculiarity of the pattern.
  eval(): unknown;
}

/**
 * When using `template` outside of a class (i.e. a "template-only component"), you can pass
 * an `eval` option that _implicitly_ provides the lexical scope for the template.
 *
 * This is called the "implicit form".
 *
 * ```ts
 * const greeting = 'Hello';
 * const HelloWorld = template('{{greeting}} World!', {
 *   eval() { return arguments[0] }
 * });
 * ```
 *
 * For more details on the requirements of the `eval` option, see {@linkcode ImplicitEvalOption}.
 */
export interface ImplicitTemplateOnlyOptions extends BaseTemplateOptions, ImplicitEvalOption {}

/**
 * When using `template` inside of a class, you can pass an `eval` option that
 * _implicitly_ provides the lexical scope for the template, just as you can
 * with a {@linkcode ImplicitTemplateOnlyOptions | template-only component}.
 *
 * This is called the "implicit form".
 *
 * ```ts
 * class MyComponent extends Component {
 *   static {
 *     template('{{this.greeting}}, {{@place}}!',
 *       { component: this },
 *       eval() { return arguments[0] }
 *     );
 *   }
 * }
 * ```
 *
 * ## Note  on Private Fields
 *
 * The current implementation of `@ember/template-compiler` does not support
 * private fields, but once the Handlebars parser adds support for private field
 * syntax and it's implemented in the Glimmer compiler, the implicit form should
 * be able to support them.
 */
export interface ImplicitClassOptions<C extends ComponentClass>
  extends BaseClassTemplateOptions<C>,
    ImplicitEvalOption {}

export function template(
  templateString: string,
  options?: ExplicitTemplateOnlyOptions | ImplicitTemplateOnlyOptions
): TemplateOnlyComponent;
export function template<C extends ComponentClass>(
  templateString: string,
  options: ExplicitClassOptions<C> | ImplicitClassOptions<C> | BaseClassTemplateOptions<C>
): C;
export function template(
  templateString: string,
  options?: BaseTemplateOptions | BaseClassTemplateOptions<any>
): object {
  const evaluate = buildEvaluator(options);

  const normalizedOptions = compileOptions(options);
  const component = normalizedOptions.component ?? templateOnly();

  queueMicrotask(() => {
    const source = glimmerPrecompile(templateString, normalizedOptions);
    const template = templateFactory(evaluate(`(${source})`) as SerializedTemplateWithLazyBlock);

    setComponentTemplate(template, component);
  });

  return component;
}

const evaluator = (source: string) => {
  return new Function(`return
  ${source}`)();
};

function buildEvaluator(options: Partial<EmberPrecompileOptions> | undefined) {
  if (options === undefined) {
    return evaluator;
  }

  if (options.eval) {
    return options.eval;
  } else {
    const scope = options.scope?.();

    if (!scope && options.component) {
      return evaluator;
    }

    assert(`The 'template' function must be called with an evaluator, scope or component`, scope);

    return (source: string) => {
      const argNames = Object.keys(scope);
      const argValues = Object.values(scope);

      return new Function(...argNames, `return (${source})`)(...argValues);
    };
  }
}
