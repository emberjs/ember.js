import {
  type LexicalKeyword,
  type PrecompiledModule,
  precompileModule as glimmerPrecompileModule,
} from '@glimmer/compiler';
import { precompileAot } from '@glimmer/opcode-compiler/lib/aot/precompile';
import type { EmberPrecompileOptions } from '../types';
import compileOptions from './compile-options';

const KEYWORDS_MODULE = '@ember/-internals/template-keywords';

/**
  Strict mode keywords and the export that implements each one. Loose mode
  templates still resolve these at runtime through the resolver.
*/
const LEXICAL_KEYWORDS: Record<string, LexicalKeyword> = {
  mut: { module: KEYWORDS_MODULE, name: 'mut' },
  readonly: { module: KEYWORDS_MODULE, name: 'readonly' },
  unbound: { module: KEYWORDS_MODULE, name: 'unbound' },
  '-each-in': { module: KEYWORDS_MODULE, name: 'eachIn' },
  '-in-el-null': { module: KEYWORDS_MODULE, name: 'inElementNullCheck' },
  '-track-array': { module: KEYWORDS_MODULE, name: 'trackArray' },
  '-normalize-class': { module: KEYWORDS_MODULE, name: 'normalizeClass' },
  '-resolve': { module: KEYWORDS_MODULE, name: 'resolve' },
  '-hash': { module: KEYWORDS_MODULE, name: 'hash' },
  '-outlet': { module: KEYWORDS_MODULE, name: 'outlet' },
  '-mount': { module: KEYWORDS_MODULE, name: 'mount' },
};

/**
  Compiles a template into a JavaScript expression plus the imports it
  needs. A strict template compiles all the way to VM words, so no compiler
  ships to the browser for it. A loose template keeps its wire format
  opcodes as imported objects and resolves names at runtime.

  @private
  @method precompileModule
*/
export default function precompileModule(
  templateString: string,
  options: Partial<EmberPrecompileOptions> = {}
): PrecompiledModule {
  let compiled = compileOptions(options);

  if (compiled.strictMode) {
    return precompileAot(templateString, {
      ...compiled,
      lexicalKeywords: LEXICAL_KEYWORDS,
      factory: { module: '@ember/template-factory/aot', name: 'createTemplateFactory' },
    });
  }

  let result = glimmerPrecompileModule(templateString, compiled);

  return {
    ...result,
    factory: { module: '@ember/template-factory/loose', name: 'createTemplateFactory' },
  };
}
