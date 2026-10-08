/**
@module ember
*/
import { precompileJSON } from '@glimmer/compiler';
import type { SerializedTemplateWithLazyBlock, TemplateFactory } from '@glimmer/interfaces';
import { templateFactory } from '@glimmer/opcode-compiler';
import type {
  ASTPluginBuilder,
  PrecompileOptions,
  PrecompileOptionsWithLexicalScope,
} from '@glimmer/syntax';
import type { EmberPrecompileOptions } from 'ember-template-compiler';
import { compileOptions } from 'ember-template-compiler';

/**
  The options of `compile`, in the shape of the conformance adapter's `compile`.
*/
export interface CompileOptions {
  strictMode?: boolean | undefined;
  /** The names (and values) of the lexical scope of a strict-mode template. */
  scope?: (() => Record<string, unknown>) | undefined;
  moduleName?: string | undefined;
  /** Implementation-only: AST plugins, for the Glimmer harness' `registerPlugin`. */
  plugins?: ASTPluginBuilder[] | undefined;
  /**
    Implementation-only, transitional: compile with the Glimmer compiler's options alone, taking
    them from `glimmerOptions` as given, without Ember's `compileOptions`. Used by the Glimmer
    integration tests until they compile like Ember does.
  */
  glimmerOnly?: { options?: PrecompileOptions | PrecompileOptionsWithLexicalScope } | undefined;
}

let templateId = 0;

/**
  Compiles a template source into a template factory, like Ember does for a `.hbs` module.

  @private
  @method compile
  @param {String} source
  @param {Object} options
*/
export function compile(source: string, options: CompileOptions = {}): TemplateFactory {
  let { strictMode, scope, moduleName, plugins, glimmerOnly } = options;
  let precompile: Partial<EmberPrecompileOptions> = {
    ...(glimmerOnly?.options as Partial<EmberPrecompileOptions> | undefined),
  };

  if (strictMode !== undefined) precompile.strictMode = strictMode;
  if (moduleName !== undefined) precompile.moduleName = moduleName;
  if (plugins !== undefined) {
    precompile.plugins = { ast: plugins } as NonNullable<EmberPrecompileOptions['plugins']>;
  }

  return build(source, precompile, scope?.() ?? {}, glimmerOnly !== undefined);
}

/**
  Uses HTMLBars `compile` function to process a string into a compiled template.

  This is not present in production builds.

  @private
  @method compile
  @param {String} templateString This is the string to be compiled by HTMLBars.
  @param {Object} options This is an options hash to augment the compiler options.
*/
export default function compileWithScope(
  templateSource: string,
  options: Partial<EmberPrecompileOptions> = {},
  scopeValues: Record<string, unknown> = {}
): TemplateFactory {
  return build(templateSource, options, scopeValues, false);
}

function build(
  templateSource: string,
  options: Partial<EmberPrecompileOptions>,
  scopeValues: Record<string, unknown>,
  glimmerOnly: boolean
): TemplateFactory {
  let withLocals = { ...options, locals: options.locals ?? Object.keys(scopeValues) };
  let [block, usedLocals] = precompileJSON(
    templateSource,
    glimmerOnly
      ? (withLocals as PrecompileOptions | PrecompileOptionsWithLexicalScope)
      : compileOptions(withLocals)
  );
  let reifiedScope: Record<string, unknown> = {};
  for (let key of usedLocals) {
    reifiedScope[key] = scopeValues[key];
  }

  let templateBlock: SerializedTemplateWithLazyBlock = {
    ...(glimmerOnly ? { id: String(templateId++) } : {}),
    block: JSON.stringify(block),
    moduleName: options.moduleName ?? options.meta?.moduleName ?? '(unknown template module)',
    scope: usedLocals.length > 0 ? () => reifiedScope : null,
    isStrictMode: options.strictMode ?? false,
  } as SerializedTemplateWithLazyBlock;

  return templateFactory(templateBlock);
}
