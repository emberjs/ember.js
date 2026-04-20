import { Project, Scenarios } from 'scenario-tester';
import { dirname } from 'node:path';

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
  project.mergeFiles({
    app: {
      'app.js': `
        import Application from '@ember/application';
        import Router from './router';

        export default class App extends Application {
          modules = {
            './router': { default: Router },
            ...import.meta.glob('./services/**/*.{js,ts}', { eager: true }),
            ...import.meta.glob('./controllers/**/*.{js,ts}', { eager: true }),
            ...import.meta.glob('./routes/**/*.{js,ts}', { eager: true }),
            ...import.meta.glob('./components/**/*.{gjs,gts,js,ts}', { eager: true }),
            ...import.meta.glob('./helpers/**/*.{js,ts}', { eager: true }),
            ...import.meta.glob('./templates/**/*.{hbs,gjs,gts}', { eager: true }),
          };
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
});

export const strictAppScenarios = Scenarios.fromProject(() =>
  Project.fromDir(dirname(require.resolve('../v2-app-template/package.json')), {
    linkDevDeps: true,
  })
).expand({
  strictResolver,
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
