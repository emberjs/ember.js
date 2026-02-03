import type {
  ASTPluginBuilder,
  ASTPluginEnvironment,
  builders,
  PrecompileOptions,
  PrecompileOptionsWithLexicalScope,
} from '@glimmer/syntax';

export type Builders = typeof builders;

/*
 * It seems like it should be possible to reepxport the `ASTPluginBuilder`
 * interface with a new named export, but the I wasn't able to figure out the
 * typing. Here export the interface subclass with no modification.
 */

export type PluginFunc = ASTPluginBuilder<EmberASTPluginEnvironment>;

export type LexicalScope = NonNullable<PrecompileOptionsWithLexicalScope['lexicalScope']>;

interface Plugins {
  ast: PluginFunc[];
}

export interface EmberPrecompileOptions extends Omit<PrecompileOptions, 'meta'> {
  isProduction?: boolean;
  moduleName?: string;
  plugins?: Plugins;
  lexicalScope?: LexicalScope;
  meta?: {
    /**
     * Exists for historical reasons, should not be in new code, as
     * the module name does not correspond to anything meaningful at runtime.
     */
    moduleName?: string | undefined;

    /**
     * Not available at runtime
     */
    jsutils?: { bindImport: (...args: unknown[]) => string };

    /**
     * Utils unique to the runtime compiler
     */
    emberRuntime?: {
      lookupKeyword(name: string): string;
    };
  };

  /**
   * This supports template blocks defined in class bodies.
   *
   * Manual form:
   *
   * ```ts
   * class MyComponent {
   *   static {
   *     template(templateContent, {
   *       component: this,
   *       eval: () => eval(arguments[0])
   *     })
   *   }
   * }
   * ```
   *
   * GJS form (compiled to the manual form via `content-tag`):
   *
   * ```ts
   * class MyComponent {
   *   <template>Template Content</template>
   * }
   * ```
   */
  component?: object;
  eval?: (value: string) => unknown;
  scope?: () => Record<string, unknown>;
}

export type EmberASTPluginEnvironment = ASTPluginEnvironment & EmberPrecompileOptions;
