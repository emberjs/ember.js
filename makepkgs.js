const fs = require('fs');
const path = require('path');

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

function findDeps(pkgDir) {
  gathered = new Set();
  for (let name of glob.sync('**/*.ts', { cwd: pkgDir })) {
    babel.transform(fs.readFileSync(path.resolve(pkgDir, name), 'utf8'), {
      plugins: [
        ['@babel/plugin-transform-typescript', { allowDeclareFields: true }],
        ['@babel/plugin-syntax-decorators', { version: 'legacy' }],
        findDepsPlugin,
      ],
    });
  }
  console.log([...gathered].join('\n'));
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

findDeps('packages/@ember/-internals');
