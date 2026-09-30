import templateOnly, { type TemplateOnlyComponent } from '@ember/component/template-only';
import { precompile as glimmerPrecompile } from '@glimmer/compiler/lib/compiler';
import type { SerializedTemplateWithLazyBlock } from '@glimmer/interfaces';
import { setComponentTemplate } from '@glimmer/manager/lib/public/template';
import templateFactory from '@glimmer/opcode-compiler/lib/template';
import compileOptions, { keywords, RUNTIME_KEYWORDS_NAME } from './compile-options';
import type { EmberPrecompileOptions } from './types';

type ComponentClass = abstract new (...args: any[]) => object;

/**
 * All possible options passed to `template()` may specify a `moduleName`.
 */
export interface BaseTemplateOptions {
  moduleName?: string;
  /**
   * Whether the template should be treated as a strict-mode template. Defaults
   * to `true`.
   */
  strictMode?: boolean;
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
 * For the full explicit form, see {@linkcode ExplicitClassOptions}.
 * For the full implicit form, see {@linkcode ImplicitClassOptions}.
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
 * When using `template` *inside* a class, as in {@linkcode BaseClassTemplateOptions},
 * you can pass a `scope` option that explicitly provides the lexical scope for the template.
 * This works just like a template-only component,
 * as in {@linkcode ExplicitTemplateOnlyOptions}.
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
export interface ExplicitClassOptions<
  C extends ComponentClass,
> extends BaseClassTemplateOptions<C> {
  scope(instance?: InstanceType<C>): Record<string, unknown>;
}

/**
 * The *implicit* form of the `template` function takes an `eval` option.
 * With it, the runtime compiler can evaluate local template variables,
 * without an explicit list of the local variables used in the template scope.
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
 * **The syntactic form presented above is the only form you should use
 * when passing an `eval` option.**
 *
 * This is _required_ if you want your code to be compatible
 * with the compile-time implementation of `@ember/template-compiler`.
 * The runtime compiler offers a tiny bit of additional wiggle room,
 * but you still need to follow very strict rules.
 *
 * We don't recommend trying to memorize the rules.
 * Instead, we recommend using the snippet presented above,
 * which the compile-time implementation supports.
 *
 * ### The Technical Requirements of the `eval` Option
 *
 * The `eval` function is passed a single parameter that is a JavaScript identifier.
 * This will be extended in the future to support private fields.
 *
 * Keywords in JavaScript are contextual, for example `await` and `yield`,
 * so the parameter might be a keyword.
 * The `@ember/template-compiler/runtime` expects the function to throw a `SyntaxError`
 * if the identifier name is not valid in the current scope.
 * The direct `eval` function takes care of this out of the box.
 *
 * Requirements:
 *
 * 1. The `eval` method must receive its parameter as `arguments[0]`.
 *    This ensures that the function's parameter name
 *    does not shadow the variable name passed to `eval()`.
 * 2. The `eval` option must be a function or concise method, and not an arrow.
 *    This is because arrows do not have their own `arguments`, which breaks (1).
 * 3. The `eval` method must call "*direct* `eval`", and not an alias of `eval`.
 *    Direct `eval` evaluates the code in the scope it was called from.
 *    Aliased versions of `eval`, including `new Function`,
 *    evaluate the code in the global scope.
 * 4. The `eval` method must return the result of calling "direct `eval`".
 *
 * The easiest way to achieve these requirements
 * is to use the exact syntax presented above.
 * This is *also* the only way to be compatible with the compile-time implementation.
 *
 * ## Rationale
 *
 * This is useful for two reasons:
 *
 * 1. This form is a useful _intermediate_ form for the compile-time toolchain.
 *    It allows the content-tag preprocessor to convert the `<template>` syntax
 *    into valid JavaScript, without full-fledged lexical analysis.
 * 2. This form is a convenient form for manual prototyping
 *    when using the runtime compiler directly.
 *    It requires some extra typing relative to `<template>`,
 *    but it's a mechanical 1:1 transformation of the syntax.
 *
 * In practice, implementations that use a runtime compiler should probably
 * use the `content-tag` preprocessor to convert the template into the implicit form.
 * A playground running completely in the browser is one example.
 * They can then rely on `@ember/template-compiler/runtime` to evaluate the template.
 */
export interface ImplicitEvalOption {
  // The real type is (value: string) => unknown,
  // but RFC #0921 specifies the syntax `eval() { return eval(arguments[1]) }`,
  // which won't type check.
  // If we need to verify this, a linter rule would probably be more helpful than types,
  // because of the peculiarity of the pattern.
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
export type ImplicitTemplateOnlyOptions = BaseTemplateOptions & ImplicitEvalOption;

/**
 * When using `template` inside of a class,
 * you can pass an `eval` option that _implicitly_ provides the lexical scope for the template.
 * This works just as it does
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
 * `@ember/template-compiler` does not support private fields.
 * The Handlebars parser would first need to support private field syntax,
 * and the Glimmer compiler would need to implement it.
 * After that, the implicit form should be able to support them.
 */
export type ImplicitClassOptions<C extends ComponentClass> = BaseClassTemplateOptions<C> &
  ImplicitEvalOption;

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
  providedOptions?: BaseTemplateOptions | BaseClassTemplateOptions<any>
): object {
  const options = { strictMode: true, ...providedOptions };

  const evaluate = buildEvaluator(options);
  const normalizedOptions = compileOptions(options);
  const component = normalizedOptions.component ?? templateOnly();

  const source = glimmerPrecompile(templateString, normalizedOptions);
  const wire = evaluate(`(${source})`) as SerializedTemplateWithLazyBlock;

  const template = templateFactory(wire);

  setComponentTemplate(template, component);

  return component;
}

/**
 * Builds the source wireformat JSON block
 *
 * @param options
 * @returns
 */
function buildEvaluator(options: Partial<EmberPrecompileOptions>) {
  if (options.eval) {
    const userEval = options.eval;

    // Wrap the compiled source in a function
    // that receives the keywords container as a parameter.
    // The user's eval evaluates this in the caller's scope,
    // so local variables such as `handleClick` are captured by closure.
    // `__keywords__` comes from the function parameter.
    return (source: string) => {
      let wrapperFn = userEval(`(function(${RUNTIME_KEYWORDS_NAME}){ return (${source}); })`) as (
        ...args: unknown[]
      ) => unknown;

      return wrapperFn(keywords);
    };
  } else {
    let scope = options.scope?.();

    if (!scope) {
      return (source: string) => {
        return new Function(RUNTIME_KEYWORDS_NAME, `return (${source})`)(keywords);
      };
    }

    scope = Object.assign({ [RUNTIME_KEYWORDS_NAME]: keywords }, scope);

    return (source: string) => {
      let hasThis = Object.prototype.hasOwnProperty.call(scope, 'this');
      let thisValue = hasThis ? (scope as { this?: unknown }).this : undefined;

      let argNames: string[] = [];
      let argValues: unknown[] = [];

      for (let [name, value] of Object.entries(scope)) {
        if (name === 'this') {
          continue;
        }

        argNames.push(name);
        argValues.push(value);
      }

      let fn = new Function(...argNames, `return (${source})`);

      return hasThis ? fn.call(thisValue, ...argValues) : fn(...argValues);
    };
  }
}
