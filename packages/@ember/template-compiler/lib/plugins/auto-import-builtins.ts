import type * as AST from '@glimmer/syntax/lib/v1/api';
import type { ASTPlugin } from '@glimmer/syntax/lib/parser/tokenizer-event-handlers';
import type { EmberASTPluginEnvironment } from '../types';
import { bindKeyword, KEYWORDS_MODULE, trackLocals } from './utils';

/**
 @module ember
*/

interface BuiltinImport {
  module: string;
  export: string;
}

function table(names: string[], overrides: Record<string, BuiltinImport>) {
  let result: Record<string, BuiltinImport> = {};

  for (let name of names) {
    result[name] = overrides[name] ?? { module: '@ember/helper', export: name };
  }

  return result;
}

const KEYWORD_OVERRIDES: Record<string, BuiltinImport> = {
  on: { module: '@ember/modifier', export: 'on' },
  mut: { module: KEYWORDS_MODULE, export: 'mut' },
  readonly: { module: KEYWORDS_MODULE, export: 'readonly' },
  unbound: { module: KEYWORDS_MODULE, export: 'unbound' },
  'unique-id': { module: '@ember/helper', export: 'uniqueId' },
};

const STRICT_BUILTINS = table(
  [
    'array',
    'eq',
    'element',
    'and',
    'fn',
    'hash',
    'neq',
    'gt',
    'gte',
    'lt',
    'lte',
    'not',
    'on',
    'or',
    'mut',
    'readonly',
    'unbound',
  ],
  KEYWORD_OVERRIDES
);

/**
 * Loose mode binds only the names that already win over app helpers and
 * modifiers there, so binding them at build time changes nothing.
 */
const LOOSE_BUILTINS = table(
  ['array', 'concat', 'fn', 'get', 'hash', 'unique-id', 'on', 'mut', 'readonly', 'unbound'],
  KEYWORD_OVERRIDES
);

function makeAutoImport(builtins: Record<string, BuiltinImport>, name: string) {
  return function (env: EmberASTPluginEnvironment): ASTPlugin {
    let { hasLocal, visitor } = trackLocals(env);

    return {
      name,
      visitor: {
        ...visitor,

        PathExpression(node: AST.PathExpression) {
          let builtin = builtins[node.original];
          if (builtin === undefined) return;
          if (hasLocal(node.original)) return;

          bindKeyword(env, node, builtin.export, builtin.module);
        },
      },
    };
  };
}

/** Makes importable keywords work without an import in strict mode. */
const autoImportBuiltins = makeAutoImport(STRICT_BUILTINS, 'auto-import-built-ins');
export default autoImportBuiltins;

/** Binds the loose mode built-ins at build time, so no name table loads. */
export const autoImportLooseBuiltins = makeAutoImport(
  LOOSE_BUILTINS,
  'auto-import-loose-built-ins'
);
