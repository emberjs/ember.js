import { v1AppScenarios } from './scenarios';
import { stableDecoratorFiles } from './stable-decorator-files';
import type { PreparedApp } from 'scenario-tester';
import * as QUnit from 'qunit';
const { module: Qmodule, test } = QUnit;

v1AppScenarios
  .map('modern-decorators', (project) => {
    project.files['ember-cli-build.js'] = project.files['ember-cli-build.js'].replace(
      '/* SCENARIO_INSERTION_TARGET */',
      `
     'ember-cli-babel': {
       disableDecoratorTransforms: true,
     },
     babel: {
       plugins: [
         [require.resolve('@babel/plugin-proposal-decorators'), { version: '2023-11' }],
       ],
     },`
    );

    project.linkDevDependency('ember-template-imports', { baseDir: __dirname })
    project.linkDevDependency('@babel/plugin-proposal-decorators', { baseDir: __dirname })

    project.mergeFiles(stableDecoratorFiles);
  })
  .forEachScenario((scenario) => {
    Qmodule(scenario.name, function (hooks) {
      let app: PreparedApp;
      hooks.before(async () => {
        app = await scenario.prepare();
      });

      test(`ember test`, async function (assert) {
        let result = await app.execute(`ember test`);
        assert.equal(result.exitCode, 0, result.output);
      });
    });
  });
