/**
 * ESLint rule: no-barrel-imports
 *
 * Disallows importing from barrel/entrypoint (index.ts) files within
 * packages/. Internal source files should import directly from the
 * specific file that defines the export, to enable proper tree-shaking.
 *
 * Provides auto-fix by reading the barrel's index.ts, tracing each
 * imported name back to its source file, and rewriting the import.
 *
 *   Bad:  import { Renderer } from '@ember/-internals/glimmer';
 *   Good: import { Renderer } from '@ember/-internals/glimmer/lib/renderer';
 */

'use strict';

const fs = require('fs');
const path = require('path');

// Cache parsed barrel export maps so we don't re-read files per lint invocation.
const barrelCache = new Map();

/**
 * Resolve a source file path (relative, without extension) to an absolute path.
 * Tries .ts, .js, /index.ts, /index.js suffixes.
 */
function resolveFile(dir, relativePath) {
  const base = path.resolve(dir, relativePath);
  for (const suffix of ['', '.ts', '.js', '/index.ts', '/index.js']) {
    const candidate = base + suffix;
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }
  return null;
}

/**
 * Parse a source file and extract its named exports.
 * Returns an array of exported names (strings).
 */
function getFileExports(filePath) {
  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch {
    return [];
  }

  const names = [];

  // export function foo / export class Foo / export const foo / export let foo / export var foo
  const reDeclExport =
    /export\s+(?:declare\s+)?(?:function|class|const|let|var|enum|interface|type|abstract\s+class)\s+(\w+)/g;
  let m;
  while ((m = reDeclExport.exec(content)) !== null) {
    names.push(m[1]);
  }

  // export { Foo, Bar as Baz } — local exports (no "from")
  const reLocalExport = /export\s+(?:type\s+)?{([^}]+)}\s*(?:;|$)/gm;
  while ((m = reLocalExport.exec(content)) !== null) {
    // Make sure this isn't a re-export (has "from")
    const afterBrace = content.slice(m.index, m.index + m[0].length + 30);
    if (/from\s+['"]/.test(afterBrace)) continue;

    for (let part of m[1].split(',')) {
      part = part.trim().replace(/^type\s+/, '');
      if (!part) continue;
      const asParts = part.split(/\s+as\s+/);
      names.push((asParts[1] || asParts[0]).trim());
    }
  }

  // export default
  if (/export\s+default\s/.test(content)) {
    names.push('default');
  }

  return names;
}

/**
 * Given the absolute path to a barrel index.ts, parse its re-exports and
 * return a Map<exportedName, relativeSourcePath>.
 *
 * Handles:
 *   export { Foo, Bar } from './lib/foo';
 *   export { Baz as Qux } from './lib/baz';
 *   export { default as Foo } from './lib/foo';
 *   export type { Foo } from './lib/foo';
 *   export * from './lib/foo';
 */
function parseBarrelExports(barrelPath) {
  if (barrelCache.has(barrelPath)) return barrelCache.get(barrelPath);

  const map = new Map(); // exportedName -> relativePath (without extension)
  const barrelDir = path.dirname(barrelPath);

  let content;
  try {
    content = fs.readFileSync(barrelPath, 'utf8');
  } catch {
    barrelCache.set(barrelPath, map);
    return map;
  }

  // Match: export [type] { names } from 'source';
  const re = /export\s+(?:type\s+)?{([^}]+)}\s+from\s+['"]([^'"]+)['"]/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    const names = m[1];
    const sourcePath = m[2];

    for (let part of names.split(',')) {
      part = part.trim();
      if (!part) continue;
      part = part.replace(/^type\s+/, '');
      const asParts = part.split(/\s+as\s+/);
      const exportedName = (asParts[1] || asParts[0]).trim();
      map.set(exportedName, sourcePath);
    }
  }

  // Match: export * from 'source';
  const reStarExport = /export\s+\*\s+from\s+['"]([^'"]+)['"]/g;
  while ((m = reStarExport.exec(content)) !== null) {
    const sourcePath = m[1];
    const resolvedFile = resolveFile(barrelDir, sourcePath);
    if (resolvedFile) {
      const exportedNames = getFileExports(resolvedFile);
      for (const name of exportedNames) {
        // Don't override named re-exports (they take precedence)
        if (!map.has(name)) {
          map.set(name, sourcePath);
        }
      }
    }
  }

  barrelCache.set(barrelPath, map);
  return map;
}

/**
 * Resolve a package specifier to the absolute path of its index.ts barrel.
 */
function resolveBarrelPath(packagesRoot, importSource) {
  const candidates = [
    path.join(packagesRoot, importSource, 'index.ts'),
    path.join(packagesRoot, importSource, 'index.js'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

/**
 * Convert a barrel-relative source to a full package import path.
 */
function toPackagePath(barrelPackage, relativeSource) {
  if (!relativeSource.startsWith('./')) return null;
  return barrelPackage + '/' + relativeSource.slice(2);
}

/**
 * Check if an import specifier resolves to a barrel index.ts.
 */
function isBarrelImport(packagesRoot, importSource) {
  if (importSource.startsWith('.') || importSource.startsWith('/')) return false;
  return resolveBarrelPath(packagesRoot, importSource) !== null;
}

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'suggestion',
    fixable: 'code',
    docs: {
      description:
        'Disallow imports from barrel/entrypoint files; require direct file imports instead',
    },
    messages: {
      noBarrelImport:
        "Do not import from the barrel '{{source}}'. Import from {{suggestion}} instead.",
      noBarrelImportNoFix:
        "Do not import from the barrel '{{source}}'. Could not determine source file for: {{names}}. Manually import from the specific file.",
    },
    schema: [],
  },

  create(context) {
    const filename = context.filename || context.getFilename();

    if (!filename.includes('/packages/')) return {};
    if (/\/(tests|type-tests)\//.test(filename)) return {};

    const packagesIdx = filename.indexOf('/packages/');
    if (packagesIdx === -1) return {};
    const packagesRoot = filename.substring(0, packagesIdx) + '/packages';

    function check(node) {
      const source = node.source && node.source.value;
      if (typeof source !== 'string') return;
      if (!isBarrelImport(packagesRoot, source)) return;

      const barrelPath = resolveBarrelPath(packagesRoot, source);
      if (!barrelPath) return;

      const exportMap = parseBarrelExports(barrelPath);

      // Collect imported names from the AST
      const importedNames = [];

      if (node.type === 'ImportDeclaration') {
        for (const spec of node.specifiers || []) {
          if (spec.type === 'ImportSpecifier') {
            importedNames.push({
              imported: spec.imported.name,
              local: spec.local.name,
              isType: spec.importKind === 'type',
            });
          } else if (spec.type === 'ImportDefaultSpecifier') {
            importedNames.push({ imported: 'default', local: spec.local.name, isType: false });
          }
          // ImportNamespaceSpecifier (import *) handled below
        }

        // import * as Foo — can't split, but can suggest the source
        const nsStar = (node.specifiers || []).find((s) => s.type === 'ImportNamespaceSpecifier');
        if (nsStar) {
          // If the barrel only re-exports from one source, we can fix it
          const sources = new Set(exportMap.values());
          if (sources.size === 1) {
            const [relSource] = sources;
            const pkgPath = toPackagePath(source, relSource);
            if (pkgPath) {
              context.report({
                node,
                messageId: 'noBarrelImport',
                data: { source, suggestion: `'${pkgPath}'` },
                fix(fixer) {
                  return fixer.replaceText(
                    node.source,
                    `'${pkgPath}'`
                  );
                },
              });
              return;
            }
          }
          // Multi-source barrel with import * — can't auto-fix
          context.report({
            node: node.source,
            messageId: 'noBarrelImportNoFix',
            data: { source, names: `* (namespace import)` },
          });
          return;
        }
      } else if (node.type === 'ExportNamedDeclaration') {
        for (const spec of node.specifiers || []) {
          importedNames.push({
            imported: spec.local.name,
            local: spec.exported.name,
            isType: spec.exportKind === 'type',
          });
        }
      } else if (node.type === 'ExportAllDeclaration') {
        // export * from 'barrel' — rewrite to the barrel's source
        const sources = new Set(exportMap.values());
        if (sources.size === 1) {
          const [relSource] = sources;
          const pkgPath = toPackagePath(source, relSource);
          if (pkgPath) {
            context.report({
              node,
              messageId: 'noBarrelImport',
              data: { source, suggestion: `'${pkgPath}'` },
              fix(fixer) {
                return fixer.replaceText(node.source, `'${pkgPath}'`);
              },
            });
            return;
          }
        }
        // Multi-source barrel — expand export * to named exports
        const bySource = new Map();
        for (const [name, relSource] of exportMap) {
          const pkgPath = toPackagePath(source, relSource);
          if (!pkgPath) continue;
          if (!bySource.has(pkgPath)) bySource.set(pkgPath, []);
          bySource.get(pkgPath).push(name);
        }
        if (bySource.size > 0) {
          const suggestion = [...bySource.keys()].map((p) => `'${p}'`).join(', ');
          context.report({
            node,
            messageId: 'noBarrelImport',
            data: { source, suggestion },
            fix(fixer) {
              const statements = [];
              for (const [pkgPath, names] of bySource) {
                statements.push(`export { ${names.join(', ')} } from '${pkgPath}';`);
              }
              return fixer.replaceText(node, statements.join('\n'));
            },
          });
        } else {
          context.report({
            node: node.source,
            messageId: 'noBarrelImportNoFix',
            data: { source, names: '* (could not resolve exports)' },
          });
        }
        return;
      }

      if (importedNames.length === 0) {
        // Side-effect import: import 'barrel'
        context.report({
          node: node.source,
          messageId: 'noBarrelImportNoFix',
          data: { source, names: '(side-effect import)' },
        });
        return;
      }

      // Group imported names by source file
      const bySource = new Map();
      const unfixed = [];

      for (const entry of importedNames) {
        const relSource = exportMap.get(entry.imported);
        if (!relSource) {
          unfixed.push(entry.imported);
          continue;
        }
        const pkgPath = toPackagePath(source, relSource);
        if (!pkgPath) {
          unfixed.push(entry.imported);
          continue;
        }
        if (!bySource.has(pkgPath)) bySource.set(pkgPath, []);
        bySource.get(pkgPath).push(entry);
      }

      if (unfixed.length > 0) {
        context.report({
          node: node.source,
          messageId: 'noBarrelImportNoFix',
          data: { source, names: unfixed.join(', ') },
        });
        return;
      }

      // Build suggestion string for the error message
      const suggestion = [...bySource.keys()].map((p) => `'${p}'`).join(', ');

      context.report({
        node,
        messageId: 'noBarrelImport',
        data: { source, suggestion },
        fix(fixer) {
          const isExport = node.type === 'ExportNamedDeclaration';
          const keyword = isExport ? 'export' : 'import';
          const typePrefix = node.importKind === 'type' ? ' type' : '';

          const statements = [];
          for (const [pkgPath, entries] of bySource) {
            const specifiers = entries.map((e) => {
              const typeStr = e.isType && !typePrefix ? 'type ' : '';
              if (e.imported === e.local) return `${typeStr}${e.imported}`;
              return `${typeStr}${e.imported} as ${e.local}`;
            });
            statements.push(
              `${keyword}${typePrefix} { ${specifiers.join(', ')} } from '${pkgPath}';`
            );
          }
          return fixer.replaceText(node, statements.join('\n'));
        },
      });
    }

    return {
      ImportDeclaration: check,
      ExportNamedDeclaration: check,
      ExportAllDeclaration: check,
    };
  },
};
