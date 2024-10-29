#!/usr/bin/env node
// @ts-check

/**
  This script is used to publish Ember's type definitions. The basic workflow
  is:

  1. Run `tsc` against the Ember packages which make up its public API, with the
     output being `/types/stable`.

  2. Wrap each emitted module in a `declare module` statement. This requires
     replacing all relative imports with absolute imports and removing all
     `declare` statements from the body of the module.

     While doing so, keep track of the full list of emitted modules for the sake
     of step (3).

  3. Check that each module emitted is included in `types/stable/index.d.ts`, if
     and only if it also appears in a list of stable types modules defined in
     this script, so that they all "show up" to end users. That list will
     eventually be the list of *all* modules, but this allows us to publish
     iteratively as we gain confidence in the stability of the types.

  This is *not* an optimal long-term publishing strategy. (To the contrary: it
  is an underspecified and _ad hoc_ implementation of a module resolver, and is
  likely to fall over if you so much as breathe on it.) We would prefer to
  generate per-package roll-ups, using a Rollup plugin or some such, but we are
  currently blocked on a number of internal circular dependencies as well as the
  difficulty of avoiding multiple definitions of the same types reused across
  many rollups.

  @packageDocumentation
 */

import glob from 'glob';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import * as parser from 'recast/parsers/babel-ts.js';
import {
  isClassDeclaration,
  isStringLiteral,
  isVariableDeclaration,
  isTSEnumDeclaration,
} from '@babel/types';
import { builders as b, visit } from 'ast-types';
import { parse, print } from 'recast';

const MODULES_PLACEHOLDER = '~~~MODULES GO HERE~~~';

const BASE_INDEX_D_TS = `\
/**
  *Provides **stable** type definitions for Ember.js.*

  This module is generated automatically as part of Ember's publishing process and
  should never be edited manually.

  To use these type definitions, add this import to any TypeScript file in your
  Ember app or addon:

  \`\`\`ts
  import 'ember-source/types';
  import 'ember-source/types/preview';
  \`\`\`

  @module
 */

// This works because each of these modules presents \`declare module\` definition
// of the module and *only* that, so importing this file in turn makes those
// module declarations "visible" automatically throughout a consuming project.
// Combined with use of \`typesVersions\` (or, in the future, possibly \`exports\`)
// in \`package.json\`, this allows users to import the types without knowing the
// exact layout details.
//
// Somewhat annoyingly, every single module in the graph must appear here. For
// now, while we are publishing ambient types, that means we must maintain this
// by hand. When we start emitting types from the source, we will need to do the
// same work, but automatically.

// STATUS NOTE: this does not yet include Ember's full public API, only the
// subset of it for which we have determined the types are ready to stabilize.
//
// Over time, it will come to include *all* of Ember's types, and the matching
// \`preview\` types will become empty. This is means that someone who writes the
// import we recommend--
//
// \`\`\`ts
// import 'ember-source/types';
// import 'ember-source/types/preview';
// \`\`\`
//
// --will always get the most up-to-date mix of preview and stable types, with
// no extra effort required.

${MODULES_PLACEHOLDER}
`;

const TYPES_DIR = path.join('types', 'stable');

async function main() {
  await fs.rm(TYPES_DIR, { recursive: true, force: true });
  await fs.mkdir(TYPES_DIR, { recursive: true });

  doOrDie(() => spawnSync('pnpm', ['tsc', '--project', 'tsconfig/publish-types.json']));

  // We're deprecating the barrel file, so this is temporary. The Ember global is a namespace,
  // and namespaces can't be both exported and used as a type with the same semantics and
  // capabilities as when defined in the original file -- so we're going to LIE and
  // pretend that the barrel file is the index file (which is the same behavior as
  // prior to the deprecation)
  await fs.cp(path.join(TYPES_DIR, 'ember/barrel.d.ts'), path.join(TYPES_DIR, 'ember/index.d.ts'));

  let remappedLocationExcludes = await doOrDie(copyHandwrittenDefinitions);
  let sideEffectExcludes = await doOrDie(copyRemappedLocationModules);

  // The majority of those items should be excluded entirely, but in some cases
  // we still need to post-process them.
  let excludes = remappedLocationExcludes.concat(sideEffectExcludes);

  // This is rooted in the `TYPES_DIR` so that the result is just the names of
  // the modules, as generated directly from the tsconfig above. These must
  // *all* appear in the final set of `/// <reference ...>`s we emit.
  let allModules = glob.sync('**/*.d.ts', {
    ignore: 'index.d.ts', // ignore the root file itself if it somehow exists
    cwd: TYPES_DIR,
  });

  let missing = excludes.filter((excluded) => !allModules.includes(excluded));
  if (missing.length) console.error('Did not capture modules:', ...missing);

  // However, we only want to process (i.e. rewrite) a subset of the modules.
  let modulesToProcess = allModules.filter((moduleName) => !excludes.includes(moduleName));
  let status = await doOrDie(async () => {
    let values = await Promise.all(modulesToProcess.map(processModule));
    return values.some((value) => value === 'failure') ? 'failure' : 'success';
  });

  let moduleReferences = allModules
    .map((moduleName) => `/// <reference path="./${moduleName}" />`)
    .join('\n');

  let stableIndexDTsContents = BASE_INDEX_D_TS.replace(MODULES_PLACEHOLDER, moduleReferences);
  await fs.writeFile(path.join(TYPES_DIR, 'index.d.ts'), stableIndexDTsContents);

  // Make the generated types easier to read!
  spawnSync('prettier', ['--write', 'types/stable/**/*.ts']);

  // @glimmer/component publishes as a separate package. We need to build its
  // types after building the ember-source types.
  doOrDie(() => {
    let result = spawnSync('pnpm', ['tsc'], { cwd: 'packages/@glimmer/component' });
    if (result.status !== 0) {
      console.log(`@glimmer/component types build failed:`);
      console.error(result.output.toString());
      process.exit(1);
    }
  });

  process.exit(status === 'success' ? 0 : 1);
}

const REMAPPED_LOCATION_MODULES = [
  {
    input: 'packages/loader/lib/index.d.ts',
    output: 'require.d.ts',
  },
];

/**
  "Emit" hand-authored `.d.ts` modules for modules which need to live in a
  different location in the output than in the input tree, e.g. for the loader,
  which creates runtime modules at a different location than its source location
  naturally corresponds to. These represent modules which need to be copied over
  and then *left exactly as they are*.

  @returns {Promise<string[]>} an array of module names to exclude from the rest of the
    post-processing steps
 */
function copyRemappedLocationModules() {
  return doOrDie(() => {
    return Promise.all(
      REMAPPED_LOCATION_MODULES.map(async ({ input, output }) => {
        await fs.cp(input, path.join(TYPES_DIR, output), { recursive: true });
        return output;
      })
    );
  });
}

/**
  "Emit" hand-authored `.d.ts` file representing runtime JS modules which are
  generated by the build system, like the `.d.ts` files for templates. Since
  `tsc` ignores loose `.d.ts` files in the source of a project, these must
  simply be copied over manually.

  Exclude from this list any items we also copy via `copySideEffectModules`() so
  we do not end up with duplicates (while that *should* still work given our
  current design for publishing, it is a "happens to" rather than "is naturally
  correct", so we want to avoid that).

  @returns {Promise<Array<string>>} The modules copied over by hand.
*/
async function copyHandwrittenDefinitions() {
  let inputDir = 'packages';
  let definitionModules = glob
    .sync('**/*.d.ts', {
      cwd: inputDir,
      ignore: ['**/node_modules/**'],
    })
    .filter((moduleName) => !REMAPPED_LOCATION_MODULES.some(({ input }) => input === moduleName));

  await doOrDie(() =>
    Promise.all(
      definitionModules.map((moduleName) => {
        let input = path.join(inputDir, moduleName);
        let output = path.join(TYPES_DIR, moduleName);
        return fs.cp(input, output, { recursive: true });
      })
    )
  );

  return definitionModules;
}

/**
  Load the module, rewrite it, and write it back to disk.

  @param {string} moduleName
  @return {Promise<'success' | 'failure'>}
 */
async function processModule(moduleName) {
  let modulePath = path.join(TYPES_DIR, moduleName);

  /** @type {string} */
  let contents;
  try {
    contents = await fs.readFile(modulePath, { encoding: 'utf-8' });
  } catch (e) {
    console.error(`Error reading ${modulePath}: ${e}`);
    return 'failure';
  }

  let moduleNameForDeclaration = moduleName.replace('/index.d.ts', '');

  let rewrittenModule;
  try {
    rewrittenModule = rewriteModule(contents, moduleNameForDeclaration);
  } catch (e) {
    console.error(`Error rewriting ${moduleName}`, e);
    return 'failure';
  }

  try {
    await fs.writeFile(modulePath, rewrittenModule);
  } catch (e) {
    console.error(`Error writing ${modulePath}: ${e}`);
    return 'failure';
  }

  return 'success';
}

/**
  Rewrite a given module declaration:

  - Tranform the main body of the module into a new top-level `declare module`
    statement.
      - Remove all `declare` modifiers from items in the module itself.
      - Update all `import` specifiers to be absolute in terms of the package
        name, which means handling both `./` and `../` correctly.
  - Preserve existing `declare module` statements, so that anything using e.g.
    declaration merging continues to work correctly.

  @param {string} code The initial code to rewrite.
  @param {string} moduleName The name of the module to use.
  @returns {string}
 */
export function rewriteModule(code, moduleName) {
  let ast = parse(code, { parser });

  /** @type {Array<import("ast-types/gen/namedTypes").namedTypes.TSModuleDeclaration>} */
  let otherModuleDeclarations = [];

  visit(ast, {
    // We need to preserve existing `declare module { ... }` blocks so that
    // things which rely on declaration merging can work, but they need to be
    // emitted *outside* the `declare module` we are introducing.
    visitTSModuleDeclaration(path) {
      // ...but we need to *avoid* doing this for namespace declarations! So we
      // *only* do it for cases where we are sure, since `declare module` will
      // always have a string literal, while `declare namespace` will have an
      // actual identifier instead.
      if (path.node.id.type == 'StringLiteral') {
        otherModuleDeclarations.push(path.node);
        path.prune(path.node);
      } else {
        // Where we have a `declare namespace` type, we need to emit it without
        // the `declare`, as with other items.
        path.node.declare = false;
      }
      this.traverse(path);
    },

    // Remove `declare` from `declare (let|const|var)` in the top-level module.
    visitVariableDeclaration(path) {
      if (isVariableDeclaration(path.node) && !hasParentModuleDeclarationBlock(path)) {
        path.node.declare = false;
      }
      this.traverse(path);
    },

    // Remove `declare` from `declare class` in the top-level module.
    visitClassDeclaration(path) {
      if (isClassDeclaration(path.node) && !hasParentModuleDeclarationBlock(path)) {
        path.node.declare = false;
      }
      this.traverse(path);
    },

    // Remove `declare` from `declare function` in the top-level module.
    visitTSDeclareFunction(path) {
      if (!hasParentModuleDeclarationBlock(path)) {
        path.node.declare = false;
      }
      this.traverse(path);
    },

    visitTSInterfaceDeclaration(path) {
      if (!hasParentModuleDeclarationBlock(path)) {
        path.node.declare = false;
      }
      this.traverse(path);
    },

    // Remove `declare` from `declare enum` in the top-level module.
    visitTSEnumDeclaration(path) {
      if (isTSEnumDeclaration(path.node) && !hasParentModuleDeclarationBlock(path)) {
        path.node.declare = false;
      }
      this.traverse(path);
    },

    // For any relative imports like `import { something } from './somewhere';`,
    // rewrite as `import { something } from '@ember/some-package/somewhere';`
    // since relative imports are not allowed in `declare module { }` blocks.
    visitImportDeclaration(path) {
      let source = path.node.source;
      if (isStringLiteral(source)) {
        source.value = normalizeSpecifier(moduleName, source.value);

        // This makes it so that the types we publish point to the types defined
        // by `backburner.js`, basically doing the type-time equivalent of the
        // no good, very bad runtime shenanigans Ember does... *somewhere*... in
        // the build to make `import Backburner from 'backburner.js'` work.
        if (source.value === 'backburner') {
          source.value = 'backburner.js';
        }
      }
      this.traverse(path);
    },

    // Do the same for `export ... from './relative-path'`.
    visitExportNamedDeclaration(path) {
      let specifier = path.node.source;
      if (isStringLiteral(specifier)) {
        specifier.value = normalizeSpecifier(moduleName, specifier.value);
      }
      this.traverse(path);
    },

    visitExportAllDeclaration(path) {
      let specifier = path.node.source;
      if (isStringLiteral(specifier)) {
        specifier.value = normalizeSpecifier(moduleName, specifier.value);
      }
      this.traverse(path);
    },

    // We need to rewrite annotations like `export const: import('./foo').foo`
    // to use relative paths, as well.
    visitTSImportType(path) {
      let specifier = path.node.argument.value;
      path.node.argument.value = normalizeSpecifier(moduleName, specifier);
      this.traverse(path);
    },
  });

  let newAST = b.file(
    b.program([
      b.declareModule(
        b.identifier(`'${moduleName.replace('.d.ts', '')}'`),
        b.blockStatement(ast.program.body)
      ),
      ...otherModuleDeclarations,
    ])
  );

  return print(newAST).code;
}

/**
  Is this declaration in a `declare module { }` block?

  @param {import('ast-types/lib/node-path').NodePath} path
  @return boolean
 */
function hasParentModuleDeclarationBlock(path) {
  /** @type {import('ast-types/lib/node-path').NodePath} */
  let parentPath = path;
  while ((parentPath = parentPath.parent)) {
    if (parentPath.node.type === 'ModuleDeclaration') {
      return true;
    }
  }

  return false;
}

const TERMINAL_MODULE_RE = /\/[\w-_]+\.d\.ts$/;
const NEIGHBOR_PATH_RE = /^(\.)\//;
const SHOULD_BE_ABSOLUTE = /(\.\.\/)+(@.*)/;

/**
  Given a relative path, `'.'`, `./`, or `(../)+`, rewrite it as an absolute path.

  @param {string} moduleName The name of the host module we are declaring.
  @param {string} specifier The name of the module it is importing.
  @return {string}
 */
function normalizeSpecifier(moduleName, specifier) {
  // One particularly degenerate case is `import()` type annotations which TS
  // generates as relative paths, e.g. `'../../@ember/object'`, since we cannot
  // yet use project references and therefore also cannot use dependencies
  // properly and therefore also cannot get TS to understand that it should be
  // writing that as an absolute specifier.
  let nonsensicalRelativePath = specifier.match(SHOULD_BE_ABSOLUTE);
  // First match is the whole string, second match is the (last) leading `../`,
  // third match is the package we care about.
  if (nonsensicalRelativePath && nonsensicalRelativePath[2]) {
    return nonsensicalRelativePath[2];
  }

  // The other cases are more normal: we replace
  if (specifier === '.') {
    return moduleName.replace(TERMINAL_MODULE_RE, '');
  } else if (specifier.startsWith('./')) {
    let parentModuleName = moduleName.replace(TERMINAL_MODULE_RE, '');
    let sansLeadingDot = specifier.replace(NEIGHBOR_PATH_RE, '');
    let newImportName = `${parentModuleName}/${sansLeadingDot}`;
    return newImportName;
  } else if (specifier.startsWith('../')) {
    // Reverse it so we can just `pop` from `parentPathChunks` as we go: walking
    // backward through the specifier means as soon as we hit the `..` we can
    // start using the chunks from the end of the hosting module.
    let reversedSpecifierChunks = specifier.split('/').reverse();
    let parentPathChunks = moduleName.split('/');

    // To make that logic work, though, we need to drop the last item from the
    // chunks comprising host module, because we need to *not* treat the current
    // module itself as a parent. If we're not in a "root" module, we need to
    // do it an extra time to get rid of the terminal `foo.d.ts` as well.
    parentPathChunks.pop();

    // Walk back from the end of the specifier, replacing `..` with chunks from
    // the parent paths.
    /** @type {string[]} */
    let merged = [];
    for (let chunk of reversedSpecifierChunks) {
      if (chunk === '..') {
        let parent = parentPathChunks.pop();
        if (!parent) {
          throw new Error(
            `Could not generate a valid path for relative path specifier ${specifier} in ${moduleName}`
          );
        }

        // If we get to `@ember`, we know we're at the root and we *need* to
        // retain it. Otherwise, we're not there yet and should keep moving up.
        if (parent === '@ember') {
          merged.push(parent);
        }
      } else {
        merged.push(chunk);
      }
    }

    // Reverse them again so we have the correct ordering.
    merged.reverse();
    // Then incorporate the rest of the parent path chunks.
    merged.unshift(...parentPathChunks);

    return merged.join('/');
  } else {
    return specifier;
  }
}

/**
 * @template T
 * @param {() => T} fn
 * @returns {T}
 */
function doOrDie(fn) {
  try {
    return fn();
  } catch (e) {
    console.log(e);
    process.exit(1);
  }
}

// --- Actually execute the program! --- //
main();
