'use strict';

const funnel = require('broccoli-funnel');
const babel = require('broccoli-babel-transpiler');
const merge = require('broccoli-merge-trees');
const Rollup = require('broccoli-rollup');
const sourcemaps = require('rollup-plugin-sourcemaps');
const UnwatchedDir = require('broccoli-source').UnwatchedDir;
const transpileToES5 = require('./transpile-to-es5');
const writePackageJSON = require('./write-package-json');
const writeLicense = require('./write-license');
const debugMacros = require('babel-plugin-debug-macros').default;

const Project = require('../utils/project');
const project = Project.from('packages');

module.exports = function buildPackages(es2017, matrix) {
  // Filter out test files from the package builds.
  es2017 = funnel(es2017, {
    exclude: ['**/test/**']
  });

  // Create an ES5 version of the higher-fidelity ES2017 code.
  let es5 = transpileToES5(es2017);
  let targets = { es5, es2017 };

  let packages = project.packages
    .map(buildPackage);

  packages = flatten(packages);
  packages = merge(flatten(packages));

  return packages;

  function buildPackage(pkg) {
    let pkgName = pkg.name;
    let builds;

    // The TypeScript compiler doesn't re-emit `.d.ts` files, which is all that
    // @glimmer/interfaces exports. We need to special case this package and
    // copy over the definition files from source.
    if (pkgName === '@glimmer/interfaces') {
      builds = [copyVerbatim('@glimmer/interfaces')];
    } else {
      builds = buildMatrix(pkgName, matrix);
    }

    return [
      writePackageJSON(pkgName),
      writeLicense(`${pkgName}/LICENSE`),
      ...builds
    ];
  }

  function buildMatrix(pkgName) {
    return matrix.map(([modules, target]) => {
      let source = targets[target];
      switch (modules) {
        case 'amd':
          return transpileAMD(pkgName, target, source);
        case 'commonjs':
          return transpileCommonJS(pkgName, target, source);
        case 'modules':
          return copyESModules(pkgName, target, source);
        case 'types':
          return copyTypes(pkgName, targets.es2017);
        default:
          throw new Error(`Unsupported module target '${target}'.`);
      }
    });
  }
}

function copyVerbatim(pkgName) {
  return funnel(new UnwatchedDir(`packages/${pkgName}`), {
    destDir: `${pkgName}/dist/types/`
  });
}

function flatten(arr) {
  return arr.reduce((out, cur) => out.concat(cur), []);
}

function copyESModules(pkgName, target, source) {
  return funnel(source, {
    srcDir: pkgName,
    destDir: `${pkgName}/dist/modules/${target}/`,
    exclude: ['**/*.d.ts']
  });
}

function copyTypes(pkg, source) {
  return funnel(source, {
    srcDir: pkg,
    include: ['**/*.d.ts'],
    destDir: `${pkg}/dist/types`
  });
}

function transpileAMD(pkgName, esVersion, tree) {
  let bundleName = pkgName.replace('/', '-').replace('@', '');
  let pkgTree = funnel(tree, {
    include: [`${pkgName}/**/*`],
    exclude: ['**/*.d.ts']
  });

  // Provide Rollup a list of package names it should not try to include in the
  // bundle.
  let external = ['@glimmer/local-debug-flags', ...project.dependencies];

  let plugins = [sourcemaps()];

  let options = {
    annotation: `Transpile AMD - ${pkgName} - ${esVersion}`,
    rollup: {
      entry: `${pkgName}/index.js`,
      external,
      plugins,
      onwarn(warning) {
        let {code} = warning;
        if (
          // Suppress known error message caused by TypeScript compiled code with Rollup
          // https://github.com/rollup/rollup/wiki/Troubleshooting#this-is-undefined
          code === 'THIS_IS_UNDEFINED' ||
          // Suppress errors regarding un-used exports. These may be left behind
          // after DEBUG stripping and Rollup removed them anyway.
          code === 'UNUSED_EXTERNAL_IMPORT'
        ) {
          return;
        }
        console.log(`Rollup warning: ${warning.message}`);
      },
      targets: [{
        dest: `${pkgName}/dist/amd/${esVersion}/${bundleName}.js`,
        format: 'amd',
        exports: 'named',
        moduleId: pkgName,
        sourceMap: 'inline'
      }]
    }
  };

  return new Rollup(pkgTree, options);
}

function transpileCommonJS(pkgName, esVersion, tree) {
  let pkgTree = funnel(tree, {
    include: [`${pkgName}/**/*`],
    exclude: ['**/*.d.ts']
  });

  let options = {
    annotation: `Transpile CommonJS - ${pkgName} - ${esVersion}`,
    plugins: [
      [debugMacros, {
        envFlags: {
          source: '@glimmer/local-debug-flags',
          flags: {
            DEBUG: false
          }
        },
        debugTools: {
          source: '@glimmer/debug'
        },
        externalizeHelpers: {
          module: true
        }
      }],
      'transform-es2015-modules-commonjs'
    ],
    sourceMaps: 'inline'
  };

  let commonjsTree = babel(pkgTree, options);

  return funnel(commonjsTree, {
    srcDir: pkgName,
    destDir: `${pkgName}/dist/commonjs/${esVersion}`
  });
}
