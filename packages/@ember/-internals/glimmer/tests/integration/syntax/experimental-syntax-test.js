import { moduleFor, RenderingTestCase, strip } from 'internal-test-helpers';

import { _registerMacros, _experimentalMacros } from '@ember/-internals/glimmer';
import { invokeStaticBlockWithStack } from '@glimmer/opcode-compiler';

moduleFor(
  'registerMacros',
  class extends RenderingTestCase {
    constructor() {
      let originalMacros = _experimentalMacros.slice();

      _registerMacros(blocks => {
        blocks.add('-test-block', (params, _hash, blocks) => {
          return invokeStaticBlockWithStack(blocks.get('default'));
        });
      });

      super(...arguments);
      this.originalMacros = originalMacros;
    }

    teardown() {
      _experimentalMacros.length = 0;
      this.originalMacros.forEach(macro => _experimentalMacros.push(macro));

      super.teardown();
    }

    ['@test allows registering custom syntax via private API']() {
      this.render(
        strip`
          {{#-test-block}}
            hello world!
          {{/-test-block}}
        `
      );

      this.assertText('hello world!');
    }
  }
);
