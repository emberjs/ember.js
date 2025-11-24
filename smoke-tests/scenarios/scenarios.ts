import { Project, Scenarios } from 'scenario-tester';
import { dirname } from 'node:path';

function classic(project: Project) {}

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
