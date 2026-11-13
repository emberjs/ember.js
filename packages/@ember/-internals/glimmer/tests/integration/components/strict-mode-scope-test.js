import { moduleFor, RenderingTestCase } from 'internal-test-helpers';

import { precompileTemplate } from '@ember/template-compilation';
import { setComponentTemplate } from '@glimmer/manager';
import templateOnly from '@ember/component/template-only';
import { on } from '@ember/modifier';

// A strict-mode template reads every name it uses from its scope, wherever the
// name is used.
moduleFor(
  'Strict Mode - the names a template reads from its scope',
  class extends RenderingTestCase {
    '@test an argument of a modifier is read from the scope'(assert) {
      let clicks = 0;
      let handleClick = () => clicks++;

      let Foo = setComponentTemplate(
        precompileTemplate('<button {{on "click" handleClick}}>Click</button>', {
          strictMode: true,
          scope: () => ({ on, handleClick }),
        }),
        templateOnly()
      );

      this.owner.register('component:foo', Foo);

      this.render('<Foo/>');
      this.click('button');
      assert.strictEqual(clicks, 1, 'the scope value ran');
    }
  }
);
