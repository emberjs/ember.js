import { moduleFor, RenderingTestCase } from '../../utils/test-case';
import { strip } from '../../utils/abstract-test-case';
import { _registerMacros, _experimentalMacros } from '@ember/-internals/glimmer';

moduleFor(
  'registerMacros',
  class extends RenderingTestCase {
    constructor() {
      let originalMacros = _experimentalMacros.slice();

      _registerMacros(blocks => {
        blocks.add('-let', (params, hash, _default, inverse, builder) => {
          builder.compileParams(params);
          builder.invokeStaticBlock(_default, params.length);
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
      {{#-let obj as |bar|}}
        {{bar}}
      {{/-let}}
    `,
        { obj: 'hello world!' }
      );

      this.assertText('hello world!');
    }
  }
);
