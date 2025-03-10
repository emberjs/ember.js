import { appScenarios } from './scenarios';
import type { PreparedApp } from 'scenario-tester';
import * as QUnit from 'qunit';
const { module: Qmodule, test } = QUnit;

appScenarios
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

    project.mergeFiles({
      tests: {
        unit: {
          'tracked-accessor-test.gjs': `
          import { module, test } from 'qunit';
          import { setupRenderingTest } from 'ember-qunit';
          import { render, click } from '@ember/test-helpers';
          import { on } from '@ember/modifier';
          import { tracked } from '@glimmer/tracking';
          import Component from '@glimmer/component';

          module('Unit | tracked-accessor', function(hooks) {
            setupRenderingTest(hooks);

            test('interactive update', async function(assert) {
              class Example extends Component {
                @tracked accessor count = 0;
                inc = () => { this.count++ };

                <template>
                  <div class="example">
                    <span>{{this.count}}</span>
                    <button {{on "click" this.inc}}>+</button>
                  </div>

                </template>
              }

              await render(<template><Example /></template>);
              assert.dom('.example span').hasText('0');
              await click('.example button');
              assert.dom('.example span').hasText('1');
            });
          });
          `
        },
      },
    });
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
