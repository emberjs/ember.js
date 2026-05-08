import templateOnly, { type TemplateOnlyComponent } from '@ember/component/template-only';
import {
  setPrivateFieldReader,
  type PrivateFieldReader,
} from '@ember/-internals/metal';
import { precompile as glimmerPrecompile } from '@glimmer/compiler';
import type { SerializedTemplateWithLazyBlock } from '@glimmer/interfaces';
import { setComponentTemplate } from '@glimmer/manager';
import { templateFactory } from '@glimmer/opcode-compiler';
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
 * The explicit `scope` function in a *class* also takes an `instance`
 * parameter that provides access to the component's instance.
 *
 * Note that the explicit form **does not** support `{{this.#field}}`
 * references — its scope arrow is evaluated outside the class body, so
 * `instance.#field` won't parse against any private slots. Use the
 * implicit (`eval`) form when you need to read private fields from a
 * template.
 */
export interface ExplicitClassOptions<
  C extends ComponentClass,
> extends BaseClassTemplateOptions<C> {
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
export type ImplicitTemplateOnlyOptions = BaseTemplateOptions & ImplicitEvalOption;

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
 * ## Note on Private Fields
 *
 * The implicit form supports `{{this.#field}}` references natively. At
 * compile time `template()` builds a per-class private-field reader using
 * the `eval` option (which sits inside the class body and so has lexical
 * access to the private slots) and registers it via
 * `setPrivateFieldReader`. At render time, when the property walker hits a
 * `#`-prefixed segment it routes through that reader instead of doing a
 * plain string property access.
 *
 * The explicit `scope` form does **not** support private fields, because
 * its scope is evaluated outside the class body — there's no way to
 * construct an accessor that reaches the private slot.
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
  // `collect-private-fields` writes each `{{this.#field}}` segment it finds
  // into this set. After precompile we hand the names to the user's `eval`
  // to build a single per-class reader; `_getProp` consults it via the
  // private-field reader registry whenever the path walker hits a `#`-key.
  const privateFields = new Set<string>();
  normalizedOptions.meta!.privateFields = privateFields;

  const component = normalizedOptions.component ?? templateOnly();

  const source = glimmerPrecompile(templateString, normalizedOptions);
  const wire = evaluate(`(${source})`) as SerializedTemplateWithLazyBlock;

  const template = templateFactory(wire);

  setComponentTemplate(template, component);

  if (privateFields.size > 0) {
    registerPrivateFieldReader(component, privateFields, providedOptions);
  }

  return component;
}

function registerPrivateFieldReader(
  component: object,
  privateFields: ReadonlySet<string>,
  providedOptions: BaseTemplateOptions | BaseClassTemplateOptions<any> | undefined
): void {
  let userEval = (providedOptions as { eval?: (source: string) => unknown } | undefined)?.eval;
  if (!userEval) {
    let firstField = privateFields.values().next().value;
    throw new Error(
      `Template uses private field access (\`{{this.#${firstField}}}\`) but no \`eval\` option was provided. Private fields can only be reached when the template is compiled with the implicit (\`eval\`) form, since that is the only form whose lexical scope reaches into the class body.`
    );
  }

  let reader = buildPrivateFieldReader(privateFields, userEval);
  setPrivateFieldReader(component, reader);
}

const PRIVATE_FIELD_NAME = /^[A-Za-z_$][\w$]*$/;

function buildPrivateFieldReader(
  privateFields: ReadonlySet<string>,
  userEval: (source: string) => unknown
): PrivateFieldReader {
  // We compile a single switch that closes over the class's private slots.
  // Because `userEval` is invoked from inside the class's static block, the
  // `#field` syntax inside the function body is resolved at parse time
  // against the class's private names, and the resulting closure preserves
  // that access for every instance handed to it later.
  let cases: string[] = [];
  for (let field of privateFields) {
    if (!PRIVATE_FIELD_NAME.test(field)) {
      throw new Error(
        `Refusing to compile private-field reader for \`#${field}\` — name is not a valid JS identifier.`
      );
    }
    cases.push(`case ${JSON.stringify(field)}:return __inst.#${field};`);
  }

  let source = `(function(__inst,__name){switch(__name){${cases.join('')}}})`;
  let reader = userEval(source);

  if (typeof reader !== 'function') {
    throw new Error(
      'Template private-field reader did not compile to a function. The `eval` option must do `return eval(arguments[0])` from inside the class body.'
    );
  }

  return reader as PrivateFieldReader;
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

    // Wrap the compiled source in a function that receives the keywords
    // container as a parameter. The user's eval evaluates this in the
    // caller's scope, so local variables (like `handleClick`) are captured
    // via closure, while `__keywords__` comes from the function parameter.
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
