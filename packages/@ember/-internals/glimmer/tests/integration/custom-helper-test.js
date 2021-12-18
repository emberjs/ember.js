import { RenderingTestCase, moduleFor, strip } from 'internal-test-helpers';

import { precompileJSON } from '@glimmer/compiler';
import { getTemplateLocals } from '@glimmer/syntax';
import { createTemplateFactory } from '@ember/template-factory';

import { Helper } from '../../index';
import { setComponentTemplate } from '@glimmer/manager';
import { templateOnlyComponent } from '@glimmer/runtime';

// eslint-disable-next-line ember-internal/require-yuidoc-access
/**
 * The template-compiler does not support strict mode at this time.
 * precompile from ember-template-compiler returns a string and
 * not a template-factory, so it doesn't help with strict-mode testing.
 *
 * We also can't import from `@ember/template-compiler` because it
 * doesn't exist to this kind of test, otherwise we'd be able to use
 * precompileTemplate, which would be perfect :D
 *
 * Copied(ish) from https://github.com/NullVoxPopuli/ember-repl/blob/main/addon/hbs.ts#L51
 */
function precompileTemplate(source, { moduleName, scope = {} }) {
  let locals = getTemplateLocals(source);

  let options = {
    strictMode: true,
    moduleName,
    locals,
    isProduction: false,
    meta: { moduleName },
  };

  // Copied from @glimmer/compiler/lib/compiler#precompile
  let [block, usedLocals] = precompileJSON(source, options);
  let usedScope = usedLocals.map((key) => scope[key]);

  let blockJSON = JSON.stringify(block);
  let templateJSONObject = {
    id: moduleName,
    block: blockJSON,
    moduleName: moduleName ?? '(unknown template module)',
    scope: () => usedScope,
    isStrictMode: true,
  };

  let factory = createTemplateFactory(templateJSONObject);

  return factory;
}

moduleFor(
  'Custom Helper test',
  class extends RenderingTestCase {
    ['@test works with strict-mode']() {
      class Custom extends Helper {
        compute([value]) {
          return `${value}-custom`;
        }
      }

      let template = strip`
        {{ (Custom 'my-test') }}
      `;

      let templateFactory = precompileTemplate(template, {
        moduleName: 'strict-mode',
        scope: { Custom },
      });

      let TestComponent = setComponentTemplate(templateFactory, templateOnlyComponent());

      this.render(`<this.TestComponent />`, { TestComponent });
      this.assertText('my-test-custom');
      this.assertStableRerender();
    }
  }
);
