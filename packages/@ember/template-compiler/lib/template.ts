import templateOnly, { type TemplateOnlyComponent } from '@ember/component/template-only';
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
 * ## Note  on Private Fields
 *
 * The current implementation of `@ember/template-compiler` does not support
 * private fields, but once the Handlebars parser adds support for private field
 * syntax and it's implemented in the Glimmer compiler, the implicit form should
 * be able to support them.
 */
export type ImplicitClassOptions<C extends ComponentClass> = BaseClassTemplateOptions<C> &
  ImplicitEvalOption;

/**
 * Extract scope values from a template string using an eval function.
 * Used in GXT mode to resolve the implicit form's local variables.
 */
function _extractScopeFromEval(
  templateString: string,
  evalFn: (v: string) => unknown
): Record<string, unknown> {
  const scope: Record<string, unknown> = {};

  // Extract potential free variable names from the template:
  // 1. Component invocations: <Foo />, <Foo>, </Foo>
  // 2. Mustache expressions: {{foo}}, {{foo bar}}, (foo ...)
  // 3. Helper/modifier invocations: {{on "click" ...}}, (fn ...)
  // 4. Dotted paths: <state.component /> (head part only)
  const identifiers = new Set<string>();

  // Match PascalCase component names: <Foo, <FooBar
  const componentPattern = /<([A-Z][a-zA-Z0-9]*)\b/g;
  let m;
  while ((m = componentPattern.exec(templateString)) !== null) {
    identifiers.add(m[1]!);
  }

  // Match lowercase identifiers in mustache/subexpression position
  // {{foo}}, {{foo bar}}, (foo ...), {{#foo}}, {{/foo}}
  // Note: do NOT skip keywords — they can be shadowed in strict mode
  const mustachePattern = /\{\{#?\/?([a-z][a-zA-Z0-9_]*)\b/g;
  while ((m = mustachePattern.exec(templateString)) !== null) {
    identifiers.add(m[1]!);
  }

  // Match subexpression helpers: (foo ...) but not (this.foo)
  const subexprPattern = /\(([a-z][a-zA-Z0-9_]*)\b/g;
  while ((m = subexprPattern.exec(templateString)) !== null) {
    identifiers.add(m[1]!);
  }

  // Match dotted path heads: <state.component /> → state
  const dottedPattern = /<([a-z][a-zA-Z0-9]*)\.([a-zA-Z])/g;
  while ((m = dottedPattern.exec(templateString)) !== null) {
    const head = m[1]!;
    if (head !== 'this') {
      identifiers.add(head);
    }
  }

  // Match modifier names: <div {{foo}}>
  const modifierPattern = /\{\{([a-z][a-zA-Z0-9_]*)\b/g;
  while ((m = modifierPattern.exec(templateString)) !== null) {
    identifiers.add(m[1]!);
  }

  // Catch-all: match any bare identifier that appears in expression context
  // This catches variables used as arguments in subexpressions like (modifier foo ...)
  // and {{helper foo ...}} etc.
  const bareIdentPattern = /\b([a-z][a-zA-Z0-9_]*)\b/g;
  while ((m = bareIdentPattern.exec(templateString)) !== null) {
    const name = m[1]!;
    // Skip HTML tag names and common HBS keywords that aren't variables
    if (!_HBS_SYNTAX_WORDS.has(name)) {
      identifiers.add(name);
    }
  }

  // Try to resolve each identifier via eval
  for (const name of identifiers) {
    try {
      const value = evalFn(name);
      if (value !== undefined) {
        scope[name] = value;
      }
    } catch {
      // Variable not in scope — skip
    }
  }

  return Object.keys(scope).length > 0 ? scope : (undefined as any);
}

// HBS syntax words that should not be treated as variable references
const _HBS_SYNTAX_WORDS = new Set([
  'as',
  'div',
  'span',
  'button',
  'input',
  'textarea',
  'form',
  'a',
  'p',
  'ul',
  'li',
  'ol',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'table',
  'tr',
  'td',
  'th',
  'thead',
  'tbody',
  'img',
  'br',
  'hr',
  'nav',
  'section',
  'article',
  'header',
  'footer',
  'main',
  'aside',
  'label',
  'select',
  'option',
  'pre',
  'code',
  'em',
  'strong',
  'class',
  'id',
  'type',
  'name',
  'value',
  'checked',
  'disabled',
  'href',
  'src',
  'click',
  'true',
  'false',
  'null',
  'undefined',
  'this',
]);

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
  // In GXT mode, use the GXT runtime compiler instead of Glimmer compiler
  if ((globalThis as any).__GXT_MODE__) {
    const gxtCompile = (globalThis as any).__gxtCompileTemplate;
    if (gxtCompile) {
      const gxtOptions = { strictMode: true, ...providedOptions };
      const gxtComponent = (gxtOptions as any).component ?? templateOnly();

      // Extract scope values from explicit scope() or implicit eval()
      let scopeValues: Record<string, unknown> | undefined;

      if ('scope' in gxtOptions && typeof (gxtOptions as any).scope === 'function') {
        // Explicit form: scope: () => ({ Foo, bar })
        scopeValues = ((gxtOptions as any).scope as () => Record<string, unknown>)();
      } else if ('eval' in gxtOptions && typeof (gxtOptions as any).eval === 'function') {
        // Implicit form: eval() { return eval(arguments[0]) }
        // Extract free variable names from the template and resolve them via eval
        scopeValues = _extractScopeFromEval(
          templateString,
          (gxtOptions as any).eval as (v: string) => unknown
        );
      }

      const gxtTemplate = gxtCompile(templateString, {
        moduleName: gxtOptions.moduleName,
        strictMode: true,
        scopeValues,
      });

      setComponentTemplate(gxtTemplate, gxtComponent);
      return gxtComponent;
    }
  }

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
