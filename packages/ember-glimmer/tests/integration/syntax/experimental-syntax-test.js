import { moduleFor, RenderingTest } from '../../utils/test-case';
import { strip } from '../../utils/abstract-test-case';
import { _registerMacros, _experimentalMacros } from 'ember-glimmer';
import { compileExpression } from '@glimmer/runtime';

moduleFor('registerMacros', class extends RenderingTest {
  constructor() {
    let originalMacros = _experimentalMacros.slice();

    _registerMacros((blocks, inlines) => {
      blocks.add('-let', (params, hash, _default, inverse, builder) => {
        compileExpression(params[0], builder);
        builder.invokeStatic(_default, 1);
      });
    });

    super();
    this.originalMacros = originalMacros;
  }

  teardown() {
    _experimentalMacros.length = 0;
    this.originalMacros.forEach(macro => _experimentalMacros.push(macro));

    super.teardown();
  }

  ['@test allows registering custom syntax via private API'](assert) {
    this.render(strip`
      {{#-let obj as |bar|}}
        {{bar}}
      {{/-let}}
    `, { obj: 'hello world!'});

    this.assertText('hello world!');
  }
});
