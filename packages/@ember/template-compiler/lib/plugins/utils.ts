import type * as AST from '@glimmer/syntax/lib/v1/api';
import type { EmberASTPluginEnvironment } from '../types';

/** The module that exports the implementation behind each keyword. */
export const KEYWORDS_MODULE = '@ember/-internals/template-keywords';

/**
 * Points a path at a keyword's implementation. With a build tool, the
 * path becomes an import binding; with the runtime compiler, it becomes an
 * entry of the runtime keywords object. Otherwise the name stays as it is
 * and a resolver looks it up.
 */
export function bindKeyword(
  env: EmberASTPluginEnvironment,
  node: AST.PathExpression,
  exportName: string,
  moduleSpecifier: string = KEYWORDS_MODULE
): void {
  if (env.meta?.jsutils) {
    node.original = env.meta.jsutils.bindImport(moduleSpecifier, exportName, node, {
      nameHint: `__keyword__${exportName}`,
    });
  } else if (env.strictMode && env.meta?.emberRuntime) {
    // The runtime compiler binds through a dotted path on its keywords
    // object, which only strict mode can invoke. A loose template keeps
    // the name and resolves it through the built-in tables.
    node.original = env.meta.emberRuntime.lookupKeyword(exportName);
  }
}

/**
 * A path for an internal keyword that a transform inserts, such as
 * `-track-array`. With a build tool or the runtime compiler, the path
 * binds the implementation directly. Otherwise the name stays for the
 * resolver, which serves templates compiled before this change.
 */
export function keywordPath(
  env: EmberASTPluginEnvironment,
  keyword: string,
  exportName: string,
  loc?: AST.SourceLocation
): AST.PathExpression {
  let path = env.syntax.builders.path(keyword, loc);
  bindKeyword(env, path, exportName);
  return path;
}

/**
 * Expressions a transform produced. A transform that returns a new block
 * sees that block again, so it checks here before it wraps a parameter a
 * second time.
 */
export const EACH_IN_EXPRESSIONS = new WeakSet<AST.SubExpression>();
export const TRACK_ARRAY_EXPRESSIONS = new WeakSet<AST.SubExpression>();

export function isPath(node: AST.Node): node is AST.PathExpression {
  return node.type === 'PathExpression';
}

export function isSubExpression(node: AST.Node): node is AST.SubExpression {
  return node.type === 'SubExpression';
}

export function isStringLiteral(node: AST.Expression): node is AST.StringLiteral {
  return node.type === 'StringLiteral';
}

export function inScope(env: EmberASTPluginEnvironment, name: string): boolean {
  return Boolean(env.lexicalScope?.(name));
}

function getLocalName(node: string | AST.VarHead): string {
  if (typeof node === 'string') {
    return node;
  } else {
    return node.original;
  }
}

export function trackLocals(env: EmberASTPluginEnvironment) {
  let locals = new Map();

  let node = {
    enter(node: AST.Template | AST.Block | AST.ElementNode) {
      let params = 'params' in node ? node.params : node.blockParams;
      for (let param of params) {
        let name = getLocalName(param);
        let value = locals.get(param) || 0;
        locals.set(name, value + 1);
      }
    },

    exit(node: AST.Template | AST.Block | AST.ElementNode) {
      let params = 'params' in node ? node.params : node.blockParams;
      for (let param of params) {
        let name = getLocalName(param);
        let value = locals.get(name) - 1;

        if (value === 0) {
          locals.delete(name);
        } else {
          locals.set(name, value);
        }
      }
    },
  };

  return {
    hasLocal: (key: string) => locals.has(key) || inScope(env, key),
    node,
    visitor: {
      Template: node,
      ElementNode: node,
      Block: node,
    },
  };
}
