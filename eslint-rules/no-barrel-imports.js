/* eslint-disable no-undef */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { parse } = require('@typescript-eslint/typescript-estree');

const WORKSPACE_ROOT = path.resolve(__dirname, '..');
const PACKAGES_ROOT = path.join(WORKSPACE_ROOT, 'packages');

const moduleCache = new Map();
const owningPackageCache = new Map();
const wildcardExportsCache = new Map();

// Barrels we deliberately don't rewrite imports from. `@glimmer/component`
// has its own legacy-resolution tsconfig that can't follow deep paths;
// `@ember/version` is a one-line shim that re-exports from `ember/version`
// (a different package), and we want to keep `@ember/version` as the canonical
// import path for the framework version.
const EXCLUDED_BARRELS = new Set(['@glimmer/component', '@ember/version']);

const idOrStr = (n) => (n.type === 'Identifier' ? n.name : n.value);

function resolveBarrelPath(specifier) {
  if (!specifier?.startsWith('@ember/') && !specifier?.startsWith('@glimmer/')) return null;
  for (const ext of ['.ts', '.js']) {
    const p = path.join(PACKAGES_ROOT, specifier, `index${ext}`);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function resolveImportSource(spec, fromFile) {
  if (!spec.startsWith('.')) return resolveBarrelPath(spec);
  const base = path.resolve(path.dirname(fromFile), spec);
  for (const c of [
    base,
    base + '.ts',
    base + '.js',
    path.join(base, 'index.ts'),
    path.join(base, 'index.js'),
  ]) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

function declarationNames(decl) {
  if (!decl) return [];
  switch (decl.type) {
    case 'VariableDeclaration':
      return decl.declarations
        .filter((v) => v.id?.type === 'Identifier')
        .map((v) => ({ name: v.id.name, isType: false }));
    case 'FunctionDeclaration':
    case 'ClassDeclaration':
    case 'TSEnumDeclaration':
      return decl.id ? [{ name: decl.id.name, isType: false }] : [];
    case 'TSInterfaceDeclaration':
    case 'TSTypeAliasDeclaration':
    case 'TSModuleDeclaration':
      return decl.id?.name ? [{ name: decl.id.name, isType: true }] : [];
    default:
      return [];
  }
}

function getModuleExports(filepath, stack = new Set()) {
  if (moduleCache.has(filepath)) return moduleCache.get(filepath);
  if (stack.has(filepath)) return new Map();
  stack.add(filepath);

  let ast;
  try {
    ast = parse(fs.readFileSync(filepath, 'utf8'), { jsx: false, range: true, loc: true });
  } catch {
    moduleCache.set(filepath, null);
    stack.delete(filepath);
    return null;
  }

  const exports = new Map();
  for (const stmt of ast.body) {
    if (stmt.type === 'ExportNamedDeclaration') collectNamedExports(stmt, exports, filepath, stack);
    else if (stmt.type === 'ExportAllDeclaration')
      collectStarExports(stmt, exports, filepath, stack);
    else if (stmt.type === 'ExportDefaultDeclaration') {
      exports.set('default', {
        source: filepath,
        localName: 'default',
        isType: false,
        kind: 'local',
      });
    }
  }

  moduleCache.set(filepath, exports);
  stack.delete(filepath);
  return exports;
}

function collectNamedExports(stmt, exports, filepath, stack) {
  const stmtIsType = stmt.exportKind === 'type';

  if (stmt.declaration) {
    for (const { name, isType } of declarationNames(stmt.declaration)) {
      exports.set(name, {
        source: filepath,
        localName: name,
        isType: isType || stmtIsType,
        kind: 'local',
      });
    }
    return;
  }

  if (!stmt.source) {
    for (const spec of stmt.specifiers ?? []) {
      if (spec.type !== 'ExportSpecifier') continue;
      exports.set(idOrStr(spec.exported), {
        source: filepath,
        localName: idOrStr(spec.local),
        isType: stmtIsType || spec.exportKind === 'type',
        kind: 'local',
      });
    }
    return;
  }

  const sourceSpec = stmt.source.value;
  const targetFile = resolveImportSource(sourceSpec, filepath);
  const isBare = !sourceSpec.startsWith('.');
  const nested = targetFile ? getModuleExports(targetFile, stack) : null;

  for (const spec of stmt.specifiers) {
    if (spec.type !== 'ExportSpecifier') continue;
    const isType = stmtIsType || spec.exportKind === 'type';
    let source = targetFile;
    let bareSource = !targetFile && isBare ? sourceSpec : null;
    let local = idOrStr(spec.local);

    const nestedEntry = nested?.get(local);
    if (nestedEntry && nestedEntry.kind !== 'namespace') {
      if (nestedEntry.source) {
        source = nestedEntry.source;
        bareSource = null;
        local = nestedEntry.localName;
      } else if (nestedEntry.bareSource) {
        source = null;
        bareSource = nestedEntry.bareSource;
        local = nestedEntry.localName;
      }
    }

    exports.set(idOrStr(spec.exported), {
      source,
      bareSource,
      localName: local,
      isType,
      kind: 'named',
    });
  }
}

function collectStarExports(stmt, exports, filepath, stack) {
  const stmtIsType = stmt.exportKind === 'type';
  const targetFile = resolveImportSource(stmt.source.value, filepath);

  if (stmt.exported) {
    exports.set(idOrStr(stmt.exported), {
      source: targetFile,
      isType: stmtIsType,
      kind: 'namespace',
    });
    return;
  }
  if (!targetFile) return;
  const nested = getModuleExports(targetFile, stack);
  if (!nested) return;
  for (const [name, entry] of nested) {
    if (name === 'default' || exports.has(name)) continue;
    exports.set(name, { ...entry, isType: entry.isType || stmtIsType });
  }
}

const SCOPE_PREFIXES = [
  path.join(PACKAGES_ROOT, '@ember') + path.sep,
  path.join(PACKAGES_ROOT, '@glimmer') + path.sep,
];
const EXCLUDED_FILE_PREFIXES = [path.join(PACKAGES_ROOT, '@glimmer/component') + path.sep];
const TEST_DIR_RE = /[\\/](?:test|tests)[\\/]/;

const isInScope = (filename) => SCOPE_PREFIXES.some((p) => filename.startsWith(p));
const isExcludedFile = (filename) => EXCLUDED_FILE_PREFIXES.some((p) => filename.startsWith(p));
const isInTestFile = (filename) =>
  TEST_DIR_RE.test(filename) || filename.includes(`${path.sep}internal-test-helpers${path.sep}`);

const stripExt = (p) => p.replace(/\.(?:d\.ts|[mc]?[jt]sx?)$/, '');
const toPosix = (p) => (path.sep === '/' ? p : p.replaceAll(path.sep, '/'));

// Map an absolute file path back to (packageRoot, bareSpec) by convention:
// `@ember/-internals/<x>` is depth-3, all other `@ember/<x>` and `@glimmer/<x>` are depth-2.
function getPackageInfo(absFile) {
  if (!absFile.startsWith(PACKAGES_ROOT + path.sep)) return null;
  const parts = toPosix(absFile.slice(PACKAGES_ROOT.length + 1)).split('/');
  const depth = parts[0] === '@ember' && parts[1] === '-internals' ? 3 : 2;
  const bareSpec = parts.slice(0, depth).join('/');
  return { packageRoot: path.join(PACKAGES_ROOT, ...bareSpec.split('/')), bareSpec };
}

function findOwningPackage(absFile) {
  if (owningPackageCache.has(absFile)) return owningPackageCache.get(absFile);
  let dir = path.dirname(absFile);
  let result = null;
  while (dir.length >= PACKAGES_ROOT.length && dir.startsWith(PACKAGES_ROOT)) {
    if (fs.existsSync(path.join(dir, 'package.json'))) {
      result = dir;
      break;
    }
    dir = path.dirname(dir);
  }
  owningPackageCache.set(absFile, result);
  return result;
}

function packageHasWildcardSourceExports(packageRoot) {
  if (wildcardExportsCache.has(packageRoot)) return wildcardExportsCache.get(packageRoot);
  let allowed = false;
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(packageRoot, 'package.json'), 'utf8'));
    const wildcard = pkg.exports?.['./*'];
    const matches = (v) => v === './*.ts';
    allowed =
      matches(wildcard) ||
      (wildcard && typeof wildcard === 'object' && Object.values(wildcard).some(matches));
  } catch {
    /* ignore */
  }
  wildcardExportsCache.set(packageRoot, allowed);
  return allowed;
}

function computeNewSpecifier(targetAbs, currentFile) {
  const targetInfo = getPackageInfo(targetAbs);
  if (!targetInfo) return null;
  const tail = toPosix(path.relative(targetInfo.packageRoot, targetAbs));
  // If the target IS the package's own index file, use just the bare specifier
  // (any `/index` suffix is redundant and confuses TS's module resolution).
  const isPackageIndex = /^index\.[mc]?[jt]sx?$/.test(tail);

  const currentInfo = getPackageInfo(currentFile);
  if (currentInfo?.bareSpec === targetInfo.bareSpec) {
    let rel = toPosix(path.relative(path.dirname(currentFile), targetAbs));
    if (!rel.startsWith('.')) rel = './' + rel;
    return { newSpec: stripExt(rel), deep: false };
  }

  if (isPackageIndex) {
    return { newSpec: targetInfo.bareSpec, deep: false };
  }

  return {
    newSpec: stripExt(path.posix.join(targetInfo.bareSpec, tail)),
    deep: true,
    owningPackageRoot: findOwningPackage(targetAbs),
  };
}

function specPart(item, statementIsType) {
  const typePrefix = !statementIsType && item.isType ? 'type ' : '';
  if (item.sourceName === item.localName) return `${typePrefix}${item.sourceName}`;
  return `${typePrefix}${item.sourceName} as ${item.localName}`;
}

function buildImportStatements(groups, allTypes) {
  const out = [];
  for (const [newSpec, items] of groups) {
    const useType = allTypes || items.every((it) => it.isType);
    const typeKw = useType ? 'type ' : '';
    if (items.length === 1 && items[0].sourceName === 'default') {
      out.push(`import ${typeKw}${items[0].localName} from '${newSpec}';`);
    } else {
      const parts = items.map((it) => specPart(it, useType));
      out.push(`import ${typeKw}{ ${parts.join(', ')} } from '${newSpec}';`);
    }
  }
  return out.join('\n');
}

function buildExportStatements(groups, allTypes) {
  const out = [];
  for (const [newSpec, items] of groups) {
    const useType = allTypes || items.every((it) => it.isType);
    const typeKw = useType ? 'type ' : '';
    const parts = items.map((it) => {
      const tp = !useType && it.isType ? 'type ' : '';
      return it.sourceName === it.exportedName
        ? `${tp}${it.sourceName}`
        : `${tp}${it.sourceName} as ${it.exportedName}`;
    });
    out.push(`export ${typeKw}{ ${parts.join(', ')} } from '${newSpec}';`);
  }
  return out.join('\n');
}

function pushGroup(groups, key, item) {
  const items = groups.get(key) ?? [];
  items.push(item);
  groups.set(key, items);
}

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'suggestion',
    fixable: 'code',
    schema: [],
    docs: {
      description:
        'Disallow imports from barrel index files within @ember and @glimmer source code; prefer direct imports from source files for tree-shaking.',
    },
    messages: {
      barrelImport:
        'Avoid importing from the "{{spec}}" barrel; import directly from the source file ({{names}}).',
      barrelImportUnresolved:
        'Avoid importing from the "{{spec}}" barrel; import directly from the source file. Could not auto-fix: {{names}}.',
      missingWildcardExports:
        'Avoid importing from the "{{spec}}" barrel. Cannot auto-fix because {{packages}} {{verb}} missing `"./*": "./*.ts"` in the `exports` field — add it to enable direct imports.',
    },
  },
  create(context) {
    const { filename } = context;
    if (!filename || !isInScope(filename) || isInTestFile(filename) || isExcludedFile(filename)) {
      return {};
    }

    function resolveSpecifier(moduleExports, importedName, barrelPath, originalSpec) {
      const entry = moduleExports.get(importedName);
      if (!entry) return { unresolved: true };
      if (entry.source === barrelPath) return { local: true };
      let newSpec;
      let owningPackageRoot = null;
      if (entry.source) {
        const computed = computeNewSpecifier(entry.source, filename);
        newSpec = computed?.newSpec;
        if (computed?.deep) owningPackageRoot = computed.owningPackageRoot;
      } else if (entry.bareSource && entry.bareSource !== originalSpec) {
        newSpec = entry.bareSource;
      }
      if (!newSpec) return { unresolved: true };
      return {
        newSpecifier: newSpec,
        localName: entry.localName,
        isType: entry.isType,
        namespace: entry.kind === 'namespace',
        owningPackageRoot,
      };
    }

    function reportUnresolved(node, spec, names) {
      context.report({
        node,
        messageId: 'barrelImportUnresolved',
        data: { spec, names: names.join(', ') || '(see above)' },
      });
    }

    function reportMissingExports(node, spec, packageRoots) {
      const paths = [...packageRoots]
        .map((root) => path.relative(WORKSPACE_ROOT, path.join(root, 'package.json')))
        .sort();
      context.report({
        node,
        messageId: 'missingWildcardExports',
        data: {
          spec,
          packages: paths.join(', '),
          verb: paths.length > 1 ? 'are' : 'is',
        },
      });
    }

    function collectMissingExports(items) {
      const missing = new Set();
      for (const item of items) {
        if (item.owningPackageRoot && !packageHasWildcardSourceExports(item.owningPackageRoot)) {
          missing.add(item.owningPackageRoot);
        }
      }
      return missing;
    }

    function check(node) {
      const spec = node.source?.value;
      if (typeof spec !== 'string') return;
      if (EXCLUDED_BARRELS.has(spec)) return;
      const barrelPath = resolveBarrelPath(spec);
      if (!barrelPath || filename === barrelPath) return;

      const moduleExports = getModuleExports(barrelPath);
      if (!moduleExports) {
        reportUnresolved(node, spec, ['(could not parse barrel)']);
        return;
      }

      if (node.type === 'ImportDeclaration')
        return handleImport(node, moduleExports, spec, barrelPath);
      if (node.type === 'ExportNamedDeclaration')
        return handleExportNamed(node, moduleExports, spec, barrelPath);
      if (node.type === 'ExportAllDeclaration') reportUnresolved(node, spec, ['*']);
    }

    function handleImport(node, moduleExports, spec, barrelPath) {
      const isWholeTypeImport = node.importKind === 'type';
      const groups = new Map();
      const namespaceImports = [];
      const kept = []; // specifiers that must stay with the original barrel spec
      const unresolved = [];
      let allLocal = node.specifiers.length > 0;

      for (const sp of node.specifiers) {
        if (sp.type === 'ImportNamespaceSpecifier') {
          unresolved.push('* as ' + sp.local.name);
          allLocal = false;
          continue;
        }
        const importedName =
          sp.type === 'ImportDefaultSpecifier'
            ? 'default'
            : sp.type === 'ImportSpecifier'
              ? idOrStr(sp.imported)
              : null;
        if (importedName === null) continue;

        const local = sp.local.name;
        const specIsType = isWholeTypeImport || sp.importKind === 'type';
        const r = resolveSpecifier(moduleExports, importedName, barrelPath, spec);

        if (r.local) {
          kept.push({ sourceName: importedName, localName: local, isType: specIsType });
          continue;
        }
        allLocal = false;
        if (r.unresolved) {
          unresolved.push(importedName);
          continue;
        }
        if (r.namespace) {
          namespaceImports.push({
            newSpec: r.newSpecifier,
            localName: local,
            isType: specIsType || r.isType,
            owningPackageRoot: r.owningPackageRoot,
          });
          continue;
        }
        pushGroup(groups, r.newSpecifier, {
          sourceName: r.localName,
          localName: local,
          isType: specIsType || r.isType,
          owningPackageRoot: r.owningPackageRoot,
        });
      }

      if (allLocal) return;
      if (unresolved.length > 0) {
        reportUnresolved(node, spec, unresolved);
        return;
      }
      if (groups.size === 0 && namespaceImports.length === 0) return;

      const allItems = [...namespaceImports, ...[...groups.values()].flat()];
      const missing = collectMissingExports(allItems);
      if (missing.size > 0) {
        reportMissingExports(node, spec, missing);
        return;
      }

      // Locally-defined symbols stay with the original barrel — they can't
      // be sourced from a sub-file because they don't live in one.
      for (const item of kept) pushGroup(groups, spec, item);

      const statements = namespaceImports.map((ns) => {
        const useType = isWholeTypeImport || ns.isType;
        return `import ${useType ? 'type ' : ''}* as ${ns.localName} from '${ns.newSpec}';`;
      });
      if (groups.size > 0) statements.push(buildImportStatements(groups, isWholeTypeImport));

      const allSpecs = [...namespaceImports.map((n) => n.newSpec), ...groups.keys()];
      context.report({
        node,
        messageId: 'barrelImport',
        data: { spec, names: allSpecs.join(', ') },
        fix: (fixer) => fixer.replaceText(node, statements.join('\n')),
      });
    }

    function handleExportNamed(node, moduleExports, spec, barrelPath) {
      const isWholeTypeExport = node.exportKind === 'type';
      const groups = new Map();
      const namespaceExports = [];
      const kept = [];
      const unresolved = [];
      let allLocal = node.specifiers.length > 0;

      for (const sp of node.specifiers) {
        if (sp.type !== 'ExportSpecifier') continue;
        const importedName = idOrStr(sp.local);
        const exportedName = idOrStr(sp.exported);
        const specIsType = isWholeTypeExport || sp.exportKind === 'type';
        const r = resolveSpecifier(moduleExports, importedName, barrelPath, spec);

        if (r.local) {
          kept.push({ sourceName: importedName, exportedName, isType: specIsType });
          continue;
        }
        allLocal = false;
        if (r.unresolved) {
          unresolved.push(importedName);
          continue;
        }
        if (r.namespace) {
          namespaceExports.push({
            newSpec: r.newSpecifier,
            exportedName,
            isType: specIsType || r.isType,
            owningPackageRoot: r.owningPackageRoot,
          });
          continue;
        }
        pushGroup(groups, r.newSpecifier, {
          sourceName: r.localName,
          exportedName,
          isType: specIsType || r.isType,
          owningPackageRoot: r.owningPackageRoot,
        });
      }

      if (allLocal) return;
      if (unresolved.length > 0) {
        reportUnresolved(node, spec, unresolved);
        return;
      }
      if (groups.size === 0 && namespaceExports.length === 0) return;

      const allItems = [...namespaceExports, ...[...groups.values()].flat()];
      const missing = collectMissingExports(allItems);
      if (missing.size > 0) {
        reportMissingExports(node, spec, missing);
        return;
      }

      for (const item of kept) pushGroup(groups, spec, item);

      const statements = namespaceExports.map((ns) => {
        const useType = isWholeTypeExport || ns.isType;
        return `export ${useType ? 'type ' : ''}* as ${ns.exportedName} from '${ns.newSpec}';`;
      });
      if (groups.size > 0) statements.push(buildExportStatements(groups, isWholeTypeExport));

      const allSpecs = [...namespaceExports.map((n) => n.newSpec), ...groups.keys()];
      context.report({
        node,
        messageId: 'barrelImport',
        data: { spec, names: allSpecs.join(', ') },
        fix: (fixer) => fixer.replaceText(node, statements.join('\n')),
      });
    }

    return {
      ImportDeclaration: check,
      ExportNamedDeclaration: (node) => node.source && check(node),
      ExportAllDeclaration: check,
    };
  },
};
