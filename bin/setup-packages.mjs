import { project, packageJson } from 'ember-apply';

let workspaces = await project.getWorkspaces();

for (let workspace of workspaces) {
  if (!workspace.includes('packages/@glimmer')) continue;

  packageJson.modify((json) => {
    if (json.private) return;
    if (!json.name) return;

    json.type = 'module';

    json.devDependencies ||= {};
    json.devDependencies.publint = '^0.2.5';

    json.scripts ||= {};
    json.scripts['test:publint'] = 'publint';

    json.publishConfig ||= {};
    json.publishConfig.exports ||= {};
    json.publishConfig.exports['.'] ||= {};
    json.publishConfig.exports['.'].types = './dist/dev/index.d.ts';
    json.publishConfig.exports['.'].development ||= {};
    json.publishConfig.exports['.'].development.default = './dist/dev/index.js';
    json.publishConfig.exports['.'].default = './dist/prod/index.d.ts';
  }, workspace);
}
