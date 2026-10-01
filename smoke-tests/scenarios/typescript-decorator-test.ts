import { v2AppScenarios } from './scenarios';
import { stableDecoratorFiles } from './stable-decorator-files';
import type { PreparedApp } from 'scenario-tester';
import { resolve } from 'node:path';
import * as QUnit from 'qunit';
const { module: Qmodule, test } = QUnit;

// Compiles the app's own code with TypeScript's standard decorator emit,
// before babel sees it.
// TypeScript only provides decorator metadata if `Symbol.metadata` exists,
// which it doesn't in browsers yet.
// Ember relies on that metadata, so apps using TypeScript's emit must polyfill it.
// This plugin does that too.
const typescriptEmitPlugin = `
function typescriptEmit() {
  return {
    name: 'typescript-emit',
    transformIndexHtml() {
      return [
        {
          tag: 'script',
          children: "Symbol.metadata ??= Symbol('Symbol.metadata');",
          injectTo: 'head-prepend',
        },
      ];
    },
    transform(code, id) {
      let [file] = id.split('?');
      if (file.startsWith('\\0') || file.includes('/node_modules/') || !/\\.(js|ts|gjs|gts)$/.test(file)) {
        return;
      }
      let { outputText, sourceMapText } = ts.transpileModule(code, {
        fileName: file.replace(/\\.gjs$/, '.js').replace(/\\.gts$/, '.ts'),
        compilerOptions: {
          // For ESNext, TypeScript would leave decorators as-is.
          target: ts.ScriptTarget.ES2022,
          module: ts.ModuleKind.ESNext,
          experimentalDecorators: false,
          allowJs: true,
          sourceMap: true,
        },
      });
      return {
        code: outputText.replace(/^\\/\\/# sourceMappingURL=.*$/m, ''),
        map: sourceMapText,
      };
    },
  };
}
`;

function replaceOrThrow(source: string, pattern: string | RegExp, replacement: string, what: string) {
  let result = source.replace(pattern, replacement);
  if (result === source) {
    throw new Error(`typescript-decorators scenario: couldn't find ${what} in the app template`);
  }
  return result;
}

v2AppScenarios
  .map('typescript-decorators', (project) => {
    project.files['vite.config.mjs'] = replaceOrThrow(
      replaceOrThrow(
        project.files['vite.config.mjs'] as string,
        '// extra plugins here',
        'typescriptEmit(),',
        'the vite plugin insertion point'
      ),
      "import { defineConfig } from 'vite';",
      `import { defineConfig } from 'vite';\nimport ts from 'typescript';\n${typescriptEmitPlugin}`,
      'the vite import'
    );

    // TypeScript compiles the decorators, so babel must not.
    project.files['babel.config.mjs'] = replaceOrThrow(
      project.files['babel.config.mjs'] as string,
      /\n\s*\[\s*'module:decorator-transforms',[\s\S]*?\n    \],/,
      '',
      'the decorator-transforms babel plugin'
    );

    // The scenarios package pins an older TypeScript, from before decorator
    // metadata support (5.2), so use the repo's.
    project.linkDevDependency('typescript', { baseDir: resolve(__dirname, '..', '..') });

    project.mergeFiles(stableDecoratorFiles);
    project.mergeFiles({
      tests: {
        unit: {
          'typescript-decorators-test.gts': `
            import { module, test } from 'qunit';
            import { setupRenderingTest } from 'ember-qunit';
            import { render, click } from '@ember/test-helpers';
            import { on } from '@ember/modifier';
            import { action } from '@ember/object';
            import { service } from '@ember/service';
            import { tracked, cached } from '@glimmer/tracking';
            import Component from '@glimmer/component';

            interface MyExample {
              message: string;
            }

            module('Unit | typescript-decorators', function (hooks) {
              setupRenderingTest(hooks);

              test('field and method decorators in TypeScript', async function (assert) {
                let computeCount = 0;

                class Example extends Component {
                  @service myExample!: MyExample;
                  @tracked count: number = 1;

                  @cached
                  get doubled(): number {
                    computeCount++;
                    return this.count * 2;
                  }

                  @action
                  inc(): void {
                    this.count++;
                  }

                  <template>
                    <div class="example">
                      <span class="message">{{this.myExample.message}}</span>
                      <span class="doubled">{{this.doubled}}</span>
                      <span class="doubled-again">{{this.doubled}}</span>
                      <button {{on "click" this.inc}}>+</button>
                    </div>
                  </template>
                }

                await render(<template><Example /></template>);
                assert.dom('.example .message').hasText('Message from MyExample');
                assert.dom('.example .doubled').hasText('2');
                assert.dom('.example .doubled-again').hasText('2');
                assert.strictEqual(computeCount, 1, '@cached getter is only computed once');

                await click('.example button');
                assert.dom('.example .doubled').hasText('4');
                assert.strictEqual(computeCount, 2, '@cached getter recomputes after a change');
              });
            });
          `,
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

      test(`pnpm test`, async function (assert) {
        let result = await app.execute(`pnpm test`);
        assert.equal(result.exitCode, 0, result.output);
      });
    });
  });
