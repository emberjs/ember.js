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
 * Given the absolute path to a barrel index.ts, parse its re-exports and
 * return a Map<exportedName, relativeSourcePath>.
 *
 * Handles:
 *   export { Foo, Bar } from './lib/foo';
 *   export { Baz as Qux } from './lib/baz';
 *   export { default as Foo } from './lib/foo';
 *   export type { Foo } from './lib/foo';
 */
function parseBarrelExports(barrelPath) {
  if (barrelCache.has(barrelPath)) return barrelCache.get(barrelPath);

  const map = new Map(); // exportedName -> relativePath (without extension)

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
    let sourcePath = m[2];

    // Parse individual names: "Foo", "Foo as Bar", "default as Foo", "type Foo"
    for (let part of names.split(',')) {
      part = part.trim();
      if (!part) continue;

      // Strip leading "type " for type-only re-exports
      part = part.replace(/^type\s+/, '');

      const asParts = part.split(/\s+as\s+/);
      const exportedName = (asParts[1] || asParts[0]).trim();

      map.set(exportedName, sourcePath);
    }
  }

  // Match: export { default } from 'source';  (shorthand)
  const reDefault = /export\s+{\s*default\s*}\s+from\s+['"]([^'"]+)['"]/g;
  while ((m = reDefault.exec(content)) !== null) {
    map.set('default', m[1]);
  }

  barrelCache.set(barrelPath, map);
  return map;
}

/**
 * Resolve a package specifier to the absolute path of its index.ts barrel.
 * Returns null if no barrel is found.
 */
function resolveBarrelPath(packagesRoot, importSource) {
  // Try direct: packages/<importSource>/index.ts
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
 * Given a relative source from a barrel (e.g. './lib/renderer') and
 * the barrel's package specifier (e.g. '@ember/-internals/glimmer'),
 * compute the full package import path.
 */
function toPackagePath(barrelPackage, relativeSource) {
  // './lib/renderer' -> '@ember/-internals/glimmer/lib/renderer'
  // '../foo' -> would be outside package, skip
  if (!relativeSource.startsWith('./')) return null;
  return barrelPackage + '/' + relativeSource.slice(2);
}

/**
 * Check if an import specifier looks like a barrel import.
 * A barrel import is one that points to a package entrypoint (index.ts)
 * rather than a specific source file.
 *
 * Heuristic: if the specifier matches a known package directory that
 * contains an index.ts, it's a barrel import.
 */
function isBarrelImport(packagesRoot, importSource) {
  // Must start with @ or a package name, not be a relative import
  if (importSource.startsWith('.') || importSource.startsWith('/')) return false;

  // Must be inside our packages/ directory
  const barrelPath = resolveBarrelPath(packagesRoot, importSource);
  return barrelPath !== null;
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
        "Do not import from the barrel '{{source}}'. Import directly from the source file instead.",
      noBarrelImportNoFix:
        "Do not import from the barrel '{{source}}'. Could not auto-fix: {{reason}}",
    },
    schema: [], // no options
  },

  create(context) {
    const filename = context.filename || context.getFilename();

    // Only apply to files inside packages/
    if (!filename.includes('/packages/')) {
      return {};
    }

    // Skip test and type-test files
    if (/\/(tests|type-tests)\//.test(filename)) {
      return {};
    }

    // Find the packages root
    const packagesIdx = filename.indexOf('/packages/');
    if (packagesIdx === -1) return {};
    const packagesRoot = filename.substring(0, packagesIdx) + '/packages';

    function check(node) {
      const source = node.source && node.source.value;
      if (typeof source !== 'string') return;

      // Check if this is a barrel import
      if (!isBarrelImport(packagesRoot, source)) return;

      // Get the imported names from the AST node
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
            importedNames.push({
              imported: 'default',
              local: spec.local.name,
              isType: false,
            });
          }
          // ImportNamespaceSpecifier (import *) — can't auto-fix
        }
      } else if (node.type === 'ExportNamedDeclaration') {
        for (const spec of node.specifiers || []) {
          importedNames.push({
            imported: spec.local.name,
            local: spec.exported.name,
            isType: spec.exportKind === 'type',
          });
        }
      }
      // ExportAllDeclaration — can't auto-fix, just report

      if (node.type === 'ExportAllDeclaration' || importedNames.length === 0) {
        context.report({
          node: node.source,
          messageId: 'noBarrelImportNoFix',
          data: {
            source,
            reason: node.type === 'ExportAllDeclaration'
              ? 'export * cannot be auto-fixed'
              : 'no named imports to trace',
          },
        });
        return;
      }

      // Resolve the barrel and trace exports
      const barrelPath = resolveBarrelPath(packagesRoot, source);
      if (!barrelPath) {
        context.report({
          node: node.source,
          messageId: 'noBarrelImport',
          data: { source },
        });
        return;
      }

      const exportMap = parseBarrelExports(barrelPath);

      // Group imported names by their source file
      const bySource = new Map(); // sourcePath -> [{imported, local, isType}]
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

      if (unfixed.length > 0 || bySource.size === 0) {
        // Can't fully auto-fix — report without fix
        context.report({
          node: node.source,
          messageId: 'noBarrelImportNoFix',
          data: {
            source,
            reason: `could not trace: ${unfixed.join(', ')}`,
          },
        });
        return;
      }

      // Build the replacement import(s)
      context.report({
        node,
        messageId: 'noBarrelImport',
        data: { source },
        fix(fixer) {
          const isExport = node.type === 'ExportNamedDeclaration';
          const keyword = isExport ? 'export' : 'import';
          const typePrefix = node.importKind === 'type' ? ' type' : '';

          const statements = [];
          for (const [pkgPath, entries] of bySource) {
            const specifiers = entries.map((e) => {
              const typeStr = e.isType && !typePrefix ? 'type ' : '';
              if (e.imported === e.local) {
                return `${typeStr}${e.imported}`;
              }
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
