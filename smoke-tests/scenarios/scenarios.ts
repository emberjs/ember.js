import { Project, Scenarios } from 'scenario-tester';
import { dirname, resolve } from 'node:path';

function classic(project: Project) {
  project.mergeFiles({
    config: {
      'optional-features.json': JSON.stringify({
        "default-async-observers": true,
        "jquery-integration": false,
        "use-ember-modules": true,
      })
    }
  });
}

function embroiderWebpack(project: Project) {
  project.linkDevDependency('@embroider/core', { baseDir: __dirname });
  project.linkDevDependency('@embroider/compat', { baseDir: __dirname });
  project.linkDevDependency('@embroider/webpack', { baseDir: __dirname });
}

function embroiderVite(project: Project) {}

// Swap the v2-app-template's default app.js for a strict-resolver variant:
// no ember-resolver, no compatModules, no modulePrefix — just a `modules =
// {...import.meta.glob(...)}` literal. Making this a variant of
// v2AppScenarios means every test that runs against v2AppScenarios also
// runs against this configuration.
function strictResolver(project: Project) {
  project.removeDependency('ember-resolver');
  project.mergeFiles({
    app: {
      'app.js': `
        import Application from '@ember/application';
        import Router from './router';
        import compatModules from '@embroider/virtual/compat-modules';
        import config from './config/environment';

        /**
         * See: https://github.com/embroider-build/embroider/issues/2708
         *
         * @embroider/virtual/compat-modules emits keys like
         * \`<modulePrefix>/<rest>\`. The strict resolver expects \`./<rest>\`.
         */
        function fixModulePrefix(modules) {
          let fixed = {};
          let prefix = config.modulePrefix + '/';

          for (let [key, module] of Object.entries(modules)) {
            let newName = key.startsWith(prefix) ? './' + key.slice(prefix.length) : key;
            fixed[newName] = module;
          }

          return fixed;
        }

        export default class App extends Application {
          modules = fixModulePrefix(compatModules);
        }
      `,
    },
  });
}

export const v1AppScenarios = Scenarios.fromProject(() =>
  Project.fromDir(dirname(require.resolve('../app-template/package.json')), { linkDevDeps: true })
).expand({
  classic,
  embroiderWebpack,
});

export const v2AppScenarios = Scenarios.fromProject(() =>
  Project.fromDir(dirname(require.resolve('../v2-app-template/package.json')), {
    linkDevDeps: true,
  })
).expand({
  embroiderVite,
  strictResolver,
});

export const strictAppScenarios = Scenarios.fromProject(() =>
  Project.fromDir(dirname(require.resolve('../v2-app-template/package.json')), {
    linkDevDeps: true,
  })
).expand({
  strictResolver,
});

// Swap `ember-source` for the assembled consumable GXT package
// (`dist-gxt-package/`, produced by scripts/build-gxt-package.mjs) in place, so
// the v2 app consumes the GXT-backend build with zero app-code change. This is
// the acceptance vehicle for the `ember-source-gxt` packaging MVP (RFC §5.5,
// design doc §5). Requires `node scripts/build-gxt-package.mjs` to have run.
function emberSourceGxt(project: Project) {
  project.linkDevDependency('ember-source', {
    target: resolve(__dirname, '../../dist-gxt-package'),
  });
}

export const gxtAppScenarios = Scenarios.fromProject(() =>
  Project.fromDir(dirname(require.resolve('../v2-app-template/package.json')), {
    linkDevDeps: true,
  })
).expand({
  emberSourceGxt,
});

function node(project: Project) {
  project.linkDevDependency('ember-source', {
    baseDir: dirname(require.resolve('../app-template/package.json')),
  });
}

export const nodeScenarios = Scenarios.fromProject(() =>
  Project.fromDir(dirname(require.resolve('../node-template/package.json')), {
    linkDevDeps: true,
  })
).expand({
  node,
});
