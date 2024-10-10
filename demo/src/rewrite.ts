import type * as Babel from '@babel/core';
import type { NodePath } from '@babel/core';
import type { ImportDeclaration } from '@babel/types';

export interface ImportRewrite {
  to?: string;
  specifier?: RewriteSpecifier | RewriteSpecifier[];
}

export interface RewriteSpecifier {
  /**
   * The name of the export to rename. The name `default` is
   * legal here, and will apply to `import Default from "..."`
   * syntax.
   */
  from: string;
  to: string;
}

export type Rewrites = Record<string, ImportRewrite | ImportRewrite[]>;

export function rewrite(
  t: (typeof Babel)['types'],
  path: NodePath<ImportDeclaration>,
  rewrites: Rewrites
) {
  for (const [matchSource, rules] of Object.entries(rewrites)) {
    for (const rule of intoArray(rules)) {
      path = rewriteOne(t, matchSource, path, rule);
    }
  }

  return path;
}

export function rewriteOne(
  t: (typeof Babel)['types'],
  matchSource: string,
  path: NodePath<ImportDeclaration>,
  rewrite: ImportRewrite
): NodePath<ImportDeclaration> {
  const source = path.node.source.value;

  if (source !== matchSource) {
    return path;
  }

  if (rewrite.to) {
    path.node.source = t.stringLiteral(rewrite.to);
  }

  const renameSpecifiers = rewrite.specifier;

  if (!renameSpecifiers) {
    return path;
  }

  path.node.specifiers = path.node.specifiers.map((specifier) => {
    for (const rewrite of intoArray(renameSpecifiers)) {
      specifier = rewriteSpecifier(t, rewrite, specifier);
    }

    return specifier;
  });

  return path;
}

function rewriteSpecifier(
  t: (typeof Babel)['types'],
  rewrite: RewriteSpecifier,
  specifier: ImportDeclaration['specifiers'][number]
) {
  if (rewrite.from === 'default') {
    if (t.isImportDefaultSpecifier(specifier)) {
      // Intentionally keep the original name around so we don't have to adjust
      // the scope.
      return t.importSpecifier(specifier.local, t.identifier(rewrite.to));
    }

    // if the import didn't use default import syntax, we might still find a `default`
    // named specifier, so don't return yet.
  }

  if (t.isImportSpecifier(specifier) && t.isIdentifier(specifier.imported)) {
    const importedName = specifier.imported.name;

    if (importedName === rewrite.from) {
      // Intentionally keep the original name around so we don't have to adjust
      // the scope.
      return t.importSpecifier(specifier.local, t.identifier(rewrite.to));
    }
  }

  return specifier;
}

function intoArray<T>(value: T | T[]): T[] {
  return Array.isArray(value) ? value : [value];
}
