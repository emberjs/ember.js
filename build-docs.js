/* eslint-disable no-console */

const path = require('path');
const klaw = require('klaw');
const { Extractor, ExtractorConfig } = require('@microsoft/api-extractor');
const { rollup } = require('rollup');
const typescript = require('@rollup/plugin-typescript');
const { default: dts } = require('rollup-plugin-dts');
const { existsSync } = require('fs');
const { writeFile, mkdir, cp, rm } = require('fs/promises');
const TypeDoc = require('typedoc');
const { exit } = require('process');

class Package {
  constructor(filePath) {
    this.absolutePath = filePath;

    const relativeSrcPath = path.relative(__dirname, filePath);
    this.srcPath = path.parse(relativeSrcPath);

    const relativeOutPath = path.relative(path.join(__dirname, 'packages'), filePath);
    this.outPath = path.parse(relativeOutPath);

    this.name =
      this.outPath.name === 'index' ? this.outPath.dir : `${this.outPath.dir}/${this.outPath.name}`;

    this.rollup = {
      dir: `tmp/rollup-types/${this.outPath.dir}`,
      name: this.outPath.name,
      ext: '.d.ts',
    };
  }

  get fileSafeName() {
    if (!this._fileSafeName) {
      this._fileSafeName = this.name.replace(/\//g, '.');
    }
    return this._fileSafeName;
  }

  get docsPackageName() {
    if (!this._docsPackageName) {
      if (this.name.startsWith('@')) {
        let parts = this.name.split('/');
        this._docsPackageName = `${parts[0]}/${parts.slice(1).join('-')}`;
      } else {
        this._docsPackageName = this.name.replace(/\//g, '.');
      }
    }
    return this._docsPackageName;
  }
}

async function build(path) {
  // HACKS
  // To build we can't just rely on .d.ts files, we need actual .ts.
  let createdFiles = [];
  for await (const item of klaw('packages/@ember/-internals/glimmer/lib/templates')) {
    if (item.stats.isFile()) {
      if (item.path.endsWith('.d.ts')) {
        let dest = item.path.replace('.d.ts', '.ts');
        await cp(item.path, dest);
        createdFiles.push(dest);
      }
    }
  }

  let bundle = await rollup({
    input: path,
    plugins: [
      typescript({
        tsconfig: './tsconfig.json',
        cacheDir: `.rollup.tscache`,
        compilerOptions: {
          declaration: true,
          declarationMap: true,
          sourceMap: true,
          incremental: true,
          outDir: 'tmp/build-types',
          declarationDir: 'tmp/build-types',
        },
      }),
    ],
  });

  await bundle.write({
    output: {
      dir: 'tmp/build-types',
      format: 'es',
      sourcemap: true,
    },
  });

  // CLEANUP HACKS
  for (let file of createdFiles) {
    await rm(file);
  }
}

async function rollupTypes(package) {
  console.log('TYPES', package.absolutePath);

  let parts = package.outPath.dir.split('/');
  let relativeTemp = Array(parts.length).fill('..').join('/');

  try {
    const bundle = await rollup({
      input: path.format({
        dir: `${__dirname}/tmp/build-types/${package.outPath.dir}`,
        name: package.outPath.name,
        ext: '.d.ts',
      }),
      plugins: [
        dts({
          compilerOptions: {
            baseUrl: `tmp/build-types/${package.outPath.dir}`,
            incremental: true,
            paths: {
              [`${package.outPath.dir}/*`]: ['*'],
              '@ember/-internals/*': [`${relativeTemp}/@ember/-internals/*`],
            },
          },
        }),
      ],
    });

    return bundle.write({
      output: {
        file: path.format(package.rollup),
        format: 'es',
      },
    });
  } catch (e) {
    console.error('ROLLUP ERROR', e);
    exit(1);
  }
}

function extract(package) {
  console.log('EXTRACT', package.absolutePath);
  try {
    const config = ExtractorConfig.prepare({
      configObject: {
        mainEntryPointFilePath: `<projectFolder>/${path.format(package.rollup)}`,
        dtsRollup: {
          enabled: true,
          untrimmedFilePath: `<projectFolder>/tmp/trimmed-types/${package.fileSafeName}.untrimmed.d.ts`,
          betaTrimmedFilePath: `<projectFolder>/tmp/trimmed-types/${package.fileSafeName}.beta.d.ts`,
          publicTrimmedFilePath: `<projectFolder>/tmp/trimmed-types/${package.fileSafeName}.release.d.ts`,
        },
        compiler: {
          tsconfigFilePath: '<projectFolder>/tsconfig.json',
          overrideTsconfig: {
            include: [`tmp/rollup-types/**/*.ts`],
          },
        },
        projectFolder: __dirname,
      },
    });

    config.packageFolder = __dirname;
    config.packageJson = {
      name: package.docsPackageName,
    };

    Extractor.invoke(config, {
      localBuild: true,
      // showVerboseMessages: true,
    });
  } catch (e) {
    console.log('EXTRACT ERROR', e);
    exit(1);
  }
}

async function run() {
  const packages = [
    '@ember/application',
    '@ember/application/instance',
    '@ember/application/namespace',
    '@ember/array',
    '@ember/array/mutable',
    '@ember/array/proxy',
    '@ember/canary-features',
    '@ember/component',
    '@ember/component/helper',
    '@ember/component/template-only',
    '@ember/controller',
    '@ember/debug',
    '@ember/destroyable',
    '@ember/engine',
    '@ember/engine/instance',
    '@ember/error',
    '@ember/helper',
    '@ember/object',
    '@ember/object/compat',
    '@ember/object/computed',
    '@ember/object/core',
    '@ember/object/evented',
    '@ember/object/events',
    '@ember/object/mixin',
    '@ember/object/observable',
    '@ember/object/observers',
    '@ember/polyfills',
    '@ember/routing',
    '@ember/routing/auto-location',
    '@ember/routing/hash-location',
    '@ember/routing/history-location',
    '@ember/routing/location',
    '@ember/routing/none-location',
    '@ember/routing/route',
    '@ember/routing/router',
    '@ember/routing/router-service',
    '@ember/runloop',
    '@ember/service',
    '@ember/template',
    '@ember/utils',
    '@ember/version',
    // 'ember',
  ].map((p) => {
    let path = ['.ts', '.js', '/index.ts', '/index.js']
      .map((ext) => `${__dirname}/packages/${p}${ext}`)
      .find(existsSync);
    return new Package(path);
  });

  await mkdir('tmp/build-types', { recursive: true });
  await writeFile(
    'tmp/build-types/index.ts',
    packages.map((p, idx) => `import _PKG${idx} from '${p.name}';`).join('\n')
  );

  await build('tmp/build-types/index.ts');

  // Copy over all pre-existing .d.ts paths
  for await (const item of klaw(path.join(__dirname, 'packages'))) {
    if (item.stats.isFile()) {
      if (
        item.path.endsWith('.d.ts') &&
        !item.path.includes('/tests/') &&
        !item.path.includes('/type-tests/')
      ) {
        let dest = `tmp/build-types/${path.relative(`${__dirname}/packages`, item.path)}`;
        await cp(item.path, dest);
      }
    }
  }

  for (let pkg of packages) {
    await rollupTypes(pkg);
  }

  // Ideally we'd parallelize this. My first go didn't work.
  for (let pkg of packages) {
    await extract(pkg);
  }

  for (let pkg of packages) {
    for (let r of ['beta', 'release', 'untrimmed']) {
      await mkdir(`types/${r}/${pkg.outPath.dir}`, { recursive: true });
      await cp(
        `tmp/trimmed-types/${pkg.fileSafeName}.${r}.d.ts`,
        `types/${r}/${pkg.outPath.dir}/${pkg.outPath.name}.d.ts`
      );
    }
  }

  for (let r of ['beta', 'release', 'untrimmed']) {
    writeFile(
      `types/${r}/tsconfig.json`,
      JSON.stringify({
        compilerOptions: {
          baseUrl: '.',
          paths: {
            '*': ['*'],
            backburner: ['../../node_modules/backburner.js/dist/backburner.d.ts'],
          },
        },
        include: ['**/*.ts'],
      })
    );
  }

  let packageGroups = {};

  for (let pkg of packages) {
    packageGroups[pkg.outPath.dir] ??= [];
    packageGroups[pkg.outPath.dir].push(pkg.absolutePath);
  }

  for (let [group, entryPoints] of Object.entries(packageGroups)) {
    const app = new TypeDoc.Application();

    app.options.addReader(new TypeDoc.TSConfigReader());
    // app.options.addReader(new TypeDoc.TypeDocReader());

    app.bootstrap({
      // tsconfig: 'tsconfig.typedoc.json',
      name: group,
      readme: 'none',
      entryPoints: entryPoints.map((ep) => path.relative(__dirname, ep.replace(/\.js$/, '.d.ts'))),
      excludeInternal: true,
    });

    const project = app.convert();

    if (project) {
      // Project may not have converted correctly
      const outputDir = `docs/${group}`;

      // Rendered docs
      await app.generateDocs(project, outputDir);
      // Alternatively generate JSON output
      await app.generateJson(project, outputDir + '/documentation.json');
    }
  }

  let docsIndex = `
    <html>
    <body>
      <ul>
        ${Object.keys(packageGroups)
          .map((group) => `<li><a href="${group}/index.html">${group}</a></li>`)
          .join('\n')}
      </ul>
    </body>
    </html>
  `;

  writeFile('docs/index.html', docsIndex);
}

run();
