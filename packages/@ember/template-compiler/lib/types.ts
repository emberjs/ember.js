import type {
  AST,
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

export type PluginFunc = NonNullable<
  NonNullable<PrecompileOptionsWithLexicalScope['plugins']>['ast']
>[number];

export type LexicalScope = NonNullable<PrecompileOptionsWithLexicalScope['lexicalScope']>;

interface Plugins {
  ast: PluginFunc[];
}

export interface JSUtils {
  bindImport(module: string, name: string, node: AST.Node): void;
}

export interface EmberPrecompileOptions extends PrecompileOptions {
  isProduction?: boolean;
  moduleName?: string;
  plugins?: Plugins;
  lexicalScope?: LexicalScope;
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
