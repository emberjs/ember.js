import { template } from '@ember/template-compiler/runtime';
import { RenderingTestCase, moduleFor } from 'internal-test-helpers';
import { capabilities as componentCapabilities, setComponentManager } from '@ember/component';

// What a runtime template's scope gives it: the explicit `this`, the names the
// implicit form takes from the caller's `eval`, and keywords that the scope
// shadows.

moduleFor(
  'Strict Mode - Runtime Template Compiler (explicit `this`)',
  class extends RenderingTestCase {
    async '@test text that reads like a `this` path stays text'() {
      await this.renderComponentModule(() => {
        let state = { cls: 'Hello, world!' };

        return template('<p>(this one)</p><div>{{this.cls}}</div>', {
          scope: () => ({ this: state }),
        });
      });

      this.assertHTML('<p>(this one)</p><div>Hello, world!</div>');
      this.assertStableRerender();
    }

    async '@test a `this` path passed as an argument reads the explicit `this`'() {
      await this.renderComponentModule(() => {
        let state = { cls: 'Hello, world!' };
        let shout = (value: string) => value.toUpperCase();

        return template('<div>{{shout this.cls}}</div>', {
          scope: () => ({ this: state, shout }),
        });
      });

      this.assertHTML('<div>HELLO, WORLD!</div>');
      this.assertStableRerender();
    }
  }
);

moduleFor(
  'Strict Mode - Runtime Template Compiler (implicit scope)',
  class extends RenderingTestCase {
    async '@test a word of text is not looked up through eval'() {
      let reads = 0;
      Object.defineProperty(globalThis, 'gxtTextProbe', {
        configurable: true,
        get() {
          reads++;
          return 'read';
        },
      });

      try {
        await this.renderComponentModule(() => {
          return template('<p>gxtTextProbe</p>', {
            eval() {
              return eval(arguments[0]);
            },
          });
        });

        this.assertHTML('<p>gxtTextProbe</p>');
        this.assert.strictEqual(reads, 0, 'the word was not evaluated');
      } finally {
        delete (globalThis as unknown as Record<string, unknown>)['gxtTextProbe'];
      }
    }

    async '@test a helper named in PascalCase is in scope'() {
      await this.renderComponentModule(() => {
        let Greeting = () => 'Hello, world!';

        hide(Greeting);

        return template('{{Greeting}}', {
          eval() {
            return eval(arguments[0]);
          },
        });
      });

      this.assertHTML('Hello, world!');
      this.assertStableRerender();
    }
  }
);

moduleFor(
  'Strict Mode - Runtime Template Compiler (shadowed keywords)',
  class extends RenderingTestCase {
    async '@test a shadowed block keyword keeps its {{else}} block'() {
      await this.renderComponentModule(() => {
        let Shadow = template('{{yield}}|{{yield to="inverse"}}');

        return template('{{#unless}}main{{else}}inverse{{/unless}}', {
          scope: () => ({ unless: Shadow }),
        });
      });

      this.assertHTML('main|inverse');
      this.assertStableRerender();
    }

    async '@test a shadowed block keyword keeps its positional and named arguments'() {
      await this.renderComponentModule(() => {
        // A component that reads its positional arguments (a template-only
        // component takes none).
        class Shadow {
          args: { positional: readonly unknown[]; named: Record<string, unknown> };

          constructor(args: Shadow['args']) {
            this.args = args;
          }

          get first() {
            return this.args.positional[0];
          }
        }
        setComponentManager(
          () => ({
            capabilities: componentCapabilities('3.13'),
            createComponent(ShadowClass: typeof Shadow, args: Shadow['args']) {
              return new ShadowClass(args);
            },
            getContext(component: Shadow) {
              return component;
            },
          }),
          Shadow
        );
        template('{{this.first}}:{{this.args.named.name}}:{{yield}}', { component: Shadow });
        let items = 'a';

        return template('{{#each items name="b"}}x{{/each}}', {
          scope: () => ({ each: Shadow, items }),
        });
      });

      this.assertText('a:b:x');
      this.assertStableRerender();
    }
  }
);

/**
 * Keeps a variable that only a template names in use, so that the transpiler
 * does not remove it (as in runtime-template-compiler-implicit-test.ts).
 *
 * @param variable The variable to keep.
 */
const hide = (variable: unknown) => {
  new Function(`return (${JSON.stringify(variable)});`);
};
