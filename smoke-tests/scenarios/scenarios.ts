import { Project, Scenarios } from 'scenario-tester';
import { dirname } from 'node:path';

function classic(project: Project) {
  // our monorepo uses pnpm overrides to force-upgrade ember-cli-htmlbars to 7,
  // so that we can actually test the case where the use-ember-modules flag is
  // enabled. This scenario ensures that when the flag is off, we still work
  // with ember-cli-htmlbars 6.
  project.linkDevDependency('ember-cli-htmlbars', { resolveName: 'ember-cli-htmlbars-6', baseDir: __dirname });
}

function classicUseModulesFeature(project: Project) {
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

function node(project: Project) {
  project.linkDevDependency('ember-source', {
    baseDir: dirname(require.resolve('../app-template/package.json')),
  });
}

export const v1AppScenarios = Scenarios.fromProject(() =>
  Project.fromDir(dirname(require.resolve('../app-template/package.json')), { linkDevDeps: true })
).expand({
  classic,
  classicUseModulesFeature,
  embroiderWebpack,
});

export const v2AppScenarios = Scenarios.fromProject(() =>
  Project.fromDir(dirname(require.resolve('../v2-app-template/package.json')), {
    linkDevDeps: true,
  })
).expand({
  embroiderVite,
});

export const nodeScenarios = Scenarios.fromProject(() =>
  Project.fromDir(dirname(require.resolve('../node-template/package.json')), {
    linkDevDeps: true,
  })
).expand({
  node,
});
