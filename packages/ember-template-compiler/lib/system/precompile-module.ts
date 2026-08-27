import {
  type LexicalKeyword,
  type PrecompiledModule,
  precompileModule as glimmerPrecompileModule,
} from '@glimmer/compiler';
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
};

/**
  Compiles a template into a JavaScript expression whose wire format opcodes
  are identifiers. The build tool binds each identifier to an import.

  @private
  @method precompileModule
*/
export default function precompileModule(
  templateString: string,
  options: Partial<EmberPrecompileOptions> = {}
): PrecompiledModule {
  let compiled = compileOptions(options);

  let result = glimmerPrecompileModule(templateString, {
    ...compiled,
    lexicalKeywords: compiled.strictMode ? LEXICAL_KEYWORDS : undefined,
  });

  return {
    ...result,
    factory: {
      module: compiled.strictMode
        ? '@ember/template-factory/modular'
        : '@ember/template-factory/loose',
      name: 'createTemplateFactory',
    },
  };
}
