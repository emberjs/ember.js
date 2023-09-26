/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');

// eslint-disable-next-line no-unused-vars
function doit(dir, packagePrefix = undefined) {
  for (let name of fs.readdirSync(dir)) {
    if (name[0] === '@') {
      doit(path.resolve(dir, name), name);
    } else {
      if (!fs.existsSync(path.resolve(dir, name, 'package.json'))) {
        let fullName;
        if (packagePrefix) {
          fullName = `${packagePrefix}/${name}`;
        } else {
          fullName = name;
        }
        fs.writeFileSync(
          path.resolve(dir, name, 'package.json'),
          JSON.stringify(
            {
              name: fullName,
              private: true,
              type: 'module',
              exports: {
                '.': './index.ts',
              },
              dependencies: {},
            },
            null,
            2
          )
        );
      }
    }
  }
}

//doit('packages');
const glob = require('glob');
const babel = require('@babel/core');

let gathered = new Set();
function saw(src) {
  let pn = absolutePackageName(src);
  if (pn) {
    gathered.add(pn);
  }
}

function findDepsPlugin() {
  return {
    visitor: {
      ImportDeclaration(path) {
        saw(path.node.source.value);
      },
      ExportNamedDeclaration(path) {
        if (path.node.source) {
          saw(path.node.source.value);
        }
      },
      ExportAllDeclaration(path) {
        saw(path.node.source.value);
      },
    },
  };
}

function findDeps(pkgDir, rootDeps) {
  gathered = new Set();
  for (let name of glob.sync('**/*.{ts,js}', { cwd: pkgDir, nodir: true })) {
    babel.transform(fs.readFileSync(path.resolve(pkgDir, name), 'utf8'), {
      configFile: false,
      plugins: [
        ['@babel/plugin-transform-typescript', { allowDeclareFields: true }],
        ['@babel/plugin-proposal-decorators', { version: 'legacy' }],
        findDepsPlugin,
      ],
    });
  }
  let pkg = JSON.parse(fs.readFileSync(path.resolve(pkgDir, 'package.json'), 'utf8'));
  for (let name of Object.keys(pkg.dependencies ?? {})) {
    gathered.add(name);
  }
  gathered.delete(pkg.name);
  gathered.delete('require');
  pkg.dependencies = Object.fromEntries(
    [...gathered].sort().map((name) => [name, rootDeps.get(name) ?? 'workspace:*'])
  );
  fs.writeFileSync(path.resolve(pkgDir, 'package.json'), JSON.stringify(pkg, null, 2));
}

function absolutePackageName(specifier) {
  if (
    // relative paths:
    specifier[0] === '.' ||
    // webpack-specific microsyntax for internal requests:
    specifier[0] === '!' ||
    specifier[0] === '-' ||
    // absolute paths:
    path.isAbsolute(specifier)
  ) {
    // Does not refer to a package
    return;
  }
  let parts = specifier.split('/');
  if (specifier[0] === '@') {
    return `${parts[0]}/${parts[1]}`;
  } else {
    return parts[0];
  }
}

function rootDeps() {
  let pkg = JSON.parse(fs.readFileSync('package.json'));
  let deps = new Map();
  for (let [name, version] of Object.entries(pkg.dependencies)) {
    deps.set(name, version);
  }
  for (let [name, version] of Object.entries(pkg.devDependencies)) {
    deps.set(name, version);
  }
  return deps;
}

function findAllDeps() {
  let r = rootDeps();
  for (let pj of glob.sync('packages/**/package.json', { ignore: '**/node_modules/**' })) {
    console.log(pj);
    findDeps(path.dirname(pj), r);
  }
}

findAllDeps();
