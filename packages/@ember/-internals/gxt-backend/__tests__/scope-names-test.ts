/**
 * A runtime template's scope may name a value with any string (compat,
 * GXT_MODE).
 *
 * `template(source, { scope })` passes every name of its scope to the compile,
 * and the legacy template function declares each one, read from the scope by
 * its name. A name with a quote or a backslash is read as that name: it is no
 * code and does not end the string that holds it. No template can use such a
 * name (no path head has a quote or a backslash), so the template renders as
 * if the name were not there. (Classic `template()` makes every scope name a
 * `Function` parameter, so it rejects such a name, as it rejects `my-helper`,
 * which the compat backend accepts.)
 *
 * The test page loads this file only in GXT builds (`virtual:gxt-tests`).
 */
import { moduleFor, RenderingTestCase } from 'internal-test-helpers';
import { template } from '@ember/template-compiler/runtime';

interface ScopeNameProbe {
  ran: boolean;
}

moduleFor(
  'GXT runtime templates: scope names',
  class extends RenderingTestCase {
    async '@test a scope name with a quote or a backslash'() {
      await this.renderComponentModule(() =>
        template('{{greeting}}', {
          scope: () => ({ greeting: 'hello', 'say"hi': 1, 'back\\slash': 2 }),
        })
      );

      this.assertText('hello');
      this.assertStableRerender();
    }

    async '@test a scope name runs no code'() {
      const probe: ScopeNameProbe = { ran: false };
      (globalThis as { gxtScopeNameProbe?: ScopeNameProbe }).gxtScopeNameProbe = probe;

      try {
        await this.renderComponentModule(() =>
          template('{{greeting}}', {
            scope: () => ({
              greeting: 'hello',
              'x"] + (globalThis.gxtScopeNameProbe.ran = true) + ["': 1,
            }),
          })
        );

        this.assertText('hello');
        this.assert.false(probe.ran, 'the scope name ran no code');
      } finally {
        delete (globalThis as { gxtScopeNameProbe?: ScopeNameProbe }).gxtScopeNameProbe;
      }
    }
  }
);
