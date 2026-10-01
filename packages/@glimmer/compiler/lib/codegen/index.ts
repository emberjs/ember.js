import type * as ASTv1 from '@glimmer/syntax/lib/v1/nodes-v1';
import { preprocess } from '@glimmer/syntax/lib/parser/tokenizer-event-handlers';

import type { GenerateOptions, Generated, ImportInfo } from './generate';

import { generate } from './generate';

export { codegenBabelPlugin, type CodegenBabelPluginOptions } from './babel-plugin';
export {
  CodegenError,
  generate,
  type GenerateOptions,
  type Generated,
  type ImportInfo,
} from './generate';

export interface CompileToDOMOptions {
  /**
   * The JavaScript bindings that are in scope for the template.
   */
  lexicalScope?: (name: string) => boolean;

  /**
   * Where (some of) those bindings were imported from.
   */
  importOf?: (name: string) => ImportInfo | undefined;

  /**
   * Where the runtime helpers are imported from.
   */
  runtimeModule?: string;
}

/**
 * Collects the imports used by generated code.
 */
export class ImportCollector {
  #imports = new Map<string, Map<string, string>>();

  constructor(readonly runtimeModule = '@glimmer/dom') {}

  runtime = (name: string): string => this.add(this.runtimeModule, name, `$$${name}`);

  importBinding = (module: string, name: string): string =>
    this.add(module, name, `$$_${name.replace(/\W/gu, '_')}`);

  add(module: string, name: string, local: string): string {
    let names = this.#imports.get(module);
    if (!names) this.#imports.set(module, (names = new Map<string, string>()));
    let existing = names.get(name);
    if (existing) return existing;
    names.set(name, local);
    return local;
  }

  entries(): Array<[module: string, names: Map<string, string>]> {
    return [...this.#imports];
  }

  toString(): string {
    return this.entries()
      .map(
        ([module, names]) =>
          `import { ${[...names].map(([name, local]) => `${name} as ${local}`).join(', ')} } from ${JSON.stringify(module)};`
      )
      .join('\n');
  }
}

export function parse(source: string): ASTv1.Template {
  return preprocess(source, { strictMode: true });
}

/**
 * EXPERIMENTAL: compile a strict-mode template to an ES module whose default
 * export is the compiled template (usable as a template-only component).
 */
export function compileToDOM(source: string, options: CompileToDOMOptions = {}): string {
  let imports = new ImportCollector(options.runtimeModule);
  let { hoisted, expression } = generateFor(parse(source), options, imports);

  return [imports.toString(), ...hoisted, `export default ${expression};`].join('\n');
}

export function generateFor(
  ast: ASTv1.Template,
  options: CompileToDOMOptions,
  imports: ImportCollector
): Generated {
  let generateOptions: GenerateOptions = {
    isLexical: options.lexicalScope ?? (() => false),
    runtime: imports.runtime,
    importBinding: imports.importBinding,
  };
  if (options.importOf) generateOptions.importOf = options.importOf;
  return generate(ast, generateOptions);
}
