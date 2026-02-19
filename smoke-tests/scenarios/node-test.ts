import { nodeScenarios } from './scenarios';
import type { PreparedApp, Scenarios } from 'scenario-tester';
import * as QUnit from 'qunit';

const { module: Qmodule, test } = QUnit;
QUnit.config.testTimeout = 120_000;

function nodeTests(scenarios: Scenarios) {
  scenarios
    .map('node-tests', (_project) => {})
    .forEachScenario((scenario) => {
      Qmodule(scenario.name, function (hooks) {
        let app: PreparedApp;

        hooks.before(async () => {
          app = await scenario.prepare();
        });

        test('node esm imports', async function (assert) {
          let result = await app.execute(`pnpm test:node`);
          assert.equal(result.exitCode, 0, result.output);
        });
      });
    });
}

nodeTests(nodeScenarios);
