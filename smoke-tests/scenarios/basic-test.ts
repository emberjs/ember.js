import { appScenarios } from './scenarios';
import type { PreparedApp } from 'scenario-tester';
import * as QUnit from 'qunit';
const { module: Qmodule, test } = QUnit;

appScenarios.map('basics', project => {

}).forEachScenario(scenario => {
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
})