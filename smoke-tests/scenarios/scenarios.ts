import { Project, Scenarios } from 'scenario-tester';
import { dirname } from 'node:path';

function classic(project: Project) {}

function embroider(project: Project) {
  project.linkDevDependency('@embroider/core', { baseDir: __dirname });
  project.linkDevDependency('@embroider/compat', { baseDir: __dirname });
  project.linkDevDependency('@embroider/webpack', { baseDir: __dirname });
}

export const appScenarios = Scenarios.fromProject(() =>
  Project.fromDir(dirname(require.resolve('../app-template/package.json')), { linkDevDeps: true })
).expand({
  classic,
  embroider
})
