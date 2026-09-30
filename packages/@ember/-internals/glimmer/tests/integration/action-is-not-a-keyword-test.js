import { DEBUG } from '@glimmer/env';
import { moduleFor, RenderingTestCase } from 'internal-test-helpers';
import { helper } from '@ember/component/helper';
import templateOnly from '@ember/component/template-only';
import { setComponentTemplate } from '@glimmer/manager';
import { precompileTemplate } from '@ember/template-compilation';
import { template } from '@ember/template-compiler/runtime';

// The `{{action}}` helper and modifier were removed in Ember 6.0. `action` is an ordinary name
// now: it is not a keyword, and templates are not rewritten to pass `this` to it.
moduleFor(
  '`action` is not a keyword',
  class extends RenderingTestCase {
    ['@test in strict mode, an unbound `action` is not in scope'](assert) {
      assert.throws(() => {
        template('<button {{action "save"}}></button>');
      }, /Attempted to resolve a modifier in a strict mode template, but that value was not in scope: action/);
    }

    ['@test in strict mode, `action` can be bound in the lexical scope']() {
      let action = () => 'my action';
      let Root = setComponentTemplate(
        precompileTemplate('{{action}}', { strictMode: true, scope: () => ({ action }) }),
        templateOnly()
      );

      this.render('<this.Root />', { Root });
      this.assertText('my action');
    }

    ['@test in loose mode, a `helper:action` receives only the arguments written']() {
      this.owner.register(
        'helper:action',
        helper((params) => `${params.length}: ${params.join(', ')}`)
      );

      this.render('{{if true (action "save" "now")}}');
      this.assertText('2: save, now');
    }

    ['@test in loose mode, an unresolved `{{action}}` is an ordinary resolution error'](assert) {
      if (!DEBUG) {
        assert.expect(0);
        return;
      }

      assert.throws(() => {
        this.render('{{action "save"}}');
      }, /Attempted to resolve `action`, which was expected to be a component or helper, but nothing was found/);
    }
  }
);
